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
    stress: string[] // is primary stress backwards including only vowels
}

export function VowelCombo({ vowel, setVowel }: { vowel: string | undefined, setVowel: (s: string | undefined) => void }) {
    return (
        <div className="bg-gray-200 rounded-sm outline outline-1 outline-black grid-cols-2 grid">
            {Object.entries(Vowels).map(([key, v], i) => 
                <div key={i} className="flex">
                    <span className="mx-2 font-semibold">{vowelToPrint[key]}:</span>
                    {v.map((c, j) => 
                        <button key={j}
                            className={"flex-grow cursor-pointer flex justify-center " + (vowel == c ? 'bg-green-300' : 'bg-gray-200')}
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

    useEffect(() => {
        if (loaded) return;
        setLoaded(false);
        // https://observablehq.com/@mbostock/fetch-utf-16
        fetch('/data.txt').then(response => response.arrayBuffer()).then(buffer => {
            const lines = new TextDecoder('utf-16le').decode(buffer).split('\n');
            const phonetics: phonetic[] = [];

            const matchVowels = new RegExp([...Vowels['diphthong'], ...Vowels['central'], ...Vowels['back'], ...Vowels['front']].join('|'), 'g');

            lines.forEach((line) => {
                if (line.length == 0) return;

                const [word, pron] = line.split('=');
                const primary = pron.includes('ˈ') ? pron.split('ˈ')[1] : pron;
                
                phonetics.push({
                    word: word,
                    stress: [...primary.matchAll(matchVowels)].map(x => x[0] as string).toReversed()
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

    return (
        <div className="flex flex-col gap-2">
            <VowelCombo vowel={vowels[0]} setVowel={(s) => updateCombo(0, s)}/>
            <VowelCombo vowel={vowels[1]} setVowel={(s) => updateCombo(1, s)}/>
            <VowelCombo vowel={vowels[2]} setVowel={(s) => updateCombo(2, s)}/>
            <button className="w-full bg-gray-100 hover:bg-gray-200 outline outline-1 outline-black rounded-sm mt-3 text-lg">
                <span>Search: </span>
                <span className="font-semibold">{vowels.map((v) => v == undefined ? '' : ` * ${v}`)}</span>
            </button>
        </div>
    );
}
