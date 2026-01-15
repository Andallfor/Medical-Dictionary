import { Dispatch, SetStateAction } from "react";
import { StandardType, Token, Tokenization } from "./tokenization";

export interface Pronunciation {
    tokens: Token[];
    text: string; // string representation of tokens
}

export interface Word {
    word: string; // the actual word
    pronunciation?: Pronunciation;
    part: string; // part of speech
    audio: string; // url to the word's audio (from MW)
    def: string[]; // definition
}

export class DictionaryEdit {
    word: string;
    pron: string;
    part: string;
    def: string;

    delete: boolean = false;

    constructor(word = '', pron = '', part = '', def = '') {
        this.word = word;
        this.pron = pron;
        this.part = part;
        this.def = def;
    }

    valid(): boolean { return this.word.length > 0; }
    isEmpty(): boolean { return this.pron.trim().length == 0 && this.word.trim().length == 0; }
}

// singleton
export class Dictionary {
    // we maintain the state of current
    // always call set to update!!!
    private static current: Word[] = [];
    private static sync: Dispatch<SetStateAction<Word[]>>;
    private static active: boolean = false;

    static init(setDict: Dispatch<SetStateAction<Word[]>>) {
        if (this.active) console.warn("Called Dictionary.init on already initialized dictionary");

        this.sync = setDict;
        this.active = true;
    }

    private static set(to: Word[]) {
        this.current = to;
        this.sync(to);
    }

    // if union is true, do not replace dictionary; take union of new dictionary and current
    // (with new dictionary override duplicate values)
    static async load(url: string, union = false) {
        if (!this.active) {
            console.error(`Attempting to load dictionary at ${url} but dictionary is not initialized!`);
            return;
        }

        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Could not read dictionary at ${url}!`);
            return;
        }

        const lines = (await response.text()).split('\n');
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
            }

            if (pron) {
                const t = Tokenization.tokenize(pron, StandardType.oed);
                word.pronunciation = {
                    tokens: t,
                    text: Tokenization.toString(t),
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

        // we want current to be overridden so dont add anything that is in seen by new dict
        if (union) this.current.forEach(x => {
            if (!seen.has(x.word)) {
                out.push(x);
                seen.add(x.word);
            }
        });

        this.set(out);
    }

    // write dictionary to file
    static save(file: string) {
        if (!this.active) {
            console.error(`Attempting to save dictionary to ${file} but dictionary is not initialized!`);
            return;
        }

        // convert to dictionary text format
        const formatted = this.current.map(w => {
            let root = `${w.word}=${w.pronunciation?.text ?? ''}`;
            const secondary = [];
            if (w.part) secondary.push(w.part);
            if (w.def.length != 0) secondary.push(...w.def.map(x => x.trim()));

            if (secondary.length != 0) root += '<@>' + secondary.join('<->');

            return root;
        }).join('\n');

        // https://stackoverflow.com/questions/72683352/how-do-i-write-inta-a-file-and-download-the-file-using-javascript
        const blob = new Blob([formatted], {type: 'text/plain;charset=UTF-8;'});
        // @ts-ignore
        if ('msSaveOrOpenBlob' in window.navigator) window.navigator.msSaveBlob(blob, file);
        else {
            const elem = window.document.createElement('a');
            elem.href = window.URL.createObjectURL(blob);
            elem.download = file;
            document.body.appendChild(elem);
            elem.click();
            document.body.removeChild(elem);
        }
    }

    // for each element,
    // if to is defined, then delete prev word (word = id), and insert in to
    // if to is undefined, then just delete word
    static update(edits: DictionaryEdit[]) {
        if (!this.active) {
            console.error(`Attempting to update dictionary but dictionary is not initialized!`);
            return;
        }

        edits.forEach(edit => {
            const index = this.current.findIndex(x => x.word == edit.word);
            if (index != -1) this.current.splice(index, 1);

            if (!edit.delete) this.current.push({
                word: edit.word,
                pronunciation: edit.pron ? {
                    text: edit.pron,
                    tokens: Tokenization.tokenize(edit.pron, StandardType.oed) // TODO: maybe add internal type so we dont perform translation on this?
                } : undefined,
                part: edit.part,
                def: edit.def ? [edit.def] : [],
                audio: '',
            });
        });

        // inefficient but need to force update
        this.set([...this.current]);
    }
}
