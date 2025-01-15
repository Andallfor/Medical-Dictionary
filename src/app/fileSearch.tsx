import { useEffect, useState } from "react";
import { fileData } from "./fileInput";

interface occurrence {
  start: string,
  end: string,
  phrase: string // since search is case insensitive, the displayed phrase may differ from the search phrase
}

function FileContainer({ file, phrase }: { file: fileData, phrase: string }) {
  const [occurrences, setOccurrences] = useState<occurrence[]>([]);

  useEffect(() => {
    if (phrase.trim().length == 0) return;

    console.log(`Searching for occurrences of ${phrase} in ${file.name}`);

    // get all occurrences
    const match = new RegExp(phrase, 'i'); // case insensitive
    const sentenceEnd = new RegExp(/[.?!:]\s/);
    const newline = new RegExp(/\r?\n|\r/g);
    const maxDist = 100;

    const local: occurrence[] = [];

    let index = 0;
    while (true) {
      const relative = file.content.slice(index).search(match);
      if (relative == -1) break;

      index += relative + phrase.length;

      // iterate backwards until we find start of sentence (punctuation followed by space)
      let end = file.content.substring(index, index + maxDist) + ' '; // edge case where punctuation is at the end of the string
      const sEnd = end.search(sentenceEnd);
      if (sEnd != -1) end = end.substring(0, sEnd + 1).trimEnd();
      else end = end.trimEnd() + '...';

      // I am bad at regex TODO: looking into look behinds or something (or just do this with loop)
      const s = Math.max(0, index - maxDist - phrase.length);
      let start = file.content.substring(s, s + maxDist);
      const sStart = Math.max(start.lastIndexOf('. '), start.lastIndexOf('! '), start.lastIndexOf('? ')); // look i spent 30 mins banging my against the regex compiler ok i give up
      if (sStart != -1) start = start.substring(sStart + 1).trimStart();
      else start = '...' + start.trimStart();

      local.push({
        start: start.replace(newline, ' '), // note that this naive replacement may result in double spaces (but that is better than no space)
        end: end.replace(newline, ' '),
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
          <div className="flex h-8 gap-2" key={i}>
            <span className="outline outline-1 outline-purple-600 w-8 flex justify-center items-center font-semibold rounded-sm bg-gray-100">{i + 1}</span>
            <span className="outline outline-1 outline-blue-600 px-2 flex items-center w-full rounded-sm whitespace-pre-wrap">
              {o.start}
              <span className="bg-yellow-200 rounded-sm">{o.phrase}</span>
              {o.end}
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