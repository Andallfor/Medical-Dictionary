import axios, { Axios, AxiosResponse } from "axios";
import { ChangeEvent, Dispatch, SetStateAction } from "react";
import { prettifyFileSize } from "../util";

interface fileMetadata {
  name: string,
  url: string,
  content: string,
  size: number
}

export interface fileData {
  name: string,
  content: string,
  size: number
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
          data.push({
            name: m.name,
            size: m.size,
            content: content.data
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
        <div className="text-primary0 flex gap-2 text-lg mb-1">
          <label className="rounded-md cursor-pointer border-surface20 border bg-surface10 hover:bg-tonal0 w-[1.75rem] h-[1.75rem] flex items-center justify-center" title="Add new file">
            <input type='file' multiple accept=".txt,.md" className="hidden" onChange={addFiles}/>
            <i className="ri-file-add-line"></i>
          </label>
          <button className="rounded-md w-[1.75rem] h-[1.75rem] border-surface20 border bg-surface10 hover:bg-tonal0 flex items-center justify-center" title="Remove all files" onClick={() => remove()}>
            <i className="ri-delete-bin-2-line"></i>
          </button>
        </div>
      </div>
      {files.length == 0 ? <div className="text-primary0/80 -translate-y-2">No files have been added.</div> : <></>}
      <div className="flex flex-col gap-2 mb-2">
        {files.map((x, k) =>
          <div key={k} className="flex">
            <div className="text-surface50 w-8 flex justify-center items-center flex-shrink-0 font-semibold">{k + 1}</div>
            <button className="px-2 py-0.5 flex items-center justify-between rounded-sm flex-grow min-w-0 bg-surface10 border border-surface20 hover:bg-tonal0 cursor-pointer" onClick={() => remove(x.name)}>
              <div className="flex">
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
