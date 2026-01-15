import { ChangeEvent, useContext, useEffect, useRef, useState } from "react";
import { DICTIONARY_CONTEXT } from "../page";
import { DictionaryEdit } from "../dictionary";

// look the majority of this code was written at like ~3am across multiple days so excuse the mess

function SymbolPicker({ update }: { update: (s: string) => void }) {
    // TODO: should automatically pull from tokenization?
    // maybe can just hide the regular ascii characters?
    const vowels = [['i', 'ɪ', 'e', 'ɛ', 'æ', 'ə', 'ʌ'], ['əː', 'u', 'ʊ', 'o', 'ɔ', 'ɔr', 'a'], ['ar', 'aɪ', 'ɔɪ', 'au', 'iɚ', 'ɛɚ', 'ʊɚ']];
    const consonants = [['ŋ', 'ʃ', 'tʃ', 'θ', 'ð', 'ʒ', 'dʒ']];
    const diacritics = [['́', '̃', '̄', 'ˌ', 'ˈ']] // https://symbl.cc/en/unicode-table/#combining-diacritical-marks

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
            <div className="mt-2 font-semibold">Consonants</div>
            {map(consonants)}
            <div className="mt-2 font-semibold">Diacritics/Misc.</div>
            {map(diacritics)}
        </div>
    );
}

// placeholder denotes that we should not care about the validity of this line (i.e. is the last line)
function Line({ edit, placeholder, fn }: { edit: DictionaryEdit, placeholder: boolean, fn: lineFn }) {
    const [searchFailed, setSearchFailed] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const wordRef = useRef<HTMLInputElement>(null);
    const pronRef = useRef<HTMLInputElement>(null);

    function wrap(e: ChangeEvent<HTMLTextAreaElement> | ChangeEvent<HTMLInputElement>, key: 'word' | 'pron' | 'part' | 'def') {
        edit[key] = e.target.value;
        fn.update(edit);
    }

    function trySubmit(k: React.KeyboardEvent<HTMLInputElement>, shouldSearch = false) {
        if (k.key == 'Enter') {
            wordRef.current?.blur();
            pronRef.current?.blur();

            if (shouldSearch) search();
        }
    }

    function search() {
        setSearchFailed(fn.search());
        setTimeout(() => setSearchFailed(false), 2000);
    }

    return (
        <div className="flex gap-1.5">
            <div className="flex-grow">
                <div className={"z-50 h-7 line rounded-b-none hover:bg-surface10 " + (placeholder || edit.valid() ? '' : 'outline-1 outline-red-500 outline')}>
                    <input className="w-1/2 bg-surface10 outline-none placeholder:italic mr-1"
                        placeholder="Enter Word" ref={wordRef} value={edit.word}
                        onFocus={() => fn.setFocus(wordRef.current!, false)}
                        onChange={(e) => wrap(e, 'word')}
                        onKeyDown={(e) => trySubmit(e, true)}
                        onBlur={() => fn.clearSelected(wordRef.current ?? undefined)} // skull
                    />
                    <input className="w-1/2 bg-surface10 outline-none placeholder:italic"
                        placeholder="Pronunciation" ref={pronRef} value={edit.pron}
                        onFocus={() => fn.setFocus(pronRef.current!, true)}
                        onChange={(e) => wrap(e, 'pron')}
                        onKeyDown={trySubmit}
                        onBlur={() => fn.clearSelected(pronRef.current ?? undefined)}
                    />
                </div>
                <div className="flex flex-col">
                    {expanded ?
                        <div className="w-full bg-surface10 pt-1 px-1">
                            <input className="line text-sm border-none placeholder:italic w-full outline-none"
                                placeholder="Part of Speech"
                                value={edit.part}
                                onChange={(e) => wrap(e, 'part')}>
                            </input>
                            <textarea className="line text-sm border-none placeholder:italic w-full outline-none"
                                placeholder="Definition"
                                rows={4}
                                value={edit.def}
                                onChange={(e) => wrap(e, 'def')}>
                            </textarea>
                        </div>
                    : <></>}
                    <button className={"w-full bg-surface10 rounded-b-md " + (expanded ? 'h-5' : 'h-3')} onClick={() => setExpanded(!expanded)}>
                        <i className={"absolute -translate-y-2 -translate-x-1/2 ri-lg " + (expanded ? 'ri-arrow-drop-up-fill' : 'ri-arrow-drop-down-fill')}></i>
                    </button>
                </div>
            </div>
            <button className={"ri-file-search-line button outline-1 outline-red-500 " + (searchFailed ? 'outline' : '')} onClick={search} title="Search for pronunciation." />
            <button className={"button outline-1 outline-red-500 " + (edit.delete ? 'ri-eraser-fill outline' : 'ri-pencil-fill')}
                onClick={() => {
                    edit.delete = !edit.delete;
                    fn.update(edit);
                }}
                title={edit.delete ? 'Delete entry.' : 'Add entry.'}/>
            <button className="ri-close-line button" onClick={() => fn.update(new DictionaryEdit())} title="Clear line." />
        </div>
    );
}

interface lineFn {
    update: (d: DictionaryEdit) => void;
    search: () => boolean;

    clearSelected: (s: HTMLInputElement | undefined) => void;
    setFocus: (input: HTMLInputElement, isPron: boolean) => void;
}

export interface lineData {
    edit: DictionaryEdit;
    id: number;
}

interface lineSelection {
    inp: HTMLInputElement;
    ind: number;
    isPron: boolean;
}

export function DictionaryEditor({ apply }: { apply: (edits: DictionaryEdit[]) => void }) {
    const dictionary = useContext(DICTIONARY_CONTEXT);
    const container = useRef<HTMLDivElement>(null);

    const [lines, setLines] = useState<lineData[]>([emptyLine()]);
    const [selected, setSelected] = useState<lineSelection | undefined>(undefined);
    const [preventSelectionClear, setPrevention] = useState(false);
    const [minimized, setMinimized] = useState(false);

    function emptyLine(): lineData {
        return {
            edit: new DictionaryEdit(),
            id: Date.now(),
        }
    }

    // TODO: in above code we directly modify edit, does that propagate here (and so we dont need to pass data?)
    function updateLine(index: number, data: DictionaryEdit) {
        const l = [...lines];
        l[index].edit = data;

        const isLast = index == l.length - 1;
        if (data.isEmpty() && !isLast) l.splice(index, 1); // dont remove last entry
        else if (!data.isEmpty() && isLast) l.push(emptyLine()); // editing last line should auto add new one

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

            updateLine(selected.ind, e);
        }
    }

    function search(index: number) {
        const w = lines[index].edit.word.toLowerCase().normalize();
        if (w.length != 0) {
            const d = dictionary.find((x) => x.word == w);
            if (d) {
                const l = [...lines];
                l[index].edit.pron = d.pronunciation?.text ?? '';
                setLines(l);

                return false;
            }
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
                            disabled={lines.length <= 1 || lines.some((x, k) => !(k == lines.length - 1 || x.edit.valid()))}
                            onClick={() => {
                                apply(lines.map(x => x.edit));
                                setLines([emptyLine()]);
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
                        return (<Line key={x.id} edit={x.edit} placeholder={k == lines.length - 1} fn={{
                            update: (edit) => updateLine(k, edit),
                            search: () => search(k),
                            setFocus: (input, isPron) => setSelected({ inp: input, ind: k, isPron: isPron }),
                            clearSelected: clearSelected,
                        }}/>);
                    }
                    )}
                </div>
                <div className="w-6"></div>
                <div className="mt-3">
                    <SymbolPicker update={addSymbol} />
                </div>
            </div>
        </div>
    )
}