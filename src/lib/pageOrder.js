import { generateKeyBetween } from 'fractional-indexing';

// Sibling order is a fractional-index string key compared by code units (never localeCompare).
// A key can always be generated between two others, so a move rewrites only the moved entry and
// never needs renumbering. Equal keys (two devices inserting at the same spot) are broken by id.

export const isOrderKey = (value) => {
    if (typeof value !== 'string' || !value) return false;
    try {
        generateKeyBetween(value, null);
        return true;
    } catch {
        return false;
    }
};

// Entries without a valid key sort after every keyed sibling.
export const compareByOrder = (a, b) => {
    const aValid = isOrderKey(a.order);
    const bValid = isOrderKey(b.order);
    if (aValid !== bValid) return aValid ? -1 : 1;
    if (aValid && a.order !== b.order) return a.order < b.order ? -1 : 1;
    if (a.id === b.id) return 0;
    return a.id < b.id ? -1 : 1;
};

export const sortByOrder = (entries) => [...entries].sort(compareByOrder);

const keyOf = (entry) => (entry && isOrderKey(entry.order) ? entry.order : null);

// A key placing an entry among `siblings` (which must not include the entry): directly before
// `beforeId`, or after the last keyed sibling when `beforeId` is null or not among them.
export const orderKeyFor = (siblings, beforeId = null) => {
    const keyed = sortByOrder(siblings).filter((sibling) => isOrderKey(sibling.order));
    const index = beforeId ? keyed.findIndex((sibling) => sibling.id === beforeId) : -1;
    if (index === -1) return generateKeyBetween(keyOf(keyed[keyed.length - 1]), null);

    const next = keyed[index].order;
    // Tied keys leave no room between them, so the entry goes before the whole tie.
    let previousIndex = index - 1;
    while (previousIndex >= 0 && keyed[previousIndex].order === next) previousIndex--;
    return generateKeyBetween(keyOf(keyed[previousIndex]), next);
};
