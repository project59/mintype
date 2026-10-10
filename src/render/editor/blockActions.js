import { NodeSelection } from '@tiptap/pm/state';

// Nodes that only exist as structure inside another block; the block menu leaves them alone.
const STRUCTURAL_NODES = ['sectionTitle', 'column', 'tableRow', 'tableCell', 'tableHeader'];

const resolveBlock = (doc, pos) => {
  if (pos < 0 || pos > doc.content.size) return null;
  const node = doc.nodeAt(pos);
  if (!node || node.isInline || STRUCTURAL_NODES.includes(node.type.name)) return null;
  const $pos = doc.resolve(pos);
  return { node, parent: $pos.parent, index: $pos.index() };
};

const firstMovableIndex = (parent) => (parent.type.name === 'section' ? 1 : 0);

// The last block of a container that can hold a paragraph (a callout, column, section body or
// the page) is replaced by an empty paragraph instead, so deleting it never removes the container.
const keepsContainer = ({ parent, index }) => (
  parent.childCount - firstMovableIndex(parent) === 1
  && parent.canReplaceWith(index, index + 1, parent.type.schema.nodes.paragraph)
);

const isEmptyParagraph = (node) => node.type.name === 'paragraph' && node.content.size === 0;

// Blocks move among their siblings only. A section's title always stays its first child.
export const getBlockActions = (doc, pos) => {
  const block = resolveBlock(doc, pos);
  if (!block) return { valid: false, canMoveUp: false, canMoveDown: false, canDelete: false };
  return {
    valid: true,
    canMoveUp: block.index > firstMovableIndex(block.parent),
    canMoveDown: block.index < block.parent.childCount - 1,
    canDelete: !(keepsContainer(block) && isEmptyParagraph(block.node)),
  };
};

// Each helper changes `tr` in place and returns the block's position afterwards, or -1.
export const moveBlock = (tr, pos, direction) => {
  const block = resolveBlock(tr.doc, pos);
  const actions = getBlockActions(tr.doc, pos);
  if (!block || !(direction === 'up' ? actions.canMoveUp : actions.canMoveDown)) return pos;
  const { node, parent, index } = block;
  if (direction === 'up') {
    const previous = parent.child(index - 1);
    const start = pos - previous.nodeSize;
    tr.replaceWith(start, pos + node.nodeSize, [node, previous]);
    return start;
  }
  const next = parent.child(index + 1);
  tr.replaceWith(pos, pos + node.nodeSize + next.nodeSize, [next, node]);
  return pos + next.nodeSize;
};

export const duplicateBlock = (tr, pos) => {
  const block = resolveBlock(tr.doc, pos);
  if (!block) return -1;
  const copyPos = pos + block.node.nodeSize;
  tr.insert(copyPos, block.node);
  return copyPos;
};

export const deleteBlock = (tr, pos) => {
  const block = resolveBlock(tr.doc, pos);
  if (!block) return -1;
  if (keepsContainer(block)) {
    tr.replaceWith(pos, pos + block.node.nodeSize, block.parent.type.schema.nodes.paragraph.create());
  } else {
    tr.setSelection(NodeSelection.create(tr.doc, pos)).deleteSelection();
  }
  return -1;
};
