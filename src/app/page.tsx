"use client"

import { useEffect, useState } from "react";
import 'remixicon/fonts/remixicon.css'
import FileInput, { fileData } from "./fileSearch/input";
import FileSearch from "./fileSearch/search";
import PhoneticTree, { toIpa } from "./phoneticTree/tree";
import { Search } from "./search/search";
import { mw, phoneme, r_sec_c, r_stress_c, r_tail_c, r_vowel, readRegex, replacement } from "./phoneticTree/constants";

export default function Home() {
    const [focusedWord, setFocusedWord] = useState<string>('');
    const [files, setFiles] = useState<fileData[]>([]);

    // internal dictionary
    const [loaded, setLoaded] = useState(false);
    const [data, setData] = useState<phoneme[]>([]);

    useEffect(() => {
        // load internal dictionary
        if (!loaded) {
            setLoaded(true);
            // https://observablehq.com/@mbostock/fetch-utf-16
            fetch('/data.txt').then(response => response.arrayBuffer()).then(buffer => {
                const lines = new TextDecoder('utf-16le').decode(buffer).substring(1).split('\n'); // skip bom
                const phonetics: phoneme[] = [];

                lines.forEach((line) => {
                    if (line.length == 0) return;
                    line = line.trim();

                    // some words may not have a pron (denoted by either nothing following = or no =)
                    const split = line.split('=');
                    let word = "", pron = "";
                    if (split.length == 2) {
                        word = split[0];
                        pron = toIpa(split[1], 'OED');
                    } else word = line;

                    const primary = pron.includes('ˈ') ? pron.split('ˈ')[1] : pron;
                    const stressedConst = readRegex(primary.match(r_stress_c));

                    phonetics.push({
                        word: word.toLowerCase(),
                        pronunciation: pron,
                        primary: {
                            vowels: [...primary.matchAll(r_vowel)].map(x => x[0] as string),
                            consonants: {
                                stressed: [
                                    stressedConst,
                                    // dont question it
                                    ...([...primary.matchAll(r_sec_c)].map(x => readRegex(x, 'ˌ')))
                                ],
                                leading: stressedConst,
                                tail: readRegex(primary.match(r_tail_c))
                            }
                        }
                    });
                });

                setData(phonetics);
            });
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
                    <FileInput files={files} setFiles={setFiles} />
                </div>
            </div>
            <div className="h-16"></div>
        </div>
    );
}
