import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import { filterBlockCommands } from './blockCommands.js';
import { renderSuggestionList } from './suggestionMenu.js';

const renderCommand = ({ icon: Icon, label }) => (
  <>
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 dark:border-zinc-700 dark:text-zinc-400">
      <Icon size={14} />
    </span>
    <span className="truncate">{label}</span>
  </>
);

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey('slashCommands'),
        char: '/',
        // Not in code, and not in table cells, which hold a single line of text.
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          if ($from.parent.type.spec.code) return false;
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            if (['tableCell', 'tableHeader'].includes($from.node(depth).type.name)) return false;
          }
          return true;
        },
        items: ({ query }) => filterBlockCommands(query),
        command: ({ editor, range, props }) => {
          props.run(editor.chain().focus().deleteRange(range)).run();
        },
        render: renderSuggestionList({
          label: 'Blocks',
          emptyText: 'No matching blocks',
          renderItem: renderCommand,
        }),
      }),
    ];
  },
});
