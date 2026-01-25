import { Dispatch, SetStateAction } from "react";
import { StandardType, Token, Tokenization } from "./tokenization";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

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
    source: StandardType;
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
    formatDef(): string[] { return this.def.trim().replaceAll(/\n+/g, '\n').split('\n'); } // each new line is a separate definition
}

type DictionaryDebugRecord = Record<string, [string, StandardType]>;

// singleton
export class Dictionary {
    // we maintain the state of current
    // always call set to update!!!
    private static current: Word[] = [];
    private static sync: Dispatch<SetStateAction<Word[]>>;
    private static active: boolean = false;

    // we want to be able to see what the base pronunciation was before it was translated
    static debugInternalLookup: DictionaryDebugRecord = {};

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
    static async load(url: string, type: 'csv' | 'txt', union = false) {
        if (!this.active) {
            console.error(`Attempting to load dictionary at ${url} but dictionary is not initialized!`);
            return;
        }

        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Could not read dictionary at ${url}!`);
            return;
        }

        if (!union) this.debugInternalLookup = {};

        const text = (await response.text()).normalize();
        const [out, seen] = type == 'csv' ? this.asWord(text, this.debugInternalLookup) : this.asWordOld(text, this.debugInternalLookup);

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

        // https://stackoverflow.com/questions/72683352/how-do-i-write-inta-a-file-and-download-the-file-using-javascript
        const blob = new Blob([this.asFormatted(this.current)], {type: 'text/csv;charset=UTF-8;'});
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

            if (!edit.delete) {
                this.current.push({
                    word: edit.word,
                    pronunciation: edit.pron ? {
                        text: edit.pron,
                        tokens: Tokenization.tokenize(edit.word, edit.pron, StandardType.internal)
                    } : undefined,
                    part: edit.part,
                    def: edit.def ? edit.formatDef() : [],
                    audio: '',
                    source: StandardType.internal,
                });

                this.debugInternalLookup[edit.word] = [edit.pron, StandardType.internal];
            } else delete this.debugInternalLookup[edit.word];
        });

        // inefficient but need to force update
        this.set([...this.current]);
    }

    /* There are two formats, old and new
    Old:
    word=pronunciation<@>part of speech<->def 1<->def 2<->...
    with everything after = optional

    New (csv):
    First line is header
    source (mw, in, od), word, pronunciation, part of speech, def1, def2, def3,...

    source and word are mandatory
    */

    // convert to dictionary format
    private static asFormatted(words: Word[]): string {
        const srcMap: Record<StandardType, string> = {
            [StandardType.mw]: 'mw',
            [StandardType.oed]: 'od',
            [StandardType.internal]: 'in'
        };

        const text: string[][] = words.map(x => [srcMap[x.source], x.word, x.pronunciation?.text ?? '', x.part, ...x.def]);
        // have to manually add in head as each line may have an arbitrary number of values (definitions...), but defining a header will remove that
        const str = '# Source, Word, Pronunciation, Part of Speech, Definitions...\n' + stringify(text);

        return str;
    }

    // convert full text (multiple lines) into words
    private static asWord(text: string, debug?: DictionaryDebugRecord): [Word[], Set<string>] {
        const out: Word[] = [];
        const seen: Set<string> = new Set<string>();
        text = text.normalize();

        const lines = parse(text, {
            delimiter: ',',
            encoding: "utf-8",
            comment: '#',
            skip_empty_lines: true,
            relax_column_count: true,
        });

        lines.forEach(line => {
            if (line.length < 2) {
                console.warn(`${line.join(',')} has invalid length`);
                return;
            }

            const [src, word, pron, part, ...defs] = line;
            if (seen.has(word)) return;

            let source: StandardType | undefined = undefined;
            switch (src) {
                case 'mw': source = StandardType.mw; break;
                case 'od': source = StandardType.oed; break;
                case 'in': source = StandardType.internal; break;
            }

            if (!source) {
                console.warn(`${line.join(',')} has invalid source`);
                return;
            }

            seen.add(word);

            if (debug && pron) debug[word] = [pron, source];

            let p: Pronunciation | undefined = undefined;
            if (pron) {
                const tokens = Tokenization.tokenize(word, pron, source);
                p = {
                    tokens: tokens,
                    text: Tokenization.toString(tokens),
                };
            }

            out.push({
                word: word,
                pronunciation: p,
                part: part ?? '',
                def: defs,
                audio: '',
                source: source
            });
        });

        return [out, seen];
    }

    private static asWordOld(text: string, debug?: DictionaryDebugRecord): [Word[], Set<string>] {
        const out: Word[] = [];
        const seen: Set<string> = new Set<string>();

        text.split('\n').forEach(line => {
            if (line.length == 0) return;
            line = line.trim().normalize();

            // we expect lines to be in the format (weird delimiters are since user can input whatever text in def and i dont really want to do proper input validation)
            // anything after = is optional
            // word=pronunciation<@>part of speech<->def 1<->def 2<->...

            const [base, secondary] = line.split('<@>');
            const [text, pron] = base.split('=');

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
                source: StandardType.oed,
            }

            if (pron) {
                if (debug) debug[StandardType.oed] = [pron, StandardType.oed];
                const t = Tokenization.tokenize(text, pron, StandardType.oed);
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

        return [out, seen];
    }
}
