import { Dispatch, Ref, SetStateAction, useEffect, useImperativeHandle, useState } from "react";
import { Tokenization } from "../tokenization";

interface customizationProps {
    width: string;
}

interface phoneticSearchProps {
    numBranches: number; // number of branches
    ref: Ref<PhoneticSearchControllerRef>;
    props: {
        list: BranchEntry[]; // entries

        // state management (since this is controlled by PhoneticSearchController)
        states: BranchState[];
        setStates: Dispatch<SetStateAction<BranchState[]>>;

        search: () => void; // search callback
    };
    customization: customizationProps;
}

export class BranchEntry {
    display: string;
    id: string; // should match to a known token

    constructor(id: string, display?: string) {
        this.id = id;
        this.display = display ?? id;
    }
}

export interface BranchState {
    // properties
    id: number; // a single phonetic controller can have multiple branches. note that this is also the index of the branch
    autoSearch: boolean; // single click triggers search
    entries: BranchEntry[];

    // instance
    active: boolean;
    isSearch: boolean; // true if the current branch indicates a search
    index: number; // index into entries which is currently selected (-1 if none)
}

export type PhoneticSearchControllerRef = {
    update: (symbols: string[]) => void;
}

export function Branch({ state, customization, update }: { state: BranchState, customization: customizationProps, update: (id: number, entryIndex: number, search: boolean) => void }) {
    const [clicks, setClicks] = useState(0);

    function handleClick(index: number) {
        setTimeout(() => setClicks(0), 250);
        if (clicks == 0) {
            setClicks(1);
            // if user clicks on the same element, send -1 to indicate we want it to be cleared
            update(state.id, index == state.index ? -1 : index, state.autoSearch);
        } else {
            // dont retrigger search on double click if we are already searching
            if (!state.autoSearch || !state.isSearch) update(state.id, index, true);
        }
    }

    function buttonStyle(index: number) {
        if (state.active) return state.index == index
            ? 'text-tonal10 font-semibold ' + ((state.isSearch || state.autoSearch) ? 'bg-red-500' : 'bg-[#79bd92]')
            : 'hover:bg-surface20';
        else return 'pointer-events-none';
    }

    return (
        <div className={
            customization.width + " rounded-sm flex flex-col " + (state.active ? 'bg-tonal0' : 'bg-surface10 text-tonal20')}>
            {state.entries.map((v, k) =>
                <button key={k}
                    className={"cursor-pointer rounded-sm py-0.5 " + buttonStyle(k)}
                    onClick={() => handleClick(k)}>
                    <p>{v.display}</p>
                </button>
            )}
        </div>
    );
}

export function PhoneticSearchController({ ref, numBranches, props, customization }: phoneticSearchProps ) {
    useEffect(() => {
        // we expect props.list to be ids corresponding known tokens
        props.list.forEach(x => {
            // special handling for empty (Sound Selection)
            if (x.id == '') return;

            if (!Tokenization.knownTokens.find(y => y.id == x.id))
                console.warn(`Branch entry has no matching known token! (display=${x.display}, id=${x.id})`);
        })

        const state: BranchState[] = [];
        for (let i = 0; i < numBranches; i++) {
            state.push({
                id: i,
                autoSearch: i == numBranches - 1, // last branch auto searches
                entries: props.list,

                active: i == 0,
                isSearch: false,
                index: -1,
            });
        }

        props.setStates(state);
    }, [numBranches]);

    function updateBranch(id: number, entryIndex: number, search: boolean = false) {
        const state = [...props.states];

        // user is clearing this branch, deactivate everything after it
        if (entryIndex == -1) {
            for (let i = id + 1; i < state.length; i++) {
                state[i].active = false;
                state[i].index = -1;
            }
        } else {
            // user has selected something in this branch, activate the next branch
            if (id + 1 < state.length) state[id + 1].active = true;
        }

        for (let i = 0; i < id; i++) state[i].isSearch = false;

        state[id].index = entryIndex;
        state[id].isSearch = search;

        props.setStates(state);
        if (search) props.search();
    }

    useImperativeHandle(ref, () => ({
        // used by parent; set the current state of branches to match to requested phonemes
        update(requestedEntries: string[]) {
            if (requestedEntries.length > numBranches) {
                console.warn(`Not enough branches (${numBranches}) to represented desired pattern ${requestedEntries.join()}`);
                requestedEntries = requestedEntries.slice(0, numBranches);
            }

            // tell each branch what entry to take
            updateBranch(0, -1, false); // reset branches
            requestedEntries.forEach((x, i) =>
                updateBranch(
                    i,
                    props.list.findIndex(y => y.display == x || y.id == x),
                    false)
            );
        },
    }));

    return (
        <div className="flex gap-2">
            {props.states.length == numBranches
                ? props.states.map((s, i) => <Branch key={i} state={s} customization={customization} update={updateBranch}/>)
                : ''
            }
        </div>
    )
}
