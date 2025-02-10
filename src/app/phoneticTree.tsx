import { InferGetStaticPropsType } from "next";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

// all vowels and consonants are IPA (unless otherwise noted)
const VowelOrder: Record<string, number> = {
    'i': 0,
    'ɪ': 1,
    'e': 2,
    'ɛ': 3,
    'æ': 4,
    'ə': 5,
    'ʌ': 6,
    'ɚ': 7,
    'u': 8,
    'ʊ': 9,
    'o': 10,
    'ɔ': 11,
    'ɔr': 12,
    'a': 13,
    'ar': 14,
    'aɪ': 15,
    'ɔɪ': 16,
    'aʊ': 17,
    'iər': 18,
    'ɛər': 19,
    'ʊər': 20,
};

// empty string means same
const oedToIpa: Record<string, string> = {
    'ɪ(ə)r': 'iər',
    'ɛ(ə)r': 'ɛər',
    'ʊ(ə)r': 'ʊər',
    'eɪ': 'e',
    'ər': 'ɚ',
    'oʊ': 'o',
    'ɑr': 'ar',
    'kl': 'cl',
    'kr': 'cr',
    'kj': 'ky',
    'tʃ': 'ch',
    'dʒ': 'j',
    'ɑ': 'a',
    'ɑ̃': 'an',
    'æ̃': 'n',
    'ᵻ': 'ɪ',
    'ᵿ': 'ə',
    'ŋ': 'ng',
    'x': 'k',
    'ʃ': 'sh',
    'ð': 'th',
    'θ': 'th',
    'ʒ': 'zh',
};

const ConsonantOrder: Record<string, number> = {
    'm': 0,
    'p': 1, 'pl': 1, 'pr': 1,
    'b': 2, 'bl': 2, 'br': 2,
    'n': 3, 'ng': 3,
    't': 4, 'tr': 4,
    'd': 5, 'dr': 5,
    'k': 6, 'cl': 6, 'cr': 6,
    'kw': 7, 'kj': 7,
    'g': 8, 'gl': 8, 'gr': 8,
    'f': 9, 'fl': 9, 'fr': 9,
    'v': 10,
    'l': 11,
    'r': 12,
    's': 13, 'sl': 13, 'sp': 13, 'st': 13, 'str': 13, 'sk': 13, 'sw': 13,
    'z': 14,
    'sh': 15,
    'ch': 16,
    'th': 17,
    'zh': 18,
    'j': 19,
    'h': 20,
    'w': 21,
    'wh': 22,
    'y': 23,
    '-': 100 // override for no consonant
}

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

interface phonetic {
    word: string,
    vowelCombo: string[], // is primary stress backwards including only vowels
    primaryConst: string,
    tailConst: string,
    pronunciation: string
}

interface comboState {
    ind: number;
    active: boolean;
    autoSearch: boolean;
    shouldSearch: boolean;
    vowel: string | undefined;
}

export function VowelCombo({ state, setVowel, notifySearch }: { state: comboState, setVowel: (s: string | undefined) => void, notifySearch: () => void }) {
    const [clicks, setClicks] = useState(0);

    function handleClick(v: string) {
        setTimeout(() => setClicks(0), 250);
        if (clicks == 0) {
            setClicks(1);
            setVowel(v == state.vowel ? undefined : v);

            if (state.autoSearch) notifySearch();
        } else {
            if (v != state.vowel) setVowel(v);
            if (!state.autoSearch || !state.shouldSearch) notifySearch(); // dont retrigger
        }
    }

    function buttonStyle(v: string) {
        if (state.active) {
            return state.vowel == v
            ? 'text-tonal10 font-semibold ' + (state.shouldSearch ? 'bg-red-500' : 'bg-[#79bd92]')
            : 'hover:bg-surface20';
        } else {
            return 'pointer-events-none';
        }
    }

    return (
        <div className={"rounded-sm flex flex-col w-10 " + (state.active ? 'bg-tonal0' : 'bg-surface10 text-tonal20')}>
            {Object.keys(VowelOrder).map((v, k) =>
                <button key={k}
                    className={"cursor-pointer rounded-sm py-0.5 " + buttonStyle(v)}
                    onClick={() => handleClick(v)}>
                    <p>{v}</p>
                </button>
            )}
        </div>
    );
}

export default function PhoneticTree() {
    const [data, setData] = useState<phonetic[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [focused, setFocused] = useState<phonetic[]>([]);
    const [vowelState, setVowelStates] = useState<comboState[]>([]);
    const [searchStr, setSearchStr] = useState<string[]>([]);

    useEffect(() => {
        if (vowelState.length != 3) {
            const state: comboState[] = [];
            for (let i = 0; i < 3; i++) {
                state.push({
                    active: i == 0,
                    autoSearch: i == 2,
                    shouldSearch: false,
                    ind: i,
                    vowel: undefined,
                });
            }

            setVowelStates(state);
        }

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

    function updateCombo(ind: number, s: string | undefined) {
        const state = [...vowelState];
        state[ind].vowel = s;
        state[ind].shouldSearch = false;

        if (!s) {
            for (let i = ind + 1; i < state.length; i++) {
                state[i].active = false;
                state[i].vowel = undefined;
            }
        } else {
            if (ind + 1 < state.length) state[ind + 1].active = true;
            for (let i = 0; i < ind; i++) state[i].shouldSearch = false;
        }

        setVowelStates(state);
    }

    function notifySearch(ind: number) {
        const state = [...vowelState];
        for (let i = 0; i < state.length; i++) {
            if (i != ind) state[i].shouldSearch = false;
            if (i > ind) state[i].vowel = undefined;
        }

        state[ind].shouldSearch = true;

        setVowelStates(state);
        search();
    }

    function formatSearch() {
        let out = searchStr.map((s) => '* ' + s).join(' ');
        return out.length != 0 ? ("'" + out) : "";
    }

    function search() {
        const pattern: string[] = [];
        vowelState.forEach(v => {
            if (v.vowel) pattern.push(v.vowel)
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
                <div className="flex gap-2">
                    {vowelState.length == 3 ? <>
                        <VowelCombo state={vowelState[0]} setVowel={(s) => updateCombo(0, s)} notifySearch={() => notifySearch(0)}/>
                        <VowelCombo state={vowelState[1]} setVowel={(s) => updateCombo(1, s)} notifySearch={() => notifySearch(1)}/>
                        <VowelCombo state={vowelState[2]} setVowel={(s) => updateCombo(2, s)} notifySearch={() => notifySearch(2)}/>
                    </> : <></>}
                </div>
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
