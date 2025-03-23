import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { ConsonantOrder, ConsonantSearch, VowelOrder, branchState, phoneme, r_tail_c, r_vowel, readRegex, replacement, standardize, standardizeType } from "./constants";
import { PhoneticSearchController, PhoneticSearchControllerRef } from "./search";

export function toIpa(str: string, from: standardizeType) {
    const standard = standardize.get(from);
    const proc = standardize.getProcessed(from);

    const base = proc.base;
    const rep = proc.rep
    const joinedReg = proc.joinedReg;

    str = str.replaceAll(base, (v) => standard[v] as string);

    const ind = [...str.matchAll(new RegExp([...Object.keys(rep)].join('|'), 'g'))];
    const stressUnits = [...str.matchAll(/ˈ|ˌ/g)].map(x => x.index!);

    if (ind.length > 0) {
        // for each of these vowels, check if they are stressed or not
        // specifically, within the current stress unit find the first vowel and check if the index is the current
        ind.forEach((match) => {
            let isStressed = false;

            if (stressUnits.length == 0 || match.index! < stressUnits[0]) isStressed = false;    
            else {
                stressUnits.push(str.length - 1);
                for (let i = 1; i < stressUnits.length; i++) {
                    if (stressUnits[i] > match.index!) {
                        let ind = i - 1;
                        let found = str.substring(stressUnits[ind]).match(joinedReg)!.index!;
                        isStressed = found + stressUnits[ind] == match.index!
                        break;
                    }
                }
            }

            rep[match[0]].forEach(x => {
                if (x.whenStress == isStressed) {
                    str = str.substring(0, match.index!) + x.to + str.substring(match.index! + match[0].length);
                }
            });
        })
    }

    return str;
}

