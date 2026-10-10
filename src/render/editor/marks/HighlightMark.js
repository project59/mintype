import Highlight from '@tiptap/extension-highlight';

export const HighlightMark = Highlight.extend({
  markdownTokenName: 'highlight',

  markdownTokenizer: {
    name: 'highlight',
    level: 'inline',
    start: (src) => src.indexOf('=='),
    tokenize(src, _, lexer) {
      const match = /^==(?:\{([^}]+)\})?([\s\S]+?)==/.exec(src);
      if (!match) return undefined;

      return {
        type: 'highlight',
        raw: match[0],
        color: match[1] || null,
        text: match[2],
        tokens: lexer.inlineTokens(match[2]),
      };
    },
  },

  parseMarkdown(token, helpers) {
    return helpers.applyMark(
      'highlight',
      helpers.parseInline(token.tokens || []),
      token.color ? { color: token.color } : undefined,
    );
  },

  renderMarkdown(node, helpers) {
    const content = helpers.renderChildren(node);
    const color = node.attrs?.color;
    return color ? `=={${color}}${content}==` : `==${content}==`;
  },
});
