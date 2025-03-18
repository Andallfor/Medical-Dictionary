import { ChangeEvent, KeyboardEventHandler, useRef, useState } from "react";

function SymbolPicker({ update }: { update: (s: string) => void }) {
    const vowels = [['i', 'ɪ', 'e', 'ɛ', 'ə', 'ʌ', 'əː'], ['u', 'ʊ', 'o', 'ɔ', 'ɔr', 'a', 'ar'], ['aɪ', 'ɔɪ', 'aʊ', 'iɚ', 'ɔr', 'ɛɚ', 'ʊɚ']];
    const consonants = [['th̥', 'th̬', 'ˌ', 'ˈ']];

    function map(table: string[][]) {
        return table.map((x, i) => 
            <div key={i} className="flex gap-1 my-1">
                {x.map((y, k) => <button key={k} className="button" onClick={() => update(y)}>{y}</button>)}
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

function Line({ index, data, update }: { index: number, data: lineData, update: (index: number, d: lineEditData, isSubmit: boolean) => void }) {
    const wordRef = useRef<HTMLInputElement>(null);
    const pronRef = useRef<HTMLInputElement>(null);

    function wrapWord(e: ChangeEvent<HTMLInputElement>) {
        update(index, {word: e.target.value, pron: data.edit.pron}, false);
    }

    function wrapPron(e: ChangeEvent<HTMLInputElement>) {
        update(index, {word: data.edit.word, pron: e.target.value}, false);
    }

    function trySubmit(k: React.KeyboardEvent<HTMLInputElement>) {
        if (k.key == 'Enter') {
            update(index, data.edit, true);

            wordRef.current?.blur();
            pronRef.current?.blur();
        }

        k.preventDefault();
    }

    function notify() {
        update(index, data.edit, false);
    }

    return (
        <div className="flex gap-2 h-7">
            <div className={"line hover:bg-surface10 " + (data.selected ? 'outline outline-1 outline-green-200' : '')}>
                <input className="w-1/2 bg-surface10 outline-none placeholder:italic" placeholder="Enter Word"
                    onChange={wrapWord} value={data.edit.word} onKeyDown={trySubmit} ref={wordRef} onFocus={notify}/>
                <input className="w-1/2 bg-surface10 outline-none placeholder:italic" placeholder="Pronunciation"
                    onChange={wrapPron} value={data.edit.pron} onKeyDown={trySubmit} ref={pronRef} onFocus={notify}/>
            </div>
            <button className="ri-reset-right-line button"></button>
            <button className="ri-close-line button disabled:bg-tonal0 disabled:cursor-not-allowed" onClick={() => update(index, {word: '', pron: ''}, true)}></button>
        </div>
    );
}

interface lineEditData {
    word: string;
    pron: string;
}

interface lineData {
    edit: lineEditData;
    selected: boolean;
}

function emptyLine(): lineData {
    return {
        edit: {
            word: '',
            pron: '',
        },
        selected: false,
    };
}

export function DictionaryEditor() {
    const [lines, setLines] = useState<lineData[]>([emptyLine()]);
    const [selected, setSelected] = useState(-1);

    function isEmpty(l: lineEditData) { return l.pron == '' && l.word == ''; }

    function setLine(index: number, data: lineEditData, isSubmit = false) {
        let l = [...lines];
        l[index].edit = data;

        let _selected = selected;

        if (isSubmit) {
            // editing last line should auto add new one
            if (index == lines.length - 1 && !isEmpty(data)) l.push(emptyLine());
            if (isEmpty(data) && index != l.length - 1) l.splice(index, 1);

            _selected = -1;
        } else if (!isEmpty(data)) _selected = index;

        for (let i = 0; i < l.length; i++) {
            l[i].selected = _selected == i;
        }

        setSelected(_selected);
        setLines(l);
    }

    function addSymbol(symbol: string) {
        if (selected != -1) {
            const l = [...lines];
            l[selected].edit.pron += symbol;

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
                        <Line key={k} index={k} data={x} update={setLine}/>
                    )}
                </div>
                <div className="w-8"></div>
                <SymbolPicker update={addSymbol}/>
            </div>
        </div>
    )
}