import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

// Shared popup for the editor's suggestion menus (`@` page links, `/` commands).
const SuggestionList = forwardRef(({ items, loading, command, label, emptyText, renderItem }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef([]);

  useEffect(() => setSelectedIndex(0), [items]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const select = (index) => {
    const item = items[index];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (!items.length) return false;
      if (event.key === 'ArrowDown') {
        setSelectedIndex((index) => (index + 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowUp') {
        setSelectedIndex((index) => (index + items.length - 1) % items.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        select(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  return (
    <div
      role="listbox"
      aria-label={label}
      className="max-h-72 w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
    >
      <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500">
        {label}
      </p>
      {items.length ? items.map((item, index) => (
        <button
          key={item.id}
          ref={(element) => { itemRefs.current[index] = element; }}
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => setSelectedIndex(index)}
          onClick={() => select(index)}
          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-gray-800 dark:text-gray-100 ${
            index === selectedIndex ? 'bg-gray-100 dark:bg-zinc-800' : ''
          }`}
        >
          {renderItem(item)}
        </button>
      )) : (
        <p className="px-2.5 py-1.5 text-sm text-gray-400 dark:text-zinc-500">
          {loading ? 'Searching…' : emptyText}
        </p>
      )}
    </div>
  );
});

SuggestionList.displayName = 'SuggestionList';

export default SuggestionList;
