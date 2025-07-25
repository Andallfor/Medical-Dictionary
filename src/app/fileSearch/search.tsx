import { use, useEffect, useState } from "react";
import { fileData, formattedFileData } from "./input";
import { formattedMatch, getHash } from "./util";

const MAX_DISPLAY = 400;

interface occurrence {
    start: string,
    end: string,
    phrase: string // since search is case insensitive, the displayed phrase may differ from the search phrase
}

function FileContainer({ file, phrase }: { file: fileData, phrase: string }) {
    const [occurrences, setOccurrences] = useState<occurrence[]>([]);
    const [lastFileLength, setLastFileLength] = useState(0);
    const [lastPhrase, setLastPhrase] = useState('');
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        if (phrase.trim().length == 0) return;
        phrase = phrase.toLowerCase();

        // ensure only one update (for some reason useEffect triggers twice normally)
        if (file.size == lastFileLength && phrase == lastPhrase) return;

        setLastFileLength(file.size);
        setLastPhrase(phrase);

        if (typeof file.content == 'string') {
            console.log(`Searching for occurrences of ${phrase} in ${file.name}`);

            // get all occurrences
            const match = new RegExp(phrase, 'i'); // case insensitive
            const newline = new RegExp(/(\r?\n|\r)/g);
            const doubleSpace = new RegExp(/\s{2,}/g);
            const maxDist = 100;

            const local: occurrence[] = [];

            let index = 0;
            while (true) {
                const relative = file.content.slice(index).search(match);
                if (relative == -1) break;

                index += relative + phrase.length;

                // find nearest end of sentences
                let end = file.content.substring(index, index + maxDist) + ' '; // edge case where punctuation is at the end of the string
                let sEnd = -1;
                for (let i = 0; i < maxDist; i++) {
                    switch (end.charAt(i)) {
                        case '.':
                        case '!':
                        case '?':
                            if (/\s/.test(end.charAt(i + 1))) sEnd = i;
                            break;
                        case '•':
                            sEnd = i - 1;
                            break;
                    }

                    if (sEnd != -1) break;
                }

                if (sEnd != -1) end = end.substring(0, sEnd + 1).trimEnd();
                else end = end.trimEnd() + '...';

                // find start
                const s = Math.max(0, index - maxDist - phrase.length);
                let start = file.content.substring(s, s + maxDist);
                let sStart = -1;
                for (let i = maxDist - 1; i > 0; i--) {
                    switch (start.charAt(i)) {
                        case '.':
                        case '!':
                        case '?':
                        case '•':
                            if (/\s/.test(start.charAt(i + 1))) sStart = i + 1;
                            break;
                    }

                    if (sStart != -1) break;
                }

                if (sStart != -1) start = start.substring(sStart + 1).trimStart();
                else start = '...' + start.trimStart();

                local.push({
                    start: start.replace(newline, ' ').replace(doubleSpace, ' '),
                    end: end.replace(newline, ' ').replace(doubleSpace, ' '),
                    phrase: file.content.substring(index - phrase.length, index)
                });
            }

            setOccurrences(local.slice(0, MAX_DISPLAY));
        } else {
            // see fileSearch/util.tsx for algorithm explanation
            const split = [...new Set(phrase.split(' '))].sort();
            const search = getHash(split, file.content.headMap);

            // used to determine if search words appears in content
            const sRe = new RegExp(split.join('|'));

            // index of each match
            const full: number[] = [];
            const partial: number[] = [];
            const content: number[] = [];

            file.content.entries.forEach((entry, index) => {
                let i = 0, j = 0;
                let match = formattedMatch.FULL;
                let isNone = true;

                for (; j < search.length; j++) {
                    if (i > entry.hash.length - 1) {
                        if (match == formattedMatch.FULL) match = formattedMatch.PARTIAL;
                        break;
                    }

                    if (search[j] < entry.hash[i] && match == formattedMatch.FULL) match = formattedMatch.PARTIAL;
                    else if (search[j] > entry.hash[i]) { i++; j--; }
                    else { isNone = false; i++; }
                }

                if (isNone) {
                    if (sRe.test(entry.content)) content.push(index);
                } else if (match == formattedMatch.FULL) full.push(index);
                else partial.push(index);
            });

            console.log(full.map(x => (file.content as formattedFileData).entries[x]));
            console.log(partial.map(x => (file.content as formattedFileData).entries[x]));
            console.log(content.map(x => (file.content as formattedFileData).entries[x]));
        }

    }, [file.content, phrase])

    if (occurrences.length == 0) return <div>No matches for "<span className="font-semibold">{phrase}</span>" in <span className="font-semibold">{file.name}</span>.</div>;
    return (
        <div>
            <button className="flex items-center gap-4 pr-2 w-full group" onClick={() => setIsExpanded(!isExpanded)}>
                <div>Found {occurrences.length}{occurrences.length == MAX_DISPLAY ? '+' : ''} matches for "<span className="font-semibold">{phrase}</span>" in <span className="font-semibold">{file.name}</span></div>
                <div className="flex-grow h-[2px] rounded-lg bg-surface30 my-1 group-hover:bg-surface40"></div>
                <i className={"ri-arrow-down-s-line ri-lg " + (isExpanded ? 'rotate-180' : '')}></i>
            </button>
            <div className={"mr-2 flex flex-col gap-2 py-2 " + (isExpanded ? '' : 'hidden')}>
                {occurrences.map((o, i) => (
                    <div className="flex gap-2" key={i}>
                        <span className="text-surface50 w-8 flex justify-center items-center flex-shrink-0 font-semibold">{i + 1}</span>
                        <span className="px-2 rounded-sm flex-grow min-w-0 bg-surface10 border border-surface20 py-0.5 text-ellipsis overflow-hidden text-nowrap">
                            {o.start}
                            <span className="bg-[#f2e194] rounded-sm font-semibold text-tonal10 px-1">{o.phrase}</span>
                            {o.end}
                        </span>
                    </div>))}
            </div>
        </div>
    )
}

export default function FileSearch({ files, phrase }: { files: fileData[], phrase: string }) {
    return (
        <div className="bg-tonal0 px-4 py-2 rounded-lg w-full min-w-0">
            {files.length == 0 ? "No files uploaded." : files.map((x, i) => <FileContainer file={x} phrase={phrase} key={i} />)}
        </div>
    );
}