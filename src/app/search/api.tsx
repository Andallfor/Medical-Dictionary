import axios from "axios";
import { mw, prs } from "../phoneticTree/constants";

export async function getMedicalDef(word: string): Promise<mw[] | undefined> {
    let data = null;
    await axios.get("https://dictionaryapi.com/api/v3/references/medical/json/" + word.toLowerCase(), {
        params: {
            'key': process.env.NEXT_PUBLIC_MEDICAL_API
        }
    }).then((r) => {data = r.data});

    if (!data) return undefined;

    if (typeof data[0] == 'string' || (data as string[]).length == 0) return undefined;
    else {
        const d = data as mw[];
        for (let i = 0; i < d.length; i++) d[i].searchTerm = word;

        return d;
    }
}

export async function getCollegiateDef(word: string): Promise<[mw[] | undefined, string[] | undefined]> {
    let data = null;
    await axios.get("https://dictionaryapi.com/api/v3/references/collegiate/json/" + word.toLowerCase(), {
        params: {
            'key': process.env.NEXT_PUBLIC_COLLEGIATE_API
        }
    }).then((r) => {data = r.data});

    if (!data || (data as string[]).length == 0) return [undefined, undefined];

    if (typeof data[0] == 'string') return [undefined, data as string[]];
    else {
        const d = data as mw[];
        for (let i = 0; i < d.length; i++) d[i].searchTerm = word;

        return [d, undefined];
    }
}

export function getAudio(w: prs) {
    const audio = w.sound.audio;
    let sub = audio.charAt(0);

    if (audio.startsWith("bix")) sub = "bix";
    else if (audio.startsWith("gg")) sub = "gg";
    else if (sub.toLowerCase() == sub.toUpperCase()) sub = "number"; // is not alpha

    const link = `https://media.merriam-webster.com/audio/prons/en/us/mp3/${sub}/${audio}.mp3`

    return link;
}
