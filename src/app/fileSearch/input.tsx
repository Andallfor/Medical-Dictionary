import axios, { Axios, AxiosResponse, all } from "axios";
import { ChangeEvent, Dispatch, SetStateAction } from "react";
import { prettifyFileSize } from "../util";
import { getHash } from "./util";

interface fileMetadata {
  name: string,
  url: string,
  content: string,
  size: number
}

export enum fileType { FORMATTED, TEXT }

export interface fileData {
  name: string,
  content: string | formattedFileData,
  size: number,
  type: fileType,
}

export interface formattedFileData {
  entries: formattedFileEntry[];
  headMap: Record<string, number>;
}

export interface formattedFileEntry {
  hash: number[];
  head: string;
  fHead: string[];
  content: string;
}

export default function FileInput({ files, setFiles }: { files: fileData[], setFiles: Dispatch<SetStateAction<fileData[]>> }) {
  async function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const metadata: fileMetadata[] = [];
    const f = event.target.files!;
    for (let i = 0; i < f.length; i++) {
      const file = f.item(i)!;

      // TODO: replace files if they already exist

      metadata.push({
        name: file.name,
        url: URL.createObjectURL(file),
        content: "",
        size: file.size
      });
    }

    const data: fileData[] = [];

    // download all content
    await axios
      .all(metadata.map(x => axios.get(x.url)))
      .then(axios.spread((...values) => {
        values.forEach((content, ind) => {
          // use the fact that lists are stable, so index here matches metadata index
          const m = metadata[ind];

          let c: string | formattedFileData = content.data as string;
          let type = fileType.TEXT;

          // read formatted file
          // see fileSearch/util.tsx for algorithm explanation
          if ((content.data as string).startsWith('#!/formatted')) {
            const lines = (content.data as string).split('\n');
            const re = /^(?<head>(?:[^a-z]+:)+)(?<body>.*)$/ms;
            const re_s = /:| /g;
            const fc: formattedFileData = { entries: [], headMap: {} };

            // get all entries
            const entries = [];
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i];
              if (line.trim().length == 0) continue;

              if (re.test(line)) entries.push(line);
              else entries[entries.length - 1] += '\n' + line; // some entries are split across multiple lines
            }

            // process entries
            const allHeads: Set<string> = new Set();
            entries.forEach(x => {
              const match = re.exec(x);
              if (!match) {
                console.error('Could not match ' + x);
                return;
              }

              const g = match.groups!;
              // hmmm.....
              // given the head "A B: C:", split on delimiters (:, space), remove whitespace and empty strings then get uniques
              const head = new Set(g['head'].split(re_s).flatMap(y => y.trim().toLowerCase()).filter(x => x.length != 0));
              head.forEach(h => allHeads.add(h));

              const entry = {
                head: g['head'].trim(),
                content: g['body'].trim(),
                hash: [],
                fHead: [...head].sort(),
              };

              fc.entries.push(entry);
            });

            // generate entry hashes
            [...allHeads].sort().forEach((x, i) => fc.headMap[x] = i);
            fc.entries.forEach(x => x.hash = getHash(x.fHead, fc.headMap));

            c = fc;
            type = fileType.FORMATTED;
          }

          data.push({
            name: m.name,
            size: m.size,
            content: c,
            type: type,
          });

          URL.revokeObjectURL(metadata[ind].url);
        })
      }
    ));

    setFiles([...files, ...data]);
  }

  function remove(name?: string) {
    if (name) {
      const ind = files.findIndex(x => x.name == name);
      if (ind != -1) {
        files.splice(ind, 1);
        setFiles([...files]);
      }
    } else setFiles([]);
  }

  return (
    <div className="">
      <div className="flex justify-between">
        <div>Current Files:</div>
        <div className="text-primary0 flex gap-2 mb-1">
          <label className="button-text cursor-pointer px-1" title="Add new file">
            <input type='file' multiple accept=".txt,.md" className="hidden" onChange={addFiles}/>
            <i className="ri-file-add-line mr-1 text-lg"></i>
            Add File
          </label>
          <button className="button-text px-1" title="Remove all files" onClick={() => remove()}>
            <i className="ri-delete-bin-2-line text-lg mr-1"></i>
            Remove All
          </button>
        </div>
      </div>
      {files.length == 0 ? <div className="text-primary0/80 -translate-y-2">No files have been added.</div> : <></>}
      <div className="flex flex-col gap-2 mb-2">
        {files.map((x, k) =>
          <div key={k} className="flex">
            <div className="number">{k + 1}</div>
            <button className="line cursor-pointer" onClick={() => remove(x.name)}>
              <div className="flex">
                {x.type == fileType.TEXT ?
                  <i className="ri-file-text-line mr-1"></i> :
                  <i className="ri-file-code-line mr-1"></i>}
                <div className="mr-4 font-semibold text-left min-w-32">{x.name}</div>
                <div>({prettifyFileSize(x.size)})</div>
              </div>
              <i className="ri-close-line ri-lg"></i>
            </button>
          </div>)}
      </div>
    </div>
  );
}
