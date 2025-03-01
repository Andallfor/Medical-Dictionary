import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { ConsonantOrder, ConsonantSearch, VowelOrder, branchState, phoneme, r_tail_c, r_vowel, readRegex, replacement, toStandardized } from "./constants";
import { PhoneticSearchController, PhoneticSearchControllerRef } from "./search";

export function toIpa(str: string, base: RegExp, rep: Record<string, replacement[]>, joinedReg: RegExp) {
    str = str.replaceAll(base, (v) => toStandardized[v] as string);

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

export function formatConversion() {
    const keys = Object.keys(toStandardized).sort((a, b) => a.length - b.length);
    const base: Record<string, string> = {};
    const rep: Record<string, replacement[]> = {};

    keys.forEach(k => {
        if (typeof toStandardized[k] == 'string') base[k] = toStandardized[k] as string;
        else rep[k] = toStandardized[k] as replacement[];
    });

    const reg = new RegExp([...Object.keys(base)].sort((a, b) => b.length - a.length).join('|'), 'g');
    const joinedReg = new RegExp([...Object.keys(VowelOrder), ...Object.keys(rep)].sort((a, b) => b.length - a.length).join('|'));
    return [reg, rep, joinedReg];
}

export default function PhoneticTree({ data }: { data: phoneme[] }) {
    // search results
    const [focused, setFocused] = useState<phoneme[]>([]);
    const [searchStr, setSearchStr] = useState<(string | undefined)[]>([]);

    // tree state
    const [vowelState, setVowelStates] = useState<branchState[]>([]);
    const [consonantState, setConsonantState] = useState<branchState[]>([]);
    const vowelRef = useRef<PhoneticSearchControllerRef>(null);
    const consonantRef = useRef<PhoneticSearchControllerRef>(null);

    function formatSearch() {
        let out = searchStr.map((s) => s ? ('* ' + s) : '').join(' ');
        return out.length != 0 ? ("'" + out) : "";
    }

    function search() {
        // [vowels... consonant?]
        const pattern: (string | undefined)[] = [];
        vowelState.forEach(v => { if (v.phoneme) pattern.push(v.phoneme) });
        pattern.push(consonantState[0].phoneme == 'None' ? '' : consonantState[0].phoneme);

        // ensure we pattern is different
        if (pattern.length == searchStr.length && pattern.reduce((a, x, i) => a && (x == searchStr[i]), true)) return;
        setSearchStr(pattern);

        // find all matching words
        let valid: phoneme[] = [];
        data.forEach(p => {
            // word has enough vowels && vowels and const match
            let isValid = p.primary.vowels.length >= pattern.length - 1 && 
                pattern.reduce((a, x, i) => a && ((i == pattern.length - 1)
                    ? (x == undefined) || (x == p.primary.consonants.tail) // undefined = match all
                    : x == p.primary.vowels[i]),
                true);

            if (isValid) valid.push(p);
        });

        valid.sort((a, b) => {
            const av = a.primary.vowels;
            const bv = b.primary.vowels;

            for (let i = 0; i < Math.max(av.length, bv.length); i++) {
                // TODO: currently we prioritize exact matches
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
        const [pron, shouldSearch] = event.detail as [string, boolean];

        // could also pull this info from internal dictionary if it exists
        const primary = pron.includes('ˈ') ? pron.split('ˈ')[1] : pron;
        const vowels = [...primary.matchAll(r_vowel)].map(x => x[0] as string);
        const tailCon = readRegex(primary.match(r_tail_c));

        vowelRef.current.update(vowels);
        consonantRef.current.update([tailCon.length == 0 ? 'None' : tailCon]);

        if (shouldSearch) search();
    }

    useEffect(() => {
        window.addEventListener('phonetic-tree-external-search', handleExternalSearch);
        return () => window.removeEventListener('phonetic-tree-external-search', handleExternalSearch);
    }, [consonantState, vowelState, data]);

    return (
        <div className="flex gap-6">
            <div>
                <div className="flex gap-4">
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
            <div className="flex flex-col gap-2 py-3 pl-2 pr-5 bg-tonal0 rounded-lg flex-grow">
                <div className="ml-1">{
                    searchStr.length == 0 ? 'No query.' :
                        <span>Found {focused.length}{focused.length >= 200 ? '+' : ''} matches for <span className="font-semibold">/{formatSearch()}/:</span></span>
                }</div>
                {focused.map((p, i) => 
                    <div key={i} className="flex gap-2 h-8">
                        <span className="w-8 flex justify-center items-center font-semibold text-surface50 flex-shrink-0">{i + 1}</span>
                        <button className="px-2 flex items-center justify-between rounded-sm whitespace-pre-wrap flex-grow min-w-0 bg-surface10 border border-surface20 group hover:bg-tonal0" onClick={() => window.dispatchEvent(new CustomEvent('force-set-file-search', { detail: [p.word, false] }))}>
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
