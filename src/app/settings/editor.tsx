import { ChangeEvent, KeyboardEventHandler, use, useEffect, useRef, useState } from "react";
import { phoneme } from "../phoneticTree/constants";

// look the majority of this code was written at like ~3am across multiple days so excuse the mess

function SymbolPicker({ update, minimized }: { update: (s: string) => void, minimized: boolean }) {
    const vowels = [['i', 'ɪ', 'e', 'ɛ', 'æ', 'ə', 'ʌ'], ['əː', 'u', 'ʊ', 'o', 'ɔ', 'ɔr', 'a'], ['ar', 'aɪ', 'ɔɪ', 'aʊ', 'iɚ', 'ɛɚ', 'ʊɚ']];
    const consonants = [['th̥', 'th̬', 'ɣ', 'ʃ', 'ð', 'ˌ', 'ˈ']];
    const diacritics = [['́', '̃', '̄']] // https://symbl.cc/en/unicode-table/#combining-diacritical-marks

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
    const [searchFailed, setSearchFailed] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const wordRef = useRef<HTMLInputElement>(null);
    const pronRef = useRef<HTMLInputElement>(null);

    function wrapWord(e: ChangeEvent<HTMLInputElement>) {
        let t = {...data.edit};
        t['word'] = e.target.value;
        fn.update(index, t);
    }

    function wrapPron(e: ChangeEvent<HTMLInputElement>) {
        let t = {...data.edit};
        t['pron'] = e.target.value;
        fn.update(index, t);
    }

    function wrapPart(e: ChangeEvent<HTMLInputElement>) {
        let t = {...data.edit};
        t['part'] = e.target.value;
        fn.update(index, t);
    }

    function wrapDef(e: ChangeEvent<HTMLTextAreaElement>) {
        let t = {...data.edit};
        t['def'] = e.target.value;
        fn.update(index, t);
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
        <div className="flex gap-1.5">
            <div className="flex-grow">
                <div className={"z-50 h-7 line rounded-b-none hover:bg-surface10 " + (fn.valid(index) ? '' : 'outline-1 outline-red-500 outline')}>
                    <input className="w-1/2 bg-surface10 outline-none placeholder:italic mr-1"
                        placeholder="Enter Word" ref={wordRef} value={data.edit.word}
                        onFocus={() => fn.setFocus({inp: wordRef.current!, ind: index, isPron: false})}
                        onChange={wrapWord}
                        onKeyDown={(e) => trySubmit(e, true)}
                        onBlur={() => fn.clearSelected(wordRef.current ?? undefined)}
                    />
                    <input className="w-1/2 bg-surface10 outline-none placeholder:italic"
                        placeholder="Pronunciation" ref={pronRef} value={data.edit.pron}
                        onFocus={() => fn.setFocus({inp: pronRef.current!, ind: index, isPron: true})}
                        onChange={wrapPron}
                        onKeyDown={trySubmit}
                        onBlur={() => fn.clearSelected(pronRef.current ?? undefined)}
                    />
                </div>
                <div className="flex flex-col">
                    {expanded ?
                        <div className="w-full bg-surface10 pt-1 px-1">
                            <input className="line text-sm border-none placeholder:italic w-full outline-none" placeholder="Part of Speech" value={data.edit.part} onChange={wrapPart}></input>
                            <textarea className="line text-sm border-none placeholder:italic w-full outline-none" placeholder="Definition" rows={4} value={data.edit.def} onChange={wrapDef}></textarea>
                        </div>
                    : <></>}
                    <button className={"w-full bg-surface10 rounded-b-md " + (expanded ? 'h-5' : 'h-3')} onClick={() => setExpanded(!expanded)}>
                        <i className={"absolute -translate-y-2 -translate-x-1/2 ri-lg " + (expanded ? 'ri-arrow-drop-up-fill' : 'ri-arrow-drop-down-fill')}></i>
                    </button>
                </div>
            </div>
            <button className={"ri-file-search-line button outline-1 outline-red-500 " + (searchFailed ? 'outline' : '')} onClick={search} title="Search for pronunciation." />
            <button className={"button outline-1 outline-red-500 " + (data.shouldDelete ? 'ri-eraser-fill outline' : 'ri-pencil-fill')} onClick={() => fn.toggleDeletion(index)} title={data.shouldDelete ? 'Delete entry.' : 'Add entry.'}/>
            <button className="ri-close-line button" onClick={() => fn.update(index, {word: '', pron: '', part: '', def: ''})} title="Clear line." />
        </div>
    );
}

interface lineFn {
    update: (index: number, d: lineEditData) => void;
    clearSelected: (s: HTMLInputElement | undefined) => void;
    setFocus: (s: lineSelection) => void;
    search: (index: number) => boolean;
    valid: (index: number) => boolean;
    toggleDeletion: (index: number) => void;
}

export interface lineEditData {
    word: string;
    pron: string;
    part: string;
    def: string;
}

export interface lineData {
    edit: lineEditData;
    id: number;
    shouldDelete: boolean;
}

interface lineSelection {
    inp: HTMLInputElement;
    ind: number;
    isPron: boolean;
}

export function DictionaryEditor({ dictionary, update }: { dictionary: phoneme[], update: (l: lineData[]) => void }) {
    const container = useRef<HTMLDivElement>(null);
    const [lines, setLines] = useState<lineData[]>([emptyLine()]);
    const [selected, setSelected] = useState<lineSelection | undefined>(undefined);
    const [preventSelectionClear, setPrevention] = useState(false);
    const [minimized, setMinimized] = useState(false);

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
        } else setSelected(undefined);
    }

    function addSymbol(symbol: string) {
        if (selected) {
            // TODO: if user selects an area of text and then adds a symbol, this symbol should replace that area. this functionality is not currently included
            const e = lines[selected.ind].edit;
            const i = selected.inp.selectionStart!;
            if (selected.isPron) e.pron = e.pron.substring(0, i) + symbol + e.pron.substring(i);
            else e.word = e.word.substring(0, i) + symbol + e.word.substring(i);

            // when we update lines to match the new text, we refocus input which causes cursor to lose its previous position and move to the end
            // so move the cursor back to where it originally was
            const len = i + symbol.length;
            setTimeout(() => selected.inp.setSelectionRange(len, len), 10);
            setPrevention(true);

            setLine(selected.ind, e);
        }
    }

    function search(index: number) {
        const w = lines[index].edit.word.toLowerCase().normalize();
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
                def: '',
                part: ''
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

    useEffect(() => {
        function handleResize() {
            if (container.current?.offsetWidth) setMinimized(container.current?.offsetWidth < 770);
        }
    
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
      }, []);

    return (
        <div className="mt-2" ref={container}>
            <div>Edit Words:</div>
            <div className={"flex mt-1 " + (minimized ? 'flex-col' : '')}>
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
                            setFocus: (i) => setSelected(i),
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
                <div className="w-6"></div>
                <div className="mt-3">
                    <SymbolPicker update={addSymbol} minimized={minimized}/>
                </div>
            </div>
        </div>
    )
}