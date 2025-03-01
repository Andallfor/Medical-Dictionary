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
    }
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
    'ɚ': 7,
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

export const oedToIpa: Record<string, string> = {
    'ɪ(ə)r': 'iɚ',
    'ɛ(ə)r': 'ɛɚ',
    'ʊ(ə)r': 'ʊɚ',
    'eɪ': 'e',
    'ər': 'ɚ',
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
};

// note that the standard we use is a custom modified IPA
export const toStandardized: Record<string, string | replacement[]> = {
    // oed
    'ɪ(ə)r': 'iɚ',
    'ɛ(ə)r': 'ɛɚ',
    'ʊ(ə)r': 'ʊɚ',
    'eɪ': 'e',
    'ər': 'ɚ',
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

    // mw
    'ē': [{to: 'i', whenStress: true},
          {to: 'ɪ', whenStress: false}],
    'i': 'ɪ',
    'ā': 'e',
    'e': 'ɛ',
    'a': 'æ',
    // ə -> ʌ when stressed, matched in oed section
    // ər -> ɚ, matched in oed section
    'ü': 'u',
    'u̇': 'ʊ',
    'ō': 'o',
    'ȯ': 'ɔ',
    'ȯr': 'ɔr', // this is tech redundant
    'ä': 'a',
    'är': 'ar', // similarly redundant
    'ī': 'aɪ',
    'ȯi': 'ɔi',
    'au̇': 'au',
    'ir': 'iɚ',
    'er': 'ɛɚ',
    'u̇r': 'ʊɚ',
}

// regex to match each phoneme, e.g. /ie|a|i|e|.../ with longest phonemes first
export const r_vowel = new RegExp([...Object.keys(VowelOrder)].join('|'), 'g');
export const formattedConsonants = Object.keys(ConsonantOrder).sort((a, b) => b.length - a.length).join('|') as string;
export const r_tail_c = new RegExp(`(${formattedConsonants})$`);
export const r_stress_c = new RegExp(`^(${formattedConsonants})`); // note that lead and primary stressed const are the same
export const r_sec_c = new RegExp(`ˌ(${formattedConsonants})`, 'g');

export function readRegex(r: RegExpMatchArray | null, rm = '') {
    if (r) {
        if (rm != '') return r[0].replace(rm, '');
        else return r[0];
    } else return '';
}