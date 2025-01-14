"use client"

import { useRef, useState } from "react";
import { getMedicalDef, mw } from "./phonetics";
import 'remixicon/fonts/remixicon.css'
import Word from "./word";

export default function Home() {
  const search = useRef<HTMLInputElement | null>(null);

  const [WORD, setWORD] = useState<mw[][]>([]);

  async function handleSearch() {
    if (!search.current) return;

    // TODO: add support for multiple words
    const word = search.current.value.split(' ')[0];
    setWORD([await getMedicalDef(word)]);
  }

  return (
    <div className="m-8">
      <div className="flex w-full h-16">
        <div className="w-1/3 flex flex-col gap-4">
          <input className="w-full outline-red-400 outline-1 outline text-2xl p-1" placeholder="Search" type="text" onKeyDown={(k) => k.key == 'Enter' ? handleSearch() : null} ref={search}/>
          <Word words={WORD}/>
        </div>
        <div className="w-2/3"></div>
      </div>
    </div>
  );
}
