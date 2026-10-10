// Layout snapshots of a Markdown object's body, compared between its static and editing views.
// Positions are relative to the object's frame, so the two views are directly comparable.

// Differences up to this many pixels are rounding noise, not layout shifts.
const TOLERANCE = 0.5;

// Text here differs by design and is left out of the line comparison: the code block header
// holds a language picker in the editor and a plain label in static views. Its box still
// counts, through the block and line positions around it.
const IGNORED_TEXT = '.code-block-header';

const round = (value) => Math.round(value * 10) / 10;

const relativeBox = (rect, origin) => ({
  top: round(rect.top - origin.top),
  left: round(rect.left - origin.left),
  width: round(rect.width),
  height: round(rect.height),
});

const describe = (element) => {
  const type = element.getAttribute('data-type') || element.getAttribute('data-callout-type');
  return `${element.tagName.toLowerCase()}${type ? `[${type}]` : ''}`;
};

// Screen-reader-only text (e.g. task item checkbox labels) is clipped to a 1px box, and the
// body of a closed <details> still reports text positions though it isn't rendered.
const isVisuallyHidden = (element) => {
  const rect = element.getBoundingClientRect();
  return (rect.width <= 1 && rect.height <= 1) || !element.checkVisibility();
};

const textLines = (root, origin) => {
  const lines = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    const parent = text.parentElement;
    if (!text.textContent.trim() || parent.closest(IGNORED_TEXT) || parent.closest('select') || isVisuallyHidden(parent)) continue;
    const range = document.createRange();
    range.selectNodeContents(text);
    [...range.getClientRects()]
      .filter((rect) => rect.width > 1 && rect.height > 0)
      .forEach((rect, index) => {
        lines.push({ text: `${text.textContent.trim().slice(0, 24)}${index ? ` (line ${index + 1})` : ''}`, ...relativeBox(rect, origin) });
      });
  }
  return lines;
};

// How far the object's height is from its content's (0 when auto-height has fitted it),
// measured like useAutoHeight in TldrawCanvas.jsx.
export const fitGap = (frame) => {
  const body = frame.firstElementChild;
  const bodyStyle = getComputedStyle(body);
  const frameStyle = getComputedStyle(frame);
  const fitted = Math.ceil(
    body.firstElementChild.getBoundingClientRect().height
    + parseFloat(bodyStyle.paddingTop) + parseFloat(bodyStyle.paddingBottom)
    + parseFloat(frameStyle.borderTopWidth) + parseFloat(frameStyle.borderBottomWidth),
  );
  return frame.offsetHeight - fitted;
};

// `frame` is the object's outer element; its first child is the scrolling body.
export const snapshot = (frame) => {
  const origin = frame.getBoundingClientRect();
  const body = frame.firstElementChild;
  const root = frame.querySelector('.tiptap');
  return {
    body: { scrollbar: body.offsetWidth - body.clientWidth > 0, contentWidth: body.clientWidth, height: frame.offsetHeight, fitGap: fitGap(frame) },
    blocks: [...root.children].map((child) => ({ block: describe(child), ...relativeBox(child.getBoundingClientRect(), origin) })),
    lines: textLines(root, origin),
  };
};

const boxDiff = (a, b) => ['top', 'left', 'width', 'height']
  .filter((key) => Math.abs(a[key] - b[key]) > TOLERANCE)
  .map((key) => `${key} ${a[key]} → ${b[key]}`)
  .join(', ');

// Compares matching boxes in order. A box whose only change is the vertical shift carried
// down from the box before it (e.g. everything below a taller block) is counted, not listed,
// so each report starts at the cause.
const diffSequence = (pairs, describePair, label) => {
  const diffs = [];
  let carried = 0;
  let shifted = 0;
  pairs.forEach(([a, b]) => {
    if (boxDiff({ ...a, top: a.top + carried }, b)) diffs.push(`${describePair(a, b)}: ${boxDiff(a, b)}`);
    else if (carried) shifted += 1;
    carried = (b.top + b.height) - (a.top + a.height);
  });
  if (shifted) diffs.push(`…and ${shifted} more ${label} only moved down with the change above`);
  return diffs;
};

// Lists the differences between two snapshots, as readable strings.
export const compare = (before, after) => {
  const diffs = [];

  if (before.body.scrollbar !== after.body.scrollbar) {
    diffs.push(`Scrollbar ${before.body.scrollbar ? 'shown' : 'hidden'} → ${after.body.scrollbar ? 'shown' : 'hidden'}`);
  }
  if (before.body.height !== after.body.height) {
    diffs.push(`Object height ${before.body.height} → ${after.body.height}`);
  }
  if (Math.abs(before.body.contentWidth - after.body.contentWidth) > TOLERANCE) {
    diffs.push(`Content width ${before.body.contentWidth} → ${after.body.contentWidth}`);
  }

  if (before.blocks.length !== after.blocks.length) {
    diffs.push(`Block count ${before.blocks.length} → ${after.blocks.length}`);
  }
  diffs.push(...diffSequence(
    before.blocks.slice(0, after.blocks.length).map((block, index) => [block, after.blocks[index]]),
    (block, other) => `Block ${before.blocks.indexOf(block) + 1} ${block.block}${other.block === block.block ? '' : ` (${other.block})`}`,
    'blocks',
  ));

  if (before.lines.length !== after.lines.length) {
    const afterTexts = new Set(after.lines.map((line) => line.text));
    const beforeTexts = new Set(before.lines.map((line) => line.text));
    const missing = before.lines.filter((line) => !afterTexts.has(line.text)).map((line) => line.text);
    const added = after.lines.filter((line) => !beforeTexts.has(line.text)).map((line) => line.text);
    diffs.push(`Text line count ${before.lines.length} → ${after.lines.length}${missing.length ? `; only before: ${missing.join(' | ')}` : ''}${added.length ? `; only after: ${added.join(' | ')}` : ''}`);
    return diffs;
  }
  const renamed = before.lines.filter((line, index) => line.text !== after.lines[index].text);
  renamed.forEach((line) => diffs.push(`Text "${line.text}" → "${after.lines[before.lines.indexOf(line)].text}"`));
  diffs.push(...diffSequence(
    before.lines.map((line, index) => [line, after.lines[index]]).filter(([line, other]) => line.text === other.text),
    (line) => `Text "${line.text}"`,
    'text lines',
  ));

  return diffs;
};
