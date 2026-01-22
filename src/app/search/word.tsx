import { Dictionary, Word } from "../dictionary";
import { Tokenization, StandardType, Token } from "../tokenization";
import { capitalize } from "../util/util";
import { getAudio, hasAudio } from "./api";
import { useContext, useEffect, useRef, useState } from "react";
import { SearchState } from "./search";
import { DICTIONARY_CONTEXT, TRANSLATION_DISPLAY_CONTEXT } from "../util/context";

export function SingleWord({ query, userSearch }: { query: SearchState, userSearch: boolean }) {
    const dictionary = useContext(DICTIONARY_CONTEXT);
    const {get: showTranslationDisplay, set: setTranslationDisplay} = useContext(TRANSLATION_DISPLAY_CONTEXT);

    // definition loaded from internal dictionary
    const [internal, setInternal] = useState<Word | undefined>(undefined);
    // definition loaded from external source (i.e. MW)
    const [external, setExternal] = useState<Word | undefined>(undefined);

    // slightly jank as we need to coerce mw[] and phoneme into wordDefinitionData
    useEffect(() => {
        let _external: Word | undefined = undefined;
        let _internal: Word | undefined = dictionary.find(x => x.word == query.word);

        const extDebug: Token[][] = [];
        const intDebug: Token[][] = [];

        externalQuery: if (query.mw) {
            // mw may return a different word than what we search (if it doesn't have the exact)
            // but we may have an internal def instead - in such a case, don't show mw
            const mwWord = query.mw.meta.id.split(':')[0].toLowerCase();
            if (query.word != mwWord) {
                if (_internal) break externalQuery; // exit the if statement; we dont want to process this
                // TODO: give user note that mw did not return exact match?
            }

            _external = {
                word: mwWord,
                part: query.mw.fl,
                def: query.mw.shortdef,
                audio: '',
                source: StandardType.mw,
            };

            if (query.mw.hwi?.prs) {
                const t = Tokenization.tokenize(_external.word, query.mw.hwi.prs[0].mw.trim(), StandardType.mw, extDebug);
                _external!.pronunciation = {
                    tokens: t,
                    text: Tokenization.toString(t),
                };

                const a = hasAudio(query.mw.hwi.prs);
                if (a) _external.audio = getAudio(a);
            }
        }

        // we always set translation display irrespective of whether or not its shown as a user might search a word
        // then pull up the translation process
        // // weird semantics but we consider undefined to be no def
        const t_mw = extDebug.length == 0 ? undefined : extDebug;
        let t_oed = undefined;
        let t_int = undefined;
        if (query.word in Dictionary.debugInternalLookup) {
            const [base, src] = Dictionary.debugInternalLookup[query.word];
            Tokenization.tokenize(query.word, base, src, intDebug);

            if (src == StandardType.oed) t_oed = intDebug;
            else if (src == StandardType.internal) t_int = intDebug;
            else console.warn("Internal has type MW!");
        }

        setTranslationDisplay({
            show: showTranslationDisplay.show,
            mw: t_mw,
            oed: t_oed,
            internal: t_int,
        });

        // determine whether or not internal is worth showing
        // note that we always show if it is internal source (as opposed to oed)
        if (_internal && _external && _internal.source != StandardType.internal) {
            if (_internal.def.length == 0 && _internal.part == '') {
                if (_internal.pronunciation && _external.pronunciation &&
                    _internal.pronunciation.text != _external.pronunciation.text) {
                    // pronunciation is different, determine whether or not the difference is worth showing (as alt)
                    let int = _internal.pronunciation.text;
                    let ext = _external.pronunciation.text;

                    // differ by a leading stress mark
                    const r1_int = int.startsWith('ˈ') || int.startsWith('ˌ');
                    const r1_ext = ext.startsWith('ˈ') || ext.startsWith('ˌ');
                    if (r1_int) int = int.slice(1);
                    if (r1_ext) ext = ext.slice(1);
                    // prev differed, detected different starting stresses, now are the same
                    const r1 = (r1_int || r1_ext) && (int == ext);
                    

                    // differ by presence of (ə) or one has ə and another has (ə)
                    const r2_int = int.replaceAll(/ə|\(ə\)/g, '')
                    const r2_ext = ext.replaceAll(/ə|\(ə\)/g, '')
                    const r2 = int != ext && r2_int == r2_ext;

                    if (r2) { // normalize
                        int = r2_int;
                        ext = r2_ext;
                    }

                    // differ by ə as ʌ in the same position
                    const r3_ext = ext.replaceAll(/ʌ|ə/g, '');
                    const r3_int = int.replaceAll(/ʌ|ə/g, '');
                    const r3 = int != ext && r3_int == r3_ext;

                    if (r1 || r2 || r3) { // small difference, replace with internal def
                        // note that we dont change _internal values since that'll affect dictionary
                        _external.pronunciation.text = _internal.pronunciation.text;
                    } else { // noticeable difference, replace with mw def
                        _internal = {..._internal}; // copy so we dont modify dictionary
                        _internal.pronunciation!.text = _external.pronunciation.text;
                    }
                }

                _internal = undefined;
            } // internal has actual definition/part of speech, dont touch
        }

        setExternal(_external);
        setInternal(_internal);

        // if needed, update the phonetic tree to have it match the newly searched word
        if (userSearch && (_internal || _external)) { // cannot use state as it has not updated yet
            window.dispatchEvent(new CustomEvent('phonetic-tree-external-search', {
                // use internal if exists
                detail:  { word: _internal ?? _external }
            }));
        }
    }, [query]);

    if (internal || external) {
        return (<div className="mt-2 mb-6">
            {external ? <Definition word={external}/> : <></>}
            {internal ? <Definition word={internal}/> : <></>}
        </div>);
    } else return <div className="text-lg ml-2 mt-1 text-[#d9646c]">Unable to find {query.word}.</div>;
}

