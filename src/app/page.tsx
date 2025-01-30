"use client"

import { useRef, useState } from "react";
import { getMedicalDef, mw } from "./phonetics";
import 'remixicon/fonts/remixicon.css'
import Word from "./word";
import FileInput, { fileData } from "./fileInput";
import FileSearch from "./fileSearch";
import PhoneticTree from "./phoneticTree";
import { InferGetStaticPropsType } from "next";

export default function Home() {
  const search = useRef<HTMLInputElement | null>(null);
  const [words, setWords] = useState<mw[][]>([]);
  const [files, setFiles] = useState<fileData[]>([]);

  async function handleSearch() {
    if (!search.current) return;

    // TODO: add support for multiple words
    const word = search.current.value.split(' ')[0];
    setWords([await getMedicalDef(word)]);
  }

  return (
    <div className="m-8">
      <div className="flex w-full">
        <div className="w-1/3 flex flex-col gap-4">
          <PhoneticTree/>
        </div>
        <div className="w-2/3">
          <div className="ml-32 flex flex-col gap-4">
            <input className="w-1/3 outline-red-400 outline-1 outline text-2xl p-1" placeholder="Search" type="text" onKeyDown={(k) => k.key == 'Enter' ? handleSearch() : null} ref={search}/>
            <Word words={words}/>
            <FileSearch files={files} phrase={words.map(x => x[0].meta.stems[0]).join(' ')}/>
            <FileInput files={files} setFiles={setFiles}/>
          </div>
        </div>
      </div>
      <div className="h-16"></div>
    </div>
  );
}
