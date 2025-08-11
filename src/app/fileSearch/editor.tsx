import { useEffect, useReducer, useRef, useState } from "react";
import { fileData, formattedFileData } from "./input";

interface entryId {
    file: string,
    index?: number,
}

export function FormattedFileEditor({ files }: { files: fileData[] }) {
    const [focus, setFocus] = useState<entryId | undefined>();
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    const head = useRef<HTMLInputElement>(null);
    const body = useRef<HTMLTextAreaElement>(null);

    function editEntry(e: Event) {
        const id = (e as CustomEvent).detail as entryId;

        if (head.current && body.current) {
            // update entry
            if (id.index) {
                const f = files.find(x => x.name == id.file)!;
                const entry = (f.content as formattedFileData).entries[id.index];
                head.current.value = entry.head;
                body.current.value = entry.content;
            } else {
                head.current.value = '';
                body.current.value = '';
            }
        } else console.error('Head and body are not defined! This should never happen.');

        setFocus(id);
    }

    function fileRemoveCallback(e: Event) {
        const name = (e as CustomEvent).detail;
        // a file was removed. if the file is the currently focused on or everything (name == undefined), hide
        if (focus && (!name || name == focus.file)) setFocus(undefined);
    }

    function submit() {
        if (!focus || !head.current || !body.current) return;
        const file = files.find(x => x.name == focus.file)!;
        const entries = (file.content as formattedFileData).entries;

        if (focus.index && head.current.value == entries[focus.index].head) {
            // heads are the same, so we can just replace the body in place
            entries[focus.index].content = body.current.value;

            document.dispatchEvent(new CustomEvent('formatted-file-force-update', { detail: focus.file }));
        } else {
            // either replacing entry or adding new entry
            if (focus.index) document.dispatchEvent(new CustomEvent('formatted-file-delete-entry', { detail: [focus.file, focus.index] }));

            if (!head.current.value.endsWith(':')) head.current.value += ':';

            document.dispatchEvent(new CustomEvent('formatted-file-force-add-entry', { detail: {
                file: focus.file,
                head: head.current.value.toUpperCase(),
                body: body.current.value,
            }}));
        }

        document.dispatchEvent(new CustomEvent('formatted-file-set-dirty', { detail: focus.file }));
        setFocus(undefined);
    }

    function isValidSubmit() {
        if (!head.current) return false;
        return head.current.value.length > 0;
    }

    useEffect(() => {
        document.addEventListener('formatted-file-edit-entry', editEntry);
        document.addEventListener('formatted-file-add-entry', editEntry);
        document.addEventListener('file-input-remove-file', fileRemoveCallback);

        return () => {
            document.removeEventListener('formatted-file-edit-entry', editEntry);
            document.removeEventListener('formatted-file-add-entry', editEntry);
            document.removeEventListener('file-input-remove-file', fileRemoveCallback);
        };
    });

    return (<>
        <div className={focus ? 'hidden' : ''}>Please select an entry to edit/add from the file search or settings panel.</div>
        <div className={!focus ? 'hidden' : 'w-full'}>
            <div className="flex justify-between w-full mb-2">
                <div className="w-2/5">
                    <input ref={head} onChange={() => forceUpdate()} className="line bg-surface10 outline-none placeholder:italic w-full uppercase" placeholder="Head"></input>
                </div>
                <div className="flex gap-2">
                    <div>&lt;<span className="italic">{focus?.file ?? 'undefined'}</span>&gt;</div>
                    <button
                        className="button-text px-1 disabled:bg-tonal0 disabled:cursor-not-allowed"
                        onClick={submit}
                        disabled={!isValidSubmit()}
                    >
                        <i className="ri-file-upload-line text-lg mr-1"></i>
                        Submit
                    </button>
                    <button className="button-text px-1" onClick={() => {
                        if (head.current && body.current) {
                            head.current.value = '';
                            body.current.value = '';
                        }

                        setFocus(undefined);
                    }}><i className="ri-delete-bin-2-line text-lg mr-1"></i>Cancel</button>
                </div>
            </div>
            <textarea ref={body} rows={4} className="w-full bg-surface10 outline-none placeholder:italic hover:bg-tonal0 border border-surface20 px-2 py-0.5" placeholder="Body..."></textarea>
        </div>
    </>);
}