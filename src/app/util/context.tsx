import { createContext, Dispatch, ReactNode, SetStateAction, useEffect, useState } from "react";
import { Word, Dictionary } from "../dictionary";
import { fileData } from "../fileSearch/input";
import { TranslationDisplayContext } from "../translationDisplay/translation";

interface Stateful<T> {
    get: T,
    set: Dispatch<SetStateAction<T>>,
}

function context<T>(base: T) { return createContext<Stateful<T>>({get: base, set: () => {}}); }

// the internal dictionary
// DO NOT modify this! you should always go through Dictionary instead or useContext(DICTIONARY_CONTEXT)
export const DICTIONARY_CONTEXT = createContext<Word[]>([]);
// the current value being searched
export const FILE_CONTEXT = context<fileData[]>([]);
// the current files loaded for file search
export const FOCUSED_WORD_CONTEXT = context<string>('');
// whether or not the phonetic translation tab is enabled
export const TRANSLATION_DISPLAY_CONTEXT = context<TranslationDisplayContext>({ show: false });

// page.tsx can only export one thing, but we also need to export our global variable here
export function ContextWrapper({ children }: { children: ReactNode }) {
    const [INTERNAL_DICTIONARY, SET_INTERNAL_DICTIONARY] = useState<Word[]>([]);

    const [FOCUSED_WORD, SET_FOCUSED_WORD] = useState<string>('');
    const [FILES, SET_FILES] = useState<fileData[]>([]);
    const [SHOW_TRANSLATION_DISPLAY, SET_SHOW_TRANSLATION_DISPLAY] = useState<TranslationDisplayContext>({ show: false });

    useEffect(() => {
        Dictionary.init(SET_INTERNAL_DICTIONARY);
        Dictionary.load('/Medical-Dictionary/dictionary.csv');
    }, []);

    // apparently, this is the best way to do this??
    return (
        <DICTIONARY_CONTEXT value={ INTERNAL_DICTIONARY }>
        <FILE_CONTEXT value={{ get: FILES, set: SET_FILES}}>
        <FOCUSED_WORD_CONTEXT value={{ get: FOCUSED_WORD, set: SET_FOCUSED_WORD}}>
        <TRANSLATION_DISPLAY_CONTEXT value={{ get: SHOW_TRANSLATION_DISPLAY, set: SET_SHOW_TRANSLATION_DISPLAY }}>
            {children}
        </TRANSLATION_DISPLAY_CONTEXT>
        </FOCUSED_WORD_CONTEXT>
        </FILE_CONTEXT>
        </DICTIONARY_CONTEXT>
    );
}