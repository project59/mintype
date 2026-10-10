import { mergeAttributes } from '@tiptap/core';
import { CodeBlock } from '@tiptap/extension-code-block';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { reactNodeView } from './reactNodeView.js';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-jsx.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-java.js';
import 'prismjs/components/prism-rust.js';
import { codeBlockLanguages } from '../codeBlockLanguages.js';
import CodeBlockView from '../components/CodeBlockView.jsx';
import { CODE_LANGUAGE_CLASS } from './blockStyles.js';

const codeBlockHighlightKey = new PluginKey('codeBlockHighlight');

const getHighlightDecorations = (doc) => {
  const decorations = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== 'codeBlock') return;

    const language = codeBlockLanguages[node.attrs.language]?.prism || 'javascript';
    const grammar = Prism.languages[language];
    if (!grammar) return;

    let offset = 0;
    const addTokenDecorations = (tokens) => {
      tokens.forEach((token) => {
        if (typeof token === 'string') {
          offset += token.length;
          return;
        }

        const start = offset;
        const tokenText = token.content instanceof Array ? token.content : [token.content];
        addTokenDecorations(tokenText);
        const end = offset;
        const aliases = token.alias ? (Array.isArray(token.alias) ? token.alias : [token.alias]) : [];
        const classes = ['token', token.type, ...aliases].join(' ');
        if (end > start) {
          decorations.push(Decoration.inline(pos + 1 + start, pos + 1 + end, { class: classes }));
        }
      });
    };

    addTokenDecorations(Prism.tokenize(node.textContent, grammar));
  });

  return DecorationSet.create(doc, decorations);
};

export const CodeBlockNode = CodeBlock.extend({
  addNodeView() {
    return reactNodeView(CodeBlockView);
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: 'js',
        parseHTML: (element) => {
          const className = element.querySelector('code')?.getAttribute('class') || '';
          return element.getAttribute('data-language') || className.match(/language-([\w-]+)/)?.[1] || 'js';
        },
        renderHTML: () => ({}),
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() || []),
      new Plugin({
        state: {
          init: (_, state) => getHighlightDecorations(state.doc),
          apply: (transaction, decorations) => (
            transaction.docChanged
              ? getHighlightDecorations(transaction.doc)
              : decorations.map(transaction.mapping, transaction.doc)
          ),
        },
        props: {
          decorations: (state) => codeBlockHighlightKey.getState(state),
        },
        key: codeBlockHighlightKey,
      }),
    ];
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="codeBlock"]', contentElement: 'pre', preserveWhitespace: 'full' },
      { tag: 'pre', preserveWhitespace: 'full' },
    ];
  },

  // Laid out like CodeBlockView, with the language as plain text where the view has its picker,
  // so static views match the editor. The language goes on the wrapper rather than as a
  // `language-*` class, which Prism's theme styles with a different font size and line height.
  // The code is a block because in the editor it holds a block-level content element, so its
  // lines use the code's own line height.
  renderHTML({ node, HTMLAttributes }) {
    const language = codeBlockLanguages[node.attrs.language] ? node.attrs.language : 'js';
    return [
      'div',
      { 'data-type': 'codeBlock', 'data-language': language, class: 'code-block-wrapper' },
      [
        'div',
        { class: 'code-block-header' },
        ['span', { class: CODE_LANGUAGE_CLASS }, codeBlockLanguages[language].name],
      ],
      [
        'pre',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { style: 'white-space: pre-wrap;' }),
        ['code', { style: 'display: block; white-space: pre-wrap; background: transparent;' }, 0],
      ],
    ];
  },

  markdownTokenName: 'code',

  parseMarkdown(token) {
    return {
      type: 'codeBlock',
      attrs: { language: token.lang || 'js' },
      content: token.text ? [{ type: 'text', text: token.text.replace(/\n$/, '') }] : [],
    };
  },

  renderMarkdown(node) {
    const language = node.attrs?.language || 'js';
    const text = node.content?.map((child) => child.text || '').join('') || '';
    const fence = text.includes('```') ? '````' : '```';
    return `${fence}${language}\n${text}\n${fence}\n`;
  },
});
