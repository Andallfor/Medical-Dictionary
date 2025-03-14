export function capitalize(s: string) {
    if (s.length == 0) return s;
    return s[0].toUpperCase() + s.substring(1);
}

export function prettifyFileSize(n: number) {
    // https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string
    const i = n == 0 ? 0 : Math.floor(Math.log(n) / Math.log(1024));
    return +((n / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}