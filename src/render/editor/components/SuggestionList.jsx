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
      className="dropdownPanel !static !w-[min(18rem,calc(100vw-2rem))] max-h-72 overflow-y-auto"
    >
      <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
        {label}
      </p>
      {items.length ? items.map((item, index) => (
        <button
          key={item.id}
          ref={(element) => { itemRefs.current[index] = element; }}
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
          data-active={index === selectedIndex ? '' : undefined}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => setSelectedIndex(index)}
          onClick={() => select(index)}
          className="dropdownItem w-full text-left"
        >
          {renderItem(item)}
        </button>
      )) : (
        <p className="px-2 py-1.5 text-gray-400 dark:text-slate-500">
          {loading ? 'Searching…' : emptyText}
        </p>
      )}
    </div>
  );
});

SuggestionList.displayName = 'SuggestionList';

export default SuggestionList;
