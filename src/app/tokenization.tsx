// we consider everything have the primary stress mark to be stressed
// if the secondary appears afterwards, then stress becomes both
export enum Stress {
    none = 0,
    primary = 1,   // 01
    secondary = 2, // 10
    both = 3,      // 11
}

export enum TokenType {
    unknown = 0,
    vowel = 1,
    consonant = 2,
    primaryStress = 4,
    secondaryStress = 8,
    stressMark = primaryStress | secondaryStress,
}

export enum StandardType { mw, oed }

export interface TokenInstance {
    canonical: string; // textual representation of phoneme
    stress: Stress; // the current stress this token is in
    // TODO: maybe add in some debug information? like tags?
}

export class Token {
    id: string; // an identifier for the token
    instance: TokenInstance; // values may differ between equivalent phonemes (id)

    equivalent: [string, ...string[]]; // any exact matches within the text are considered to be this token. always has at least 1 element
    type: TokenType = TokenType.unknown;
    known: boolean = false; // is this a predefined token?
    replaceCanonical: boolean = true; // should the canonical be set as the first element of equivalent?

    constructor(id: string, equivalent?: [string, ...string[]], type = TokenType.unknown, known = false, replaceCanonical = true) {
        this.id = id;
        this.instance = { canonical: id, stress: Stress.none };
        this.equivalent = equivalent ?? [id];

        this.type = type;
        this.known = known;
        this.replaceCanonical = replaceCanonical;

        if (this.replaceCanonical) this.instance.canonical = this.equivalent[0];
    }

    // deep copy token
    // if reference is provided, new token will take its instance properties
    copy(reference?: Token): Token {
        const t = new Token(
            this.id.repeat(1),
            this.equivalent.map(x => x.repeat(1)) as [string, ...string[]],
            this.type,
            this.known,
            this.replaceCanonical,
        );

        if (reference) t.instance = reference.instance;
        else {
            t.instance.canonical = this.instance.canonical.repeat(1);
            t.instance.stress = this.instance.stress;   
        }

        return t;
    }

    equals(other: string | Token): boolean {
        if (typeof other == 'string') return this.equivalent.includes(other);
        else return this.equivalent.some(x => other.equals(x));
    }
}

interface Rule { (tokens: Token[]): Token[] };
interface Replacement { to: string; whenStress: boolean; }

