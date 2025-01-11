"use client"

import Image from "next/image";
import { FormEvent, useRef } from "react";
import { getAudio, getMedicalDef } from "./phonetics";
import 'remixicon/fonts/remixicon.css'

export default function Home() {
  const search = useRef<HTMLInputElement | null>(null);
  const searchText = useRef<HTMLParagraphElement | null>(null);
  const pronunciation = useRef<HTMLParagraphElement | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  async function handleSearch() {
    if (!search.current) return;

    // TODO: add support for multiple words
    const word = search.current.value.split(' ')[0];
    const def = await getMedicalDef(word);
    const prs = def.hwi.prs[0];

    if (!audio.current || !pronunciation.current || !searchText.current) return;

    console.log(def);

    // TODO: to get complete pronunciation, need to make identical request to collegiate dictionary
    
    searchText.current.innerText = def.meta.id;
    pronunciation.current.innerText = prs.mw;
    audio.current.src = getAudio(prs);
  }

  async function playAudio() {
    if (!audio.current) return;
    audio.current.play();
  }

  return (
    <div className="m-8">
      <div className="flex w-full h-16">
        <div className="w-1/3 flex flex-col gap-4">
          <input className="w-full outline-red-400 outline-1 outline text-2xl p-1" placeholder="Search" type="text" onKeyDown={(k) => k.key == 'Enter' ? handleSearch() : null} ref={search}/>
          <div className="text-4xl">
            <span className="" ref={searchText}>Hello</span>
            <button className="mx-3 border-black border-[1px] hover:bg-gray-100 bg-gray-50 rounded-md px-2" onClick={playAudio}>
              <span ref={pronunciation}>hə-'lō</span>
              <i className=" ml-2 mr-1 ri-volume-up-fill"></i>
              <audio src={undefined} ref={audio}></audio>
            </button>
          </div>
        </div>
        <div className="w-2/3"></div>
      </div>
    </div>
  );
}
