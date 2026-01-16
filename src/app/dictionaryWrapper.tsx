import { createContext, ReactNode, useEffect, useState } from "react";
import { Dictionary, Word } from "./dictionary";

export const DICTIONARY_CONTEXT = createContext<Word[]>([]);

// page.tsx can only export one thing, but we also need to export our global variable here
export function DictionaryWrapper({ children }: { children: ReactNode}) {
    // global state for our dictionary
    // DO NOT modify these! you should always go through Dictionary instead or useContext(DICTIONARY_CONTEXT)
    const [INTERNAL_DICTIONARY, SET_INTERNAL_DICTIONARY] = useState<Word[]>([]);

    useEffect(() => {
        Dictionary.init(SET_INTERNAL_DICTIONARY);
        Dictionary.load('/Medical-Dictionary/data.txt');
    }, []);

    return <DICTIONARY_CONTEXT value={ INTERNAL_DICTIONARY }>{children}</DICTIONARY_CONTEXT>;
}