import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import YouTubeView from '../components/YouTubeView.jsx';
import { leafDirectiveTokenizer, renderLeafDirective } from '../markdown/directives.js';

const extractVideoId = (value) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return '';
};

export const YouTubeNode = Node.create({
  name: 'youtube',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      videoId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-video-id') || '',
        renderHTML: (attributes) => ({ 'data-video-id': attributes.videoId }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="youtube"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const videoId = node.attrs.videoId;
    if (!videoId) {
      return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'youtube', class: 'youtube-embed' }), 'YouTube Video'];
    }
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'youtube', class: 'youtube-embed' }),
      [
        'div',
        { class: 'youtube-iframe-wrap' },
        ['iframe', { src: `https://www.youtube.com/embed/${videoId}`, frameborder: '0', allowfullscreen: 'true' }],
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(YouTubeView);
  },

  markdownTokenName: 'youtube',
  markdownTokenizer: leafDirectiveTokenizer('youtube'),

  parseMarkdown(token) {
    return { type: 'youtube', attrs: { videoId: extractVideoId(typeof token.attrs.id === 'string' ? token.attrs.id : '') } };
  },

  renderMarkdown(node) {
    return renderLeafDirective('youtube', { attrs: { id: node.attrs?.videoId } });
  },
});
