import { use, useEffect, useState } from "react";
import { fileData } from "./fileInput";

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

  if (occurrences.length == 0) return <></>;
  return (
    <div>
      <div>{file.name} ({occurrences.length}):</div>
      <div className="h-2"></div>
      <div className="ml-2 flex flex-col gap-2">
        {occurrences.map((o, i) => (
          <div className="flex gap-2 h-8 w-full" key={i}>
            <span className="outline outline-1 outline-purple-600 w-8 flex justify-center items-center font-semibold rounded-sm bg-gray-100 flex-shrink-0">{i + 1}</span>
            <span className="outline outline-1 outline-blue-600 px-2 flex items-center rounded-sm whitespace-pre-wrap flex-grow min-w-0">
              <span className="text-nowrap">{o.start}</span>
              <span className="bg-yellow-200 rounded-sm">{o.phrase}</span>
              <span className="text-nowrap text-ellipsis overflow-hidden">{o.end}</span>
            </span>
          </div>))}
        </div>
    </div>
  )
}

export default function FileSearch({ files, phrase }: { files: fileData[], phrase: string }) {
  return (
    <div className="w-full outline-green-800 outline-1 outline p-2">
      {files.map((x, i) => <FileContainer file={x} phrase={phrase} key={i}/>)}
    </div>
  );
}