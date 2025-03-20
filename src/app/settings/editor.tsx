import { ChangeEvent, KeyboardEventHandler, use, useEffect, useRef, useState } from "react";
import { phoneme } from "../phoneticTree/constants";

function SymbolPicker({ update }: { update: (s: string) => void }) {
    const vowels = [['i', 'ɪ', 'e', 'ɛ', 'ə', 'ʌ', 'əː'], ['u', 'ʊ', 'o', 'ɔ', 'ɔr', 'a', 'ar'], ['aɪ', 'ɔɪ', 'aʊ', 'iɚ', 'ɔr', 'ɛɚ', 'ʊɚ']];
    const consonants = [['th̥', 'th̬', 'ˌ', 'ˈ']];
    // const diacritics = [['́', '̃', '̄']] // https://symbl.cc/en/unicode-table/#combining-diacritical-marks
    // support (combining) diacritics is difficult because JS lacks unicode normalization by default

    function map(table: string[][]) {
        return table.map((x, i) => 
            <div key={i} className="flex gap-1 my-1">
                {x.map((y, k) => <button key={k} className="button" onMouseDown={() => update(y)}>{y}</button>)}
            </div>);
    }

    return (
        <div className="mt-2">
            <div className="font-semibold">Vowels</div>
            {map(vowels)}
            <div className="mt-2 font-semibold">Consonants/Misc.</div>
            {map(consonants)}
        </div>
    );
}

function Line({ index, data, fn }: { index: number, data: lineData, fn: lineFn }) {
    const [searchFailed, setSearchFailed] = useState(false);
    const wordRef = useRef<HTMLInputElement>(null);
    const pronRef = useRef<HTMLInputElement>(null);

    function wrapWord(e: ChangeEvent<HTMLInputElement>) {
        fn.update(index, {word: e.target.value, pron: data.edit.pron}, false);
    }

    function wrapPron(e: ChangeEvent<HTMLInputElement>) {
        fn.update(index, {word: data.edit.word, pron: e.target.value}, true);
    }

    function trySubmit(k: React.KeyboardEvent<HTMLInputElement>, shouldSearch = false) {
        if (k.key == 'Enter') {
            wordRef.current?.blur();
            pronRef.current?.blur();

            if (shouldSearch) search();
        }
    }

    function search() {
        setSearchFailed(fn.search(index));
        setTimeout(() => setSearchFailed(false), 2000);
    }

    function isFilled() {
        if (!pronRef.current || !wordRef.current) return true;

        const p = pronRef.current.value.trim();
        const w = wordRef.current.value.trim();
        
        if (p.length > 0 && w.length == 0) return false;
        return true;
    }

    return (
        <div className="flex gap-2 h-7">
            <div className={"line hover:bg-surface10 " + (isFilled() ? '' : 'outline-1 outline-red-500 outline')}>
                <input className="w-1/2 bg-surface10 outline-none placeholder:italic"
                    placeholder="Enter Word" ref={wordRef} value={data.edit.word}
                    onFocus={() => fn.setFocus(index, false)}
                    onChange={wrapWord}
                    onKeyDown={(e) => trySubmit(e, true)}
                    onBlur={() => fn.clearSelected(wordRef.current ?? undefined)}
                />
                <input className="w-1/2 bg-surface10 outline-none placeholder:italic"
                    placeholder="Pronunciation" ref={pronRef} value={data.edit.pron}
                    onFocus={() => fn.setFocus(index, true)}
                    onChange={wrapPron}
                    onKeyDown={trySubmit}
                    onBlur={() => fn.clearSelected(pronRef.current ?? undefined)}
                />
            </div>
            <button className={"ri-file-search-line button outline-1 outline-red-500 " + (searchFailed ? 'outline' : '')} onClick={search}></button>
            <button className="ri-close-line button" onClick={() => fn.update(index, {word: '', pron: ''})}></button>
        </div>
    );
}

interface lineFn {
    update: (index: number, d: lineEditData, isPron?: boolean) => void;
    clearSelected: (s: HTMLInputElement | undefined) => void;
    setFocus: (index: number, isPron: boolean) => void;
    search: (index: number) => boolean;
}

interface lineEditData {
    word: string;
    pron: string;
}

interface lineData {
    edit: lineEditData;
    id: number;
}

interface lineSelection {
    index: number;
    isPron: boolean;
}

export function DictionaryEditor({ dictionary }: { dictionary: phoneme[] }) {
    const [lines, setLines] = useState<lineData[]>([emptyLine()]);
    const [selected, setSelected] = useState<lineSelection>({index: -1, isPron: false});
    const [preventSelectionClear, setPrevention] = useState(false);

    function isEmpty(l: lineEditData) { return l.pron == '' && l.word == ''; }

    function setLine(index: number, data: lineEditData, isPron?: boolean) {
        const l = [...lines];
        l[index].edit = data;

        if (isEmpty(data) && index != l.length - 1) l.splice(index, 1);
        if (index == lines.length - 1 && !isEmpty(data)) l.push(emptyLine()); // editing last line should auto add new one

        setLines(l);
        if (isPron) setSelected({index: index, isPron: isPron});
    }

    function clearSelected(self: HTMLInputElement | undefined) {
        if (preventSelectionClear) {
            setPrevention(false);
            setTimeout(() => self?.focus(), 10);
        } else setSelected({index: -1, isPron: false});
    }

    function addSymbol(symbol: string) {
        if (selected.index != -1) {
            const l = [...lines];
            if (selected.isPron) l[selected.index].edit.pron += symbol;
            else l[selected.index].edit.word += symbol;

            if (selected.index == lines.length - 1) l.push(emptyLine()); // editing last line should auto add new one

            setPrevention(true);
            setLines(l);
        }
    }

    function search(index: number) {
        const w = lines[index].edit.word.toLowerCase();
        if (w.length != 0) {
            const d = dictionary.find((x) => x.word == w);
            if (d) {
                const l = [...lines];
                l[index].edit.pron = d.pronunciation;
                setLines(l);

                return false;
            }
        }

        return true;
    }

    function emptyLine(): lineData {
        return {
            edit: {
                word: '',
                pron: '',
            },
            id: Date.now()
        };
    }

    return (
        <div className="mt-2">
            <div>Edit Words:</div>
            <div className="flex">
                <div className="bg-surface20 w-[2px] mx-2"></div>
                <div className="flex-grow flex flex-col gap-2">
                    <div className="flex flex-grow-0 gap-2">
                        <button className="button-text px-2 disabled:bg-tonal0 disabled:cursor-not-allowed" disabled={lines[0].edit.word.length == 0}>Submit Words</button>
                        <button className="button-text px-2">Clear All</button>
                    </div>
                    {lines.map((x, k) => {
                        return (<Line key={x.id} index={k} data={x} fn={{
                            update: setLine,
                            clearSelected: clearSelected,
                            setFocus: (i, p) => setSelected({index: i, isPron: p}),
                            search: search
                        }}/>);
                    }
                    )}
                </div>
                <div className="w-8"></div>
                <SymbolPicker update={addSymbol}/>
            </div>
        </div>
    )
}