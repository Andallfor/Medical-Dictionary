import { Children, ReactNode, useEffect, useState } from "react";

interface tab {
    name: string,
    value: ReactNode,
    hidden?: boolean,
}

export function Tab({ tabs }: { tabs: tab[] }) {
    const [selected, setSelected] = useState(0);

    useEffect(() => {
        // we may disable a currently selected tab
        // in such a case, go back to the first visible tab
        if (tabs[selected].hidden) setSelected(tabs.findIndex(x => !x.hidden));
    }, [tabs]);

    return (
        <div className="flex flex-col gap-3 flex-shrink-0">
            <div className="flex bg-tonal0 rounded-lg justify-between gap-2 px-2 py-1">
                {tabs.map((x, i) => {
                    if (x.hidden) return <div key={i}></div>;

                    return (
                        <button key={i}
                            className={`flex-grow rounded-md ${selected == i ? 'bg-tonal10' : 'bg-tonal0 hover:bg-surface10'}`}
                            onClick={() => setSelected(i)}
                        >
                            {x.name}
                        </button>
                    );
                })}
            </div>
            {/* mark as hidden so their state persists across tab changes */}
            {tabs.map((x, i) => <div key={i} className={selected == i ? '' : 'hidden'}>{x.value}</div>)}
        </div>
    )
}
