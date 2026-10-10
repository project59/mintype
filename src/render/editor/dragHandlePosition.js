const HANDLE_HEIGHT = 24;
// Space between the handle and its block; DocumentEditor's handle bridges it with an
// invisible extension so the pointer never leaves the handle's hover area.
const HANDLE_GAP = 2;

// Text further than this below a block's top edge isn't treated as its first line
// (e.g. the content of a section whose header has no text nodes).
const MAX_FIRST_LINE_OFFSET = 48;
const FALLBACK_LINE_HEIGHT = 36;

// Screen-reader-only text (e.g. the task item checkbox's label) is clipped to a 1px box,
// so it doesn't mark where the block's first visible line is.
const isVisuallyHidden = (element) => {
  const rect = element.getBoundingClientRect();
  return rect.width <= 1 && rect.height <= 1;
};

const firstTextLineRect = (dom) => {
  const walker = document.createTreeWalker(dom, NodeFilter.SHOW_TEXT, {
    acceptNode: (text) => (isVisuallyHidden(text.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const range = document.createRange();
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    const start = text.textContent.search(/\S/);
    if (start === -1) continue;
    range.setStart(text, start);
    range.setEnd(text, start + 1);
    const rect = [...range.getClientRects()].find((candidate) => candidate.height > 0);
    if (rect) return rect;
  }
  return null;
};

const textblockLineCenter = (dom, rect) => {
  const style = getComputedStyle(dom);
  const fontSize = parseFloat(style.fontSize) || 16;
  const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.5;
  return rect.top + parseFloat(style.borderTopWidth || 0) + parseFloat(style.paddingTop || 0) + lineHeight / 2;
};

const firstLineCenter = (dom, node, rect) => {
  const textRect = firstTextLineRect(dom);
  if (textRect && textRect.top - rect.top <= MAX_FIRST_LINE_OFFSET) return textRect.top + textRect.height / 2;
  if (node.isTextblock) return textblockLineCenter(dom, rect);
  return rect.top + Math.min(rect.height, FALLBACK_LINE_HEIGHT) / 2;
};

// List items sit inside their list's padding, with the marker to their left, so their
// handle goes to the left of the marker instead of overlapping it.
const anchorLeft = (dom, node, rect) => (
  node.type.name === 'listItem' && dom.parentElement
    ? dom.parentElement.getBoundingClientRect().left
    : rect.left
);

export const getDragHandleRect = (view, pos) => {
  const node = pos >= 0 ? view.state.doc.nodeAt(pos) : null;
  const dom = node ? view.nodeDOM(pos) : null;
  if (!(dom instanceof HTMLElement)) return null;

  const rect = dom.getBoundingClientRect();
  const left = anchorLeft(dom, node, rect) - HANDLE_GAP;
  const top = firstLineCenter(dom, node, rect) - HANDLE_HEIGHT / 2;
  return { x: left, y: top, left, top, right: left, bottom: top + HANDLE_HEIGHT, width: 0, height: HANDLE_HEIGHT };
};

// Hovering a node view's chrome (e.g. a section header) resolves to the start of its
// content, and the drag handle then also considers the first child when it's an atom,
// even if the pointer isn't over it or a collapsed section hides it. This rule drops
// candidates the pointer isn't vertically over, which includes hidden ones.
export const createPointerTargetRule = () => {
  let pointerY = null;
  return {
    trackPointer: (_view, event) => {
      pointerY = event.clientY;
      return false;
    },
    rule: {
      id: 'pointerOverTarget',
      evaluate: ({ view, pos }) => {
        const dom = view.nodeDOM(pos);
        if (pointerY === null || !(dom instanceof HTMLElement)) return 0;
        const rect = dom.getBoundingClientRect();
        if (!rect.width && !rect.height) return 1000;
        return pointerY < rect.top - 2 || pointerY > rect.bottom + 2 ? 1000 : 0;
      },
    },
  };
};
