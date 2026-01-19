import FileInput from "../fileSearch/input";
import { Editor } from "./loader";
import { Divider } from "../util/util";

export function Settings() {
    return (
        <div className="bg-tonal0 rounded-lg">
            <div className="px-4 py-1 text-lg"><i className="ri-tools-line mr-1"></i>Settings</div>
            <div className='mx-4 mb-2 flex flex-col gap-2'>
                <Divider title="File Search">
                    <FileInput />
                </Divider>
                <Divider title="Internal Dictionary">
                    <Editor />
                </Divider>
            </div>
        </div>);
}