export default function PhoneticTree({ data }: { data: phoneme[] }) {
    // search results
    const [focused, setFocused] = useState<phoneme[]>([]);
    const [searchStr, setSearchStr] = useState<(string | undefined)[] | undefined>(undefined);

    // tree state
    const [vowelState, setVowelStates] = useState<branchState[]>([]);
    const [consonantState, setConsonantState] = useState<branchState[]>([]);
    const [noPronState, setNoPronState] = useState<branchState[]>([]);

    // ref
    const vowelRef = useRef<PhoneticSearchControllerRef>(null);
    const consonantRef = useRef<PhoneticSearchControllerRef>(null);
    const noPronRef = useRef<PhoneticSearchControllerRef>(null);

    function formatSearch() {
        if (!searchStr) return;
        if (searchStr.length == 0) return "no pronunciation";

        let out = searchStr.map((s) => s ? ('* ' + s) : '').join(' ');
        return out.length != 0 ? ("'" + out) : "";
    }

    function search(matchNoPron = false, requestExact = "", force = false) {
        // noPron and vowels/consonant should be mutually exclusive
        if (matchNoPron) {
            vowelRef.current?.update([]);
            consonantRef.current?.update([]);
        } else noPronRef.current?.update([]);

        // pattern: [vowels... consonant | undefined] or [] for noPron
        const pattern: (string | undefined)[] = [];
        if (!matchNoPron) {
            vowelState.forEach(v => { if (v.phoneme) pattern.push(v.phoneme) });
            if (consonantState[0].phoneme) {
                pattern.push(consonantState[0].phoneme == 'None' ? '' : consonantState[0].phoneme);
            } else pattern.push(undefined);
        }

        const tail = pattern[pattern.length - 1];

        // ensure the pattern is different
        if (!force && searchStr != undefined &&
            pattern.length == searchStr.length && pattern.reduce((a, x, i) => a && (x == searchStr[i]), true)) return;
        setSearchStr(pattern);

        // find all matching words
        const valid = data.filter((p) => {
            if (p.word == requestExact) return true; // exact match

            if (pattern.length == 0) return p.pronunciation.length == 0; // strict empty
            else {
                if (p.pronunciation.length == 0) return false;

                // this can be optimized to make use of short circuit eval
                const t = tail == undefined ? true : p.primary.consonants.tail == tail;
                let v = p.primary.vowels.length >= pattern.length - 1;
                for (let i = 0; i < pattern.length - 1; i++) v &&= p.primary.vowels[i] == pattern[i];

                return t && v;
            }
        });

        valid.sort((a, b) => {
            // exact match first
            if (a.word == requestExact) return -1;
            if (b.word == requestExact) return 1;

            const av = a.primary.vowels;
            const bv = b.primary.vowels;

            for (let i = 0; i < Math.max(av.length, bv.length); i++) {
                const ac = i >= av.length ? -1 : VowelOrder[av[i]];
                const bc = i >= bv.length ? -1 : VowelOrder[bv[i]];

                if (ac - bc != 0) return ac - bc;
            }

            // prioritize words with no leading consonant
            const alc = a.primary.consonants.leading.length == 0 ? -1 : ConsonantOrder[a.primary.consonants.leading];
            const blc = b.primary.consonants.leading.length == 0 ? -1 : ConsonantOrder[b.primary.consonants.leading];
            const pc = alc - blc;
            if (pc != 0) return pc;

            const tc = ConsonantOrder[a.primary.consonants.tail] - ConsonantOrder[b.primary.consonants.tail];
            return tc;
        });

        setFocused(valid.slice(0, 200));
    }

    function handleExternalSearch(e: Event) {
        if (!vowelRef.current || !consonantRef.current) return;

        const event = e as CustomEvent;
        const [word, pron] = event.detail as [string, string];

        if (pron != '') {
            const primary = pron.includes('ˈ') ? pron.split('ˈ')[1] : pron;
            const vowels = [...primary.matchAll(r_vowel)].map(x => x[0] as string);
            const tailCon = readRegex(primary.match(r_tail_c));

            vowelRef.current.update(vowels);
            consonantRef.current.update([tailCon.length == 0 ? 'None' : tailCon]);
        } else noPronRef.current?.update(['No Pronunciation']);

        search(pron == '', word.toLowerCase(), true);
    }

    function clear() {
        setFocused([]);
        setSearchStr(undefined);
        vowelRef.current?.update([]);
        consonantRef.current?.update([]);
        noPronRef.current?.update([]);
    }

    useEffect(() => {
        window.addEventListener('phonetic-tree-external-search', handleExternalSearch);
        return () => window.removeEventListener('phonetic-tree-external-search', handleExternalSearch);
    }, [consonantState, vowelState, data]);

    return (
        <div className="flex gap-6">
            <div className="flex flex-col gap-2">
                <PhoneticSearchController ref={noPronRef} num={1} props={{
                    states: noPronState,
                    setStates: setNoPronState,
                    search: () => search(true),
                    list: ["No Pronunciation"]
                }} customization={{ width: 'w-full' }}/>
                <div className="flex gap-2">
                    <PhoneticSearchController ref={vowelRef} num={4} props={{
                        states: vowelState,
                        setStates: setVowelStates,
                        search: search,
                        list: Object.keys(VowelOrder),
                    }} customization={{
                        width: 'w-8'
                    }}/>
                    <PhoneticSearchController ref={consonantRef} num={1} props={{
                        states: consonantState,
                        setStates: setConsonantState,
                        search: search,
                        list: ConsonantSearch
                    }} customization={{
                        width: 'w-12'
                    }}/>
                </div>
            </div>
            <div className="flex flex-col pl-2 pr-5 bg-tonal0 rounded-lg flex-grow">
                <div className="pl-1 sticky top-0 bg-tonal0 pt-3 pb-2">{
                    searchStr == undefined ? 'No query.' :
                        <div className="flex justify-between">
                            <span>Found {focused.length}{focused.length >= 200 ? '+' : ''} matches for <span className="font-semibold">/{formatSearch()}/:</span></span>
                            <button onClick={clear}>
                                <i className="ri-close-line button"></i>
                            </button>
                        </div>
                }</div>
                <div className="flex flex-col gap-2 pb-4">
                    {focused.map((p, i) => 
                        <div key={i} className="flex gap-2 h-8">
                            <span className="number">{i + 1}</span>
                            <button className="line group" onClick={() => window.dispatchEvent(new CustomEvent('force-set-file-search', { detail: [p.word, false] }))}>
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
        </div>
    );
}
