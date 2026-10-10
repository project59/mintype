import { TextSelection } from '@tiptap/pm/state';

export const MIN_COLUMNS = 2;
export const MAX_COLUMNS = 4;

const isEmptyColumn = (column) => column.childCount === 1 && column.firstChild.isTextblock && column.firstChild.content.size === 0;

// Columns share the row by their width ratio and only wrap onto a new row when one would
// get narrower than 9rem (e.g. on phones).
export const columnStyle = (width) => {
  const ratio = Number(width) > 0 ? Number(width) : 1;
  return `flex: ${ratio} 1 0%; min-width: min(100%, 9rem);`;
};

// Each layout is a list of per-column width ratios; null means 1.
export const getLayouts = (count) => {
  const rest = Array(count - 1).fill(null);
  return [
    { id: 'equal', label: 'Equal columns', widths: Array(count).fill(null) },
    { id: 'wideFirst', label: 'Wide first column', widths: ['2', ...rest] },
    { id: 'wideLast', label: 'Wide last column', widths: [...rest, '2'] },
  ];
};

export const addColumn = (tr, columnPos, side) => {
  const column = tr.doc.nodeAt(columnPos);
  const columns = tr.doc.resolve(columnPos).parent;
  if (!column || columns.type.name !== 'columns' || columns.childCount >= MAX_COLUMNS) return false;
  const at = side === 'before' ? columnPos : columnPos + column.nodeSize;
  tr.insert(at, column.type.createAndFill());
  tr.setSelection(TextSelection.near(tr.doc.resolve(at + 1)));
  return true;
};

// Content of the removed column moves into its neighbour rather than being discarded.
export const removeColumn = (tr, columnPos) => {
  const column = tr.doc.nodeAt(columnPos);
  const $pos = tr.doc.resolve(columnPos);
  if (!column || $pos.parent.type.name !== 'columns' || $pos.parent.childCount <= MIN_COLUMNS) return false;
  const moved = isEmptyColumn(column) ? null : column.content;
  tr.delete(columnPos, columnPos + column.nodeSize);
  if (moved) tr.insert($pos.index() > 0 ? columnPos - 1 : columnPos + 1, moved);
  return true;
};

export const unwrapColumns = (tr, columnsPos) => {
  const columns = tr.doc.nodeAt(columnsPos);
  if (!columns || columns.type.name !== 'columns') return false;
  const blocks = [];
  columns.forEach((column) => column.forEach((block) => blocks.push(block)));
  const kept = blocks.filter((block) => !(block.type.name === 'paragraph' && block.content.size === 0));
  tr.replaceWith(columnsPos, columnsPos + columns.nodeSize, kept.length ? kept : [tr.doc.type.schema.nodes.paragraph.create()]);
  tr.setSelection(TextSelection.near(tr.doc.resolve(columnsPos), 1));
  return true;
};

export const setColumnWidths = (tr, columnsPos, widths) => {
  const columns = tr.doc.nodeAt(columnsPos);
  if (!columns || columns.type.name !== 'columns') return false;
  let pos = columnsPos + 1;
  columns.forEach((column, _offset, index) => {
    tr.setNodeMarkup(pos, undefined, { ...column.attrs, width: widths[index] ?? null });
    pos += column.nodeSize;
  });
  return true;
};

// Backspace at the start of an empty first column drops that column, or unwraps the block when only two remain.
export const backspaceEmptyFirstColumn = (editor) => {
  const { selection } = editor.state;
  if (!selection.empty) return false;
  const { $from } = selection;
  let depth = $from.depth;
  while (depth > 0 && $from.node(depth).type.name !== 'column') depth -= 1;
  if (depth === 0 || $from.depth !== depth + 1 || $from.index(depth) !== 0 || $from.parentOffset !== 0) return false;
  if ($from.index(depth - 1) !== 0 || !isEmptyColumn($from.node(depth))) return false;
  const columnPos = $from.before(depth);
  const columnsPos = $from.before(depth - 1);
  const siblings = $from.node(depth - 1).childCount;
  return editor.commands.command(({ tr }) => (siblings > MIN_COLUMNS ? removeColumn(tr, columnPos) : unwrapColumns(tr, columnsPos)));
};
