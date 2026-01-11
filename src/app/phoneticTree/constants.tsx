export type sense = [string, sense_def]

// https://dictionaryapi.com/products/json
export interface sense_def {
    sn: string,
    dt: [string, string][]
}

export interface prs {
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
    shortdef: string[],
    searchTerm: string,
}

export interface phoneme {
    word: string,
    pronunciation: string,
    primary: { // information regarding pronunciation after the primary stress to the end of the word
        vowels: string[],
        consonants: {
            stressed: string[], // all consonants immediately following ˈ or ˌ in order. First entry will be the primary stressed or empty string if none
            leading: string, // empty string if none (i.e. vowel starts instead)
            tail: string, // empty string if none
        }
    },
    part?: string,
    def?: string[],
}

export interface wordDefinitionData {
    word: string,
    pronunciation?: string,
    part?: string,
    def?: string[],
    audio?: string,
    shouldWarn: boolean, // if pronunciation was only from MW
}

export interface branchState {
    ind: number;
    active: boolean;
    autoSearch: boolean;
    shouldSearch: boolean;
    phoneme: string | undefined;
    phonemeList: string[];
}

export interface replacement { // these are assumed to be vowels
    to: string;
    whenStress: boolean;
}

// all vowels and consonants are IPA (unless otherwise noted)
export const VowelOrder: Record<string, number> = {
    'i': 0,
    'ɪ': 1,
    'e': 2,
    'ɛ': 3,
    'æ': 4,
    'ə': 5,
    'ʌ': 6,
    'əː': 7,
    'u': 8,
    'ʊ': 9,
    'o': 10,
    'ɔ': 11,
    'ɔr': 12,
    'a': 13,
    'ar': 14,
    'aɪ': 15,
    'ɔɪ': 16,
    'aʊ': 17,
    'iɚ': 18,
    'ɛɚ': 19,
    'ʊɚ': 20,
};

export const ConsonantOrder: Record<string, number> = {
    'm': 0,
    'p': 1, 'pl': 1, 'pr': 1,
    'b': 2, 'bl': 2, 'br': 2,
    'n': 3, 'ng': 3,
    't': 4, 'tr': 4,
    'd': 5, 'dr': 5,
    'k': 6, 'cl': 6, 'cr': 6,
    'kw': 7, 'kj': 7,
    'g': 8, 'gl': 8, 'gr': 8,
    'f': 9, 'fl': 9, 'fr': 9,
    'v': 10,
    'l': 11,
    'r': 12,
    's': 13, 'sl': 13, 'sp': 13, 'st': 13, 'str': 13, 'sk': 13, 'sw': 13,
    'z': 14,
    'sh': 15,
    'ch': 16,
    'th̥': 17, // voiceless
    'th̬': 18, // voiced
    'zh': 19,
    'j': 20,
    'h': 21,
    'w': 22,
    'wh̤': 23, // with breath
    'y': 24,
    '': 100 // override for no consonant
}

export const ConsonantSearch: string[] = [
    'None',
    'm',
    'p',
    'b',
    'n',
    'ng', // in source these two are supposed to be the same but thats rather diff to support currently
    't',
    'd',
    'k', // we are supposed to match for both k and x but we translate x to k in oedToIpa
    'g',
    'f',
    'v',
    'l',
    'r',
    's',
    'sh',
    'ch',
    'th̥',
    'th̬',
    'zh',
    'j'
]

export type standardizeType = 'OED' | 'MW';

type standardizeProcessed = {
    base: RegExp;
    rep: Record<string, replacement[]>;
    joinedReg: RegExp;
}

/*

the phonetic translation pipeline needs to be much more robust
we need to support:
- phonetic tree search matches for multiple variations of a phoneme (4)
- more post processing
    - duplicate stressed consonant (and r as vowel) (7.1)
    - 7.2.1, 7.2.2 are already implemented
    - coerce some phonetics to yu (7.2.2.1)
        - note exception with j in actual word before ju
        - add 'yu' sound
    - coerce u: to omega (7.2.2.2)
    - coerce əʊ to o (7.2.2.3)
    - coerce various to iɚ (7.2.2.4)
        - exception, if before consonant
    - coerce various to ɛɚ (7.2.2.5)
    - coerce various to ʊɚ (7.2.2.6)
    - coerce ʌː to əː (7.2.2.7)

proposed pipeline
we want to represent everything as a token, so a pronunciation is made up of a list of tokens
    each token should contain its own metadata, e.g. type (primary/secondary stress, vowel, consonant)

we first perform substitution
during translation, treat every character as its own token. then repeatedly run "rules" over it until we finish all rules
    - higher priority rules are run last
    - these rules update the tokens

TODO: vowel order and consonant search should search by token id
*/

