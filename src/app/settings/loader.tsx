import { ChangeEvent, useContext, useEffect, useState } from "react";
import { DictionaryEditor } from "./editor";
import { Dictionary, DictionaryEdit } from "../dictionary";
import { DICTIONARY_CONTEXT, TRANSLATION_DISPLAY_CONTEXT } from "../util/context";

export function Editor() {
    const dictionary = useContext(DICTIONARY_CONTEXT);
    const {get: showTranslationDisplay, set: setTranslationDisplay} = useContext(TRANSLATION_DISPLAY_CONTEXT);

    const [lenEmpty, setLenEmpty] = useState(0); // number of entries with no pronunciation
    const [name, setName] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() =>
        setLenEmpty(dictionary.filter(x => !x.pronunciation || x.pronunciation.text == '').length),
    [dictionary])

    function download() {
        setIsDirty(false);
        Dictionary.save(name.length == 0 ? 'dictionary.csv' : name);
    }

    function loadFile(event: ChangeEvent<HTMLInputElement>, union = false) {
        if (!union) setIsDirty(true); // modified dictionary, so is dirty

        const f = event.target.files!.item(0)!;
        const name = f.name;
        const url = URL.createObjectURL(f);

        setName(name);

        Dictionary.load(url, union);
    }

    function applyEdits(edits: DictionaryEdit[]) {
        // since each line/edit is an actual line in the ui, the last line will always be empty
        setIsDirty(true);
        if (name.length == 0) setName('Modified.csv');

        Dictionary.update(edits.filter(x => x.valid()));
    }

    return (
        <div className="flex flex-col gap-2">
            <div>
                Display Settings:
                <div className="flex">
                    <div className="bg-surface20 w-[2px] mx-2"></div>
                    <div>
                        <input type="checkbox" id="translationDisplay" className="mr-2"
                            checked={showTranslationDisplay.show} onChange={() => {
                                setTranslationDisplay({...showTranslationDisplay, show: !showTranslationDisplay.show});
                            }}/>
                        <label htmlFor="translationDisplay" className="select-none">Show Phonetic Translation</label>
                    </div>
                </div>
            </div>
            <div>
                <div className="flex justify-between">
                    <div className={isDirty ? 'font-semibold' : ''}>
                        <span>{isDirty ? <span className="text-red-400">*</span> : ''}</span>
                        <span>Loaded Dictionary: </span>
                        <span>{name.length == 0 ? <i>&lt;Default&gt;</i> : name} </span>
                    </div>
                    <div className="flex gap-2">
                        <label className="button-text px-1 cursor-pointer">
                            <input type='file' accept=".txt" className="hidden" onChange={(e) => loadFile(e, false)}/>
                            <i className="ri-file-add-line text-lg mr-1"></i>
                            Replace
                        </label>
                        <label className="button-text px-1 cursor-pointer">
                            <input type='file' accept=".txt" className="hidden" onChange={(e) => loadFile(e, true)}/>
                            <i className="ri-file-upload-line text-lg mr-1"></i>
                            Upload
                        </label>
                        <button className="button-text px-1" onClick={download}>
                            <i className="ri-file-download-line text-lg mr-1"></i>
                            Download
                        </button>
                    </div>
                </div>
                <div className="flex">
                    <div className="bg-surface20 w-[2px] mx-2"></div>
                    <div>
                        <div>Total words: {dictionary.length}</div>
                        <div>Without pronunciation: {lenEmpty}</div>
                    </div>
                </div>
            </div>
            <DictionaryEditor apply={applyEdits} />
        </div>
    )
}