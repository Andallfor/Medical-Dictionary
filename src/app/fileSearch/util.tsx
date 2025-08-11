import { formattedFileData } from "./input";

export enum formattedMatch {
    FULL, PARTIAL, NONE
} 

// assumes words is already unique and sorted
export function getHash(words: string[], headMap: Record<string, number>): number[] {
    const out: number[] = [];
    let hasInvalid = false;
    words.forEach(w => {
        if (SEARCH_IGNORE.has(w)) return;

        if (w in headMap) out.push(headMap[w]);
        else if (!hasInvalid) {
            // only need one instance of invalid
            hasInvalid = true;
            out.splice(1, 0, -1);
        }
    });

    return out;
}

// define:
// full match = all words in search appear in head, in any order (head >= search)
// partial match = at least one word in search is not in head
// content match = at least on word in search is in the body

/**
 * Idea is that we should have a "hash" for every head, which can be efficiently compared against other hashes to determine full or partial matching
 * Preprocessing:
 *    Retrieve all unique words that have been used in a head and sort
 *    Associate each word with a unique index (some sort of dictionary structure)
 *    For each entry,
 *        Take the unique words and sort
 *        The hash will be an array of the associated indices for each word in the sorted head
 * Searching:
 *    Take the unique words in search and then sort
 *    Generate a hash for the search via the same method used for each entry's head
 *        If a search word does not have an associated index, set it to -1
 *    For each entry,
 *        Let i = 0 (will be used as the index of the entry's head)
 *        let j = 0 (will be used as the index of search hash)
 *        let match = full
 *        let none = true
 *        for (j = 0; j < search.length; j++)
 *            If i > head.length - 1
 *                # Search > head, and the rest of the search words are guaranteed to not exist
 *                If match == full then set match = partial
 *                break
 *            If search[j] < head[i]
 *                # Because both search and head are sorted, this guarantees that the current search index will never appear in head
 *                If match == full then set match = partial
 *            If search[j] > head[i]
 *                # This means that head[i] does not appear in search, but we don't care about that
 *                i++
 *                j-- # we still want to continue examining this search element
 *            If search[j] == head[i]
 *                none = false
 *                i++
 *        If none == true
 *            match = none
 *            Check if any search term exists in entry body for content match
 */

export function readFormattedFile(content: string) {
    if (!content.startsWith('#!/formatted')) return undefined;

    const lines = content.split('\n');
    const re = /^(?<head>(?:[^a-z]+:)+)(?<body>.*)$/ms;
    const re_s = /:| /g;
    const fc: formattedFileData = { entries: [], headMap: {} };

    // get all entries
    const entries = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().length == 0) continue;

        if (re.test(line)) entries.push(line);
        else entries[entries.length - 1] += '\n' + line; // some entries are split across multiple lines
    }

    // process entries
    const allHeads: Set<string> = new Set();
    entries.forEach(x => {
        const match = re.exec(x);
        if (!match) {
            console.error('Could not match ' + x);
            return;
        }

        const g = match.groups!;
        // hmmm.....
        // given the head "A B: C:", split on delimiters (:, space), remove whitespace and empty strings then get uniques
        const head = new Set(g['head'].split(re_s).flatMap(y => y.trim().toLowerCase()).filter(x => x.length != 0));
        head.forEach(h => allHeads.add(h));

        const entry = {
            head: g['head'].trim(),
            content: g['body'].trim(),
            hash: [],
            fHead: [...head].sort(),
        };

        fc.entries.push(entry);
    });

    // generate entry hashes
    [...allHeads].sort().forEach((x, i) => fc.headMap[x] = i);
    fc.entries.forEach(x => x.hash = getHash(x.fHead, fc.headMap));

    return fc;
}

// top 100 most common english words
export const SEARCH_IGNORE = new Set([
    'the', 'of', 'and', 'to', 'a', 'in', 'for', 'is', 'on', 'that', 'by', 'this', 'with', 'i', 'you', 'it', 'not', 'or', 'be', 'are', 'from', 'at', 'as', 'your', 'all', 'have', 'new', 'more', 'an', 'was', 'we', 'will', 'home', 'can', 'us', 'about', 'if', 'page', 'my', 'has', 'search', 'free', 'but', 'our', 'one', 'other', 'do', 'no', 'information', 'time', 'they', 'site', 'he', 'up', 'may', 'what', 'which', 'their', 'news', 'out', 'use', 'any', 'there', 'see', 'only', 'so', 'his', 'when', 'contact', 'here', 'business', 'who', 'web', 'also', 'now', 'help', 'get', 'pm', 'view', 'online', 'c', 'e', 'first', 'am', 'been', 'would', 'how', 'were', 'me', 's', 'services', 'some', 'these', 'click', 'its', 'like', 'service', 'x', 'than', 'find'
]);
