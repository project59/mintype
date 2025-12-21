import { nanoid } from "nanoid";

export const COMMENT_TYPES = {
  suggestion: { label: 'Suggestion', color: '#fff3cd' },
  correction: { label: 'Correction', color: '#CFABFF' }, //purple
  remove: { label: 'Remove', color: '#f8d7da' },
  praise: { label: 'Praise', color: '#d4edda' },
};

export const REACTION_TYPES = {
  THUMBS_UP: { emoji: '👍', label: 'thumbs_up' },
  THUMBS_DOWN: { emoji: '👎', label: 'thumbs_down' },
  LAUGH: { emoji: '😄', label: 'laugh' },
  SAD: { emoji: '😢', label: 'sad' },
  THANKS: { emoji: '🙏', label: 'thanks' }
};

export const newPageSchema = (type, order, name) => ({
  name: name || "Untitled Page",
  type: type || 'document',
  emoji: null,
  created: Date.now(),
  lastModified: Date.now(),
  lastMetaModified: Date.now(),
  isFavorite: false,
  order: order || 1000000,
  deleted: false,
  sensitive: false,
  remoteFileId: null,
  wikiId: null,
  documentWidth: 'normal' // normal, wide
});

export const newPageContentSchema = (type) => ({
  type: type || 'document',
  elements: [{
    id: nanoid(),
    type: 'dynamic',
    x: 5000,
    y: 5000,
    width: 600,
    // height: 100,
    bgColor: "#ffffff",
    rotation: 0,
    zIndex: 0,
    content: [{ id: nanoid(), type: 'text', data: { text: 'Welcome!' } }],
    locked: false,
  }],
  comments: [],
  preferences: {
    panX: 120,
    panY: 120,
    zoom: 1,
    bgColor: { r: 255, g: 255, b: 255 },
    lockScrollY: false,
    lockScrollX: false,
    gridType: "none", // none, dots, lines
    gridSize: 20,
    gridColor: { r: 0, g: 0, b: 0 },
  }
})

export const defaultBlockSchemas = (type) => {
  switch (type) {
    case 'text': return { id: nanoid(), type: 'text', data: { text: 'Hi there!' } }
    case 'textbox': return { id: nanoid(), type: 'text', data: { text: '<p><span class=\"ql-font-Playpen\">Text box</span></p>' } }
    case 'image': return { id: nanoid(), type: 'image', data: { width: 600, justify: '', sourceType: 'url || file', imageSource: 'url || data url' } }
    case 'code': return { id: nanoid(), type: 'code', data: { language: 'jsx', code: '' } }
    case 'video': return { id: nanoid(), type: 'video', data: { videoUrl: '', justify: '', width: 600 } }
    case 'callout': return { id: nanoid(), type: 'callout', data: { type: 'info', emoji: null, content: '' } }
    case 'pageEmbed': return { id: nanoid(), type: 'pageEmbed', data: { pageId: '' } }
    case 'collapse': return { id: nanoid(), type: 'collapse', data: { title: '', collapseTitle: '', content: [] } }
    case 'columns': return { id: nanoid(), type: 'columns', data: { columns: [{ id: nanoid(), content: [] }, { id: nanoid(), content: [] }] } }
  }
}


import { Quill } from 'react-quill-new';
// Add this helper function to convert HTML to Quill Delta
const htmlToQuillHtml = (html) => {
  // Create a temporary Quill instance to normalize HTML
  const tempContainer = document.createElement('div');
  tempContainer.style.display = 'none';
  document.body.appendChild(tempContainer);

  // Import Quill (make sure it's available in your component)
  const tempQuill = new Quill(tempContainer);

  // Convert HTML to Delta, then back to Quill's normalized HTML
  const delta = tempQuill.clipboard.convert(
    { html },
  );
  tempQuill.setContents(delta);
  const normalizedHtml = tempQuill.root.innerHTML;
  // Cleanup
  document.body.removeChild(tempContainer);

  return normalizedHtml;
};

// Updated clipboardContentToBlocks with Quill Delta conversion
export const clipboardContentToBlocks = (clipboardData) => {
  const blocks = [];

  // Check for images first
  const items = Array.from(clipboardData.items);
  const imageItem = items.find(item => item.type.startsWith('image/'));

  if (imageItem) {
    const file = imageItem.getAsFile();
    const reader = new FileReader();

    return new Promise((resolve) => {
      reader.onload = (e) => {
        blocks.push({
          id: nanoid(),
          type: 'image',
          data: {
            sourceType: 'file',
            imageSource: e.target.result,
            fileName: file.name || 'pasted-image.png'
          }
        });
        resolve(blocks);
      };
      reader.readAsDataURL(file);
    });
  }

  // Handle HTML content
  const html = clipboardData.getData('text/html');

  if (html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Collect content by type
    let currentTextNodes = [];

    const flushTextNodes = () => {
      if (currentTextNodes.length > 0) {
        const combinedHtml = currentTextNodes.join('');
        const normalizedHtml = htmlToQuillHtml(combinedHtml);
        blocks.push({
          id: nanoid(),
          type: 'text',
          data: { text: normalizedHtml } // Store as Quill-normalized HTML
        });
        currentTextNodes = [];
      }
    };

    const processNode = (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Check for images
        if (node.tagName === 'IMG') {
          flushTextNodes(); // Flush any accumulated text before adding image
          blocks.push({
            id: nanoid(),
            type: 'image',
            data: {
              sourceType: 'url',
              imageSource: node.src,
              fileName: 'pasted-image'
            }
          });
        }
        // Check for code blocks (PRE or CODE inside PRE)
        else if (node.tagName === 'PRE' || (node.tagName === 'CODE' && node.parentElement?.tagName === 'PRE')) {
          flushTextNodes(); // Flush any accumulated text before adding code
          const codeElement = node.tagName === 'PRE' ? node.querySelector('code') || node : node;
          const code = codeElement.textContent;
          const language = codeElement.className.match(/language-(\w+)/)?.[1] || 'jsx';

          blocks.push({
            id: nanoid(),
            type: 'code',
            data: {
              code: code,
              language: language
            }
          });
        }
        // Accumulate text content
        else if (['P', 'DIV', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'STRONG', 'EM', 'U', 'A', 'UL', 'OL', 'LI', 'BLOCKQUOTE'].includes(node.tagName)) {
          if (!node.querySelector('pre, code[class*="language-"], img')) {
            currentTextNodes.push(node.outerHTML);
          } else {
            // Has nested special elements, process recursively
            Array.from(node.childNodes).forEach(processNode);
          }
        }
        // Process other elements recursively
        else {
          Array.from(node.childNodes).forEach(processNode);
        }
      }
      // Handle text nodes
      else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text) {
          currentTextNodes.push(`<p>${text}</p>`);
        }
      }
    };

    Array.from(doc.body.childNodes).forEach(processNode);
    flushTextNodes(); // Flush any remaining text

  } else {
    // Fallback to plain text
    const text = clipboardData.getData('text/plain');
    if (text) {
      const normalizedHtml = htmlToQuillHtml(`<p>${text}</p>`);
      blocks.push({
        id: nanoid(),
        type: 'text',
        data: normalizedHtml
      });
    }
  }

  return Promise.resolve(blocks);
};