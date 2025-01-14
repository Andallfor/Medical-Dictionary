import { getAudio, getCollegiateDef, mw } from "./phonetics";
import { useRef, useState } from "react";

function SingleWord({ words }: { words: mw[] }) {
  const audioPlayer = useRef<HTMLAudioElement | null>(null);

  const word = words[0];
  const [phonetics, setPhonetics] = useState(word.hwi.prs[0].mw.trim());

  if (phonetics.startsWith('-')) {
    // for some reason medical words do not always provide their full pronunciation if it is also provided in the collegiate API
    setPhonetics('Loading...');
    getCollegiateDef(word.meta.id).then((r) => setPhonetics(r[0].hwi.prs[0].mw.trim()));
  }

  return (
    <div>
      <span className="capitalize">{word.meta.id}</span>
      <button className="mx-3 border-black border-[1px] hover:bg-gray-100 bg-gray-50 rounded-md px-2"
        onClick={() => audioPlayer.current ? audioPlayer.current.play() : null}>
        <span>{phonetics}</span>
        <i className=" ml-2 mr-1 ri-volume-up-fill"></i>
        <audio src={getAudio(word.hwi.prs[0])} ref={audioPlayer}></audio>
      </button>
    </div>
  );
}

export default function Word({ words }: { words: mw[][] }) {
  return (
    <div className="text-2xl">
      { words.length == 0 ? ""
        : words.map((word, id) => <SingleWord words={word} key={id}/>)}
    </div>
  )
}