// we consider everything have the primary stress mark to be stressed
// if the secondary appears afterwards, then stress becomes both
enum Stress {
    none = 0,
    primary = 1,   // 01
    secondary = 2, // 10
    both = 3,      // 11
}

enum TokenType { primaryStress, secondaryStress, vowel, consonant, unknown }

export enum StandardType { mw, oed }

interface Token {
    id: string; // an identifier for the token

    equivalent: string[]; // any exact matches within the text are considered to be this token
    type: TokenType;
    known: boolean; // is this a predefined token?
    replaceCanonical: boolean; // should the canonical be set as the first element of equivalent?

    // values may differ between equivalent phonemes (id)
    instance: {
        canonical: string; // textual representation of phoneme
        stress: Stress; // the current stress this token is in
        // TODO: maybe add in some debug information? like tags?
    }
}

type Rule = { (tokens: Token[]): Token[] };

export class Tokenization {
    // later values have higher priority
    // null means it applies to all types
    static rules: [StandardType | null, Rule][] = [
        // apply stress
        [null,
        toks => {
            toks.forEach((t, i) => {
                if (t.id == 'ˈ') t.instance.stress |= Stress.primary;
                else if (t.id == 'ˌ') t.instance.stress |= Stress.secondary;
                else if (i != 0) t.instance.stress = toks[i - 1].instance.stress; // stress propagates forwards
            })

            // if no stress marks appear, then the entire pron is stressed
            // since everything after a stress mark is stressed, we only need to check if the last element is stressed or not
            if (toks[toks.length - 1].instance.stress == Stress.none) toks.forEach(t => { t.instance.stress = Stress.primary });

            return toks;
        }],

        // translations
        [StandardType.mw, t => this.translate(t, standardize.fromMw)],
        [StandardType.oed, t => this.translate(t, standardize.fromOed)],

        // coalesce tokens into known tokens
        [null,
        toks => {
            return toks;
            // as with translations, we also want to form the largest tokens possible
            // im sure theres a better way to go about this but ehhh

            // at this point, everything is still text-based and not really a token

            // at each step (base token), take the longest match (if any)
            const out: Token[] = [];
            for (let i = 0; i < toks.length; i++) {
                // coalesce if new token is equivalent to two or more joined tokens (canonical)
                const base = toks[i].instance.canonical;

                // number of tokens, token to replace with
                let best: [number, Token | null] = [-1, null];

                // look for a known token that matches
                this.knownTokens.forEach(e => {
                    e.equivalent.forEach(test => {
                        // we need new tokens to be two or more tokens, so if it is <= base this is impossible
                        if (test.length <= base.length) return;
                        
                        // the following tokens must exactly make up test which implies must have same length
                        let expectedLen = 0;
                        let numTokens = 0;
                        for (let j = i; j < toks.length; j++) {
                            expectedLen += toks[j].instance.canonical.length;
                            numTokens++;

                            if (expectedLen >= test.length) break;
                        }

                        if (expectedLen != test.length) return;

                        // get the string representation of those tokens
                        let reference = '';
                        for (let j = i; j < i + numTokens; j++) reference += toks[j].instance.canonical;

                        if (test != reference) return;

                        // we have a match, save it as we want to take the longest match
                        if (numTokens > best[0]) {
                            const t = {...e};
                            t.instance.canonical = reference;

                            best = [numTokens, t];
                        }
                    })
                });

                if (best[0] == -1) out.push(toks[i]);
                else {
                    out.push(best[1]!);
                    i += best[0] - 1;
                }
            }

            return out;
        }],

        // special rules

        // set all the known values
    ];

    static knownTokens: Token[] = [
        // currently, this is the same as vowel order
        ...this.simpleTokenVector([
            'i',
            'ɪ',
            'e',
            'ɛ',
            'æ',
            'ə',
            'ʌ',
            'əː',
            'u',
            'ʊ',
            'o',
            'ɔ',
            'ɔr',
            'a',
            'ar',
            'aɪ',
            'ɔɪ',
            'aʊ',
            'iɚ',
            'ɛɚ',
            'ʊɚ'
        ], TokenType.vowel),

        // this is the same as consonant order
        // note that the first element in each array is considered the canonical
        ...this.simpleTokenVector2D([
            ['m'],
            ['p',  'pl', 'pr'],
            ['b',  'bl', 'br'],
            ['n',  'ng'],
            ['t',  'tr'],
            ['d',  'dr'],
            ['k',  'cl', 'cr'],
            ['kw', 'kj'],
            ['g',  'gl', 'gr'],
            ['f',  'fl', 'fr'],
            ['v'],
            ['l'],
            ['r'],
            ['s',  'sl', 'sp', 'st', 'str', 'sk', 'sw'],
            ['z'],
            ['sh'],
            ['ch'],
            ['th̥'],
            ['th̬'],
            ['zh'],
            ['j'],
            ['h'],
            ['w'],
            ['wh̤'],
            ['y'],
        ], TokenType.consonant),

        this.simpleToken(['ˈ'], TokenType.primaryStress),
        this.simpleToken(['ˌ'], TokenType.secondaryStress),
    ];

