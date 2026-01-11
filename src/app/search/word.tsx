import { mw, phoneme, StandardType, Tokenization, wordDefinitionData } from "../phoneticTree/constants";
import { toIpa } from "../phoneticTree/tree";
import { capitalize } from "../util";
import { getAudio, hasAudio } from "./api";
import { useEffect, useRef, useState } from "react";

export function SingleWord({ words, dictionary, userSearch }: { words: mw[] | string, dictionary: phoneme[], userSearch: boolean }) {
    // definition loaded from internal dictionary
    const [internal, setInternal] = useState<wordDefinitionData | undefined>(undefined);
    // definition loaded from external source (i.e. MW)
    const [external, setExternal] = useState<wordDefinitionData | undefined>(undefined);

    // slightly jank as we need to coerce mw[] and phoneme into wordDefinitionData
    useEffect(() => {
        // get mw def
        let _external: wordDefinitionData | undefined = undefined;
        if (typeof words != 'string') { // mw exists
            const m = (words as mw[])[0];
            let pron: string | undefined, audio: string | undefined;

            if (m.hwi && m.hwi.prs) {
                pron = toIpa(m.hwi.prs[0].mw.trim(), 'MW');

                const a = hasAudio(m.hwi.prs);
                if (a) audio = getAudio(a);
            }

            _external = {
                word: m.meta.id.split(':')[0],
                part: m.fl,
                def: m.shortdef,
                pronunciation: pron,
                audio: audio,
                shouldWarn: true,
            };
        } else _external = undefined;

        // get internal def
        let _internal: wordDefinitionData | undefined = undefined;
        const internalDef = _external ? dictionary.find(x => x.word == _external?.word) : dictionary.find(x => x.word == words as string);
        if (internalDef) {
            const internalTemplate: wordDefinitionData = {
                word: internalDef.word,
                part: internalDef.part,
                def: internalDef.def,
                audio: undefined,
                shouldWarn: true,
            };

            if (internalDef.pronunciation.length > 0) {
                internalTemplate.pronunciation = internalDef.pronunciation;
                internalTemplate.shouldWarn = false;
            }

            _internal = internalTemplate;
        } else _internal = undefined;

        // check if _internal is the same as _external. if it is, get rid of _internal
        if (_internal && _external) {
            // word and pronunciation must be the same
            // def and part must either be undefined or the same
            if (_internal.word == _external.word && _internal.pronunciation == _external.pronunciation &&
                (!_internal.def || (_internal.def == _external.def)) &&
                (!_internal.part || (_internal.part == _external.part))) {
                _internal = undefined;
            }
        }

        setExternal(_external);
        setInternal(_internal);

        // if needed, update the phonetic tree to have it match the newly searched word
        if (userSearch && (_internal || _external)) { // cannot use state as it has not updated yet
            window.dispatchEvent(new CustomEvent('phonetic-tree-external-search', {
                detail: [ // try to use internal if available
                    _internal?.word ?? _external?.word,
                    (_internal?.pronunciation ?? _external?.pronunciation) ?? '',
                    true
                ]
            }));
        }
    }, [words]);

    if (internal || external) {
        return (<div className="mt-2 mb-6">
            {external ? <Definition word={external} source={'Merriam-Webster'}/> : <></>}
            {internal ? <Definition word={internal} source={'Internal'}/> : <></>}
        </div>);
    } else return <div className="text-lg ml-2 mt-1 text-[#d9646c]">Unable to find {typeof words == 'string' ? (words as string) : 'word'}.</div>;
}

function Definition({ word, source }: { word: wordDefinitionData, source: string }) {
    const audioPlayer = useRef<HTMLAudioElement | null>(null);

    return (
        <div className="flex flex-grow">
            <div className="bg-surface20 w-[2px] mx-2"></div>
            <div className="ml-1 mt-1 mb-2 w-full">
                <div className="flex items-center justify-between">
                    <div className="text-2xl flex items-center">
                        <span className="capitalize">{word.word}</span>
                        {word.audio
                            ? <button className={"ml-3 hover:bg-tonal0/70 border bg-tonal0 rounded-md px-2 text-xl py-0.5 " + (word.shouldWarn ? 'border-red-500' : 'border-surface20')}
                                title={word.shouldWarn ? "Pronunciation was converted from MW and so may not be correct." : undefined}
                                onClick={() => audioPlayer.current ? audioPlayer.current.play() : null}>
                                <span>{word.pronunciation}</span>
                                <i className="ml-2 mr-1 ri-volume-up-fill text-primary40"></i>
                                <audio src={word.audio} ref={audioPlayer}></audio>
                            </button>
                            : word.pronunciation
                                ? <div className={"ml-3 border bg-tonal0 rounded-md text-2 text-xl py-0.5 px-2 " + (word.shouldWarn ? 'border-red-500' : 'border-surface20')}>{word.pronunciation}</div>
                                : <span className="text-base mx-6">[No pronunciation found]</span>}
                    </div>
                    <div className="flex items-center">
                        <i className="text-sm">({source})</i>
                        {(word.pronunciation) ? <button className="button ml-3 ri-file-copy-line text-base" onClick={() => navigator.clipboard.writeText(word.pronunciation!)}></button> : <></>}
                    </div>
                </div>
                <div className="text-primary40">
                    <i>{capitalize((word.part && word.part.length > 0) ? word.part : 'No part of speech')}</i>
                    {(word.def && word.def.length > 0) ? 
                        word.def.map((s, k) =>
                            <div key={k} className="ml-2 flex">
                                <div>{k + 1}.</div>
                                <div className="ml-1">{capitalize(s)}</div>
                            </div>
                        )
                    : <div className="text-lg ml-2 text-[#d9646c]">No definition available.</div>}
                </div>
            </div>
        </div>);
}
