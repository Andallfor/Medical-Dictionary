import axios from "axios";
import { ChangeEvent, Dispatch, SetStateAction, useContext, useEffect, useState } from "react";
import { prettifyFileSize } from "../util/util";
import { readFormattedFile } from "./util";
import { FormattedFileEditor } from "./editor";
import { FILE_CONTEXT } from "../util/context";

interface fileMetadata {
    name: string,
    url: string,
    content: string,
    size: number
}

export enum fileType { FORMATTED, TEXT }

export interface fileData {
    name: string,
    content: string | formattedFileData,
    size: number,
    type: fileType,
}

export interface formattedFileData {
    entries: formattedFileEntry[];
    headMap: Record<string, number>;
}

export interface formattedFileEntry {
    hash: number[];
    head: string;
    fHead: string[];
    content: string;
}

export default function FileInput() {
    const {get: files, set: setFiles} = useContext(FILE_CONTEXT);
    const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});

    async function addFiles(event: ChangeEvent<HTMLInputElement>) {
        const metadata: fileMetadata[] = [];
        const f = event.target.files!;
        for (let i = 0; i < f.length; i++) {
            const file = f.item(i)!;

            // TODO: replace files if they already exist

            metadata.push({
                name: file.name,
                url: URL.createObjectURL(file),
                content: "",
                size: file.size
            });
        }

        const data: fileData[] = [];

        // download all content
        await axios
            .all(metadata.map(x => axios.get(x.url)))
            .then(axios.spread((...values) => {
                values.forEach((content, ind) => {
                    // use the fact that lists are stable, so index here matches metadata index
                    const m = metadata[ind];

                    let con: string | formattedFileData = content.data as string;
                    let type = fileType.TEXT;

                    // read formatted file
                    if ((content.data as string).startsWith('#!/formatted')) {
                        con = readFormattedFile(content.data as string)!;
                        type = fileType.FORMATTED;
                    }

                    data.push({
                        name: m.name,
                        size: m.size,
                        content: con,
                        type: type,
                    });

                    URL.revokeObjectURL(metadata[ind].url);
                })
            }
            ));

        setFiles([...files, ...data]);
    }

    function remove(name?: string) {
        if (name) {
            const ind = files.findIndex(x => x.name == name);
            if (ind != -1) {
                files.splice(ind, 1);
                setFiles([...files]);
            }
        } else setFiles([]);

        document.dispatchEvent(new CustomEvent('file-input-remove-file', { detail: name }));
    }

    function downloadFormatted(filename: string) {
        const file = files.find(x => x.name == filename)!;
        if (file.type != fileType.FORMATTED) return;

        let str = "#!/formatted\n";
        (file.content as formattedFileData).entries.forEach(x => {
            str += x.head + '\n' + x.content + '\n\n';
        });

        const blob = new Blob([str], {type: 'text/plain;charset=UTF-8;'});
        if ('msSaveOrOpenBlob' in window.navigator) {
            // @ts-ignore
            window.navigator.msSaveBlob(blob, filename);
        } else {
            const elem = window.document.createElement('a');
            elem.href = window.URL.createObjectURL(blob);
            elem.download = filename;
            document.body.appendChild(elem);
            elem.click();
            document.body.removeChild(elem);
        }

        const copy = {...dirtyMap};
        copy[filename] = false;
        setDirtyMap({...copy});
    }

    function addFormattedEntry(e: Event) {
        const data = (e as CustomEvent).detail as { file: string, head: string, body: string };

        // brute force approach: reconstruct text file then reprocess as new file

        const fIndex = files.findIndex(x => x.name == data.file);
        const file = files[fIndex];
        if (file.type != fileType.FORMATTED) return;
        let str = '#!/formatted\n';
        (file.content as formattedFileData).entries.forEach(x => str += `${x.head}\n${x.content}\n\n`);

        str += `${data.head}\n${data.body}`;

        const copy = [...files];
        copy[fIndex].content = readFormattedFile(str)!;
        copy[fIndex].size += (data.head.length + data.body.length); // assume sizeof(char) = 1, we dont need this to be super accurate

        setFiles(copy);
    }

    useEffect(() => {
        const deleteFormattedEntry = (e: Event) => {
            const [filename, index] = (e as CustomEvent).detail as [string, number];

            const copy = [...files];
            const file = copy.find(f => f.name == filename)!;
            delete (file.content as formattedFileData).entries[index];

            setFiles(copy);

            const dCopy = {...dirtyMap};
            dCopy[filename] = true;
            setDirtyMap(dCopy);

            document.dispatchEvent(new CustomEvent('formatted-file-force-update', { detail: filename }));
        };

        const setDirty = (e: Event) => {
            const file = (e as CustomEvent).detail as string;

            const copy = {...dirtyMap};
            copy[file] = true;
            setDirtyMap(copy);
        };

        document.addEventListener('formatted-file-delete-entry', deleteFormattedEntry);
        document.addEventListener('formatted-file-set-dirty', setDirty);
        document.addEventListener('formatted-file-force-add-entry', addFormattedEntry);

        return () => {
            document.removeEventListener('formatted-file-delete-entry', deleteFormattedEntry);
            document.removeEventListener('formatted-file-set-dirty', setDirty);
            document.removeEventListener('formatted-file-force-add-entry', addFormattedEntry);
        };
    });

    return (
        <div className="mb-2">
            <div className="flex justify-between">
                <div>Current Files:</div>
                <div className="text-primary0 flex gap-2 mb-1">
                    <label className="button-text cursor-pointer px-1" title="Add new file">
                        <input type='file' multiple accept=".txt,.md" className="hidden" onChange={addFiles} />
                        <i className="ri-file-add-line mr-1 text-lg"></i>
                        Add File
                    </label>
                    <button className="button-text px-1" title="Remove all files" onClick={() => remove()}>
                        <i className="ri-delete-bin-2-line text-lg mr-1"></i>
                        Remove All
                    </button>
                </div>
            </div>
            {files.length == 0 ? <div className="text-primary0/80 -translate-y-2">No files have been added.</div> : <></>}
            <div className="flex flex-col gap-2 mb-2">
                {files.map((x, k) =>
                    <div key={k} className="flex">
                        <div className="number">{k + 1}</div>
                        <div className="line py-0 hover:bg-surface10">
                            <div className="flex">
                                {x.type == fileType.TEXT ?
                                    <i className="ri-file-text-line mr-1"></i> :
                                    <i className="ri-file-code-line mr-1"></i>}
                                <div className="mr-4 text-left min-w-32">
                                    <span className="text-red-400">{dirtyMap[x.name] ? '*' : ''}</span>
                                    <span className={dirtyMap[x.name] ? 'font-semibold' : ''}>{x.name}</span>
                                </div>
                                <div>({prettifyFileSize(x.size)})</div>
                            </div>
                        </div>
                        {x.type == fileType.FORMATTED ? <>
                            <button className="button ri-add-line ml-1.5" onClick={() => document.dispatchEvent(new CustomEvent('formatted-file-add-entry', { detail: { file: x.name }}))}/>
                            <button className="button ri-file-download-line ml-1.5" onClick={() => downloadFormatted(x.name)}/>
                        </> : <></>}
                        <button className="button ri-close-line ml-1.5" onClick={() => remove(x.name)} />
                    </div>)}
            </div>
            <div className={files.some(x => x.type == fileType.FORMATTED) ? '' : 'hidden'}>
                <div>Edit Formatted Entry:</div>
                <div className="flex mt-1">
                    <div className="bg-surface20 w-[2px] mx-2"></div>
                    <FormattedFileEditor files={files} />
                </div>
            </div>
        </div>
    );
}
