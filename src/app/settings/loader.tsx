import { ChangeEvent, useEffect, useState } from "react";
import { phoneme } from "../phoneticTree/constants";
import { DictionaryEditor, lineData, lineEditData } from "./editor";

export function Editor({ dictionary }: { dictionary: phoneme[] }) {
    const [lenEmpty, setLenEmpty] = useState(0);
    const [name, setName] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setLenEmpty(dictionary.filter(x => x.pronunciation.length == 0).length);
    }, [dictionary])

    function download() {
        setIsDirty(false);

        const file = name.length == 0 ? 'dictionary.txt' : name;
        let data = "";
        dictionary.forEach(x => data += `${x.word}=${x.pronunciation}\n`);

        // https://stackoverflow.com/questions/72683352/how-do-i-write-inta-a-file-and-download-the-file-using-javascript
        const blob = new Blob([data], {type: 'text/plain;charset=UTF-8;'});
        if ('msSaveOrOpenBlob' in window.navigator) {
            // @ts-ignore
            window.navigator.msSaveBlob(blob, file);
        } else {
            const elem = window.document.createElement('a');
            elem.href = window.URL.createObjectURL(blob);
            elem.download = file;
            document.body.appendChild(elem);
            elem.click();
            document.body.removeChild(elem);
        }
    }

    function loadFile(event: ChangeEvent<HTMLInputElement>, isReplace = false) {
        if (!isReplace) setIsDirty(true); // modified dictionary, so is dirty

        const f = event.target.files!.item(0)!;
        const name = f.name;
        const url = URL.createObjectURL(f);

        setName(name);

        if (isReplace) window.dispatchEvent(new CustomEvent('internal-dictionary-replace', { detail: url }));
        else window.dispatchEvent(new CustomEvent('internal-dictionary-upload', { detail: [url, true] }));
    }

    function updateDictionary(lines: lineData[]) {
        // last element will always be empty
        const str = lines
            .filter(x => x.edit.word.length != 0)
            .map(x => x.shouldDelete ? `${x.edit.word}=DELETE` : `${x.edit.word}=${x.edit.pron}`) // signal deletion with "DELETE"
            .join('\n');

        setIsDirty(true);
        if (name.length == 0) setName('Modified.txt')

        window.dispatchEvent(new CustomEvent('internal-dictionary-upload', {detail: [str, false]}));
    }

    return (
        <div>
            <div>
                <div className="flex justify-between">
                    <div className={isDirty ? 'font-semibold' : ''}>
                        <span>{isDirty ? <span className="text-red-400">*</span> : ''}</span>
                        <span>Loaded Dictionary: </span>
                        <span>{name.length == 0 ? <i>&lt;Default&gt;</i> : name} </span>
                    </div>
                    <div className="flex gap-2">
                        <label className="button-text px-1 cursor-pointer">
                            <input type='file' accept=".txt" className="hidden" onChange={(e) => loadFile(e, true)}/>
                            <i className="ri-file-add-line text-lg mr-1"></i>
                            Replace
                        </label>
                        <label className="button-text px-1 cursor-pointer">
                            <input type='file' accept=".txt" className="hidden" onChange={(e) => loadFile(e, false)}/>
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
            <DictionaryEditor dictionary={dictionary} update={updateDictionary}/>
        </div>
    )
}