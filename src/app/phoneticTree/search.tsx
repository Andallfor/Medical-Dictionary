import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { ConsonantSearch, VowelOrder, branchState } from "./constants";

interface customizationProps {
    width: string;
}

interface phoneticSearchProps {
    num: number;
    props: {
        list: string[];
        states: branchState[];
        setStates: Dispatch<SetStateAction<branchState[]>>;
        search: () => void;
    };
    customization: customizationProps;
}

export function Branch({ state, customization, update }: { state: branchState, customization: customizationProps, update: (i: number, s: string | undefined, search: boolean) => void }) {
    const [clicks, setClicks] = useState(0);

    function handleClick(v: string) {
        setTimeout(() => setClicks(0), 250);
        if (clicks == 0) {
            setClicks(1);
            update(state.ind, v == state.phoneme ? undefined : v, state.autoSearch);
        } else {
            // dont retrigger search on double click if we are already searching
            if (!state.autoSearch || !state.shouldSearch) update(state.ind, v, true);
        }
    }

    function buttonStyle(v: string) {
        if (state.active) {
            return state.phoneme == v
            ? 'text-tonal10 font-semibold ' + (state.shouldSearch ? 'bg-red-500' : 'bg-[#79bd92]')
            : 'hover:bg-surface20';
        } else return 'pointer-events-none';
    }

    return (
        <div className={
            customization.width + " rounded-sm flex flex-col " + (state.active ? 'bg-tonal0' : 'bg-surface10 text-tonal20')}>
            {state.phonemeList.map((v, k) =>
                <button key={k}
                    className={"cursor-pointer rounded-sm py-0.5 " + buttonStyle(v)}
                    onClick={() => handleClick(v)}>
                    <p>{v}</p>
                </button>
            )}
        </div>
    );
}

export function PhoneticSearchController({ num, props, customization }: phoneticSearchProps ) {
    useEffect(() => {
        const state: branchState[] = [];
        for (let i = 0; i < num; i++) {
            state.push({
                active: i == 0,
                autoSearch: i == num - 1,
                shouldSearch: false,
                ind: i,
                phoneme: undefined,
                phonemeList: props.list
            });
        }

        props.setStates(state);
    }, [num]);

    function updateBranch(ind: number, s: string | undefined, search: boolean = false) {
        const state = [...props.states];

        // deactivate later branches
        if (search || !s) {
            for (let i = ind + 1; i < state.length; i++) {
                state[i].active = false;
                state[i].phoneme = undefined;
            }
        }

        if ((s || search) && ind + 1 < state.length) state[ind + 1].active = true;

        for (let i = 0; i < ind; i++) state[i].shouldSearch = false;

        state[ind].phoneme = s;
        state[ind].shouldSearch = search;

        props.setStates(state);
        if (search) props.search();
    }

    return (
        <div className="flex gap-2">
            {props.states.length == num ? 
                props.states.map((s, i) => <Branch key={i} state={s} customization={customization} update={updateBranch}/>)
                : ''
            }
        </div>
    )
}
