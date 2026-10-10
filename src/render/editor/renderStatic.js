import { generateHTML } from '@tiptap/core';
import { MarkdownManager } from '@tiptap/markdown';
import { buildExtensions } from './extensions.js';

let cachedExtensions = null;

const getExtensions = () => {
  if (!cachedExtensions) {
    cachedExtensions = buildExtensions();
  }
  return cachedExtensions;
};

export const markdownToHtml = (md) => {
  try {
    const extensions = getExtensions();
    const manager = new MarkdownManager({ extensions });
    const json = manager.parse(md || '');
    return generateHTML(json, extensions);
  } catch (error) {
    console.error('Failed to render markdown to HTML', error);
    return '';
  }
};