export class Tokenization {
    // later values have higher priority
    // null means it applies to all types
    private static rules: [StandardType | null, Rule][] = [
        // apply stress
        [null,
        toks => {
            toks.forEach((t, i) => {
                if (i != 0) t.instance.stress = toks[i - 1].instance.stress; // stress propagates forwards

                if (t.id == 'ˈ') t.instance.stress |= Stress.primary;
                else if (t.id == 'ˌ') t.instance.stress |= Stress.secondary;
            })

            // if no stress marks appear, then the entire pron is stressed
            // since everything after a stress mark is stressed, we only need to check if the last element is stressed or not
            if (toks[toks.length - 1].instance.stress == Stress.none) toks.forEach(t => { t.instance.stress = Stress.primary });

            return toks;
        }],

        // translations
        [StandardType.mw, t => this.translate(t, this.translation[StandardType.mw])],
        [StandardType.oed, t => this.translate(t, this.translation[StandardType.oed])],

        // coalesce tokens into known tokens
        [null,
        toks => {
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
                            const t = e.copy();
                            t.instance.canonical = reference;
                            t.instance.stress = toks[i].instance.stress;

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
        [null,
        toks => toks.map(t => {
            if (t.type != TokenType.unknown) return t;

            const ind = this.knownTokens.findIndex(x => x.equals(t));
            if (ind == -1) {
                t.known = false;
                return t;
            }

            return this.knownTokens[ind].copy(t);
        })],

        // coalesce parenthesis
    ];

    // TODO: if performance is an issue, probably convert this to a map
    static knownTokens: Token[] = [
        ...this.simpleTokenVector([
            'i',
            'ɪ',
            'e',
            'ɛ',
            'æ',
            'ə',
            'əː',
            'ʌ',
            'u',
            'ʊ',
            'o',
            'ɔ',
            'a',
            'aɪ',
            'ɔɪ',
            'au',
            'iɚ',
            'ɛɚ',
            'ʊɚ',
        ], TokenType.vowel),

        // note that the first element in each array is considered the canonical
        ...this.simpleTokenVector2D([
            ['m'],
            ['p',  'pl', 'pr'],
            ['b',  'bl', 'br'],
            ['n',  'ŋ'],
            ['t',  'tr'],
            ['d',  'dr'],
            ['k',  'ks', 'kl', 'kr'], // NOTE: we translate x to ks! (see branches)
            ['kw'],
            ['g',  'gl', 'gr'],
            ['f',  'fl', 'fr'],
            ['v'],
            ['l'],
            ['r'],
            ['s',  'sm', 'sp', 'spl', 'spr', 'sn', 'st', 'str', 'sk', 'sl', 'sw'],
            ['z'],
            ['ʃ'],
            ['tʃ'],
            ['θ'],
            ['ð'],
            ['ʒ'],
            ['dʒ'],
            ['h'],
            ['w'],
            ['wh'], // NOTE:
            ['y'],
        ], TokenType.consonant),

        this.simpleToken(['ˈ'], TokenType.primaryStress),
        this.simpleToken(['ˌ'], TokenType.secondaryStress),
    ];

    private static translation: Record<StandardType, Record<string, string | Replacement[]>> = {
        [StandardType.mw]: {
            'ē': [{to: 'i', whenStress: true},
                  {to: 'ɪ', whenStress: false}],
            'i': 'ɪ',
            'ā': 'e',
            'e': 'ɛ',
            'a': 'æ',
            'ə': [{to: 'ʌ', whenStress: true},
                  {to: 'ə', whenStress: false}],
            'ər': 'əː',
            'ü': 'u',
            'yü': 'yu',
            'u̇': 'ʊ',
            'ō': 'o',
            'ȯ': 'ɔ',
            'ȯr': 'ɔr',
            'ä': 'a',
            'är': 'ar',
            'ī': 'aɪ',
            'oi': 'ɔɪ',
            'au̇': 'au',
            'ir': 'iɚ',
            'er': 'ɛɚ',
            'u̇r': 'ʊɚ',
            'oe': 'eu̇',
            'ue': 'iu̇',
            'ᵊ': '',
            '-': '',

            // consonants
            'k̠': 'k',
            'x': 'ks',
            'sh': 'ʃ',
            'ch': 'tʃ',
            't͟h': 'θ',
            'th': 'ð',
            'zh': 'ʒ',
            'j': "dʒ",
            'hw': 'wh',
            'ʸ': 'y'
        },
        [StandardType.oed]: {
            'i': 'i',
            'ɪ': 'ɪ', // no change
            'eɪ': 'e',
            'ɛ': 'ɛ', // no change
            'æ': 'æ', // no change
            'ə': [{to: 'ʌ', whenStress: true},
                  {to: 'ə', whenStress: false}],
            'ər': 'əː',
            'u': 'u', // no change
            'ju': 'yu',
            'jü': 'yu',
            'ʊ': 'ʊ', // no change
            'oʊ': 'o',
            'əu': 'o',
            'ɔ': 'ɔ', // no change
            'ɔr': 'ɔr', // no change
            'ɑ': 'a',
            'ɑr': 'ar',
            'ɑɪ': 'aɪ',
            'ɔɪ': 'ɔɪ',
            'ɑʊ': 'au',
            'ɪ(ə)r': 'iɚ',
            'ɛ(ə)r': 'ɛɚ',
            'ʊ(ə)r': 'ʊɚ',

            // consonants
            'x': 'ks',
            '(h)w': 'wh',
        }
    };

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

        // theres probably a cleaner functional way to do this but oh well
        this.rules.forEach(([filter, rule]) => {
            if (filter == null || filter == type) tokens = rule(tokens);
        });

        return tokens;
    }

    private static translate(toks: Token[], from: Record<string, string | Replacement[]>): Token[] {
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
        const matches = [...pron.matchAll(toRegexOr(Object.keys(from), 'g'))];

        let srcIndex = 0; // index corresponding to toks
        matches.forEach(m => {
            const ind = m.index;
            const key = m[0];

            // copy everything up to here into the output
            for (; srcIndex < ind; srcIndex++) out.push(toks[srcIndex]);
            srcIndex += key.length; // offset by the length of the match

            // now apply the translation
            const replacement = from[key];
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
                // NOTE: we split replacement into individual tokens for each letter!
                // rather than have val as one token
                // this is because some replacements may not be a known token
                for (let i = 0; i < val.length; i++) {
                    const t = this.simpleToken([val[i]], TokenType.unknown, true);
                    t.instance.stress = toks[ind].instance.stress; // we need to maintain stress

                    out.push(t);
                }
            }
        });

        // copy rest of tokens
        for (; srcIndex < toks.length; srcIndex++) out.push(toks[srcIndex]);

        return out;
    }

    static toString(tokens: Token[]): string {
        return tokens.map(x => x.replaceCanonical ? x.equivalent[0] : x.instance.canonical).join('');
    }

    // return all tokens that have primary stress, skipping the primary stress mark
    static getPrimary(tokens: Token[]): Token[] {
        return tokens.filter(x => x.instance.stress & Stress.primary && !(x.type & TokenType.stressMark));
    }

    // first element in base is used as canonical and id
    private static simpleToken(base: [string, ...string[]], type: TokenType, known: boolean = true): Token {
        return new Token(base[0], base, type, known, false);
    }

    // create tokens for a list of phonemes, assuming they all have only one equivalency and are of the same type
    private static simpleTokenVector(phonemes: string[], type: TokenType): Token[] { return phonemes.map((s) => this.simpleToken([s], type)); }
    private static simpleTokenVector2D(phonemes: [string, ...string[]][], type: TokenType): Token[] { return phonemes.map((s) => this.simpleToken(s, type)); }
}

const regexEscape = new RegExp(/[-[\]{}()*+?.,\\^$|#\s]/g);

// given an array of strings, sort them in descending length and escape any needed characters
// then join them together as (arr1|arr2|...)
function toRegexOr(arr: string[], flags = 'g'): RegExp {
    // https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    arr = arr.map(x => x.replace(regexEscape, '\\$&')).sort((a, b) => b.length - a.length);
    return new RegExp(`(${arr.join('|')})`, flags);
}
