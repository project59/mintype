import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import YouTubeView from '../components/YouTubeView.jsx';
import { leafDirectiveTokenizer, renderLeafDirective } from '../markdown/directives.js';
import { extractVideoId, youtubeEmbedUrl } from '../youtubeUtils.js';

export const YouTubeNode = Node.create({
  name: 'youtube',
  group: 'block',
  atom: true,
  selectable: true,

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
    const videoId = extractVideoId(node.attrs.videoId);
    if (!videoId) {
      return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'youtube', class: 'youtube-embed' }), 'YouTube Video'];
    }
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'youtube', class: 'youtube-embed' }),
      [
        'div',
        { class: 'youtube-iframe-wrap' },
        [
          'iframe',
          {
            src: youtubeEmbedUrl(videoId),
            title: 'YouTube video',
            frameborder: '0',
            referrerpolicy: 'strict-origin-when-cross-origin',
            allowfullscreen: 'true',
          },
        ],
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
