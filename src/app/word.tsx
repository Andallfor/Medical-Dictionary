import { getAudio, getCollegiateDef, mw } from "./phoneticApi";
import { useEffect, useRef, useState } from "react";

function SingleWord({ words }: { words: mw[] }) {
  const audioPlayer = useRef<HTMLAudioElement | null>(null);
  const [phonetics, setPhonetics] = useState('');

  useEffect(() => {
    if (!words[0].hwi.prs) return;
    setPhonetics(words[0].hwi.prs[0].mw.trim());

    if (phonetics.startsWith('-')) {
      // for some reason medical words do not always provide their full pronunciation if it is also provided in the collegiate API
      setPhonetics('Loading...');
      getCollegiateDef(words[0].meta.id).then(([a, b]) => {
        if (a != undefined) {
          setPhonetics(a[0].hwi.prs[0].mw.trim());
        }
      });
    }
  }, [words]);

  return (
    <div>
      <div className="text-2xl flex items-center">
        <span className="capitalize">{words[0].meta.id}</span>
        {words[0].hwi.prs ? (
          <button className="mx-3 hover:bg-tonal0/70 border border-surface20 bg-tonal0 rounded-md px-2"
            onClick={() => audioPlayer.current ? audioPlayer.current.play() : null}>
            <span>{phonetics}</span>
            <i className=" ml-2 mr-1 ri-volume-up-fill text-primary40"></i>
            <audio src={getAudio(words[0].hwi.prs[0])} ref={audioPlayer}></audio>
          </button>
        ) : <span className="text-base mx-6">[No audio found]</span>}
        </div>
      <div className="ml-1 mt-1 text-primary40">└<span className="ml-2">{words[0].shortdef}</span></div>
      {/*
      <div className="text-lg ml-2">
        <div>Related Words:</div>
        {words.slice(1).map((w, ind) => (<div key={ind} className="capitalize">- {w.meta.id}</div>))}
      </div>
      */}
    </div>
  );
}

export default function Word({ words }: { words: mw[][] }) {
  return (
    <div>
      { words.length == 0 ? ""
        : words.map((word, id) => <SingleWord words={word} key={id}/>)}
    </div>
  )
}