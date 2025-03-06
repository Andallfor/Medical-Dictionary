import { mw, phoneme, replacement } from "../phoneticTree/constants";
import { toIpa } from "../phoneticTree/tree";
import { capitalize } from "../util";
import { getAudio, getCollegiateDef, hasAudio } from "./api";
import { useEffect, useRef, useState } from "react";

export function SingleWord({ words, dictionary, userSearch }: { words: mw[], dictionary: phoneme[], userSearch: boolean }) {
    const audioPlayer = useRef<HTMLAudioElement | null>(null);
    const [phonetics, setPhonetics] = useState('');
    const [shouldWarn, setShouldWarn] = useState(false);

    useEffect(() => {
        if (!words[0].hwi.prs) return;

        const word = words[0];
        const ref = dictionary.find((p) => p.word.toLowerCase() == word.searchTerm);
        let pron = '';
        if (ref) {
            pron = ref.pronunciation;
            setPhonetics(ref.pronunciation);
            setShouldWarn(false);
        } else {
            let str = words[0].hwi.prs[0].mw.trim();

            str = str.replaceAll('-', '');
            str = toIpa(str, 'MW');

            pron = str;
            setPhonetics(str);
            setShouldWarn(true);
        }

        if (userSearch) window.dispatchEvent(new CustomEvent('phonetic-tree-external-search', { detail: [pron, true] }));

    }, [words]);

    return (
        <div className="ml-1">
            <div className="text-2xl flex items-center">
                <span className="capitalize">{words[0].meta.id}</span>
                {(() => {
                    const audio = hasAudio(words[0].hwi.prs);
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
                <div className="italic">{words[0].fl}</div>
                {words[0].shortdef.map((s, k) =>
                    <div key={k} className="ml-2 flex">
                        <div>{k + 1}.</div>
                        <div className="ml-1">{capitalize(s)}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
