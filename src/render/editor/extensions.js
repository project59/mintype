import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { CalloutNode } from './nodes/CalloutNode.js';
import { CodeBlockNode } from './nodes/CodeBlockNode.js';
import { ImageNode } from './nodes/ImageNode.js';
import { TableExt, TableRowExt, TableHeaderExt, TableCellExt } from './nodes/TableNodes.js';
import { SectionNode, SectionTitleNode } from './nodes/SectionNode.js';
import { ColumnsNode, ColumnNode } from './nodes/ColumnsNode.js';
import { YouTubeNode } from './nodes/YouTubeNode.js';
import { MapsNode } from './nodes/MapsNode.js';
import { PageMentionNode } from './nodes/PageMentionNode.js';
import { SlashCommands } from './SlashCommands.jsx';
import { LinkMark } from './marks/LinkMark.js';
import { TextStyleMark, FontFamily, FontSize, Color } from './marks/TextStyleMarks.js';
import { HighlightMark } from './marks/HighlightMark.js';
import { UnderlineMark, SuperscriptMark, SubscriptMark } from './marks/InlineStyleMarks.js';

// Whiteboard Markdown objects leave out the `/` menu, whose popup would open inside the canvas.
export const buildExtensions = ({ placeholder = 'Type here...', slashCommands = true } = {}) => [
  StarterKit.configure({
    codeBlock: false,
    link: false,
    underline: false,
    // Indigo-500 drop line, visible in both light and dark mode.
    dropcursor: { color: '#6366f1', width: 2 },
  }),
  Markdown.configure({ markedOptions: { gfm: true, html: true } }),
  Placeholder.configure({ placeholder }),
  TextStyleMark,
  FontFamily,
  FontSize,
  Color,
  HighlightMark.configure({ multicolor: true }),
  UnderlineMark,
  SuperscriptMark,
  SubscriptMark,
  LinkMark.configure({
    openOnClick: false,
    enableClickSelection: true,
    autolink: true,
    linkOnPaste: true,
    HTMLAttributes: {
      rel: 'noopener noreferrer nofollow',
    },
  }),
  CalloutNode,
  CodeBlockNode,
  ImageNode,
  TableExt,
  TableRowExt,
  TableHeaderExt,
  TableCellExt,
  SectionNode,
  SectionTitleNode,
  ColumnsNode,
  ColumnNode,
  YouTubeNode,
  MapsNode,
  TaskList.configure({ HTMLAttributes: { class: 'my-2 list-none !pl-0' } }),
  TaskItem.configure({
    nested: true,
    HTMLAttributes: {
      class: 'flex items-start gap-2.5 [&_p]:!mb-0 [&>label]:flex [&>label]:h-[1lh] [&>label]:shrink-0 [&>label]:items-center [&_input]:h-4 [&_input]:w-4 [&_input]:cursor-pointer [&_input]:accent-blue-600 [&>div]:min-w-0 [&>div]:flex-1 data-[checked=true]:[&>div]:text-gray-500 data-[checked=true]:[&>div]:line-through dark:data-[checked=true]:[&>div]:text-zinc-500',
    },
  }),
  PageMentionNode,
  ...(slashCommands ? [SlashCommands] : []),
];