    static tokenize(pronunciation: string, type: StandardType): Token[] {
        if (pronunciation.length == 0) return [];

        // sanity check: known tokens has no same tokens
        const _map: Set<string> = new Set<string>();
        this.knownTokens.forEach(x =>
            x.equivalent.forEach(y => {
                if (_map.has(y)) console.warn("Known tokens has duplicate " + y);
                _map.add(y);
            })
        );

        // initial step is to convert everything into a token
        let tokens: Token[] = [];
        for (let i = 0; i < pronunciation.length; i++) {
            tokens.push(this.simpleToken([pronunciation[i]], TokenType.unknown, false));
        }

        // console.log(tokens.map(this.copy));

        // theres probably a cleaner functional way to do this but oh well
        this.rules.forEach(([filter, rule]) => {
            if (filter == null || filter == type) {
                tokens = rule(tokens);
                // console.log(tokens.map(this.copy));
            }
        });

        return tokens;
    }

    static translate(toks: Token[], from: Record<string, string | replacement[]>): Token[] {
        const out: Token[] = [];

        // assumptions:
        // all keys are unique (but can partially overlap)
        // longer keys should take priority over shorter (e.g. 'test' and matching for 'es' and 'e' will always take 'es')
        // translations do not stack (e.g. from above, 'e' should not apply after 'es')
        // each token has a canonical of length 1

        if (!toks.every(t => t.instance.canonical.length == 1)) {
            console.warn("Attempting to translate non-uniform toks of length 1!");
            return toks;
        }

        // find the index of each match
        const pron = this.toString(toks);
        const matches = [...pron.matchAll(toRegexOr(Object.keys(from), 'ugd'))];

        let srcIndex = 0; // index corresponding to toks
        matches.forEach(m => {
            const ind = m.index;
            const key = m[0];

            // copy everything up to here into the output
            for (; srcIndex < ind; srcIndex++) out.push(toks[srcIndex]);
            srcIndex += key.length; // offset by the length of the match

            // now apply the translation
            const replacement = from[key];
            if (replacement == undefined) {
                console.log(key);
                console.log(from);
            }
            let val: string = key; // by default dont replace
            if (typeof replacement == 'string') val = replacement;
            else {
                const stressed = toks[ind].instance.stress != Stress.none;
                const rep = replacement.find(x =>
                    (x.whenStress && stressed) || (!x.whenStress && !stressed)
                );

                if (rep != undefined) val = rep.to;
            }

            if (val != '') {
                // we need to maintain stress
                const t = this.simpleToken([val], TokenType.unknown, true);
                t.instance.stress = toks[ind].instance.stress;

                out.push(t);
            }
        });

        // copy rest of tokens
        for (; srcIndex < toks.length; srcIndex++) out.push(toks[srcIndex]);

        return out;
    }

    static toString(tokens: Token[]): string { return tokens.map(x => x.instance.canonical).join(''); }

    // first element in base is used as canonical and id
    static simpleToken(base: [string, ...string[]], type: TokenType, known: boolean = true): Token {
        return {
            id: base[0],
            equivalent: base,
            replaceCanonical: false,
            type: type,
            known: known,
            instance: {
                canonical: base[0],
                stress: Stress.none,
            }
        };
    }

    // create tokens for a list of phonemes, assuming they all have only one equivalency and are of the same type
    static simpleTokenVector(phonemes: string[], type: TokenType): Token[] { return phonemes.map((s) => this.simpleToken([s], type)); }
    static simpleTokenVector2D(phonemes: [string, ...string[]][], type: TokenType): Token[] { return phonemes.map((s) => this.simpleToken(s, type)); }

    static copy(token: Token | undefined): Token | undefined {
        if (!token) return token;

        return {
            id: token.id.repeat(1), // deep copy string
            equivalent: token.equivalent.map(x => x.repeat(1)),
            replaceCanonical: token.replaceCanonical,
            type: token.type,
            known: token.known,
            instance: {
                canonical: token.instance.canonical.repeat(1),
                stress: token.instance.stress,
            }
        }
    }
}

// move into separate file?
export class standardize {
    static get(t: standardizeType) {
        if (t == 'OED') return standardize.fromOed;
        else return standardize.fromMw;
    }

