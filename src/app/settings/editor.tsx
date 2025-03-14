import { ChangeEvent, useEffect, useState } from "react";
import { phoneme } from "../phoneticTree/constants";

export function Editor({ dictionary }: { dictionary: phoneme[] }) {
    const [lenEmpty, setLenEmpty] = useState(0);

    useEffect(() => {
        setLenEmpty(dictionary.filter(x => x.pronunciation.length == 0).length);
    }, [dictionary])

    function download() {
        const file = 'dictionary.txt';
        let data = "";
        dictionary.forEach(x => data += `${x.word}=${x.pronunciation}\n`);
        const arr = [255, 254]; // UTF-16LE
        for (let i = 0; i < data.length; i++) {
            const c = data.charCodeAt(i);
            arr.push(c & 0xff);
            arr.push(c / 256 >>> 0);
        }

        // https://stackoverflow.com/questions/72683352/how-do-i-write-inta-a-file-and-download-the-file-using-javascript
        // https://stackoverflow.com/questions/32937088/javascript-create-utf-16-text-file
        const blob = new Blob([new Uint8Array(arr)], {type: 'text/plain;charset=UTF-16LE;'});
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

    async function loadFile(event: ChangeEvent<HTMLInputElement>, isReplace = false) {
        const f = event.target.files!.item(0)!;
        const name = f.name;
        const url = URL.createObjectURL(f);

        if (isReplace) window.dispatchEvent(new CustomEvent('internal-dictionary-replace', { detail: url }));
        else window.dispatchEvent(new CustomEvent('internal-dictionary-upload', { detail: url }));
    }

    return (
        <div>
            <div className="">
                <div className="flex justify-between">
                    <div>Dictionary Name: <i>&lt;Default&gt;</i></div>
                    <div className="flex gap-2">
                        <label className="button-text px-1 cursor-pointer">
                            <input type='file' accept=".txt" className="hidden" onChange={(e) => loadFile(e, true)}/>
                            Replace
                        </label>
                        <button className="button-text px-1">
                            Upload
                        </button>
                        <button className="button-text px-1" onClick={download}>
                            Download
                        </button>
                    </div>
                </div>
                <div>Total words: {dictionary.length}</div>
                <div>Without pronunciation: {lenEmpty}</div>
            </div>
        </div>
    )
}