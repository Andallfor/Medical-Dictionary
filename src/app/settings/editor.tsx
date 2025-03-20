import { ChangeEvent, KeyboardEventHandler, use, useEffect, useRef, useState } from "react";

function SymbolPicker({ update }: { update: (s: string) => void }) {
    const vowels = [['i', 'ɪ', 'e', 'ɛ', 'ə', 'ʌ', 'əː'], ['u', 'ʊ', 'o', 'ɔ', 'ɔr', 'a', 'ar'], ['aɪ', 'ɔɪ', 'aʊ', 'iɚ', 'ɔr', 'ɛɚ', 'ʊɚ']];
    const consonants = [['th̥', 'th̬', 'ˌ', 'ˈ']];
    const diacritics = [['́', '̴', '̄']] // https://symbl.cc/en/unicode-table/#combining-diacritical-marks

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
            <div className="mt-2 font-semibold">Diacritics</div>
            {map(diacritics)}
        </div>
    );
}

function Line({ index, data, fn }: { index: number, data: lineData, fn: lineFn }) {
    const wordRef = useRef<HTMLInputElement>(null);
    const pronRef = useRef<HTMLInputElement>(null);

    function wrapWord(e: ChangeEvent<HTMLInputElement>) {
        fn.update(index, {word: e.target.value, pron: data.edit.pron}, false);
    }

    function wrapPron(e: ChangeEvent<HTMLInputElement>) {
        fn.update(index, {word: data.edit.word, pron: e.target.value}, true);
    }

    function trySubmit(k: React.KeyboardEvent<HTMLInputElement>) {
        if (k.key == 'Enter') {
            wordRef.current?.blur();
            pronRef.current?.blur();
        }
    }

    return (
        <div className="flex gap-2 h-7">
            <div className="line hover:bg-surface10">
                <input className="w-1/2 bg-surface10 outline-none placeholder:italic" placeholder="Enter Word" ref={wordRef} value={data.edit.word}
                    onFocus={() => fn.setFocus(index, false)} onChange={wrapWord} onKeyDown={trySubmit} onBlur={() => fn.clearSelected(wordRef.current ?? undefined)}/>
                <input className="w-1/2 bg-surface10 outline-none placeholder:italic" placeholder="Pronunciation" ref={pronRef} value={data.edit.pron}
                    onFocus={() => fn.setFocus(index, true)} onChange={wrapPron} onKeyDown={trySubmit} onBlur={() => fn.clearSelected(pronRef.current ?? undefined)}/>
            </div>
            <button className="ri-file-search-line button"></button>
            <button className="ri-close-line button"></button>
        </div>
    );
}

interface lineFn {
    update: (index: number, d: lineEditData, isPron: boolean) => void;
    clearSelected: (s: HTMLInputElement | undefined) => void;
    setFocus: (index: number, isPron: boolean) => void;
}

interface lineEditData {
    word: string;
    pron: string;
}

interface lineData {
    edit: lineEditData;
}

interface lineSelection {
    index: number;
    isPron: boolean;
}

function emptyLine(): lineData {
    return {
        edit: {
            word: '',
            pron: '',
        },
    };
}

export function DictionaryEditor() {
    const [lines, setLines] = useState<lineData[]>([emptyLine()]);
    const [selected, setSelected] = useState<lineSelection>({index: -1, isPron: false});
    const [preventSelectionClear, setPrevention] = useState(false);

    function isEmpty(l: lineEditData) { return l.pron == '' && l.word == ''; }

    function setLine(index: number, data: lineEditData, isPron: boolean) {
        console.log('passed');
        const l = [...lines];
        l[index].edit = data;

        if (isEmpty(data) && index != l.length - 1) l.splice(index, 1);
        if (index == lines.length - 1 && !isEmpty(data)) l.push(emptyLine()); // editing last line should auto add new one

        setLines(l);
        setSelected({index: index, isPron: isPron});
    }

    function clearSelected(self: HTMLInputElement | undefined) {
        if (preventSelectionClear) {
            setPrevention(false);
            setTimeout(() => self?.focus(), 10);
        } else {
            setSelected({index: -1, isPron: false});
        }
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

    return (
        <div className="mt-2">
            <div>Edit Words:</div>
            <div className="flex">
                <div className="bg-surface20 w-[2px] mx-2"></div>
                <div className="flex-grow flex flex-col gap-2">
                    {lines.map((x, k) =>
                        <Line key={k} index={k} data={x} fn={{
                            update: setLine,
                            clearSelected: clearSelected,
                            setFocus: (i, p) => setSelected({index: i, isPron: p})
                        }}/>
                    )}
                </div>
                <div className="w-8"></div>
                <SymbolPicker update={addSymbol}/>
            </div>
        </div>
    )
}