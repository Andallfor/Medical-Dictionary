import { InferGetStaticPropsType } from "next";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { ConsonantOrder, VowelOrder, branchState, oedToIpa, phonetic } from "./phoneticConstants";
import { PhoneticSearchController } from "./phoneticSearch";

function toIpa(oed: string, v: RegExp) {
    // special case: all stressed ə should become ʌ
    Object.entries(oedToIpa).forEach(([k, v]) => oed = oed.replaceAll(k, v));
    const parts: string[] = [];
    const ind = [...oed.matchAll(new RegExp(/ˈ|ˌ/g))].map(x => x.index!).concat([oed.length]);
    for (let i = 0; i < ind.length - 1; i++) {
        let p = oed.substring(ind[i], ind[i + 1]);
        const m = p.match(v);
        if (m && m[0] == 'ə') p = p.replace('ə', 'ʌ');
        parts.push(p);
    }

    if (parts.length == 0) return oed;
    return oed.substring(0, ind[0]) + parts.join('');
}

export default function PhoneticTree() {
    const [data, setData] = useState<phonetic[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [focused, setFocused] = useState<phonetic[]>([]);
    const [vowelState, setVowelStates] = useState<branchState[]>([]);
    const [searchStr, setSearchStr] = useState<string[]>([]);

    useEffect(() => {
        if (!loaded) {
            setLoaded(false);
            // https://observablehq.com/@mbostock/fetch-utf-16
            fetch('/data.txt').then(response => response.arrayBuffer()).then(buffer => {
                const lines = new TextDecoder('utf-16le').decode(buffer).substring(1).split('\n'); // skip bom
                const phonetics: phonetic[] = [];

                const matchVowels = new RegExp([...Object.keys(VowelOrder)].join('|'), 'g');
                const matchConstants = new RegExp(Object.keys(ConsonantOrder).sort((a, b) => b.length - a.length).join('|'), 'g');

                lines.forEach((line) => {
                    if (line.length == 0) return;

                    let [word, pron] = line.split('=');
                    pron = toIpa(pron, matchVowels); // expects input from oed

                    const primary = pron.includes('ˈ') ? pron.split('ˈ')[1] : pron;

                    const pc = [...primary.matchAll(matchConstants)].map(x => x[0] as string);

                    phonetics.push({
                        word: word,
                        vowelCombo: [...primary.matchAll(matchVowels)].map(x => x[0] as string),
                        primaryConst: pc[0] ?? '-',
                        tailConst: pc[pc.length - 1] ?? '-',
                        pronunciation: pron
                    });
                });

                setData(phonetics);
            });
        }
    }, [])

    function formatSearch() {
        let out = searchStr.map((s) => '* ' + s).join(' ');
        return out.length != 0 ? ("'" + out) : "";
    }

    function search() {
        const pattern: string[] = [];
        vowelState.forEach(v => {
            if (v.phoneme) pattern.push(v.phoneme)
        });

        if (pattern.length == searchStr.length) {
            let isSame = true;
            for (let i = 0; i < pattern.length; i++) {
                if (pattern[i] != searchStr[i]) isSame = false;
            }

            if (isSame) return;
        }

        setSearchStr(pattern);

        let valid: phonetic[] = [];
        data.forEach(p => {
            let isValid = true;
            for (let i = 0; i < pattern.length; i++) {
                if (p.vowelCombo[i] != pattern[i]) {
                    isValid = false;
                    break;
                }
            }

            if (isValid) valid.push(p);
        });

        valid.sort((a, b) => {
            for (let i = 0; i < Math.max(a.vowelCombo.length, b.vowelCombo.length); i++) {
                // TODO: currently we prioritize exact matches
                const ac = i >= a.vowelCombo.length ? -1 : VowelOrder[a.vowelCombo[i]];
                const bc = i >= b.vowelCombo.length ? -1 : VowelOrder[b.vowelCombo[i]];
                
                if (ac - bc != 0) return ac - bc;
            }

            const pc = ConsonantOrder[a.primaryConst] - ConsonantOrder[b.primaryConst];
            if (pc != 0) return pc;

            const tc = ConsonantOrder[a.tailConst] - ConsonantOrder[b.tailConst];
            return tc;
        });

        valid = valid.slice(0, 200);

        setFocused(valid);
    }

    return (
        <div className="flex gap-6">
            <div>
                <PhoneticSearchController num={4} props={{
                    states: vowelState,
                    setStates: setVowelStates,
                    search: search,
                    list: Object.keys(VowelOrder)
                }}/>
            </div>
            <div className="flex flex-col gap-2 py-3 pl-2 pr-5 bg-tonal0 rounded-lg flex-grow">
                <div className="ml-1">{
                    searchStr.length == 0 ? 'No query.' :
                        <span>Found {focused.length}{focused.length >= 200 ? '+' : ''} matches for <span className="font-semibold">/{formatSearch()}/:</span></span>
                }</div>
                {focused.map((p, i) => 
                    <div key={i} className="flex gap-2 h-8">
                        <span className="w-8 flex justify-center items-center font-semibold text-surface50 flex-shrink-0">{i + 1}</span>
                        <button className="px-2 flex items-center justify-between rounded-sm whitespace-pre-wrap flex-grow min-w-0 bg-surface10 border border-surface20 group hover:bg-tonal0" onClick={() => window.dispatchEvent(new CustomEvent('force-set-search', { detail: p.word }))}>
                            <div className="flex-grow flex justify-start">
                                <span className="mr-4 font-semibold min-w-32 text-left">{p.word[0].toUpperCase() + p.word.substring(1)}</span>
                                <span>/{p.pronunciation}/</span>
                            </div>
                            <i className="ri-arrow-right-s-fill ri-lg group-hover:translate-x-2 transition-transform"></i>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
