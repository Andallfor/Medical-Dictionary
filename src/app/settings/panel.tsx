import { Dispatch, ReactNode, SetStateAction, useState } from "react";
import FileInput, { fileData } from "../fileSearch/input";
import { Editor } from "./loader";
import { phoneme } from "../phoneticTree/constants";

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

function Divider({ title, children }: { title: string, children?: ReactNode }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div>
            <button className="w-full flex items-center gap-4 group" onClick={() => setIsExpanded(!isExpanded)}>
                <p className={isExpanded ? 'font-semibold' : ''}>{title}</p>
                <div className="flex-grow h-[2px] rounded-lg bg-surface30 my-1 group-hover:bg-surface40"></div>
                <i className={"ri-arrow-down-s-line ri-lg " + (isExpanded ? 'rotate-180' : '')}></i>
            </button>
            <div className={isExpanded ? '' : 'hidden'}>
                {children}
            </div>
        </div>
    )
}