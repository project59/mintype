import { useEffect, useSyncExternalStore } from 'react';
import { PopoverPanel } from '@headlessui/react';

// Matches Tailwind's `md` breakpoint, below which the app uses its mobile layout.
const PHONE_QUERY = '(max-width: 767px)';

const subscribe = (onChange) => {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

export const usePhoneLayout = () => useSyncExternalStore(subscribe, () => window.matchMedia(PHONE_QUERY).matches);

// Opening a sheet from the editor hides the on-screen keyboard so the sheet has room. The editor
// keeps its selection, and commands that refocus it bring the keyboard back.
const DismissKeyboard = ({ children }) => {
  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.isContentEditable) active.blur();
  }, []);
  return children;
};

// A Headless UI PopoverPanel that is anchored to its button on larger screens and becomes a
// bottom sheet (the `sheetPanel` class) on phones. Function children also receive `phone`, so
// content can switch to sheet layouts (`sheetGrid` / `sheetButton`).
export const ResponsivePopoverPanel = ({ anchor, className = '', sheetClassName = '', children, ...props }) => {
  const phone = usePhoneLayout();
  const render = (bag) => (typeof children === 'function' ? children({ ...bag, phone }) : children);

  if (!phone) {
    return (
      <PopoverPanel portal anchor={anchor} className={className} {...props}>
        {render}
      </PopoverPanel>
    );
  }

  return (
    <PopoverPanel portal focus={false} transition className={`sheetPanel ${sheetClassName}`} {...props}>
      {(bag) => <DismissKeyboard>{render(bag)}</DismissKeyboard>}
    </PopoverPanel>
  );
};
