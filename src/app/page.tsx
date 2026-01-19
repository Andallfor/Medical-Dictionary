"use client"

import { useContext, useEffect } from "react";
import 'remixicon/fonts/remixicon.css'
import FileSearch from "./fileSearch/search";
import PhoneticTree from "./phoneticTree/tree";
import { Search } from "./search/search";
import { Settings } from "./settings/panel";
import { Tab } from "./util/tab";
import { TranslationDisplay } from "./translationDisplay/translation";
import { ContextWrapper, TRANSLATION_DISPLAY_CONTEXT } from "./util/context";

// wrapper so that we can use context
function Main() {
    const showTranslationDisplay = useContext(TRANSLATION_DISPLAY_CONTEXT).get;

    return (
        <div className="m-8 mt-4">
            <div className="flex flex-col-reverse xl:grid xl:grid-cols-[50%_minmax(0,1fr)] gap-8">
                <Tab 
                    tabs={[{
                        name: 'Phonetic Tree',
                        value: <PhoneticTree />,
                    }, {
                        name: 'File Search',
                        value: <FileSearch />,
                    }, {
                        name: 'Phonetic Translation',
                        value: <TranslationDisplay />,
                        hidden: !showTranslationDisplay,
                    }
                ]} />
                <div className="flex flex-col gap-4">
                    <Search />
                    <Settings />
                </div>
            </div>
        </div>
    );
}

export default function Home() { return <ContextWrapper><Main/></ContextWrapper>; }
