import { TextStyle, FontFamily, FontSize, Color } from '@tiptap/extension-text-style';

const styleAttributeNames = {
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  color: 'color',
  'background-color': 'backgroundColor',
};

const parseStyleAttributes = (style = '') => Object.fromEntries(
  style.split(';').flatMap((declaration) => {
    const separator = declaration.indexOf(':');
    if (separator < 0) return [];

    const name = styleAttributeNames[declaration.slice(0, separator).trim().toLowerCase()];
    const value = declaration.slice(separator + 1).trim();
    return name && value ? [[name, value]] : [];
  }),
);

const TextStyleMark = TextStyle.extend({
  markdownTokenizer: {
    name: 'textStyleSpan',
    level: 'inline',
    start: (src) => src.toLowerCase().indexOf('<span'),
    tokenize(src, _, lexer) {
      const match = /^<span\b[^>]*\bstyle=(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/span>/i.exec(src);
      if (!match) return undefined;

      return {
        type: 'textStyle',
        raw: match[0],
        style: match[1] ?? match[2],
        text: match[3],
        tokens: lexer.inlineTokens(match[3]),
      };
    },
  },

  parseMarkdown(token, helpers) {
    return helpers.applyMark(
      'textStyle',
      helpers.parseInline(token.tokens || []),
      parseStyleAttributes(token.style),
    );
  },

  renderMarkdown(node, helpers) {
    const { fontFamily, fontSize, color, backgroundColor } = node.attrs || {};
    const content = helpers.renderChildren(node);
    const styleParts = [];
    if (fontFamily) styleParts.push(`font-family:${fontFamily}`);
    if (fontSize) styleParts.push(`font-size:${fontSize}`);
    if (color) styleParts.push(`color:${color}`);
    if (backgroundColor) styleParts.push(`background-color:${backgroundColor}`);
    if (styleParts.length === 0) return content;
    return `<span style="${styleParts.join(';')}">${content}</span>`;
  },
});

export { TextStyleMark, FontFamily, FontSize, Color };