    static getProcessed(t: standardizeType) {
        if (!standardize._p_mw) {
            const [a, b, c] = standardize._format(standardize.fromMw);
            standardize._p_mw = {
                base: a as RegExp,
                rep: b as Record<string, replacement[]>,
                joinedReg: c as RegExp,
            };
        }
        if (!standardize._p_oed) {
            const [a, b, c] = standardize._format(standardize.fromOed);
            standardize._p_oed = {
                base: a as RegExp,
                rep: b as Record<string, replacement[]>,
                joinedReg: c as RegExp,
            };
        }

        if (t == 'OED') return standardize._p_oed!;
        else return standardize._p_mw!;
    }

    // this replaces the previous toIpa
    static format(pronunciation: string, type: standardizeType): [string, Token[]] {
        



        return ['', []]
    }

    // sklɪərəʊˈdəːmə
    // sclɪəːəʊˈʌːmʌ
    // sclɪəːəʊˈdəːmə
    static fromOed: Record<string, string | replacement[]> = {
        'ɪ(ə)r': 'iɚ',
        'ɛ(ə)r': 'ɛɚ',
        'ʊ(ə)r': 'ʊɚ',
        'eɪ': 'e',
        'ər': 'əː',
        'oʊ': 'o',
        'ɑr': 'ar',
        'kl': 'cl',
        'kr': 'cr',
        'kj': 'ky',
        'tʃ': 'ch',
        'dʒ': 'j',
        '(h)w': 'wh̤',
        'ɑ': 'a',
        'ɑ̃': 'an',
        'æ̃': 'n',
        'ᵻ': 'ɪ',
        'ᵿ': 'ə',
        'ŋ': 'ng',
        'x': 'k',
        'ʃ': 'sh',
        'ð': 'th̥',
        'θ': 'th̬',
        'ʒ': 'zh',
        'ə': [{to: 'ʌ', whenStress: true}],
        'ɡ':'g',
        'ɒ': 'a',
    };
    static _p_oed?: standardizeProcessed = undefined;

    static fromMw: Record<string, string | replacement[]> = {
        'ē': [{to: 'i', whenStress: true},
              {to: 'ɪ', whenStress: false}],
        'i': 'ɪ',
        'ā': 'e',
        'e': 'ɛ',
        'a': 'æ',
        'ə': [{to: 'ʌ', whenStress: true}],
        'ər': 'əː',
        'ü': 'u',
        'u̇': 'ʊ',
        'ō': 'o',
        'ȯ': 'ɔ',
        'ȯr': 'ɔr',
        'ä': 'a',
        'är': 'ar',
        'ī': 'aɪ',
        'ȯi': 'ɔi',
        'au̇': 'au',
        'ir': 'iɚ',
        'er': 'ɛɚ',
        'u̇r': 'ʊɚ',
        'oe': 'eu',
        'ue': 'iʊ',
        'ᵊ': '',
        '-': '',
    };
    static _p_mw?: standardizeProcessed = undefined;

    static _format(r: Record<string, string | replacement[]>) {
        const keys = Object.keys(r).sort((a, b) => a.length - b.length);
        const base: Record<string, string> = {};
        const rep: Record<string, replacement[]> = {};

        keys.forEach(k => {
            if (typeof r[k] == 'string') base[k] = r[k] as string;
            else rep[k] = r[k] as replacement[];
        });

        const reg = toRegexOr(Object.keys(base));
        const joinedReg = toRegexOr([...Object.keys(VowelOrder), ...Object.keys(rep)]);

        return [reg, rep, joinedReg];
    }
}

const regexEscape = new RegExp(/[-[\]{}()*+?.,\\^$|#\s]/g);

// regex to match each phoneme, e.g. /ie|a|i|e|.../ with longest phonemes first
export const r_vowel = toRegexOr(Object.keys(VowelOrder));
export const formattedConsonants = toRegexOr(Object.keys(ConsonantOrder)).source;
export const r_tail_c = new RegExp(`(${formattedConsonants})$`);
export const r_stress_c = new RegExp(`^(${formattedConsonants})`); // note that lead and primary stressed const are the same
export const r_sec_c = new RegExp(`ˌ(${formattedConsonants})`, 'g');

// given an array of strings, sort them in descending length and escape any needed characters
// then join them together as (arr1|arr2|...)
export function toRegexOr(arr: string[], flags = 'g'): RegExp {
    // https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    arr = arr.map(x => x.replace(regexEscape, '\\$&')).sort((a, b) => b.length - a.length);
    return new RegExp(`(${arr.join('|')})`, flags);
}

export function readRegex(r: RegExpMatchArray | null, rm = '') {
    if (r) {
        if (rm != '') return r[0].replace(rm, '');
        else return r[0];
    } else return '';
}