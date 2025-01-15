"use client"

import { useRef, useState } from "react";
import { getMedicalDef, mw } from "./phonetics";
import 'remixicon/fonts/remixicon.css'
import Word from "./word";
import FileInput, { fileData } from "./fileInput";
import FileSearch from "./fileSearch";

export default function Home() {
  const search = useRef<HTMLInputElement | null>(null);
  const [word, setWord] = useState<mw[][]>([]);
  const [files, setFiles] = useState<fileData[]>([]);

  async function handleSearch() {
    if (!search.current) return;

    // TODO: add support for multiple words
    const word = search.current.value.split(' ')[0];
    setWord([await getMedicalDef(word)]);
  }

  return (
    <div className="m-8">
      <div className="flex w-full h-16">
        <div className="w-1/3 flex flex-col gap-4">
          <input className="w-full outline-red-400 outline-1 outline text-2xl p-1" placeholder="Search" type="text" onKeyDown={(k) => k.key == 'Enter' ? handleSearch() : null} ref={search}/>
          <Word words={word}/>
        </div>
        <div className="w-2/3">
          <div className="ml-32 flex flex-col gap-4">
            <FileSearch files={files} phrase={word.map(x => x[0].meta.id).join(' ')}/>
            <FileInput files={files} setFiles={setFiles}/>
          </div>
        </div>
      </div>
    </div>
  );
}
