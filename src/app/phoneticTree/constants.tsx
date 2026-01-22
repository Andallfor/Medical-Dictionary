import { Tokenization, TokenType } from "../tokenization"
import { BranchEntry } from "./search"

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

export interface branchState {
    ind: number;
    active: boolean;
    autoSearch: boolean;
    shouldSearch: boolean;
    phoneme: string | undefined;
    phonemeList: string[];
}

// these should correspond to known token ids
// for vowels, this is one-to-one with our vowel tokens
export const BranchVowels = Tokenization.knownTokens
    .filter(x => x.type == TokenType.vowel)
    .map(x => new BranchEntry(x.instance.canonical));

export const BranchConsonants = [
    new BranchEntry('', 'None'),
    'm',
    'p',
    'b',
    new BranchEntry('n', 'n/ŋ'),
    't',
    'd',
    new BranchEntry('k', 'k/x'), // NOTE: we translate x to ks!
    'g',
    'f',
    'v',
    'l',
    new BranchEntry('ntl', 'n(t)l'),
    'r',
    's',
    'z',
    'ʃ',
    'tʃ',
    'ð',
    'θ',
    'ʒ',
    'dʒ'
].map(x => typeof x == 'string' ? new BranchEntry(x) : x);
