import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { SingleWord } from "./word";
import { getCollegiateDef, getMedicalDef } from "./api";
import { mw, phoneme } from "../phoneticTree/constants";
import { capitalize } from "../util";

export function Search({ words, setWords, dictionary }: { words: mw[][], setWords: Dispatch<SetStateAction<mw[][]>>, dictionary: phoneme[] }) {
    const [searchError, setSearchError] = useState('');
    const [loading, setLoading] = useState('');
    const [isUserSearch, setIsUserSearch] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const search = useRef<HTMLInputElement | null>(null);

    async function handleSearch(userSearch: boolean) {
        if (!search.current) return;
        setIsUserSearch(userSearch);
        search.current.blur();

        const history = [search.current.value, ...searchHistory];
        if (history.length > 20) history.pop();
        setSearchHistory(history);

        // TODO: add support for multiple words
        const word = search.current.value.split(' ')[0];
        setLoading(`Searching for ${word}...`)

        const [col, dym] = await getCollegiateDef(word);
        if (col) {
            setWords([col as mw[]]);
            setSearchError('');
        } else {
            setSearchError('Unable to find ' + word);
            setWords([]);
            if (dym) console.log(dym);
        }

        setLoading('');
    }

    useEffect(() => {
        function overrideSearch(e: Event) {
            const event = e as CustomEvent;
            if (!search.current) return;

            const [text, user] = event.detail as [string, boolean];
            search.current.value = text;
            handleSearch(user);
        }

        window.addEventListener('force-set-file-search', overrideSearch);
        return () => window.removeEventListener('force-set-file-search', overrideSearch);
    }, [searchHistory]);

    return (
        <div className="w-full relative">
            <div className="flex items-center peer">
                <i className="absolute ri-search-line pl-2 ri-lg translate-y-[-1px]"></i>
                <input className="w-full bg-tonal0 rounded-md px-2 py-1 text-2xl pl-10 placeholder:text-surface30 placeholder:italic"
                    placeholder="Search" type="text" onKeyDown={(k) => k.key == 'Enter' ? handleSearch(true) : null} ref={search} />
            </div>
            <div className="absolute scale-y-0 peer-has-[:focus]:scale-y-100 bg-surface10 mt-2 w-full rounded-md text-base">
                <div className="mx-2">
                    {searchHistory.length > 0 ? searchHistory.map((x, k) => <div key={k} className="my-1 pl-2 rounded-md w-full hover:bg-surface20">
                        <button className="w-full text-left" onMouseDown={() => window.dispatchEvent(new CustomEvent('force-set-file-search', { detail: [x, true] }))}>
                            {capitalize(x)}
                        </button>
                    </div>) : <></>}
                </div>
            </div>
            {loading == '' ? '' : (
                <div className="flex items-center mt-1">
                    <div className="translate-y-[1px]"><LoadingCircle /></div>
                    {loading}
                </div>
            )}
            {words.length == 0
                ? (<div className="text-lg ml-2 mt-1 text-[#d9646c]">{searchError}</div>)
                : (
                    <div className="flex mt-2 mb-6">
                        <div className="bg-surface20 w-[2px] mx-2"></div>
                        <div className="mt-3 mb-2">
                        { words.length == 0 ? ""
                            : words.map((word, id) => <SingleWord words={word} key={id} dictionary={dictionary} userSearch={isUserSearch}/>)}
                        </div>
                    </div>
                )
            }
        </div>
    )
}

function LoadingCircle() {
    return <svg className='animate-spin w-4 h-4 mx-2' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path fill="none" d="M0 0h24v24H0z"></path>
        <path d="M11.9995 2C12.5518 2 12.9995 2.44772 12.9995 3V6C12.9995 6.55228 12.5518 7 11.9995 7C11.4472 7 10.9995 6.55228 10.9995 6V3C10.9995 2.44772 11.4472 2 11.9995 2ZM11.9995 17C12.5518 17 12.9995 17.4477 12.9995 18V21C12.9995 21.5523 12.5518 22 11.9995 22C11.4472 22 10.9995 21.5523 10.9995 21V18C10.9995 17.4477 11.4472 17 11.9995 17ZM20.6597 7C20.9359 7.47829 20.772 8.08988 20.2937 8.36602L17.6956 9.86602C17.2173 10.1422 16.6057 9.97829 16.3296 9.5C16.0535 9.02171 16.2173 8.41012 16.6956 8.13398L19.2937 6.63397C19.772 6.35783 20.3836 6.52171 20.6597 7ZM7.66935 14.5C7.94549 14.9783 7.78161 15.5899 7.30332 15.866L4.70525 17.366C4.22695 17.6422 3.61536 17.4783 3.33922 17C3.06308 16.5217 3.22695 15.9101 3.70525 15.634L6.30332 14.134C6.78161 13.8578 7.3932 14.0217 7.66935 14.5ZM20.6597 17C20.3836 17.4783 19.772 17.6422 19.2937 17.366L16.6956 15.866C16.2173 15.5899 16.0535 14.9783 16.3296 14.5C16.6057 14.0217 17.2173 13.8578 17.6956 14.134L20.2937 15.634C20.772 15.9101 20.9359 16.5217 20.6597 17ZM7.66935 9.5C7.3932 9.97829 6.78161 10.1422 6.30332 9.86602L3.70525 8.36602C3.22695 8.08988 3.06308 7.47829 3.33922 7C3.61536 6.52171 4.22695 6.35783 4.70525 6.63397L7.30332 8.13398C7.78161 8.41012 7.94549 9.02171 7.66935 9.5Z"></path>
    </svg>
}
