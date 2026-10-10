import { Node, mergeAttributes } from '@tiptap/core';

const parseAlt = (alt) => {
  const [text, width, justify] = (alt || '').split('|');
  return {
    alt: text || '',
    width: width ? Number(width) || null : null,
    justify: justify || '',
  };
};

export const ImageNode = Node.create({
  name: 'image',
  group: 'block',
  selectable: true,
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) => ({ src: attributes.src }),
      },
      alt: {
        default: '',
        parseHTML: (element) => element.getAttribute('alt') || '',
        renderHTML: (attributes) => ({ alt: attributes.alt }),
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.getAttribute('data-width');
          return width ? Number(width) || null : null;
        },
        renderHTML: (attributes) =>
          attributes.width ? { 'data-width': String(attributes.width) } : {},
      },
      justify: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-justify') || '',
        renderHTML: (attributes) =>
          attributes.justify ? { 'data-justify': attributes.justify } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { width, justify, ...rest } = HTMLAttributes;
    const style = width ? { width: `${width}px`, height: 'auto' } : {};
    const image = ['img', mergeAttributes(rest, { style })];
    if (justify) {
      return ['div', { class: `image-wrap image-justify-${justify}` }, image];
    }
    return image;
  },

  addCommands() {
    return {
      setImage:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: attributes });
        },
    };
  },

  markdownTokenName: 'image',

  parseMarkdown(token) {
    const { alt, width, justify } = parseAlt(token.text);
    return {
      type: 'image',
      attrs: {
        src: token.href || '',
        alt,
        width,
        justify,
      },
    };
  },

  renderMarkdown(node) {
    const { src, alt, width, justify } = node.attrs || {};
    if (!src) return '';
    const parts = [alt || ''];
    if (width) parts.push(String(width));
    if (justify) parts.push(justify);
    return `![${parts.join('|')}](${src})\n`;
  },
});