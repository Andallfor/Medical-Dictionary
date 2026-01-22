import { ReactNode, useEffect, useState } from "react";
import { Replacement, StandardType, StandardType_Expanded, Tokenization } from "../tokenization"
import { capitalize } from "../util/util";

interface Conditional {
    from: string,
    to: string,
    condition: string,
}

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

// group rules that have the same to and condition for readability
interface GroupFrom {
    val: string[],
    condition: string
}

interface Group {
    from: GroupFrom[],
    to: string,
}

export function TranslationTable({ type, custom }: { type: StandardType_Expanded, custom?: Conditional[] }) {
    function getText(rep: Replacement): string {
        let str = '';

        if (rep.withoutPhysicalPattern) str += `without "${rep.withoutPhysicalPattern.join(', ')}"`;
        if (rep.withPhysicalPattern) str += `with "${rep.withPhysicalPattern.join(',')}"`;

        if (str.length == 0) console.warn(`Empty translation table conditional ${rep}`);
        return capitalize(str);
    }

    const [rules, setRules] = useState<Group[]>([]);

    useEffect(() => {
        const base = Tokenization.translation[type];
        // essentially, group by to then group by condition
        // [to, [condition, from[]]]
        // note that some have no condition. we indicate this with 'always'
        const map: Record<string, Record<string | "always", string[]>> = {};
        const add = (to: string, cond: string, from: string) => {
            if (!(to in map)) map[to] = {};
            if (!(cond in map[to])) map[to][cond] = [];
            map[to][cond].push(from);
        };

        Object.entries(base).forEach(([from, to]) => {
            if (typeof to == 'string') add(to, 'always', from);
            else to.forEach(x => add(x.to, getText(x), from));
        });

        // add in custom conditionals
        custom?.forEach(x => add(x.to, x.condition, x.from));

        // coalesce
        const groups: Group[] = [];
        Object.entries(map).forEach(([to, values]) => {
            const group = {
                from: Object.entries(values).map(([condition, froms]) => { return {
                    val: froms,
                    condition: condition == 'always' ? '' : condition
                }}),
                to: to,
            };

            groups.push(group);
        });

        setRules(groups);
    }, [type, custom]);

    return (
        <div className="flex-grow flex flex-col items-center gap-1 w-full">
            <div>
                { type == StandardType.mw ? 'Merriam-Webster'
                : type == StandardType.oed ? 'Oxford English Dictionary'
                : 'Global'}
            </div>
            <div className="w-full flex flex-col gap-[6px]">
                {rules.map(x => (
                    <div key={x.to} className="bg-surface10 w-full py-[3px] px-4 rounded-md border-surface20 border">
                        {x.from.map(y => (
                            <div key={y.condition} className="flex justify-between gap-8 items-center">
                                <div className="w-6">
                                    {y.val.map(z => (<div key={z}>{z}</div>))}
                                </div>
                                <Arrow>{y.condition}</Arrow>
                                <div className="w-6">{x.to}</div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}