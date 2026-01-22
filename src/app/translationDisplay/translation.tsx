import { ReactNode, useContext, useEffect, useState } from "react";
import { FOCUSED_WORD_CONTEXT, TRANSLATION_DISPLAY_CONTEXT } from "../util/context";
import { Divider } from "../util/util";
import { StandardType, StandardType_Expanded, StandardTypeUnion, Token, Tokenization, TokenType } from "../tokenization";
import { TranslationTable } from "./table";

export interface TranslationDisplayContext {
    show: boolean;
    mw?: Token[][];
    oed?: Token[][];
    internal?: Token[][];
}

interface Step {
    tokens: Token[];
    description: string;
}

function UV({ children }: { children: ReactNode }) {
    return <div className="decoration-[1.5px] underline-offset-[5px] underline decoration-green-300">{children}</div>
}

function UC({ children }: { children: ReactNode }) {
    return <div className="decoration-[1.5px] underline-offset-[5px] underline decoration-blue-400">{children}</div>
}

function UU({ children }: { children: ReactNode }) {
    return <div className="decoration-[1.5px] underline-offset-[5px] underline decoration-red-500">{children}</div>
}

function TranslationStep({ toks }: { toks: Token[] }) {
    return (
        <div className="flex gap-1 text-lg tracking-wider">
            {toks.every(x => x.type == TokenType.unknown)
             ? <div>{Tokenization.toString(toks)}</div> // everything is unknown, dont bother with tokens
             : toks.map((x, i) => {
                    // TODO: currently we dont handle parenthesis, so just ignore them
                    if (x.instance.canonical == '(' || x.instance.canonical == ')')
                        return <span key={i}>{x.instance.canonical}</span>;

                    switch (x.type) {
                        case TokenType.primaryStress:
                        case TokenType.secondaryStress:
                        case TokenType.stressMark:
                            return <span key={i}>{x.instance.canonical}</span>;
                        case TokenType.consonant:
                            return <UC key={i}>{x.toString()}</UC>
                        case TokenType.vowel:
                            return <UV key={i}>{x.toString()}</UV>
                        case TokenType.unknown:
                            return <UU key={i}>{x.toString()}</UU>
                    }
            })}
        </div>
    );
}

