import { ChangeEvent, KeyboardEventHandler, use, useEffect, useRef, useState } from "react";
import { phoneme } from "../phoneticTree/constants";

// look the majority of this code was written at like ~3am across multiple days so excuse the mess

function SymbolPicker({ update }: { update: (s: string) => void }) {
    const vowels = [['i', 'ɪ', 'e', 'ɛ', 'ə', 'ʌ', 'əː'], ['u', 'ʊ', 'o', 'ɔ', 'ɔr', 'a', 'ar'], ['aɪ', 'ɔɪ', 'aʊ', 'iɚ', 'ɔr', 'ɛɚ', 'ʊɚ']];
    const consonants = [['th̥', 'th̬', 'ɣ', 'ʃ', 'ð', 'ˌ', 'ˈ']];
    // const diacritics = [['́', '̃', '̄']] // https://symbl.cc/en/unicode-table/#combining-diacritical-marks
    // support (combining) diacritics is difficult because JS lacks unicode normalization by default
    // which means there is difference between á and á (second one is with combining acute)

    function map(table: string[][]) {
        return table.map((x, i) => 
            <div key={i} className="flex gap-1 my-1">
                {x.map((y, k) => <button key={k} className="button" onMouseDown={() => update(y)}>{y}</button>)}
            </div>);
    }

    return (
        <div>
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
        fn.update(index, {word: e.target.value, pron: data.edit.pron});
    }

    function wrapPron(e: ChangeEvent<HTMLInputElement>) {
        fn.update(index, {word: data.edit.word, pron: e.target.value});
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

    return (
        <div className="flex gap-2 h-7">
            <div className={"line hover:bg-surface10 " + (fn.valid(index) ? '' : 'outline-1 outline-red-500 outline')}>
                <input className="w-1/2 bg-surface10 outline-none placeholder:italic mr-1"
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
            <button className={"ri-file-search-line button outline-1 outline-red-500 " + (searchFailed ? 'outline' : '')} onClick={search} title="Search for pronunciation." />
            <button className={"button outline-1 outline-red-500 " + (data.shouldDelete ? 'ri-eraser-fill outline' : 'ri-pencil-fill')} onClick={() => fn.toggleDeletion(index)}/>
            <button className="ri-close-line button" onClick={() => fn.update(index, {word: '', pron: ''})} title="Clear line." />
        </div>
    );
}

interface lineFn {
    update: (index: number, d: lineEditData) => void;
    clearSelected: (s: HTMLInputElement | undefined) => void;
    setFocus: (index: number, isPron: boolean) => void;
    search: (index: number) => boolean;
    valid: (index: number) => boolean;
    toggleDeletion: (index: number) => void;
}

export interface lineEditData {
    word: string;
    pron: string;
}

export interface lineData {
    edit: lineEditData;
    id: number;
    shouldDelete: boolean;
}

interface lineSelection {
    index: number;
    isPron: boolean;
}

export function DictionaryEditor({ dictionary, update }: { dictionary: phoneme[], update: (l: lineData[]) => void }) {
    const [lines, setLines] = useState<lineData[]>([emptyLine()]);
    const [selected, setSelected] = useState<lineSelection>({index: -1, isPron: false});
    const [preventSelectionClear, setPrevention] = useState(false);

    function isEmpty(l: lineEditData) { return l.pron == '' && l.word == ''; }

    function setLine(index: number, data: lineEditData) {
        const l = [...lines];
        l[index].edit = data;

        if (isEmpty(data) && index != l.length - 1) l.splice(index, 1);
        if (index == lines.length - 1 && !isEmpty(data)) l.push(emptyLine()); // editing last line should auto add new one

        setLines(l);
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
            id: Date.now(),
            shouldDelete: false,
        };
    }

    function lineIsValid(index: number) {
        const line = lines[index];

        const p = line.edit.pron.trim();
        const w = line.edit.word.trim();
        
        if (p.length > 0 && w.length == 0) return false;
        return true;
    }

    function canSubmit() {
        if (lines[0].edit.word.length == 0) return false;

        for (let i = 0; i < lines.length; i++) {
            if (!lineIsValid(i)) return false;
        }

        return true;
    }

    return (
        <div className="mt-2">
            <div>Edit Words:</div>
            <div className="flex mt-1">
                <div className="bg-surface20 w-[2px] mx-2"></div>
                <div className="flex-grow flex flex-col gap-2 mt-1">
                    <div className="flex flex-grow-0 gap-2">
                        <button className="button-text px-2 disabled:bg-tonal0 disabled:cursor-not-allowed"
                            disabled={!canSubmit()}
                            onClick={() => {
                                update(lines);
                                setLines([emptyLine()])
                            }}>
                            <i className="ri-file-transfer-line text-lg mr-1"></i>
                            Upload Words
                        </button>
                        <button className="button-text px-2">
                            <i className="ri-delete-bin-2-line text-lg mr-1"></i>
                            Clear All
                        </button>
                    </div>
                    {lines.map((x, k) => {
                        return (<Line key={x.id} index={k} data={x} fn={{
                            update: setLine,
                            clearSelected: clearSelected,
                            setFocus: (i, p) => setSelected({index: i, isPron: p}),
                            search: search,
                            valid: lineIsValid,
                            toggleDeletion: (index: number) => {
                                const l = [...lines];
                                l[index].shouldDelete = !l[index].shouldDelete;
                                setLines(l);
                            }
                        }}/>);
                    }
                    )}
                </div>
                <div className="w-8"></div>
                <div className="mt-3">
                    <SymbolPicker update={addSymbol}/>
                </div>
            </div>
        </div>
    )
}