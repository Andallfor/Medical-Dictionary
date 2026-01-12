"use client"

import { useEffect, useState } from "react";
import 'remixicon/fonts/remixicon.css'
import { fileData } from "./fileSearch/input";
import FileSearch from "./fileSearch/search";
import PhoneticTree from "./phoneticTree/tree";
import { Search } from "./search/search";
import { phoneme, Word } from "./phoneticTree/constants";
import { Settings } from "./settings/panel";
import { processDictionary, readInternalDictionary } from "./settings/dictionary";

export default function Home() {
    const [focusedWord, setFocusedWord] = useState<string>('');
    const [files, setFiles] = useState<fileData[]>([]);
    const [tabGroup, setTabGroup] = useState(0);

    // internal dictionary
    const [loaded, setLoaded] = useState(false);
    const [data, setData] = useState<Word[]>([]);

    async function load(url: string, callback: (s: string[]) => void, revoke = true) {
        fetch(url).then(response => response.text()).then(text => {
            const lines = text.split('\n');
            callback(lines);

            if (revoke) URL.revokeObjectURL(url);
        });
    }

    function upload(e: Event) {
        const [str, isFile] = (e as CustomEvent).detail as [string, boolean];

        function process(lines: string[]) {
            const words = readInternalDictionary(lines);
            const seen: Set<string> = new Set<string>();

            // data (in memory values) takes priority
            const values = [...data, ...words].filter(x => {
                // accept no dupes, if it does not have pron or pron is not marked for deletion
                const valid = !seen.has(x.word) && !x.pronunciation?.shouldDelete;
                seen.add(x.word);
                return valid;
            });

            setData(values);
        }

        if (isFile) load(str, process);
        else process(str.split('\n'));
    }

    function replace(e: Event) {
        load((e as CustomEvent).detail as string, lines => setData(readInternalDictionary(lines)));
    }

    useEffect(() => {
        // load internal dictionary
        if (!loaded) {
            setLoaded(true);
            load('/Medical-Dictionary/data.txt', lines => setData(readInternalDictionary(lines)), false);
        }

        window.addEventListener('internal-dictionary-upload', upload);
        window.addEventListener('internal-dictionary-replace', replace);

        return () => {
            window.removeEventListener('internal-dictionary-upload', upload);
            window.removeEventListener('internal-dictionary-replace', replace);
        }
    }, [data]);

    return (
        <div className="m-8 mt-4">
            <div className="flex flex-col-reverse xl:grid xl:grid-cols-[50%_minmax(0,1fr)] gap-8">
                <div className="flex flex-col gap-3 flex-shrink-0">
                    <div className="flex bg-tonal0 rounded-lg justify-between gap-2 px-2 py-1">
                        <button className={"flex-grow rounded-md " + (tabGroup == 0 ? 'bg-tonal10' : 'bg-tonal0 hover:bg-surface10')} onClick={() => setTabGroup(0)}>Phonetic Tree</button>
                        <button className={"flex-grow rounded-md " + (tabGroup == 1 ? 'bg-tonal10' : 'bg-tonal0 hover:bg-surface10')} onClick={() => setTabGroup(1)}>File Search</button>
                    </div>
                    {/* <div className={tabGroup == 0 ? '' : 'hidden'}><PhoneticTree data={data}/></div> */}
                    <div className={tabGroup == 1 ? '' : 'hidden'}><FileSearch files={files} phrase={focusedWord} /></div>
                </div>
                <div className="flex flex-col gap-4">
                    <Search setFocused={setFocusedWord} dictionary={data} />
                    {/* <Settings files={files} setFiles={setFiles} dictionary={data} /> */}
                </div>
            </div>
        </div>
    );
}
