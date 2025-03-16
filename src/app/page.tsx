"use client"

import { useEffect, useState } from "react";
import 'remixicon/fonts/remixicon.css'
import { fileData } from "./fileSearch/input";
import FileSearch from "./fileSearch/search";
import PhoneticTree from "./phoneticTree/tree";
import { Search } from "./search/search";
import { phoneme } from "./phoneticTree/constants";
import { Settings } from "./settings/panel";
import { processDictionary } from "./settings/dictionary";

export default function Home() {
    const [focusedWord, setFocusedWord] = useState<string>('');
    const [files, setFiles] = useState<fileData[]>([]);

    // internal dictionary
    const [loaded, setLoaded] = useState(false);
    const [data, setData] = useState<phoneme[]>([]);

    async function load(url: string, callback: (s: string[]) => void, revoke = true) {
        fetch(url).then(response => response.text()).then(text => {
            const lines = text.split('\n');
            callback(lines);

            if (revoke) URL.revokeObjectURL(url);
        });
    }

    // TODO: figure out how to determine file type
    function upload(e: Event) {
        load((e as CustomEvent).detail as string, (lines) => {
            const phonetics = processDictionary(lines);
            // add in the words that we dont already have
            const filtered: phoneme[] = [...data, ...phonetics.filter(x => data.findIndex((y) => y.word == x.word) == -1)];
            setData(filtered);
        });
    }

    function replace(e: Event) {
        load((e as CustomEvent).detail as string, (lines) => {
            const phonetics = processDictionary(lines);
            setData(phonetics);
        });
    }

    useEffect(() => {
        // load internal dictionary
        if (!loaded) {
            setLoaded(true);
            load('/data.txt', (lines) => {
                const phonetics = processDictionary(lines);
                setData(phonetics);
            }, false);
        }

        window.addEventListener('internal-dictionary-upload', upload);
        window.addEventListener('internal-dictionary-replace', replace);

        return () => {
            window.removeEventListener('internal-dictionary-upload', upload);
            window.removeEventListener('internal-dictionary-replace', replace);
        }
    }, [data]);

    return (
        <div className="m-8">
            <div className="grid grid-cols-[45%_minmax(0,1fr)] gap-8">
                <div className="flex flex-col gap-4 flex-shrink-0">
                    <PhoneticTree data={data}/>
                </div>
                <div className="flex flex-col gap-4">
                    <Search setFocused={setFocusedWord} dictionary={data} />
                    <FileSearch files={files} phrase={focusedWord} />
                    <Settings files={files} setFiles={setFiles} dictionary={data}/>
                </div>
            </div>
            <div className="h-16"></div>
        </div>
    );
}
