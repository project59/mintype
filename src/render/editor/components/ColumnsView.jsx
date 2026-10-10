import React from 'react';
import { ArrowLeftToLine, ArrowRightToLine, Columns2, PanelLeft, PanelRight, Trash2, Ungroup } from 'lucide-react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import {
  addColumn, getLayouts, removeColumn, setColumnWidths, unwrapColumns,
} from '../nodes/columnsCommands.js';
import { COLUMN_VIEW_STYLE, COLUMNS_VIEW_STYLE } from '../nodes/blockStyles.js';

const LAYOUT_ICONS = { equal: Columns2, wideFirst: PanelLeft, wideLast: PanelRight };

const toolbarClass = 'absolute z-10 flex items-center gap-0.5 rounded-md border border-gray-200 bg-white p-0.5 shadow-sm opacity-0 transition-opacity focus-within:opacity-100 dark:border-zinc-700 dark:bg-zinc-900 [@media(hover:none)]:opacity-100';

const ToolButton = ({ label, onClick, active = false, className = '', children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={active}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    className={`flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10 ${active ? 'bg-black/5 text-gray-900 dark:bg-white/10 dark:text-white' : ''} ${className}`}
  >
    {children}
  </button>
);

const ColumnsView = ({ node, editor, getPos }) => {
  const run = (command) => () => editor.commands.command(({ tr }) => command(tr, getPos()));
  const currentWidths = JSON.stringify(node.children.map((column) => column.attrs.width ?? null));

  return (
    <NodeViewWrapper data-count={node.childCount} className="group/columns relative" style={COLUMNS_VIEW_STYLE}>
      <div contentEditable={false} className={`${toolbarClass} -top-8 right-0 group-hover/columns:opacity-100 group-focus-within/columns:opacity-100`}>
        {getLayouts(node.childCount).map(({ id, label, widths }) => {
          const Icon = LAYOUT_ICONS[id];
          return (
            <ToolButton key={id} label={label} active={JSON.stringify(widths) === currentWidths} onClick={run((tr, pos) => setColumnWidths(tr, pos, widths))}>
              <Icon size={14} />
            </ToolButton>
          );
        })}
        <ToolButton label="Unwrap columns" onClick={run(unwrapColumns)}>
          <Ungroup size={14} />
        </ToolButton>
      </div>
      {/* NodeViewContent wraps ProseMirror's content element, whose children are the columns. */}
      <NodeViewContent className="[&>[data-node-view-content-react]]:flex [&>[data-node-view-content-react]]:flex-wrap [&>[data-node-view-content-react]]:gap-[var(--columns-gap)]" />
    </NodeViewWrapper>
  );
};

// Add/remove buttons hide at the column limits (4 and 2), driven by the parent's data-count so they stay current without re-rendering.
export const ColumnView = ({ editor, getPos }) => {
  const run = (command) => () => editor.commands.command(({ tr }) => command(tr, getPos()));

  return (
    <NodeViewWrapper
      style={COLUMN_VIEW_STYLE}
      className="group/column relative h-full min-w-0 rounded-lg border border-transparent transition-colors hover:border-dashed hover:border-gray-300 focus-within:border-dashed focus-within:border-gray-300 dark:hover:border-zinc-600 dark:focus-within:border-zinc-600"
    >
      <div contentEditable={false} className={`${toolbarClass} -top-3 right-2 group-hover/column:opacity-100 group-focus-within/column:opacity-100`}>
        <ToolButton label="Add column before" onClick={run((tr, pos) => addColumn(tr, pos, 'before'))} className="group-data-[count=4]/columns:hidden">
          <ArrowLeftToLine size={14} />
        </ToolButton>
        <ToolButton label="Add column after" onClick={run((tr, pos) => addColumn(tr, pos, 'after'))} className="group-data-[count=4]/columns:hidden">
          <ArrowRightToLine size={14} />
        </ToolButton>
        <ToolButton label="Delete column" onClick={run(removeColumn)} className="hover:!text-rose-500 group-data-[count=2]/columns:hidden">
          <Trash2 size={14} />
        </ToolButton>
      </div>
      <NodeViewContent />
    </NodeViewWrapper>
  );
};

export default ColumnsView;
