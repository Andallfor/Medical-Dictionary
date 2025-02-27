import { mw, phoneme, replacement } from "../phoneticTree/constants";
import { formatConversion, toIpa } from "../phoneticTree/tree";
import { getAudio, getCollegiateDef } from "./api";
import { useEffect, useRef, useState } from "react";

export function SingleWord({ words, dictionary, userSearch }: { words: mw[], dictionary: phoneme[], userSearch: boolean }) {
  const audioPlayer = useRef<HTMLAudioElement | null>(null);
  const [phonetics, setPhonetics] = useState('');

  useEffect(() => {
    if (!words[0].hwi.prs) return;

    const word = words[0];
    const ref = dictionary.find((p) => p.word.toLowerCase() == word.searchTerm);
    let pron = '';
    if (ref) {
      pron = ref.pronunciation;
      setPhonetics(ref.pronunciation);
    } else {
      let str = words[0].hwi.prs[0].mw.trim();

      str = str.replaceAll('-', '');
      const [a, b, c] = formatConversion();
      str = toIpa(str, a as RegExp, b as Record<string, replacement[]>, c as RegExp);

      pron = str;
      setPhonetics('*' + str);
    }

    if (userSearch) window.dispatchEvent(new CustomEvent('phonetic-tree-external-search', { detail: [pron, true] }));

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
      <div className="ml-1 mt-1 text-primary40">
        <div className="italic">{words[0].fl}</div>
        {words[0].shortdef.map((s, k) => 
          <div className="ml-2" key={k}>{k+1}. {s}</div>
        )}
      </div>
    </div>
  );
}
