import { phoneme, readRegex, r_stress_c, r_vowel, r_sec_c, r_tail_c } from "../phoneticTree/constants";
import { toIpa } from "../phoneticTree/tree";

export function processDictionary(lines: string[]) {
    const phonetics: phoneme[] = [];

    lines.forEach((line) => {
        if (line.length == 0) return;
        line = line.trim();

        // some words may not have a pron (denoted by either nothing following = or no =)
        const split = line.split('=');
        let word = "", pron = "";
        if (split.length == 2) {
            word = split[0];
            pron = toIpa(split[1], 'OED');
        } else word = line;

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
            }
        });
    });

    return phonetics;
}