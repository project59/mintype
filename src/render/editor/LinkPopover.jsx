import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Transition } from '@headlessui/react';
import { ExternalLink, Trash2, X } from 'lucide-react';
import { getMarkRange } from '@tiptap/core';
import { usePhoneLayout } from '../../components/common/ResponsivePopover.jsx';

// The toolbar's link button emits this on the active editor to open its link editor.
export const OPEN_LINK_EDITOR_EVENT = 'mintype:openLinkEditor';

const PANEL_HEIGHT = 140;

const placeBelow = (bounds) => {
  const panelWidth = Math.min(288, window.innerWidth - 16);
  return {
    top: Math.max(8, Math.min(bounds.bottom + 8, window.innerHeight - PANEL_HEIGHT)),
    left: Math.max(8, Math.min(bounds.left, window.innerWidth - panelWidth - 8)),
  };
};

const coordsBounds = (view, pos) => () => {
  try {
    return view.coordsAtPos(pos);
  } catch {
    return null;
  }
};

// Edits a link in place. It opens on a clicked link, or from the toolbar for the selection:
// the link around the cursor, a link for the selected text, or a new linked URL at the cursor.
const LinkPopover = ({ editor, children }) => {
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const [link, setLink] = useState(null);
  // The phone sheet stays mounted with its link while it slides away, so being shown is
  // tracked apart from `link`, which is cleared once the sheet has left.
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState('');
  const phone = usePhoneLayout();

  const close = () => {
    setVisible(false);
    if (!phone) setLink(null);
  };

  // `target` is { pos } for an existing link (any position inside it) or { from, to } for a
  // new one. `getBounds` returns the rect to place the desktop panel under, or null once gone.
  const open = (target, getBounds, href) => {
    const bounds = getBounds();
    if (!bounds) return;
    setUrl(href);
    setLink({ id: Date.now(), target, getBounds, ...placeBelow(bounds) });
    setVisible(true);
  };

  useEffect(() => {
    if (!link || !visible) return undefined;

    const reposition = () => {
      const bounds = link.getBounds();
      if (!bounds) {
        close();
        return;
      }
      const { top, left } = placeBelow(bounds);
      setLink((current) => {
        if (!current || current.id !== link.id || (current.top === top && current.left === left)) return current;
        return { ...current, top, left };
      });
    };

    const dismiss = (event) => {
      if (rootRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) return;
      close();
    };

    document.addEventListener('pointerdown', dismiss);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [link, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (link) inputRef.current?.focus({ preventScroll: true });
  }, [link?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editor) return undefined;
    const openFromSelection = () => {
      const { state, view } = editor;
      const { from, to, $from } = state.selection;
      const range = getMarkRange($from, state.schema.marks.link);
      if (range) {
        open({ pos: range.from }, coordsBounds(view, range.from), editor.getAttributes('link').href || '');
      } else {
        open({ from, to }, coordsBounds(view, from), '');
      }
    };
    editor.on(OPEN_LINK_EDITOR_EVENT, openFromSelection);
    return () => editor.off(OPEN_LINK_EDITOR_EVENT, openFromSelection);
  }, [editor]);

  const handleClick = (event) => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || !editor?.view.dom.contains(anchor)) {
      close();
      return;
    }

    event.preventDefault();
    open(
      { pos: editor.view.posAtDOM(anchor, 0) },
      () => (anchor.isConnected ? anchor.getBoundingClientRect() : null),
      anchor.getAttribute('href') || '',
    );
  };

  const isExisting = link?.target.pos !== undefined;

  // Acts on the link that was clicked, wherever the selection is: a tap on a phone does not
  // always move the cursor into the link.
  const linkChain = () => editor.chain().focus().setTextSelection(link.target.pos).extendMarkRange('link');

  const save = (event) => {
    event.preventDefault();
    const href = url.trim();
    if (!href || !editor) return;
    const { target } = link;
    if (isExisting) {
      linkChain().setLink({ href }).run();
    } else if (target.from === target.to) {
      editor.chain().focus().insertContentAt(target.from, { type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run();
    } else {
      editor.chain().focus().setTextSelection(target).setLink({ href }).run();
    }
    close();
  };

  const remove = () => {
    if (!editor) return;
    linkChain().unsetLink().run();
    close();
  };

  const navigate = () => {
    const href = url.trim();
    if (!href) return;
    if (!/^(https?:|mailto:|tel:|\/|#|\.\.?\/)/i.test(href)) return;
    window.open(href, '_blank', 'noopener,noreferrer');
    close();
  };

  return (
    <div ref={rootRef} onClick={handleClick}>
      {children}
      {link && createPortal(
        phone ? (
          // On phones the editor becomes a bottom sheet that slides in and out; tapping
          // outside it closes it.
          <Transition show={visible} appear afterLeave={() => setLink(null)}>
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Edit link"
              className="sheetPanel space-y-2"
              onClick={(event) => event.stopPropagation()}
            >
              <form onSubmit={save} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  aria-label="Link URL"
                  type="text"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="Paste or type a link"
                  className="sheetInput"
                />
                <button type="submit" className="sheetButton sheetButtonPrimary flex-row px-4">
                  Save
                </button>
              </form>
              {isExisting && (
                <div className="sheetGrid grid-cols-2">
                  <button type="button" onClick={navigate} className="sheetButton">
                    <ExternalLink size={18} />
                    Open link
                  </button>
                  <button type="button" onClick={remove} className="sheetButton sheetButtonDanger">
                    <Trash2 size={18} />
                    Remove link
                  </button>
                </div>
              )}
            </div>
          </Transition>
        ) : visible && (
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Edit link"
            className="fixed z-[10000] w-[min(18rem,calc(100vw-1rem))] rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            style={{ top: link.top, left: link.left }}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') close();
            }}
          >
            <form onSubmit={save} className="flex items-center gap-2">
              <input
                ref={inputRef}
                aria-label="Link URL"
                type="text"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="Paste or type a link"
                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-100"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                Save
              </button>
            </form>
            <div className="mt-2 flex items-center justify-between">
              {isExisting ? (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={navigate}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800"
                >
                  <ExternalLink size={13} />
                  Open link
                </button>
              ) : <span />}
              <div className="flex items-center">
                {isExisting && (
                  <button
                    type="button"
                    aria-label="Remove link"
                    title="Remove link"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={remove}
                    className="rounded-md p-1.5 text-gray-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Close link popover"
                  title="Close"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={close}
                  className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        ),
        document.body,
      )}
    </div>
  );
};

export default LinkPopover;
