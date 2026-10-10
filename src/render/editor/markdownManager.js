import { MarkdownManager } from '@tiptap/markdown';
import { buildExtensions } from './extensions.js';

let manager = null;

// A shared parser/serializer for working with page Markdown outside an editor.
export const getMarkdownManager = () => {
  if (!manager) {
    manager = new MarkdownManager({ extensions: buildExtensions() });
  }
  return manager;
};
