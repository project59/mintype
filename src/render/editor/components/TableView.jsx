import { useEffect, useReducer, useRef, useState } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { TableMap } from '@tiptap/pm/tables';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine, ArrowUpToLine,
  GripHorizontal, GripVertical, Plus, Trash2,
} from 'lucide-react';
import { TABLE_BOX_CLASS, TABLE_SCROLL_CLASS } from '../nodes/blockStyles.js';

const gripClass = 'flex items-center justify-center rounded border border-zinc-200 bg-white text-zinc-400 shadow-sm hover:text-zinc-700 data-[open]:border-indigo-400 data-[open]:text-indigo-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100';
const addBarClass = 'absolute flex items-center justify-center rounded bg-zinc-100 text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-200 hover:text-zinc-700 focus-visible:opacity-100 group-hover/table:opacity-100 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-200 [@media(hover:none)]:opacity-100';

const MenuItem = ({ icon: Icon, label, onClick, disabled = false, danger = false }) => (
  <button
    type="button"
    disabled={disabled}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
      danger
        ? 'text-zinc-700 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-200 dark:hover:bg-rose-950/40'
        : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
    }`}
  >
    <Icon size={14} />
    {label}
  </button>
);

const GripMenu = ({ label, icon: Icon, style, className, children }) => (
  <Popover className="absolute z-10" style={style}>
    <PopoverButton aria-label={label} title={label} onMouseDown={(event) => event.preventDefault()} className={`${gripClass} ${className}`}>
      <Icon size={12} />
    </PopoverButton>
    <PopoverPanel
      portal
      anchor={{ to: 'bottom start', gap: '6px', padding: '12px' }}
      className="z-50 w-48 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
    >
      {({ close }) => children(close)}
    </PopoverPanel>
  </Popover>
);

// Row and column grips follow the hovered (or tapped) cell. Their menus act on that row or
// column by placing the cursor in it and running the table commands.
const TableView = ({ node, editor, getPos }) => {
  const wrapperRef = useRef(null);
  const scrollRef = useRef(null);
  const [cell, setCell] = useState(null);
  const [, remeasure] = useReducer((count) => count + 1, 0);

  const map = TableMap.get(node);
  const active = cell && cell.row < map.height && cell.col < map.width ? cell : null;

  useEffect(() => {
    window.addEventListener('resize', remeasure);
    return () => window.removeEventListener('resize', remeasure);
  }, []);

  const trackCell = (event) => {
    const element = event.target.closest?.('td, th');
    if (!element || !scrollRef.current?.contains(element)) return;
    const next = { row: element.parentElement.sectionRowIndex, col: element.cellIndex };
    if (next.row !== cell?.row || next.col !== cell?.col) setCell(next);
  };

  const cellPos = (row, col) => getPos() + 1 + map.positionAt(row, col, node);
  const inCell = (row, col) => editor.chain().focus().setTextSelection(cellPos(row, col) + 2);

  const setColumnAlign = (col, align) => editor.chain().focus().command(({ tr }) => {
    for (let row = 0; row < map.height; row += 1) {
      const pos = cellPos(row, col);
      tr.setNodeMarkup(pos, null, { ...tr.doc.nodeAt(pos).attrs, align });
    }
    return true;
  }).run();

  // Deleting the header row promotes the next row to be the header.
  const deleteRow = (row, col) => (row === 0 ? inCell(row, col).deleteRow().toggleHeaderRow() : inCell(row, col).deleteRow()).run();

  let gripPositions = null;
  const tableElement = scrollRef.current?.querySelector('table');
  const cellElement = active && tableElement?.rows[active.row]?.cells[active.col];
  if (cellElement && wrapperRef.current) {
    const origin = wrapperRef.current.getBoundingClientRect();
    const rowRect = cellElement.parentElement.getBoundingClientRect();
    const cellRect = cellElement.getBoundingClientRect();
    const tableRect = tableElement.getBoundingClientRect();
    gripPositions = {
      row: { left: Math.max(tableRect.left, origin.left) - origin.left - 6, top: rowRect.top - origin.top + rowRect.height / 2 - 10 },
      col: { left: cellRect.left - origin.left + cellRect.width / 2 - 10, top: tableRect.top - origin.top - 6 },
    };
  }

  const gripVisibility = 'opacity-0 group-hover/table:opacity-100 data-[open]:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100';

  return (
    <NodeViewWrapper ref={wrapperRef} className={`group/table relative ${TABLE_BOX_CLASS}`} onPointerMove={trackCell} onPointerDown={trackCell}>
      <div ref={scrollRef} className={TABLE_SCROLL_CLASS} onScroll={remeasure}>
        <NodeViewContent as="table" />
      </div>

      {editor.isEditable && gripPositions && (
        <div contentEditable={false}>
          <GripMenu label="Row options" icon={GripVertical} style={gripPositions.row} className={`h-5 w-3 ${gripVisibility}`}>
            {(close) => {
              const run = (action) => () => { action(); close(); };
              const { row, col } = active;
              return (
                <>
                  <MenuItem icon={ArrowUpToLine} label="Insert row above" disabled={row === 0} onClick={run(() => inCell(row, col).addRowBefore().run())} />
                  <MenuItem icon={ArrowDownToLine} label="Insert row below" onClick={run(() => inCell(row, col).addRowAfter().run())} />
                  <MenuItem icon={Trash2} label="Delete row" danger disabled={map.height === 1} onClick={run(() => deleteRow(row, col))} />
                  <MenuItem icon={Trash2} label="Delete table" danger onClick={run(() => inCell(0, 0).deleteTable().run())} />
                </>
              );
            }}
          </GripMenu>
          <GripMenu label="Column options" icon={GripHorizontal} style={gripPositions.col} className={`h-3 w-5 ${gripVisibility}`}>
            {(close) => {
              const run = (action) => () => { action(); close(); };
              const { row, col } = active;
              const align = node.child(0).child(col).attrs.align;
              return (
                <>
                  <div className="mb-1 flex gap-1 border-b border-zinc-100 px-1 pb-1 dark:border-zinc-800">
                    {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([value, Icon]) => (
                      <button
                        key={value}
                        type="button"
                        aria-label={`Align ${value}`}
                        title={`Align ${value}`}
                        aria-pressed={(align || 'left') === value}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={run(() => setColumnAlign(col, value === 'left' ? null : value))}
                        className={`flex h-7 flex-1 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 ${
                          (align || 'left') === value ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white' : ''
                        }`}
                      >
                        <Icon size={14} />
                      </button>
                    ))}
                  </div>
                  <MenuItem icon={ArrowLeftToLine} label="Insert column left" onClick={run(() => inCell(row, col).addColumnBefore().run())} />
                  <MenuItem icon={ArrowRightToLine} label="Insert column right" onClick={run(() => inCell(row, col).addColumnAfter().run())} />
                  <MenuItem icon={Trash2} label="Delete column" danger disabled={map.width === 1} onClick={run(() => inCell(row, col).deleteColumn().run())} />
                  <MenuItem icon={Trash2} label="Delete table" danger onClick={run(() => inCell(0, 0).deleteTable().run())} />
                </>
              );
            }}
          </GripMenu>
        </div>
      )}

      {editor.isEditable && (
        <div contentEditable={false}>
          <button
            type="button"
            aria-label="Add row"
            title="Add row"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => inCell(map.height - 1, 0).addRowAfter().run()}
            className={`${addBarClass} -bottom-3 left-0 right-0 h-3`}
          >
            <Plus size={10} />
          </button>
          <button
            type="button"
            aria-label="Add column"
            title="Add column"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => inCell(0, map.width - 1).addColumnAfter().run()}
            className={`${addBarClass} -right-4 bottom-1 top-0 w-3`}
          >
            <Plus size={10} />
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default TableView;
