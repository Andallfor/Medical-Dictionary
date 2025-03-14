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

    // TODO: cleanup
    function upload(e: Event) {
        const url = (e as CustomEvent).detail as string;
        fetch(url).then(response => response.arrayBuffer()).then(buffer => {
            const lines = new TextDecoder('utf-16le').decode(buffer).substring(1).split('\n');
            const phonetics = processDictionary(lines);
            // add in the words that we dont already have
            const filtered: phoneme[] = [...data, ...phonetics.filter(x => data.findIndex((y) => y.word == x.word) == -1)];
            setData(filtered);

            URL.revokeObjectURL(url);
        });
    }

    function replace(e: Event) {
        const url = (e as CustomEvent).detail as string;
        fetch(url).then(response => response.arrayBuffer()).then(buffer => {
            const lines = new TextDecoder('utf-16le').decode(buffer).substring(1).split('\n');
            const phonetics = processDictionary(lines);
            setData(phonetics);

            URL.revokeObjectURL(url);
        });
    }

    useEffect(() => {
        // load internal dictionary
        if (!loaded) {
            setLoaded(true);
            // https://observablehq.com/@mbostock/fetch-utf-16
            fetch('/data.txt').then(response => response.arrayBuffer()).then(buffer => {
                const lines = new TextDecoder('utf-16le').decode(buffer).substring(1).split('\n'); // skip bom
                const phonetics = processDictionary(lines);
                setData(phonetics);
            });
        }

        window.addEventListener('internal-dictionary-upload', upload);
        window.addEventListener('internal-dictionary-replace', replace);

        return () => {
            window.removeEventListener('internal-dictionary-upload', upload);
            window.removeEventListener('internal-dictionary-replace', replace);
        }
    }, []);

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
