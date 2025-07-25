import { Dispatch, ReactNode, SetStateAction, useState } from "react";
import FileInput, { fileData } from "../fileSearch/input";
import { Editor } from "./loader";
import { phoneme } from "../phoneticTree/constants";
import { Divider } from "../util";

export function Settings({ dictionary, files, setFiles }: { dictionary: phoneme[], files: fileData[], setFiles: Dispatch<SetStateAction<fileData[]>> }) {
    return (
        <div className="bg-tonal0 rounded-lg">
            <div className="px-4 py-1 text-lg"><i className="ri-tools-line mr-1"></i>Settings</div>
            <div className='mx-4 mb-2 flex flex-col gap-2'>
                <Divider title="File Search">
                    <FileInput files={files} setFiles={setFiles} />
                </Divider>
                <Divider title="Internal Dictionary">
                    <Editor dictionary={dictionary}/>
                </Divider>
            </div>
        </div>);
}
