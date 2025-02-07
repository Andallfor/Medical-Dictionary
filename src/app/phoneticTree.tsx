import { InferGetStaticPropsType } from "next";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

// https://tfcs.baruch.cuny.edu/introduction-to-vowels/
const Vowels: Record<string, string[]> = {
    'front': ['i', 'ɪ', 'e', 'ɛ', 'æ'],
    'back': ['u', 'ʊ', 'o', 'ɑ', 'ɔ'],
    'central': ['ʌ', 'ə', 'ɚ'],
    'diphthong': ['aɪ', 'aʊ', 'ɔɪ']
};

const vowelToPrint: Record<string, string> = {
    'front': 'Front',
    'back': 'Back',
    'central': 'Central',
    'diphthong': 'Diphthong'
};

// dont question it
const VowelOrder: Record<string, number> = {
    'i': 0,
    'ɪ': 1,
    'e': 2,
    'ɛ': 3,
    'æ': 4,
    'ə': 5,
    'ɚ': 6,
    'ʌ': 7,
    'u': 8,
    'ʊ': 9,
    'o': 10,
    'ɔ': 11,
    'ɑ': 12, 'ɒ': 12, 'a': 12,
    'ɑɪ': 13,
    'ɑʊ': 14,
    'ɔɪ': 15,
};

const ConsonantOrder: Record<string, number> = {
    'm': 0,
    'p': 1, 'pl': 1, 'pr': 1,
    'b': 2, 'bl': 2, 'br': 2,
    'n': 3, 'ŋ': 3,
    't': 4, 'tr': 4,
    'd': 5, 'dr': 5,
    'k': 6, 'kl': 6, 'kr': 6,
    'kw': 7, 'kj': 7,
    'g': 8, 'gl': 8, 'gr': 8,
    'f': 9, 'fl': 9, 'fr': 9,
    'v': 10,
    'l': 11,
    'r': 12,
    's': 13, 'sl': 13, 'sp': 13, 'st': 13, 'str': 13, 'sk': 13, 'sw': 13,
    'z': 14,
    'x': 15,
    'ʃ': 16,
    'ð': 17,
    'θ': 18,
    'ʒ': 19,
    'dʒ': 20,
    'h': 21,
    'w': 22,
    'ʍ': 23,
    'j': 24,
    '-': 100 // override for no consonant
}

interface phonetic {
    word: string,
    vowelCombo: string[], // is primary stress backwards including only vowels
    primaryConst: string,
    tailConst: string,
    pronunciation: string
}

export function VowelCombo({ vowel, setVowel }: { vowel: string | undefined, setVowel: (s: string | undefined) => void }) {
    return (
        <div className="bg-tonal0 rounded-sm flex flex-col w-10">
            {Object.entries(Vowels).map(([key, v], i) => {
                return (v.map((c, j) => 
                    <button key={j}
                        className={"cursor-pointer rounded-sm py-0.5 " + (vowel == c ? 'bg-[#79bd92] text-tonal10 font-semibold' : 'hover:bg-surface20')}
                        onClick={() => setVowel(vowel == c ? undefined : c)}>
                        <p>{c}</p>
                    </button>
                ))}
            )}
        </div>
    );
}

export default function PhoneticTree() {
    const [vowels, setVowels] = useState<(string | undefined)[]>([]);
    const [data, setData] = useState<phonetic[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [focused, setFocused] = useState<phonetic[]>([]);

    useEffect(() => {
        if (loaded) return;
        setLoaded(false);
        // https://observablehq.com/@mbostock/fetch-utf-16
        fetch('/data.txt').then(response => response.arrayBuffer()).then(buffer => {
            const lines = new TextDecoder('utf-16le').decode(buffer).substring(1).split('\n'); // skip bom
            const phonetics: phonetic[] = [];

            const matchVowels = new RegExp([...Vowels['diphthong'], ...Vowels['central'], ...Vowels['back'], ...Vowels['front']].join('|'), 'g');
            const matchConstants = new RegExp(Object.keys(ConsonantOrder).sort((a, b) => b.length - a.length).join('|'), 'g');

            lines.forEach((line) => {
                if (line.length == 0) return;

                const [word, pron] = line.split('=');
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
    }, [])

    function updateCombo(ind: number, s: string | undefined) {
        const c = [...vowels];
        c[ind] = s;
        setVowels(c);
    }

    function search() {
        const pattern: string[] = [];
        vowels.forEach(v => {
            if (v) pattern.push(v)
        });

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

        setFocused(valid);
    }

    function formatSearch() {
        let out = vowels.map((v) => v == undefined ? '' : ` * ${v}`).join('');
        return out.length != 0 ? ("'" + out) : "";
    }

    return (
        <div className="flex gap-2 justify-between">
            <VowelCombo vowel={vowels[0]} setVowel={(s) => updateCombo(0, s)}/>
            {/* <VowelCombo vowel={vowels[1]} setVowel={(s) => updateCombo(1, s)}/>
            <VowelCombo vowel={vowels[2]} setVowel={(s) => updateCombo(2, s)}/>
            <button className="w-full rounded-md mb-3 text-lg bg-tonal0 hover:bg-tonal0/70 border border-surface20" onClick={search}>
                <span>Search: </span>
                <span className="font-semibold">{formatSearch()}</span>
            </button>*/}
            <div className="flex flex-col gap-2 py-3 pl-2 pr-5 bg-tonal0 rounded-lg">
                <div className="ml-1">{focused.length == 0 ? 'No Results.' : `${focused.length} Results:`}</div>
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
