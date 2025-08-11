import { mw, phoneme, wordDefinitionData } from "../phoneticTree/constants";
import { toIpa } from "../phoneticTree/tree";
import { capitalize } from "../util";
import { getAudio, hasAudio } from "./api";
import { useEffect, useRef, useState } from "react";

export function SingleWord({ words, dictionary, userSearch }: { words: mw[] | string, dictionary: phoneme[], userSearch: boolean }) {
    const [isValid, setIsValid] = useState(false);
    const [data, setData] = useState<wordDefinitionData | undefined>(undefined)

    useEffect(() => {
        const mwValid = typeof words != 'string';
        let ref: phoneme | undefined = undefined;
        if (!mwValid) ref = dictionary.find(x => x.word == words);
        else {
            const t = (words as mw[])[0].searchTerm;
            ref = dictionary.find(x => x.word == t);
        }

        if (mwValid || ref) {
            // this is a bit jank as this system was originally designed when mw was the central data type to the system, before the introduction of phoneme
            const w: wordDefinitionData = {word: '', shouldWarn: true};

            if (mwValid) {
                const m = (words as mw[])[0];
                w.word = m.meta.id.split(':')[0];
                if (m.hwi && m.hwi.prs) {
                    w.pronunciation = toIpa(m.hwi.prs[0].mw.trim(), 'MW');
                    const audio = hasAudio(m.hwi.prs);
                    if (audio) w.audio = getAudio(audio);
                }
                w.part = m.fl;
                w.def = m.shortdef;
            }

            // override with what data is stored in the database
            if (ref) {
                w.word = ref.word;
                if (ref.pronunciation.length > 0) {
                    w.pronunciation = ref.pronunciation;
                    w.shouldWarn = false;
                }
                if (ref.def) w.def = ref.def;
                if (ref.part) w.part = ref.part;
            }

            setIsValid(true);
            setData(w);
        } else {
            setIsValid(false);
            setData(undefined);
        }
    }, [words]);

    return (
        (isValid && data)
        ? <Definition word={data} userSearch={userSearch}/>
        : <div className="text-lg ml-2 mt-1 text-[#d9646c]">Unable to find {typeof words == 'string' ? (words as string) : 'word'}.</div>
    )
}

function Definition({ word, userSearch }: { word: wordDefinitionData, userSearch: boolean }) {
    const audioPlayer = useRef<HTMLAudioElement | null>(null);

    // get pronunciation and audio
    useEffect(() => {
        if (userSearch) window.dispatchEvent(new CustomEvent('phonetic-tree-external-search', { detail: [word.word, word.pronunciation ?? '', true] }));
    }, [word]);

    return (
        <div className="flex mt-2 mb-6 flex-grow">
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
                    {(word.pronunciation) ? <button className="button ml-3 ri-file-copy-line text-base" onClick={() => navigator.clipboard.writeText(word.pronunciation!)}></button> : <></>}
                </div>
                <div className="text-primary40">
                    <div className="italic">{capitalize((word.part && word.part.length > 0) ? word.part : 'No part of speech')}</div>
                    {(word.def && word.def.length > 0) ? 
                        word.def.map((s, k) =>
                            <div key={k} className="ml-2 flex">
                                <div>{k + 1}.</div>
                                <div className="ml-1">{capitalize(s)}</div>
                            </div>
                        )
                    : <div className="text-lg ml-2 mt-1 text-[#d9646c]">No definition available.</div>}
                </div>
            </div>
        </div>);
}
