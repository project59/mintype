
export const newPageSchema = (type, order, name) => ({
  name: name || "Untitled Page",
  type: type || 'document',
  emoji: null,
  created: Date.now(),
  lastModified: Date.now(),
  lastMetaModified: Date.now(),
  isFavorite: false,
  order: order ?? null,
  deleted: false,
  sensitive: false,
  remoteFileId: null,
  documentWidth: 'normal' // normal, wide
});

export const TLDRAW_WHITEBOARD_FORMAT_VERSION = 1;
export const MARKDOWN_SHAPE_TYPE = 'mintypeMarkdown';

export const newPageContentSchema = (type) => {
  if (type === 'document') {
    return {
      type: 'document',
      markdown: '# Welcome!',
    };
  }
  if (type === 'whiteboard') {
    return {
      type: 'whiteboard',
      tldraw: {
        formatVersion: TLDRAW_WHITEBOARD_FORMAT_VERSION,
        snapshot: null,
      },
    };
  }
  throw new Error(`Unsupported page type: ${type}`);
}
