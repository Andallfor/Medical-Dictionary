import { InferGetStaticPropsType } from "next";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

// https://tfcs.baruch.cuny.edu/introduction-to-vowels/
const Vowels: Record<string, string[]> = {
    'front': ['i', 'ɪ', 'e', 'ɛ', 'æ'],
    'back': ['u', 'ʊ', 'o', 'ɑ', 'ɔ'],
    'central': ['ʌ', 'ə', 'ɚ'],
    'diphthong': ['ɑɪ', 'ɑʊ', 'ɔɪ']
};

const vowelToPrint: Record<string, string> = {
    'front': 'Front',
    'back': 'Back',
    'central': 'Central',
    'diphthong': 'Diphthong'
};

interface phonetic {
    word: string,
    vowelCombo: string[] // is primary stress backwards including only vowels
    pronunciation: string
}

export function VowelCombo({ vowel, setVowel }: { vowel: string | undefined, setVowel: (s: string | undefined) => void }) {
    return (
        <div className="bg-tonal0 rounded-sm grid-cols-2 grid">
            {Object.entries(Vowels).map(([key, v], i) => 
                <div key={i} className="flex">
                    <span className="mx-2 font-semibold">{vowelToPrint[key]}:</span>
                    {v.map((c, j) => 
                        <button key={j}
                            className={"flex-grow cursor-pointer flex justify-center rounded-sm " + (vowel == c ? 'bg-[#79bd92] text-tonal10 font-semibold' : '')}
                            onClick={() => setVowel(vowel == c ? undefined : c)}>
                            <p>{c}</p>
                        </button>
                    )}
                </div>
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

            lines.forEach((line) => {
                if (line.length == 0) return;

                const [word, pron] = line.split('=');
                const primary = pron.includes('ˈ') ? pron.split('ˈ')[1] : pron;
                
                phonetics.push({
                    word: word,
                    vowelCombo: [...primary.matchAll(matchVowels)].map(x => x[0] as string).toReversed(),
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

        const valid: phonetic[] = [];
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

        setFocused(valid);
    }

    function formatSearch() {
        return vowels.toReversed().map((v) => v == undefined ? '' : ` * ${v}`);
    }

    return (
        <div className="flex flex-col gap-2">
            <VowelCombo vowel={vowels[0]} setVowel={(s) => updateCombo(0, s)}/>
            <VowelCombo vowel={vowels[1]} setVowel={(s) => updateCombo(1, s)}/>
            <VowelCombo vowel={vowels[2]} setVowel={(s) => updateCombo(2, s)}/>
            <button className="w-full rounded-md mb-3 text-lg bg-tonal0 hover:bg-tonal0/70 border border-surface20" onClick={search}>
                <span>Search: </span>
                <span className="font-semibold">{formatSearch()}</span>
            </button>
            <div className="flex flex-col gap-2 py-3 pl-2 pr-5 bg-tonal0 rounded-lg">
                <div className="ml-1">{focused.length == 0 ? 'No Results.' : `${focused.length} Results:`}</div>
                {focused.map((p, i) => 
                    <div key={i} className="flex gap-2 h-8">
                        <span className="w-8 flex justify-center items-center font-semibold text-surface50 flex-shrink-0">{i + 1}</span>
                        <span className="px-2 flex items-center rounded-sm whitespace-pre-wrap flex-grow min-w-0 bg-surface10 border border-surface20">
                            <span className="mr-4 font-semibold">{p.word[0].toUpperCase() + p.word.substring(1)}:</span>
                            <span>{p.pronunciation}</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
