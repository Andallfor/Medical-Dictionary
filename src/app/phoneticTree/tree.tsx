import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { ConsonantOrder, ConsonantSearch, Stress, Token, TokenType, Tokenization, VowelOrder, Word, branchState, phoneme, r_tail_c, r_vowel, readRegex } from "./constants";
import { PhoneticSearchController, PhoneticSearchControllerRef } from "./search";

export default function PhoneticTree({ data }: { data: Word[] }) {
    // TODO: branch state should also use tokens!

    // search results
    const [focused, setFocused] = useState<Word[]>([]);
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
        if (searchStr.length == 0) return "sound selection";

        let out = searchStr.map((s) => s == undefined ? '*' : s == '' ? '' : ('* ' + s)).join(' ');
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

        // ensure the pattern is different
        if (!force && searchStr != undefined &&
            pattern.length == searchStr.length && pattern.reduce((a, x, i) => a && (x == searchStr[i]), true)) return;
        setSearchStr(pattern);

        // given pattern as string array [str1, str2, str3]
        // the desired regex is * str1 * str2 * str3
        // where * means any consonant any number of times (no vowels!) 
        // if the last element is undefined, it means any consonant any number of times and at most one vowel
        // note that we only match against the primary syllable of the word

        // unfortunately we can't use regex for this because we need a
        // non-greedy match everything except for vowels expect for the exact vowel we want

        const valid = data.filter((p) => {
            // if (p.pronunciation?.shouldDelete) return false;
            if (p.word == requestExact) return true; // exact match

            if (pattern.length == 0) return p.pronunciation == undefined; // strict empty
            else {
                if (p.pronunciation == undefined) return false;

                // start search at primary stress
                const tokens = p.pronunciation.tokens;
                let index = tokens.findIndex(x => x.instance.stress & Stress.primary);
                
                if (index == -1) {
                    console.warn(`Word ${p.word} (${p.pronunciation.text}) has no stress!`, p.pronunciation);
                    return false;
                }

                let i = 0;
                for (; i < pattern.length; i++) {
                    const pat = pattern[i];
                    let vowelAllowance = 0;

                    // no asterisk
                    if (pat == "") continue;

                    if (pat == undefined) {
                        // we want undefined to match any number of consonants and at most one vowel
                        // we also assume that undefined is at the very end
                        if (i != pattern.length - 1) console.warn(`Phonetic tree pattern ${pattern.join(', ')} has non-terminating undefined`);
                        vowelAllowance = 1;
                    }

                    // consume tokens until we hit our match or run out of vowel allowance
                    let valid = false;
                    for (; index < tokens.length; index++) {
                        if (pat != undefined && tokens[index].equals(pat)) {
                            index++;
                            valid = true;
                            break;
                        }
                        if (tokens[index].type == TokenType.vowel && vowelAllowance-- <= 0) return false;
                    }

                    if (pat != undefined && !valid) return false;
                }

                // we need to have consumed all tokens (above loop automatically checks if we consume the entire pattern)
                // >= because if we match on last token index gets incremented
                return index >= tokens.length;
            }
        });

        const vowelMap: Record<string, number> = {};
        const consonantMap: Record<string, number> = {};
        Tokenization.knownTokens.forEach((t, i) => {
            if (t.type == TokenType.consonant) consonantMap[t.id] = i;
            else if (t.type == TokenType.vowel) vowelMap[t.id] = i;
        });

        // dont sort if no pronunciation
        if (pattern.length != 0) valid.sort((a, b) => {
            // exact match first
            if (a.word == requestExact) return -1;
            if (b.word == requestExact) return 1;

            // TODO: probably should cache this somewhere
            const at = a.pronunciation!.tokens.filter(x =>
                x.instance.stress & Stress.primary &&
                !(x.type & (TokenType.primaryStress | TokenType.secondaryStress)));
            const bt = b.pronunciation!.tokens.filter(x =>
                x.instance.stress & Stress.primary &&
                !(x.type & (TokenType.primaryStress | TokenType.secondaryStress)));

            const av = at.filter(x => x.type == TokenType.vowel);
            const bv = bt.filter(x => x.type == TokenType.vowel);

            // sort by vowel
            const len = Math.max(av.length, bv.length);
            for (let i = 0; i < len; i++) {
                const ac = i >= av.length ? -1 : vowelMap[av[i].id];
                const bc = i >= bv.length ? -1 : vowelMap[bv[i].id];

                if (ac != bc) return ac - bc;
            }

            // sort by leading consonant
            // prioritize words with no leading consonant
            const ac = at[0].type == TokenType.consonant ? consonantMap[at[0].id] : -1;
            const bc = bt[0].type == TokenType.consonant ? consonantMap[bt[0].id] : -1;
            if (ac != bc) return ac - bc;

            // sort by tail consonant
            const al = at[at.length - 1];
            const bl = bt[bt.length - 1];
            return (
                al.type == TokenType.consonant ? consonantMap[al.id] : -1 - 
                bl.type == TokenType.consonant ? consonantMap[bl.id] : -1
            );
        });

        setFocused(valid.slice(0, 200));
    }

    // TODO: update to pass Word around, not string text
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
        } else noPronRef.current?.update(['Sound Selection']);

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
                    list: ["Sound Selection"]
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
                                    <span>/{p.pronunciation?.text ?? ''}/</span>
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
