import { mw, phoneme, StandardType, Token, Tokenization, Word, wordDefinitionData } from "../phoneticTree/constants";
import { capitalize } from "../util";
import { getAudio, hasAudio } from "./api";
import { useEffect, useRef, useState } from "react";

export function SingleWord({ words, dictionary, userSearch }: { words: mw[] | string, dictionary: Word[], userSearch: boolean }) {
    // definition loaded from internal dictionary
    const [internal, setInternal] = useState<Word | undefined>(undefined);
    // definition loaded from external source (i.e. MW)
    const [external, setExternal] = useState<Word | undefined>(undefined);

    // slightly jank as we need to coerce mw[] and phoneme into wordDefinitionData
    useEffect(() => {
        let _external: Word | undefined = undefined;
        let _internal: Word | undefined = undefined;        

        // get MW def
        if (typeof words != 'string') {
            const m = (words as mw[])[0]; // take the first output
            _external = {
                word: m.meta.id.split(':')[0],
                part: m.fl,
                def: m.shortdef,
                audio: '',
                isInternal: false,
            };

            if (m.hwi?.prs) {
                const t = Tokenization.tokenize(m.hwi.prs[0].mw.trim(), StandardType.mw);
                _external!.pronunciation = {
                    tokens: t,
                    text: Tokenization.toString(t),
                    shouldDelete: false,
                };

                const a = hasAudio(m.hwi.prs);
                if (a) _external.audio = getAudio(a);
            }
        }

        // sync our internal search with MW search (if present)
        // TODO: this is a bit unintuitive? likely need to redo the parameters to pass in both mw and what the user searched
        const internalDef = _external ? dictionary.find(x => x.word == _external.word) : dictionary.find(x => x.word == words as string);
        if (internalDef) {
            _internal = {
                word: internalDef.word,
                part: internalDef.part,
                def: internalDef.def,
                audio: '',
                isInternal: false,
            }

            if (internalDef.pronunciation) {
                _internal.pronunciation = internalDef.pronunciation;
                _internal.isInternal = true;
            }
        }

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
                    (_internal?.pronunciation?.text ?? _external?.pronunciation?.text) ?? '',
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

function Definition({ word, source }: { word: Word, source: string }) {
    const audioPlayer = useRef<HTMLAudioElement | null>(null);

    return (
        <div className="flex flex-grow">
            <div className="bg-surface20 w-[2px] mx-2"></div>
            <div className="ml-1 mt-1 mb-2 w-full">
                <div className="flex items-center justify-between">
                    <div className="text-2xl flex items-center">
                        <span className="capitalize">{word.word}</span>
                        {word.audio
                            ? <button className={"ml-3 hover:bg-tonal0/70 border bg-tonal0 rounded-md px-2 text-xl py-0.5 " + (!word.isInternal ? 'border-red-500' : 'border-surface20')}
                                title={!word.isInternal ? "Pronunciation was converted from MW and so may not be correct." : undefined}
                                onClick={() => audioPlayer.current ? audioPlayer.current.play() : null}>
                                <span>{word.pronunciation?.text ?? ''}</span>
                                <i className="ml-2 mr-1 ri-volume-up-fill text-primary40"></i>
                                <audio src={word.audio} ref={audioPlayer}></audio>
                            </button>
                            : word.pronunciation
                                ? <div className={"ml-3 border bg-tonal0 rounded-md text-2 text-xl py-0.5 px-2 " + (!word.isInternal ? 'border-red-500' : 'border-surface20')}>{word.pronunciation.text}</div>
                                : <span className="text-base mx-6">[No pronunciation found]</span>}
                    </div>
                    <div className="flex items-center">
                        <i className="text-sm">({source})</i>
                        {word.pronunciation
                            ? <button className="button ml-3 ri-file-copy-line text-base"
                                onClick={() => navigator.clipboard.writeText(word.pronunciation!.text)}></button>
                            : <></>}
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
