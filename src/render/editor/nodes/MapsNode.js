import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import MapsView from '../components/MapsView.jsx';
import { leafDirectiveTokenizer, renderLeafDirective } from '../markdown/directives.js';
import { getGoogleMapsEmbedUrl } from '../mapsUtils.js';

export const MapsNode = Node.create({
  name: 'maps',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      url: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-map-url') || '',
        renderHTML: (attributes) => ({ 'data-map-url': attributes.url }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="maps"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const embedUrl = getGoogleMapsEmbedUrl(node.attrs.url);
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'maps', class: 'maps-embed' }),
      ...(embedUrl ? [[
        'iframe',
        {
          src: embedUrl,
          title: 'Google Maps location',
          loading: 'lazy',
          referrerpolicy: 'no-referrer-when-downgrade',
          allowfullscreen: 'true',
        },
      ]] : ['Add a Google Maps URL']),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MapsView);
  },

  markdownTokenName: 'maps',
  markdownTokenizer: leafDirectiveTokenizer('maps'),

  parseMarkdown(token) {
    return { type: 'maps', attrs: { url: typeof token.attrs.url === 'string' ? token.attrs.url.trim() : '' } };
  },

  renderMarkdown(node) {
    return renderLeafDirective('maps', { attrs: { url: node.attrs?.url } });
  },
});