function TranslationProcess({ steps, type }: { steps: Step[], type: StandardType }) {
    let name = '';
    switch (type) {
        case StandardType.mw: name = 'Merriam-Webster'; break;
        case StandardType.oed: name = 'Oxford English Dictionary'; break;
        case StandardType.internal: name = 'Internal'; break;
    }
    return (
        <div className="flex flex-col items-center w-1/2 gap-1">
            <div>{name}</div>
            <div className="bg-surface10 w-full p-2 rounded-md border-surface20 border h-full">
                {steps.length == 0 ? <i className="flex justify-center">No matching word</i> : steps.map((x, i) => {
                    // first show always just be the raw text of the pronunciation
                    return (
                        <div key={i} className="flex w-full justify-between">
                            <div className="text-surface50 font-semibold">{x.description}</div>
                            {i == 0
                             ? <div className="mb-1 text-lg tracking-wider">{Tokenization.toString(x.tokens)}</div>
                             : <TranslationStep toks={x.tokens}></TranslationStep>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// one to one with Tokenization.rules. not part of tokenization.tsx because this is purely for UI and not really related
// to the actual translation process
// if string is empty, then never display
const ANNOTATIONS: [StandardType_Expanded, string][] = [
    [StandardTypeUnion.all, ''],
    [StandardType.mw, 'Remove Syllable Delimiters'],
    [StandardType.mw, 'Apply Local Translation Table'],
    [StandardType.oed, 'Apply Local Translation Table'],
    [StandardTypeUnion.external, 'Apply Global Translation Table'],
    [StandardTypeUnion.all, ''],
    [StandardTypeUnion.all, 'Detect Tokens'],
    [StandardTypeUnion.external, 'ə to ʌ when stressed'],
    [StandardTypeUnion.external, 'False iɚ detector'],
    [StandardTypeUnion.external, 'False ɛɚ detector'],
    [StandardTypeUnion.external, 'False ʊɚ detector'],
    [StandardTypeUnion.external, 'Duplicate Stressed Consonant'],
];

// make mw/oed steps match length of annotations/rules since not all rules apply
function pad(arr: Token[][], type: StandardType): Token[][] {
    const padded: Token[][] = [];
    let ref = 0;
    for (let i = 0; i < ANNOTATIONS.length; i++) {
        const filter = ANNOTATIONS[i][0];
        if (filter & type) padded.push(arr[ref++]);
        else padded.push([]);
    }

    return padded;
}

function annotate(padded: Token[][], type: StandardType): Step[] {
    const out: Step[] = [];

    if (padded.length != ANNOTATIONS.length) {
        console.error("Trying to annotate non-padded array.");
        return [];
    }

    for (let i = 0; i < padded.length; i++) {
        if (ANNOTATIONS[i][1] == '') continue;
        const refType = ANNOTATIONS[i][0];

        // these should be the same
        if (!(refType & type)) continue;
        if (padded[i].length == 0) continue;

        const step = { tokens: padded[i], description: ANNOTATIONS[i][1] };
        if (out.length == 0) out.push(step);
        else {
            const prev = out[out.length - 1];
            const change = prev.tokens.length != padded[i].length ||
                        Tokenization.toString(prev.tokens) != Tokenization.toString(padded[i]) ||
                        prev.tokens.some((x, j) => x.type != padded[i][j].type);
            
            if (change) out.push(step);
        }
    }

    return out;
}

export function TranslationDisplay() {
    const word = useContext(FOCUSED_WORD_CONTEXT).get;
    const data = useContext(TRANSLATION_DISPLAY_CONTEXT).get;

    const [mw, setMW] = useState<Step[]>([]);
    const [oed, setOED] = useState<Step[]>([]);

    useEffect(() => {
        // since we annotate steps outside of the actual tokenization steps, make sure nothing has changed
        if (ANNOTATIONS.length != Tokenization.rules.length || ANNOTATIONS.some(([t, _], i) => Tokenization.rules[i][0] != t))
            console.warn("Annotations do not match Tokenization.rules!");

        if (data.mw) {
            // skip first element, that is base
            const padded = pad(data.mw.slice(1), StandardType.mw);
            setMW([{ tokens: data.mw[0], description: 'Base' }, ...annotate(padded, StandardType.mw)]);
        } else setMW([]);

        if (data.oed) {
            // skip first element, that is base
            const padded = pad(data.oed.slice(1), StandardType.oed);
            setOED([{ tokens: data.oed[0], description: 'Base' }, ...annotate(padded, StandardType.oed)]);
        } else setOED([]);
    }, [data]);

    return (
        <div className="bg-tonal0 px-4 py-2 pb-4 rounded-lg w-full min-w-0">
            <div className="flex flex-col gap-2">
                <Divider title="Information">
                    <div className="flex">
                        <div className="bg-surface20 w-[2px] mx-2 flex-shrink-0 mt-1"></div>
                        <div className="pb-1">
                            This tab describes how we translate phonetic pronunciations from external sources (Merriam-Webster and Oxford English Dictionary) to the pronunciation displayed to the user. This is necessary as the aforementioned sources use their own pseudo-IPA-based pronunciation, which we attempt to coerce into IPA.
                            <br/><br/>
                            We categorize words into three categories depending on their source:
                            <ol type="1" className="pl-6">
                                <li className="pl-1"><i>Merriam-Webster</i> - These are retrieved on the fly from the search bar.</li>
                                <li className="pl-1"><i>Oxford English Dictionary</i> - Anything in the default internal dictionary.</li>
                                <li className="pl-1"><i>Internal</i> - Values entered by the user.</li>
                            </ol>
                            <br/>
                            <br/><br/>
                            The translation process converts a base pronunciation into IPA and also tokenizes it into the constituent vowels/consonants. Merriam-Webster and Oxford English Dictionary/User based words have separate, but similar translation processes. The primary difference is in their translation tables, which are simple text replacement commands. This process is what is shown below.
                            <br/><br/>
                            <i>Steps which do not change anything are not shown.</i>
                            <br/><br/>
                            <div className="flex gap-4">
                                <div className="text-surface50 font-semibold">Key</div>
                                <UV>Vowels</UV>
                                <UC>Consonants</UC>
                                <UU>Unknown</UU>
                            </div>
                        </div>
                    </div>
                </Divider>
                <Divider title="Translation Tables">
                    <div className="flex">
                        <div className="bg-surface20 w-[2px] mx-2 flex-shrink-0 mt-1"></div>
                        <div className="w-full pb-1">
                            <div className="flex w-full gap-4 justify-around mb-4">
                                <TranslationTable type={StandardType.mw}/>
                                <TranslationTable type={StandardType.oed}/>
                                <TranslationTable type={StandardTypeUnion.external} custom={[
                                    { from: 'ə', to: 'ʌ', condition: 'Stressed' },
                                ]}/>
                            </div>
                        </div>
                    </div>
                </Divider>
                {!word ? 'No search phrase.' :
                    <div className="flex justify-around w-full mt-4 gap-4">
                        <TranslationProcess steps={mw} type={StandardType.mw}/>
                        <TranslationProcess steps={oed} type={StandardType.oed}/>
                    </div>
                }
            </div>
        </div>
    );
}
