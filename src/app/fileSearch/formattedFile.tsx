import { useEffect, useState } from "react";
import { formattedFileData, formattedFileEntry } from "./input";
import { SEARCH_IGNORE, formattedMatch, getHash } from "./util";
import { Divider } from "../util";

export interface f_fileData {
    name: string,
    content: formattedFileData,
    size: number,
}

function Match({ title, indices, entries }: { title: string, indices: number[], entries: formattedFileEntry[] }) {
    return (
        <div className="mb-1">
            <Divider title={title} reverse={indices.length < 20}>
                <div className="flex mt-1">
                    <div className="bg-surface20 w-[2px] mx-2 shrink-0"></div>
                    <div className="flex gap-2 flex-col">
                        {indices.map((x, i) => (
                            <div className="ml-2 px-2 rounded-sm flex-grow min-w-0 bg-surface10 border border-surface20 py-0.5 text-ellipsis overflow-hidden whitespace-pre-line" key={i}>
                                <p className="italic font-semibold">{entries[x].head}</p>
                                <p>{entries[x].content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Divider>
        </div>);
}

export function FormattedFileContainer({ file, phrase }: { file: f_fileData, phrase: string }) {
    const [lastFileLength, setLastFileLength] = useState(0);
    const [lastPhrase, setLastPhrase] = useState('');
    const [full, setFull] = useState<number[]>([]);
    const [partial, setPartial] = useState<number[]>([]);
    const [content, setContent] = useState<number[]>([]);

    useEffect(() => {
        if (file.size == lastFileLength && phrase == lastPhrase) return;

        setLastFileLength(file.size);
        setLastPhrase(phrase);

        // see fileSearch/util.tsx for algorithm explanation
        const split = [...new Set(phrase.split(' '))].filter(x => !(SEARCH_IGNORE.has(x))).sort();
        const search = getHash(split, file.content.headMap);

        // used to determine if search words appears in content
        const sRe = new RegExp(split.join('|'));

        // index of each match
        const _full: number[] = [];
        const _partial: number[] = [];
        const _content: number[] = [];

        file.content.entries.forEach((entry, index) => {
            let i = 0, j = 0;
            let match = formattedMatch.FULL;
            let isNone = true;

            for (; j < search.length; j++) {
                if (i > entry.hash.length - 1) {
                    if (match == formattedMatch.FULL) match = formattedMatch.PARTIAL;
                    break;
                }

                if (search[j] < entry.hash[i]) {
                    if (match == formattedMatch.FULL) match = formattedMatch.PARTIAL;
                } else {
                    if (search[j] > entry.hash[i]) { i++; j--; }
                    else { isNone = false; i++; }
                }
            }

            if (isNone) {
                if (split.length > 0 && sRe.test(entry.content)) _content.push(index);
            } else {
                if (match == formattedMatch.FULL) _full.push(index);
                else _partial.push(index);
            }
        });

        setFull(_full);
        setPartial(_partial);
        setContent(_content);
    });

    // TODO: sort matches by how close they are!

    const num = full.length + partial.length + content.length;
    if (num == 0) return <div>No matches for "<span className="font-semibold">{phrase}</span>" in <span className="font-semibold">{file.name}</span>.</div>;

    const title = <div>Found {num} matches for "<span className="font-semibold">{phrase}</span>" in <span className="font-semibold">{file.name}</span></div>;
    
    return (
        <div>
            <Divider title={title} reverse={true}>
                <div className="ml-4">
                    <Match title={`Full Matches (${full.length})`} indices={full} entries={file.content.entries}/>
                    <Match title={`Partial Matches (${partial.length})`} indices={partial} entries={file.content.entries}/>
                    <Match title={`Content Matches (${content.length})`} indices={content} entries={file.content.entries}/>
                </div>
            </Divider>
        </div>
    );
}