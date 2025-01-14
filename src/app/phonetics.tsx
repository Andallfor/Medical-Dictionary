import axios from "axios";
import { JSX } from "react";

// https://dictionaryapi.com/products/json

interface sense_def {
    sn: string,
    dt: [string, string][]
}

type sense = [string, sense_def]

interface prs {
    mw: string,
    sound: {
        audio: string
    }
}

export interface mw {
    meta: {
        id: string,
        stems: string[]
    },
    hwi: {
        hw: string,
        prs: prs[]
    },
    fl: string,
    def: {
        sseq: sense[][]
    }[],
    shortdef: string[]
}

export async function getMedicalDef(word: string): Promise<mw[]> {
    let data = null;
    await axios.get("https://dictionaryapi.com/api/v3/references/medical/json/" + word.toLowerCase(), {
        params: {
            'key': process.env.NEXT_PUBLIC_MEDICAL_API
        }
    }).then((r) => {data = r.data});

    return data as unknown as mw[];
}

export async function getCollegiateDef(word: String): Promise<mw[]> {
    let data = null;
    await axios.get("https://dictionaryapi.com/api/v3/references/collegiate/json/" + word.toLowerCase(), {
        params: {
            'key': process.env.NEXT_PUBLIC_COLLEGIATE_API
        }
    }).then((r) => {data = r.data});

    return data as unknown as mw[];
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

export default function phonetics(): JSX.Element {
    return <div></div>;
}