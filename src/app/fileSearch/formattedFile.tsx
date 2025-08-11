import { ReactNode, useEffect, useReducer, useState } from "react";
import { formattedFileData, formattedFileEntry } from "./input";
import { SEARCH_IGNORE, formattedMatch, getHash } from "./util";
import { Divider } from "../util";
import { readRegex } from "../phoneticTree/constants";

export interface f_fileData {
    name: string,
    content: formattedFileData,
    size: number,
}

interface highlightData {
    re: RegExp;
    pos: 'content' | 'head'
}

function MatchEntry({ index, entry, highlight }: { index: [string, number], entry: formattedFileEntry, highlight?: highlightData }) {
    const [deleteState, setDeleteState] = useState(0);

    function applyHighlight(str: string, pos: 'content' | 'head'): ReactNode {
        if (!highlight || pos != highlight.pos) return str;
        highlight.re.lastIndex = 0;
        return (
            <p dangerouslySetInnerHTML={{
                __html: str.replace(highlight.re, '<span class="underline decoration-yellow decoration-2 underline-offset-2">$1</span>')
            }}></p>);
    }

    // when we delete an entry (formatted-file-delete-entry event), entry var becomes null
    if (!entry) return <></>;

    return (
        <div className="ml-2 px-2 rounded-sm flex-grow min-w-0 bg-surface10 border border-surface20 py-0.5 text-ellipsis overflow-hidden whitespace-pre-line wrap-anywhere">
            <div className="flex justify-between mt-1">
                <div className="italic font-semibold">{applyHighlight(entry.head, 'head')}</div>
                <div className="flex gap-2">
                    <button className="button ri-pencil-fill" onClick={() => document.dispatchEvent(new CustomEvent('formatted-file-edit-entry', { detail: { file: index[0], index: index[1]} }))}/>
                    <button className={"button " + (deleteState == 0 ? 'ri-close-line' : 'ri-check-line outline-1 outline outline-red-500')}
                        onClick={(e) => {
                        if (deleteState == 0) {
                            setDeleteState(1);

                            // click elsewhere; reset deletion
                            const callback = (y: MouseEvent) => {
                                if (!(e.target as Node).contains(y.target as Node)) setDeleteState(0);
                                document.removeEventListener('click', callback);
                            }

                            document.addEventListener('click', callback);
                        } else if (deleteState == 1) {
                            // this calls event in input.tsx (since that is where we set the file state that is shared)
                            // (only slightly scuffed)
                            document.dispatchEvent(new CustomEvent('formatted-file-delete-entry', { detail: index }));
                        }
                    }}/>
                </div>
            </div>
            <div>{applyHighlight(entry.content, 'content')}</div>
        </div>
    );
}

function Match({ title, filename, indices, entries, highlight }: { title: string, filename: string, indices: number[], entries: formattedFileEntry[], highlight?: highlightData }) {
    return (
        <div className="mb-1">
            <Divider title={title} reverse={indices.length < 20}>
                <div className="flex mt-1">
                    <div className="bg-surface20 w-[2px] mx-2 shrink-0"></div>
                    <div className="flex gap-2 flex-col w-full">
                        {indices.map((x, i) => (
                            <MatchEntry key={i} index={[filename, x]} entry={entries[x]} highlight={highlight}/>
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
    const [fullContent, setFullContent] = useState<number[]>([]);
    const [partialContent, setPartialContent] = useState<number[]>([]);
    const [highlightRegex, setHighlightRegex] = useState(new RegExp(''));

    useState(() => {
        function callback(e: Event) {
            const name = (e as CustomEvent).detail as string;
            if (name != file.name) return;

            setLastFileLength(-1);
        }

        document.addEventListener('formatted-file-force-update', callback);

        return () => {
            document.removeEventListener('formatted-file-force-update', callback);
        }
    });

    useEffect(() => {
        if (file.size == lastFileLength && phrase == lastPhrase) return;

        setLastFileLength(file.size);
        setLastPhrase(phrase);

        // see fileSearch/util.tsx for algorithm explanation
        const split = [...new Set(phrase.split(' '))].filter(x => !(SEARCH_IGNORE.has(x))).sort();
        const search = getHash(split, file.content.headMap);

        // used to determine if search words appears in content
        const sRe = new RegExp(split.join('|')); // appears somewhere in text
        const fRe = new RegExp(`\\b${split.join('|')}\\b`); // match full word

        // index of each match
        const _full: number[][] = [];
        const _partial: number[][] = [];
        const _content: number[] = [];
        const _partial_content: number[] = [];

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
                if (split.length > 0) {
                    if (fRe.test(entry.content)) _content.push(index);
                    else if (sRe.test(entry.content)) _partial_content.push(index);
                }
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
        setFullContent(_content); // dont sort content
        setPartialContent(_partial_content);

        const re = new RegExp(`(${split.join('|')})`, 'gi');
        setHighlightRegex(re);
    });

    const num = full.length + partial.length + fullContent.length;
    if (num == 0) return <div>No matches for "<span className="font-semibold">{phrase}</span>" in <span className="font-semibold">{file.name}</span>.</div>;

    const title = <div>Found {num} matches for "<span className="font-semibold">{phrase}</span>" in <span className="font-semibold">{file.name}</span></div>;
    
    return (
        <div>
            <Divider title={title} reverse={true}>
                <div className="ml-4">
                    <Match
                        filename={file.name}
                        title={`Full Matches (${full.length})`}
                        indices={full}
                        entries={file.content.entries}
                        highlight={{
                            re: highlightRegex,
                            pos: 'head'}
                        }/>
                    <Match
                        filename={file.name}
                        title={`Partial Matches (${partial.length})`}
                        indices={partial}
                        entries={file.content.entries}
                        highlight={{
                            re: highlightRegex,
                            pos: 'head'}
                        }/>
                    <Match
                        filename={file.name}
                        title={`Content Matches (${fullContent.length})`}
                        indices={fullContent}
                        entries={file.content.entries}
                        highlight={{
                            re: highlightRegex,
                            pos: 'content'}
                        }/>
                    <Match
                        filename={file.name}
                        title={`Partial Content Matches (${partialContent.length})`}
                        indices={partialContent}
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