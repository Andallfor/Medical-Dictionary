import { ReactNode, useEffect, useState } from "react";
import { formattedFileData, formattedFileEntry } from "./input";
import { SEARCH_IGNORE, formattedMatch, getHash } from "./util";
import { Divider } from "../util";

export interface f_fileData {
    name: string,
    content: formattedFileData,
    size: number,
}

interface highlightData {
    re: RegExp;
    pos: 'content' | 'head'
}

function Match({ title, indices, entries, highlight }: { title: string, indices: number[], entries: formattedFileEntry[], highlight?: highlightData }) {
    function applyHighlight(str: string, pos: 'content' | 'head'): ReactNode {
        if (!highlight || pos != highlight.pos) return str;
        highlight.re.lastIndex = 0;
        return (
            <p dangerouslySetInnerHTML={{
                __html: str.replace(highlight.re, '<span class="underline decoration-yellow decoration-2 underline-offset-2">$1</span>')
            }}></p>);
    }

    return (
        <div className="mb-1">
            <Divider title={title} reverse={indices.length < 20}>
                <div className="flex mt-1">
                    <div className="bg-surface20 w-[2px] mx-2 shrink-0"></div>
                    <div className="flex gap-2 flex-col">
                        {indices.map((x, i) => (
                            <div className="ml-2 px-2 rounded-sm flex-grow min-w-0 bg-surface10 border border-surface20 py-0.5 text-ellipsis overflow-hidden whitespace-pre-line" key={i}>
                                <div className="italic font-semibold">{applyHighlight(entries[x].head, 'head')}</div>
                                <div>{applyHighlight(entries[x].content, 'content')}</div>
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
    const [highlightRegex, setHighlightRegex] = useState(new RegExp(''));

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
        const _full: number[][] = [];
        const _partial: number[][] = [];
        const _content: number[] = [];

        file.content.entries.forEach((entry, index) => {
            let i = 0, j = 0;
            let match = formattedMatch.FULL;
            let isNone = true;
            let numMatches = 0;

            for (; j < search.length; j++) {
                if (i > entry.hash.length - 1) {
                    if (match == formattedMatch.FULL) match = formattedMatch.PARTIAL;
                    break;
                }

                if (search[j] < entry.hash[i]) {
                    if (match == formattedMatch.FULL) match = formattedMatch.PARTIAL;
                } else {
                    if (search[j] > entry.hash[i]) { i++; j--; }
                    else { isNone = false; i++; numMatches++; }
                }
            }

            const score = entry.hash.length - numMatches;
            if (isNone) {
                if (split.length > 0 && sRe.test(entry.content)) _content.push(index);
            } else {
                if (match == formattedMatch.FULL) _full.push([index, score]);
                else _partial.push([index, score]);
            }
        });

        function sort(a: number[], b: number[]) {
            const s = a[1] - b[1];
            return s != 0 ? s : file.content.entries[a[0]].head.localeCompare(file.content.entries[b[0]].head);
        }

        // sort by score
        setFull(_full.sort(sort).map(x => x[0]));
        setPartial(_partial.sort(sort).map(x => x[0]));
        setContent(_content); // dont sort content

        const re = new RegExp(`(${split.join('|')})`, 'gi');
        setHighlightRegex(re);
    });

    const num = full.length + partial.length + content.length;
    if (num == 0) return <div>No matches for "<span className="font-semibold">{phrase}</span>" in <span className="font-semibold">{file.name}</span>.</div>;

    const title = <div>Found {num} matches for "<span className="font-semibold">{phrase}</span>" in <span className="font-semibold">{file.name}</span></div>;
    
    return (
        <div>
            <Divider title={title} reverse={true}>
                <div className="ml-4">
                    <Match
                        title={`Full Matches (${full.length})`}
                        indices={full}
                        entries={file.content.entries}
                        highlight={{
                            re: highlightRegex,
                            pos: 'head'}
                        }/>
                    <Match
                        title={`Partial Matches (${partial.length})`}
                        indices={partial}
                        entries={file.content.entries}
                        highlight={{
                            re: highlightRegex,
                            pos: 'head'}
                        }/>
                    <Match
                        title={`Content Matches (${content.length})`}
                        indices={content}
                        entries={file.content.entries}
                        highlight={{
                            re: highlightRegex,
                            pos: 'content'}
                        }/>
                </div>
            </Divider>
        </div>
    );
}