function Pron({ text, audio, source }: { text?: string, audio?: string, source?: StandardType }) {
    const audioPlayer = useRef<HTMLAudioElement | null>(null);
    text = text ?? '[No pronunciation found]';

    return (
        <div className="relative">{audio && audio?.length !== 0 ?
            <button className="hover:bg-tonal0/70 border bg-tonal0 rounded-md px-2 text-xl py-0.5 border-surface20" onClick={() => audioPlayer.current?.play()}>
                {text}
                <i className="ml-2 mr-1 ri-volume-up-fill text-primary40"></i>
                <audio src={audio} ref={audioPlayer}></audio>
            </button> :
            <div className="border bg-tonal0 rounded-md text-2 text-xl py-0.5 px-2 border-surface20">{text}</div>}
            {source ?
                <div className="absolute text-sm w-full text-center">{
                    source == StandardType.mw ? 'MW' :
                    source == StandardType.oed ? 'OED' :
                    source == StandardType.internal ? 'Internal' :
                'Unknown'}
                </div> : <></>}
        </div>
    );
}

function Definition({ word, altPron }: { word: Word, altPron?: [string, StandardType] }) {
    function getSrc(t: StandardType): string {
        return t == StandardType.mw ? 'Merriam-Webster' :
               t == StandardType.oed ? 'Internal (Oxford English Dictionary)' :
               t == StandardType.internal ? 'Internal' :
               'Unknown';
    }

    return (
        <div className="flex flex-grow">
            <div className="bg-surface20 w-[2px] mx-2"></div>
            <div className="ml-1 mt-1 mb-2 w-full">
                <div className="flex items-center justify-between">
                    <div className="text-2xl flex items-center gap-4">
                        <span className="capitalize">{word.word}</span>
                        <Pron text={word.pronunciation?.text} audio={word.audio} source={altPron ? word.source : undefined}/>
                        {altPron ? <>
                            <div className="text-base">or</div>
                            <Pron text={altPron[0]} source={altPron[1]}/>
                        </> : <></>}
                    </div>
                    <div className="flex items-center">
                        <i className="text-sm">{getSrc(word.source)}</i>
                        {word.pronunciation
                            ? <button className="button ml-3 ri-file-copy-line text-base"
                                onClick={() => navigator.clipboard.writeText(word.pronunciation!.text)}></button>
                            : <></>}
                    </div>
                </div>
                <div className="text-primary40">
                    <i>{capitalize((word.part && word.part.length > 0) ? word.part : 'No part of speech')}</i>
                    {(word.def && word.def.length > 0) ? 
                        word.def.map((s, k) =>
                            <div key={k} className="ml-2 flex">
                                <div>{k + 1}.</div>
                                <div className="ml-1">{capitalize(s)}</div>
                            </div>
                        )
                    : <div className="text-lg ml-2 text-[#d9646c]">No definition available.</div>}
                </div>
            </div>
        </div>);
}
