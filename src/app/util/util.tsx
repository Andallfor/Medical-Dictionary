import { ReactNode, useState } from "react";

export function capitalize(s: string) {
    if (s.length == 0) return s;
    return s[0].toUpperCase() + s.substring(1);
}

export function prettifyFileSize(n: number) {
    // https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string
    const i = n == 0 ? 0 : Math.floor(Math.log(n) / Math.log(1024));
    return +((n / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}
export function Divider({ title, children, reverse }: { title: string | ReactNode, children?: ReactNode, reverse?: boolean }) {
    const [isExpanded, setIsExpanded] = useState(reverse ? true : false);

    return (
        <div>
            <button className="w-full flex items-center gap-4 group" onClick={() => setIsExpanded(!isExpanded)}>
                <span>{title}</span>
                <div className="flex-grow h-[2px] rounded-lg bg-surface30 my-1 group-hover:bg-surface40"></div>
                <i className={"ri-arrow-down-s-line ri-lg " + (isExpanded ? 'rotate-180' : '')}></i>
            </button>
            <div className={isExpanded ? '' : 'hidden'}>
                {children}
            </div>
        </div>
    )
}