export function capitalize(s: string) {
    if (s.length == 0) return s;
    return s[0].toUpperCase() + s.substring(1);
}