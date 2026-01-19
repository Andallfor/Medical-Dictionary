import { StandardType } from "../tokenization"

export function TranslationTable({ type }: { type: StandardType }) {
    return (
        <div className="flex-grow flex flex-col items-center gap-1 w-full">
            <div>
                { type == StandardType.mw ? 'Merriam-Webster'
                : type == StandardType.oed ? 'Oxford English Dictionary/Internal'
                : 'Global'}
            </div>
            <div className="bg-surface10 w-full p-2 rounded-md border-surface20 border">
                stuff
            </div>
        </div>
    );
}