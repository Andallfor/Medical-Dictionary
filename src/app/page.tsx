"use client"

import { createContext, useEffect, useState } from "react";
import 'remixicon/fonts/remixicon.css'
import { fileData } from "./fileSearch/input";
import FileSearch from "./fileSearch/search";
import PhoneticTree from "./phoneticTree/tree";
import { Search } from "./search/search";
import { Settings } from "./settings/panel";
import { Dictionary, Word } from "./dictionary";

export const DICTIONARY_CONTEXT = createContext<Word[]>([]);

export default function Home() {
    // global state for our dictionary
    // DO NOT modify these! you should always go through Dictionary instead or useContext(DICTIONARY_CONTEXT)
    const [INTERNAL_DICTIONARY, SET_INTERNAL_DICTIONARY] = useState<Word[]>([]);

    const [focusedWord, setFocusedWord] = useState<string>('');
    const [files, setFiles] = useState<fileData[]>([]);
    const [tabGroup, setTabGroup] = useState(0);

    useEffect(() => {
        Dictionary.init(SET_INTERNAL_DICTIONARY);
        Dictionary.load('/Medical-Dictionary/data.txt');
    }, []);

    return (
        <DICTIONARY_CONTEXT value={ INTERNAL_DICTIONARY }>
            <div className="m-8 mt-4">
                <div className="flex flex-col-reverse xl:grid xl:grid-cols-[50%_minmax(0,1fr)] gap-8">
                    <div className="flex flex-col gap-3 flex-shrink-0">
                        <div className="flex bg-tonal0 rounded-lg justify-between gap-2 px-2 py-1">
                            <button className={"flex-grow rounded-md " + (tabGroup == 0 ? 'bg-tonal10' : 'bg-tonal0 hover:bg-surface10')} onClick={() => setTabGroup(0)}>Phonetic Tree</button>
                            <button className={"flex-grow rounded-md " + (tabGroup == 1 ? 'bg-tonal10' : 'bg-tonal0 hover:bg-surface10')} onClick={() => setTabGroup(1)}>File Search</button>
                        </div>
                        <div className={tabGroup == 0 ? '' : 'hidden'}><PhoneticTree /></div>
                        <div className={tabGroup == 1 ? '' : 'hidden'}><FileSearch files={files} phrase={focusedWord} /></div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <Search setFocused={setFocusedWord} />
                        <Settings files={files} setFiles={setFiles} />
                    </div>
                </div>
            </div>
        </DICTIONARY_CONTEXT>
    );
}
