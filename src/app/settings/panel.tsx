import { Dispatch, SetStateAction } from "react";
import FileInput, { fileData } from "../fileSearch/input";
import { Editor } from "./loader";
import { Divider } from "../util";

export function Settings({ files, setFiles }: { files: fileData[], setFiles: Dispatch<SetStateAction<fileData[]>> }) {
    return (
        <div className="bg-tonal0 rounded-lg">
            <div className="px-4 py-1 text-lg"><i className="ri-tools-line mr-1"></i>Settings</div>
            <div className='mx-4 mb-2 flex flex-col gap-2'>
                <Divider title="File Search">
                    <FileInput files={files} setFiles={setFiles} />
                </Divider>
                <Divider title="Internal Dictionary">
                    <Editor />
                </Divider>
            </div>
        </div>);
}
