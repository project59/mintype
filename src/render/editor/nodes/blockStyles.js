// Styling shared by blocks' editor views (components/*View.jsx) and their static HTML
// (renderHTML, StaticMarkdownRenderer), so a change made here applies to both. Where the two
// can't use the same element, such as a React button that static HTML draws with ::after, both
// versions are defined side by side and must be changed together; the parity check
// (parity.html) catches layout drift between them. Tailwind only sees complete class names, so
// keep every class here written out in full.

// Icons are lucide's SVG children, kept as data because static HTML can't render React
// components. IconSvg.jsx draws them in views; iconSpec builds the static DOM.
export const iconSvgAttrs = (size) => ({
  width: String(size),
  height: String(size),
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
});

// A ProseMirror DOMOutputSpec for an icon, for renderHTML or DOMSerializer.renderSpec.
export const iconSpec = (icon, size, attrs = {}) => [
  'http://www.w3.org/2000/svg svg',
  { ...iconSvgAttrs(size), ...attrs },
  ...icon.map(([tag, childAttrs]) => [`http://www.w3.org/2000/svg ${tag}`, childAttrs]),
];

// Section: a rounded box whose title row holds the open/close toggle at the left and, in the
// editor, the colour and delete controls at the right (the title's pr-14 leaves them room).
export const SECTION_BOX_CLASS = 'relative my-2 rounded-lg py-1 pl-8 pr-2';
export const SECTION_TITLE_CLASS = "list-none py-0.5 pr-14 text-base font-semibold leading-7 [&::-webkit-details-marker]:hidden [&:has(>br:only-child)]:before:pointer-events-none [&:has(>br:only-child)]:before:float-left [&:has(>br:only-child)]:before:h-0 [&:has(>br:only-child)]:before:font-normal [&:has(>br:only-child)]:before:text-gray-400 [&:has(>br:only-child)]:before:content-['Section_title']";
// The toggle is a 24px button at left-1.5 top-2 holding a 9px triangle, pointing right when
// closed and down when open. Static HTML has no element there, so it draws the triangle with
// the title's ::after over the same 24px box (::before is the title's placeholder); its
// clip-path is the 9px triangle centred in that box.
export const SECTION_TOGGLE_CLASS = 'absolute left-1.5 top-2 flex h-6 w-6 items-center justify-center rounded text-gray-700 hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10';
export const SECTION_TOGGLE_ICON_SIZE = 9;
export const SECTION_STATIC_TOGGLE_CLASS = '[&>summary]:after:absolute [&>summary]:after:left-1.5 [&>summary]:after:top-2 [&>summary]:after:h-6 [&>summary]:after:w-6 [&>summary]:after:rotate-90 [&[open]_>_summary]:after:rotate-180 [&>summary]:after:bg-gray-700 dark:[&>summary]:after:bg-gray-200 [&>summary]:after:content-[""] [&>summary]:after:[clip-path:polygon(50%_35.94%,65.63%_64.06%,34.38%_64.06%)]';
// The vertical guide beside an open section's body runs from 2.25rem below the top to 0.5rem
// above the bottom, 1.15rem from the left. Static HTML draws it as a background line because
// the body blocks have no wrapper element to draw a border on.
export const SECTION_GUIDE_CLASS = 'pointer-events-none absolute bottom-2 left-[1.15rem] top-9 w-px bg-gray-300 dark:bg-zinc-600';
export const SECTION_STATIC_GUIDE_CLASS = 'bg-no-repeat bg-[length:1px_calc(100%-2.75rem)] bg-[position:1.15rem_2.25rem] [&[open]]:bg-[linear-gradient(theme(colors.gray.300),theme(colors.gray.300))] dark:[&[open]]:bg-[linear-gradient(theme(colors.zinc.600),theme(colors.zinc.600))]';

// Columns: static HTML uses inline styles so exported HTML needs no CSS, and the views use the
// same values. A column's padding and 1px border (transparent until hovered) sit inside its
// flex item so they don't change how the columns share the row.
const COLUMNS_GAP = '1rem';
const COLUMNS_MARGIN = '0.75rem 0';
const COLUMN_PADDING = '0.5rem';
export const COLUMNS_STATIC_STYLE = `display:flex;flex-wrap:wrap;gap:${COLUMNS_GAP};margin:${COLUMNS_MARGIN}`;
export const COLUMN_STATIC_INNER_STYLE = `height:100%;padding:${COLUMN_PADDING};border:1px solid transparent`;
export const COLUMNS_VIEW_STYLE = { margin: COLUMNS_MARGIN, '--columns-gap': COLUMNS_GAP };
export const COLUMN_VIEW_STYLE = { padding: COLUMN_PADDING };

// Table: the wrapper's spacing, and the inner element that scrolls wide tables sideways.
export const TABLE_BOX_CLASS = 'my-3';
export const TABLE_SCROLL_CLASS = 'overflow-x-auto pb-1';

// Code block: the language shown in the header, as a picker in the editor and as text in
// static HTML.
export const CODE_LANGUAGE_CLASS = 'h-6 rounded-md px-2 text-xs font-medium leading-6 text-gray-600 dark:text-gray-400';

// Page link: an icon (the page's emoji, or a document icon) followed by the page's title. A
// link whose page can't be found is greyed out.
export const PAGE_MENTION_CLASS = 'rounded px-0.5';
export const PAGE_MENTION_ICON_CLASS = 'mr-1 inline-block align-[0.1em]';
export const PAGE_MENTION_ICON_SIZE = 14;
export const PAGE_MENTION_ICON_SVG_CLASS = 'inline text-gray-400 dark:text-zinc-500';
export const PAGE_MENTION_UNRESOLVED_CLASS = 'text-gray-400 dark:text-zinc-500';
export const PAGE_ICON = [
  ['path', { d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' }],
  ['path', { d: 'M14 2v4a2 2 0 0 0 2 2h4' }],
  ['path', { d: 'M10 9H8' }],
  ['path', { d: 'M16 13H8' }],
  ['path', { d: 'M16 17H8' }],
];
// In the viewer's own workspace an unresolved link is a missing page; elsewhere (e.g. a
// QuickShare recipient without the target page) it's only a link to a page they can't see.
export const MISSING_PAGE_LABEL = 'Missing page';
export const LINKED_PAGE_LABEL = 'Linked page';
