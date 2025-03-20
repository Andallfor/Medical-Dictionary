import { use, useEffect, useState } from "react";
import { fileData } from "./input";

interface occurrence {
  start: string,
  end: string,
  phrase: string // since search is case insensitive, the displayed phrase may differ from the search phrase
}

function FileContainer({ file, phrase }: { file: fileData, phrase: string }) {
  const [occurrences, setOccurrences] = useState<occurrence[]>([]);
  const [lastFileLength, setLastFileLength] = useState(0);
  const [lastPhrase, setLastPhrase] = useState('');

  useEffect(() => {
    if (phrase.trim().length == 0) return;

    // ensure only one update (for some reason useEffect triggers twice normally)
    if (file.size == lastFileLength && phrase == lastPhrase) return;
    setLastFileLength(file.content.length);
    setLastPhrase(phrase);

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

    setOccurrences(local);
  }, [file.content, phrase])

  if (occurrences.length == 0) return <div>No matches for "<span className="font-semibold">{phrase}</span>" in <span className="font-semibold">{file.name}</span>.</div>;
  return (
    <div className="pb-4">
      <div>Found {occurrences.length} matches for "<span className="font-semibold">{phrase}</span>" in <span className="font-semibold">{file.name}</span>:</div>
      <div className="h-2"></div>
      <div className="mr-2 flex flex-col gap-2">
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
    files.length == 0
      ? <div></div>
      : (<div className="bg-tonal0 px-4 py-2 rounded-lg w-full min-w-0">
          {files.map((x, i) => <FileContainer file={x} phrase={phrase} key={i}/>)}
        </div>)
  );
}