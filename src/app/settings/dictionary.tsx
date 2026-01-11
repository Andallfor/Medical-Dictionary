import { phoneme, readRegex, r_stress_c, r_vowel, r_sec_c, r_tail_c, Tokenization, StandardType } from "../phoneticTree/constants";
import { toIpa } from "../phoneticTree/tree";
import { lineData } from "./editor";

export function processDictionary(lines: string[]) {
    const phonetics: phoneme[] = [];

    lines.forEach((line) => {
        if (line.length == 0) return;
        line = line.trim().normalize();

        // we expect lines to be in the format (weird delimiters are since user can input whatever text in def and i dont really want to do proper input validation)
        // anything after = is optional
        // word=pronunciation<@>part of speech<->def 1<->def 2<->...

        const [a, b] = line.split('<@>');
        const split = a.split('=').map(x => x.normalize());
        let word = "", pron = "";
        if (split.length == 2) {
            word = split[0];
            pron = toIpa(split[1], 'OED');
        } else word = line;

        const c = b ? b.split('<->') : [];
        let part = '', def: string[] = [];
        if (c.length > 0) {
            part = c[0];
            if (c.length > 1) {
                // do not allow any blank lines through
                def = c.slice(1).reduce<string[]>((acc, x) => {
                    const y = x.trim();
                    if (y.length > 0) acc.push(y);
                    return acc;
                }, []);
            }
        }

        const primary = pron.includes('ˈ') ? pron.split('ˈ')[1] : pron;
        const stressedConst = readRegex(primary.match(r_stress_c));

        phonetics.push({
            word: word.toLowerCase(),
            pronunciation: pron,
            primary: {
                vowels: [...primary.matchAll(r_vowel)].map(x => x[0] as string),
                consonants: {
                    stressed: [
                        stressedConst,
                        // dont question it
                        ...([...primary.matchAll(r_sec_c)].map(x => readRegex(x, 'ˌ')))
                    ],
                    leading: stressedConst,
                    tail: readRegex(primary.match(r_tail_c))
                }
            },
            part: part.length == 0 ? undefined : part,
            def: def.length == 0 ? undefined : def,
        });
    });

    // check for duplicates
    phonetics.sort((a, b) => a.word.localeCompare(b.word));
    const filtered: phoneme[] = [];
    let last = "";
    for (let i = 0; i < phonetics.length; i++) {
        if (phonetics[i].word == last) console.warn(`Found duplicate ${phonetics[i].word}. Skipping`);    
        else {
            last = phonetics[i].word;
            filtered.push(phonetics[i]);
        }
    }

    return filtered;
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
