import { mw, phoneme } from "../phoneticTree/constants";
import { toIpa } from "../phoneticTree/tree";
import { capitalize } from "../util";
import { getAudio, hasAudio } from "./api";
import { useEffect, useRef, useState } from "react";

export function SingleWord({ words, dictionary, userSearch }: { words: mw[] | string, dictionary: phoneme[], userSearch: boolean }) {
    if (typeof words == 'string') return <Error word={words as string} userSearch={userSearch} dictionary={dictionary}/>
    else return <Definition word={(words as mw[])[0]} dictionary={dictionary} userSearch={userSearch}/>
}

function Definition({ word, dictionary, userSearch }: { word: mw, dictionary: phoneme[], userSearch: boolean }) {
    const audioPlayer = useRef<HTMLAudioElement | null>(null);
    const [phonetics, setPhonetics] = useState('');
    const [shouldWarn, setShouldWarn] = useState(false);

    // get pronunciation and audio
    useEffect(() => {
        // check if word is already defined, otherwise generate from mw
        const ref = dictionary.find((p) => p.word == word.searchTerm);
        const pron = ref ? ref.pronunciation : toIpa(word.hwi.prs[0].mw.trim(), 'MW');

        setPhonetics(pron);
        setShouldWarn(ref == undefined);

        if (userSearch) window.dispatchEvent(new CustomEvent('phonetic-tree-external-search', { detail: [word.searchTerm, pron, true] }));
    }, [word]);

    return (
        <div className="flex mt-2 mb-6">
            <div className="bg-surface20 w-[2px] mx-2"></div>
            <div className="ml-1 mt-1 mb-2">
                <div className="text-2xl flex items-center">
                    <span className="capitalize">{word.meta.id}</span>
                    {(() => {
                        const audio = hasAudio(word.hwi.prs);
                        if (audio) {
                            return (<>
                                <button className={"ml-3 hover:bg-tonal0/70 border bg-tonal0 rounded-md px-2 text-xl py-0.5 " + (shouldWarn ? 'border-red-500' : 'border-surface20')}
                                    title={shouldWarn ? "Pronunciation was converted from MW and so may not be correct." : undefined}
                                    onClick={() => audioPlayer.current ? audioPlayer.current.play() : null}>
                                    <span>{phonetics}</span>
                                    <i className="ml-2 mr-1 ri-volume-up-fill text-primary40"></i>
                                    <audio src={getAudio(audio)} ref={audioPlayer}></audio>
                                </button>
                            </>)
                        } else return <span className="text-base mx-6">[No audio found]</span>;
                    })()}
                </div>
                <div className="text-primary40">
                    <div className="italic">{word.fl}</div>
                    {word.shortdef.map((s, k) =>
                        <div key={k} className="ml-2 flex">
                            <div>{k + 1}.</div>
                            <div className="ml-1">{capitalize(s)}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>);
}

function Error({ word, userSearch, dictionary }: { word: string, userSearch: boolean, dictionary: phoneme[] }) {
    useEffect(() => {
        if (userSearch) {
            const pron = dictionary.find((p) => p.word == word);
            window.dispatchEvent(new CustomEvent('phonetic-tree-external-search',
                { detail: [word, pron ? pron.pronunciation : '', true] }));
        }
    }, [word]);

    return <div className="text-lg ml-2 mt-1 text-[#d9646c]">Unable to find {word}.</div>
}
