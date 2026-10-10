import {
  AtSign, ChevronRight, Columns3, FileWarningIcon, Heading1, Heading2, Heading3,
  List, ListChecks, ListOrdered, MapPin, Minus, Quote, Table, TerminalSquare, Type, Video,
} from 'lucide-react';
import { TextSelection } from '@tiptap/pm/state';

const paragraph = { type: 'paragraph' };

const insertBlock = (type, attrs = {}, content = []) => (chain) => chain.insertContent({ type, attrs, content });

// New sections start open with the cursor in their (empty) title.
const insertSection = (chain) => insertBlock('section', { color: 'default', open: true }, [{ type: 'sectionTitle' }, paragraph])(chain)
  .command(({ tr }) => {
    const { $from } = tr.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).type.name === 'section') {
        tr.setSelection(TextSelection.create(tr.doc, $from.before(depth) + 2));
        break;
      }
    }
    return true;
  });

// Typing the trigger opens the page picker from PageMentionNode's suggestion plugin, which
// only starts at the beginning of a word.
const openPagePicker = (chain) => chain.command(({ tr }) => {
  const charBefore = tr.selection.$from.nodeBefore?.text?.slice(-1);
  tr.insertText(charBefore && !/\s/.test(charBefore) ? ' @' : '@');
  return true;
});

// Shared by the `/` menu and the toolbar's Add Block menu. `run` receives a focused chain
// (already scoped to remove the typed `/query` for slash commands) and returns it.
// Text formats are only offered in the `/` menu; the toolbar has its own controls for them.
export const blockCommands = [
  { id: 'text', label: 'Text', icon: Type, keywords: ['paragraph', 'plain'], textFormat: true, run: (chain) => chain.setParagraph() },
  { id: 'heading1', label: 'Heading 1', icon: Heading1, keywords: ['h1', 'title'], textFormat: true, run: (chain) => chain.setHeading({ level: 1 }) },
  { id: 'heading2', label: 'Heading 2', icon: Heading2, keywords: ['h2', 'subtitle'], textFormat: true, run: (chain) => chain.setHeading({ level: 2 }) },
  { id: 'heading3', label: 'Heading 3', icon: Heading3, keywords: ['h3'], textFormat: true, run: (chain) => chain.setHeading({ level: 3 }) },
  { id: 'bulletList', label: 'Bullet list', icon: List, keywords: ['unordered', 'ul'], textFormat: true, run: (chain) => chain.toggleBulletList() },
  { id: 'orderedList', label: 'Numbered list', icon: ListOrdered, keywords: ['ordered', 'ol'], textFormat: true, run: (chain) => chain.toggleOrderedList() },
  { id: 'quote', label: 'Quote', icon: Quote, keywords: ['blockquote'], textFormat: true, run: (chain) => chain.toggleBlockquote() },
  { id: 'divider', label: 'Divider', icon: Minus, keywords: ['hr', 'horizontal rule', 'separator'], textFormat: true, run: (chain) => chain.setHorizontalRule() },
  { id: 'callout', label: 'Callout', icon: FileWarningIcon, keywords: ['info', 'warning', 'note'], run: insertBlock('callout', { type: 'info' }, [paragraph]) },
  { id: 'codeBlock', label: 'Code block', icon: TerminalSquare, keywords: ['code', 'snippet'], run: insertBlock('codeBlock') },
  { id: 'table', label: 'Table', icon: Table, keywords: ['grid'], run: (chain) => chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }) },
  { id: 'columns', label: 'Columns', icon: Columns3, keywords: ['layout', 'side by side'], run: insertBlock('columns', {}, [
    { type: 'column', content: [paragraph] },
    { type: 'column', content: [paragraph] },
  ]) },
  { id: 'section', label: 'Section', icon: ChevronRight, keywords: ['collapsible', 'toggle', 'details'], run: insertSection },
  { id: 'pageMention', label: 'Page link', icon: AtSign, keywords: ['mention', 'backlink', 'link'], run: openPagePicker },
  { id: 'youtube', label: 'YouTube video', icon: Video, keywords: ['video', 'embed'], run: insertBlock('youtube', { videoId: '' }) },
  { id: 'maps', label: 'Maps', icon: MapPin, keywords: ['google', 'location', 'map'], run: insertBlock('maps', { url: '' }) },
  { id: 'taskList', label: 'To-do list', icon: ListChecks, keywords: ['todo', 'task', 'checkbox', 'checklist'], run: (chain) => chain.toggleTaskList() },
];

export const filterBlockCommands = (query) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return blockCommands;
  return blockCommands.filter(({ label, keywords }) => (
    label.toLowerCase().includes(needle) || keywords.some((keyword) => keyword.includes(needle))
  ));
};
