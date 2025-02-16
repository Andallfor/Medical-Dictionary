"use client"

import { useState } from "react";
import 'remixicon/fonts/remixicon.css'
import FileInput, { fileData } from "./fileSearch/input";
import FileSearch from "./fileSearch/search";
import PhoneticTree from "./phoneticTree/tree";
import { Search } from "./search/search";
import { mw } from "./phoneticTree/constants";

export default function Home() {
    const [words, setWords] = useState<mw[][]>([]);
    const [files, setFiles] = useState<fileData[]>([]);

    return (
        <div className="m-8">
            <div className="grid grid-cols-[45%_minmax(0,1fr)] gap-8">
                <div className="flex flex-col gap-4 flex-shrink-0">
                    <PhoneticTree />
                </div>
                <div className="flex flex-col gap-4">
                    <Search words={words} setWords={setWords} />
                    <FileSearch files={files} phrase={words.map(x => x[0].meta.stems[0]).join(' ')} />
                    <FileInput files={files} setFiles={setFiles} />
                </div>
            </div>
            <div className="h-16"></div>
        </div>
    );
}
