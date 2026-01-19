import { ReactNode } from "react";
import { Replacement, StandardType, Tokenization } from "../tokenization"
import { capitalize } from "../util/util";

// mildly scuffed arrow
function Arrow({ children }: { children?: ReactNode }) {
    return (
        <div className="flex-grow">
            {children ? <div className="flex justify-center text-xs mb-[-9px]">{children}</div> : <></>}
            <div className="flex items-center">
                <div className="bg-surface40 h-[2px] w-full flex-shrink-0"></div>
                <i className="ri-arrow-right-s-line text-surface50 translate-x-[-10px]"></i>
            </div>
        </div>
    );
}

function Line({ from, to }: { from: string, to: string | Replacement[] }) {
    function getText(rep: Replacement): string {
        let str = '';

        if (rep.withoutPhysicalPattern) {
            str += `without "${rep.withoutPhysicalPattern.join(', ')}"`;
        }

        return str.length == 0 ? 'Otherwise' : capitalize(str);
    }

    return (
        <div>
            {typeof to == 'string' ? (
                <div className="flex w-full justify-between text-lg items-center gap-8 h-6">
                    <div className="w-6">{from}</div>
                    <Arrow />
                    <div className="w-6">{to}</div>
                </div>
            ) : (
                to.map((x, i) => ( // TODO: figure out proper formatting for multi replacements
                    <div key={i} className="flex w-full justify-between text-lg items-center gap-8 h-8">
                        {i == 0 ? <div className="w-6">{from}</div> : <div className="w-12"></div>}
                        <Arrow>{getText(x)}</Arrow>
                        <div className="w-6">{x.to}</div>
                    </div>
                )
            ))}
        </div>
    )
}

export function TranslationTable({ type }: { type: StandardType }) {
    return (
        <div className="flex-grow flex flex-col items-center gap-1 w-full">
            <div>
                { type == StandardType.mw ? 'Merriam-Webster'
                : type == StandardType.oed ? 'Oxford English Dictionary/Internal'
                : 'Global'}
            </div>
            <div className="bg-surface10 w-full p-2 px-4 rounded-md border-surface20 border">
                {Object.keys(Tokenization.translation[type]).map(k => 
                    <Line from={k} to={Tokenization.translation[type][k]} key={k}/>
                )}
            </div>
        </div>
    );
}