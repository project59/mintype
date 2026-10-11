import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { NodeViewWrapper } from '@tiptap/react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { getPagePath, getPageTitle, usePageMeta } from '../../shared/pageMeta.js';
import {
  MISSING_PAGE_LABEL, PAGE_ICON, PAGE_MENTION_CLASS, PAGE_MENTION_ICON_CLASS, PAGE_MENTION_ICON_SIZE,
  PAGE_MENTION_ICON_SVG_CLASS, PAGE_MENTION_UNRESOLVED_CLASS,
} from '../nodes/blockStyles.js';
import IconSvg from './IconSvg.jsx';

const PageMentionView = ({ node, editor, deleteNode, selected }) => {
  const navigate = useNavigate();
  const meta = usePageMeta(node.attrs.pageId);
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const [menu, setMenu] = useState(null);

  const missing = meta === null;
  const path = getPagePath(meta);

  useEffect(() => {
    if (!menu) return undefined;
    const dismiss = (event) => {
      if (anchorRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) return;
      setMenu(null);
    };
    const close = () => setMenu(null);
    document.addEventListener('pointerdown', dismiss);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  const openPage = () => {
    setMenu(null);
    if (path) navigate(path);
  };

  const handleClick = (event) => {
    event.preventDefault();
    if (!editor.isEditable) {
      openPage();
      return;
    }
    const bounds = anchorRef.current.getBoundingClientRect();
    setMenu({
      top: Math.min(bounds.bottom + 6, window.innerHeight - 100),
      left: Math.max(8, Math.min(bounds.left, window.innerWidth - 200)),
    });
  };

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        ref={anchorRef}
        role="link"
        tabIndex={-1}
        data-page-id={node.attrs.pageId}
        title={missing ? 'This page no longer exists' : undefined}
        onClick={handleClick}
        className={`inline cursor-pointer ${PAGE_MENTION_CLASS} hover:bg-gray-100 dark:hover:bg-zinc-700/60 ${
          selected ? 'bg-blue-100 dark:bg-blue-900/40' : ''
        }`}
      >
        <span className={PAGE_MENTION_ICON_CLASS} aria-hidden="true">
          {meta?.emoji || <IconSvg icon={PAGE_ICON} size={PAGE_MENTION_ICON_SIZE} className={PAGE_MENTION_ICON_SVG_CLASS} />}
        </span>
        <span className={meta ? undefined : PAGE_MENTION_UNRESOLVED_CLASS}>
          {meta === undefined ? 'Loading…' : missing ? MISSING_PAGE_LABEL : getPageTitle(meta)}
        </span>
      </span>
      {menu && createPortal(
        <div
          ref={panelRef}
          role="menu"
          aria-label="Page link"
          className="fixed z-[10000] flex w-48 flex-col rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-slate-900"
          style={{ top: menu.top, left: menu.left }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setMenu(null);
          }}
        >
          <button
            type="button"
            role="menuitem"
            disabled={!path}
            onMouseDown={(event) => event.preventDefault()}
            onClick={openPage}
            className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-slate-800"
          >
            <ExternalLink size={14} />
            Open page
          </button>
          <button
            type="button"
            role="menuitem"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setMenu(null);
              deleteNode();
            }}
            className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 dark:text-gray-200 dark:hover:bg-rose-950/40"
          >
            <Trash2 size={14} />
            Remove link
          </button>
        </div>,
        document.body,
      )}
    </NodeViewWrapper>
  );
};

export default PageMentionView;
