import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';

export const UnderlineMark = Underline.extend({
  renderMarkdown(node, helpers) {
    return `<u>${helpers.renderChildren(node)}</u>`;
  },
});

export const SuperscriptMark = Superscript.extend({
  renderMarkdown(node, helpers) {
    return `<sup>${helpers.renderChildren(node)}</sup>`;
  },
});

export const SubscriptMark = Subscript.extend({
  renderMarkdown(node, helpers) {
    return `<sub>${helpers.renderChildren(node)}</sub>`;
  },
});