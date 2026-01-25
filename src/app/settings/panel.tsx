import FileInput from "../fileSearch/input";
import { Editor } from "./loader";
import { Divider, DividerRef } from "../util/util";
import { useEffect, useRef } from "react";

export function Settings() {
    const dict = useRef<DividerRef>(null);

    useEffect(() => {
        function openDictionary() { dict.current?.set(true); }

        window.addEventListener('internal-dictionary-editor-add-line', openDictionary);
        return () => window.removeEventListener('internal-dictionary-editor-add-line', openDictionary);
    });

    return (
        <div className="bg-tonal0 rounded-lg">
            <div className="px-4 py-1 text-lg"><i className="ri-tools-line mr-1"></i>Settings</div>
            <div className='mx-4 mb-2 flex flex-col gap-2'>
                <Divider title="File Search">
                    <FileInput />
                </Divider>
                <Divider title="Internal Dictionary" ref={dict}>
                    <Editor />
                </Divider>
            </div>
        </div>);
}
