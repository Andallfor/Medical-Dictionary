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
          <div className="ml-16 flex flex-col gap-4">
            <div className="w-full">
              <div className="flex items-center">
                <i className="absolute ri-search-line pl-2 ri-lg translate-y-[-1px]"></i>
                <input className="w-full bg-tonal0 rounded-md px-2 py-1 text-2xl pl-10 placeholder:text-surface30 placeholder:italic" placeholder="Search" type="text" onKeyDown={(k) => k.key == 'Enter' ? handleSearch() : null} ref={search}/>
              </div>
              {words.length == 0
                ? <div></div>
                : (
                  <div className="flex mt-2 mb-6">
                    <div className="bg-surface20 w-[2px] mx-2"></div>
                    <div className="mt-3 mb-2">
                      <Word words={words}/>
                    </div>
                  </div>
                )
              }
            </div>
            <FileSearch files={files} phrase={words.map(x => x[0].meta.stems[0]).join(' ')}/>
            <FileInput files={files} setFiles={setFiles}/>
          </div>
        </div>
      </div>
      <div className="h-16"></div>
    </div>
  );
}
