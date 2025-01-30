import axios, { Axios, AxiosResponse } from "axios";
import { ChangeEvent, Dispatch, SetStateAction } from "react";

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

  return (
    <div className="w-full p-4 pt-2 bg-tonal0 rounded-lg">
      <div>{files.length == 0 ? "No files have been uploaded." : "Uploaded files: " + files.flatMap(x => x.name).join(', ')}</div>
      <div className="mt-4">
        <label className="p-1 rounded-md px-2 cursor-pointer border-surface20 border bg-surface10 hover:bg-tonal0">
          <input type='file' multiple accept=".txt,.md" className="hidden" onChange={addFiles}/>
          <span className="select-none text-primary0">Add New Text</span>
        </label>
      </div>
    </div>
  );
}