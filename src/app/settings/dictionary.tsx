import { phoneme, readRegex, r_stress_c, r_vowel, r_sec_c, r_tail_c, Tokenization, StandardType, Word, Token } from "../phoneticTree/constants";
import { lineData } from "./editor";

export function readInternalDictionary(lines: string[]): Word[] {
    const out: Word[] = [];
    const seen: Set<string> = new Set<string>();

    lines.forEach(line => {
        if (line.length == 0) return;
        line = line.trim().normalize();

        // we expect lines to be in the format (weird delimiters are since user can input whatever text in def and i dont really want to do proper input validation)
        // anything after = is optional
        // word=pronunciation<@>part of speech<->def 1<->def 2<->...

        const [base, secondary] = line.split('<@>');
        const [text, pron] = base.split('=').map(x => x?.normalize());

        if (seen.has(text)) {
            console.warn(`Found duplicate ${text}. Skipping`);
            return;
        }
        seen.add(text);
        
        const word: Word = {
            word: text,
            def: [],
            part: '',
            audio: '',
            isInternal: true,
        }

        if (pron) {
            const t = Tokenization.tokenize(pron, StandardType.oed);
            word.pronunciation = {
                tokens: t,
                text: Tokenization.toString(t),
                shouldDelete: false,
            };
        }

        if (secondary) {
            const split = secondary.split('<->');
            word.part = split[0];

            for (let i = 1; i < split.length; i++) {
                const s = split[i].trim();
                if (s.length > 0) word.def.push(s);
            }
        }

        out.push(word);
    });

    return out;
}

export function fmt_ld(x: lineData) {
    // signal deletion with "DELETE"
    if (x.shouldDelete) return `${x.edit.word}=DELETE`;
    else {
        let base = `${x.edit.word}=${x.edit.pron}`;
        const hasPart = x.edit.part && x.edit.part.length > 0;
        const hasDef = x.edit.def && x.edit.def.length > 0;
        if (hasPart || hasDef) {
            base += `<@>${hasPart ? x.edit.part : ''}<->`;
            if (hasDef) base += x.edit.def!.trim().replace(/\r?\n/g, '<->');
        }

        return base;
    }
}

export function fmt_ph(x: phoneme) {
    let base = `${x.word}=${x.pronunciation}`;
    const hasPart = x.part && x.part.length > 0;
    const hasDef = x.def && x.def.length > 0;
    if (hasPart || hasDef) {
        base += `<@>${hasPart ? x.part : ''}<->`;
        if (hasDef) base += x.def!.map(x => x.trim()).join('<->');
    }

    return base;
}
