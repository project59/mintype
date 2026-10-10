import { useEffect, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import { DOMSerializer } from '@tiptap/pm/model';
import { codeBlockLanguages } from '../../editor/codeBlockLanguages.js';
import {
  LINKED_PAGE_LABEL, MISSING_PAGE_LABEL, PAGE_ICON, PAGE_MENTION_CLASS, PAGE_MENTION_ICON_CLASS, PAGE_MENTION_ICON_SIZE,
  PAGE_MENTION_ICON_SVG_CLASS, PAGE_MENTION_UNRESOLVED_CLASS, iconSpec,
} from '../../editor/nodes/blockStyles.js';
import { markdownToHtml } from '../../editor/renderStatic.js';
import { getCachedPageMeta, getPageTitle, loadPageMeta, subscribePageMeta } from '../pageMeta.js';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'sup', 'sub', 'code', 'pre', 'a', 'img',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
  'span', 'mark', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'summary', 'details', 'iframe', 'label', 'input', 'svg', 'path', 'circle', 'hr',
];

// A separate instance so the hook below doesn't apply to other sanitizing in the app.
const purify = DOMPurify(window);
// Inputs are only allowed as task item checkboxes.
purify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName === 'input' && node.getAttribute('type') !== 'checkbox') node.remove();
});

// Drawn like PageMentionView (see blockStyles.js). Mentions resolve against the viewer's own
// pages, so only in their workspace is an unresolved one known to be missing.
const hydratePageMention = (element, inWorkspace) => {
  const pageId = element.getAttribute('data-page-id');
  const meta = getCachedPageMeta(pageId);
  if (meta === undefined) {
    loadPageMeta(pageId);
    return;
  }

  const icon = document.createElement('span');
  icon.className = PAGE_MENTION_ICON_CLASS;
  icon.setAttribute('aria-hidden', 'true');
  if (meta?.emoji) icon.textContent = meta.emoji;
  else {
    icon.append(DOMSerializer.renderSpec(document, iconSpec(PAGE_ICON, PAGE_MENTION_ICON_SIZE, { class: PAGE_MENTION_ICON_SVG_CLASS })).dom);
  }

  const title = document.createElement('span');
  if (!meta) title.className = PAGE_MENTION_UNRESOLVED_CLASS;
  title.textContent = meta ? getPageTitle(meta) : inWorkspace ? MISSING_PAGE_LABEL : LINKED_PAGE_LABEL;

  // React node view wrappers in the editor set `white-space: normal`.
  element.className = `${PAGE_MENTION_CLASS} whitespace-normal`;
  element.replaceChildren(icon, title);
};

// Colors code like the editor's Prism decorations. Prism escapes the text it wraps.
const highlightCodeBlocks = (html) => {
  if (!html.includes('data-type="codeBlock"')) return html;
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('[data-type="codeBlock"] code').forEach((code) => {
    const language = codeBlockLanguages[code.closest('[data-type="codeBlock"]').dataset.language]?.prism || 'javascript';
    const grammar = Prism.languages[language];
    if (grammar) code.innerHTML = Prism.highlight(code.textContent, grammar, language);
  });
  return template.innerHTML;
};

// `inWorkspace` says the Markdown belongs to the viewer's own workspace (see hydratePageMention).
const StaticMarkdownRenderer = ({ markdown, className, inWorkspace = false }) => {
  const containerRef = useRef(null);

  const html = useMemo(() => {
    const raw = markdownToHtml(markdown || '');
    return highlightCodeBlocks(purify.sanitize(raw, {
      ALLOWED_TAGS,
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'class', 'style',
        'data-page-id', 'data-video-id', 'data-map-url', 'data-type', 'data-checked', 'data-language', 'frameborder', 'allowfullscreen', 'width', 'height',
        'title', 'loading', 'referrerpolicy', 'open', 'type', 'checked', 'aria-hidden',
        'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'cx', 'cy', 'r',
      ],
    }));
  }, [markdown]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container?.querySelector('[data-type="pageMention"]')) return undefined;
    const hydrate = () => container.querySelectorAll('[data-type="pageMention"]').forEach((element) => hydratePageMention(element, inWorkspace));
    hydrate();
    return subscribePageMeta(hydrate);
  }, [html, inWorkspace]);

  return (
    <div
      ref={containerRef}
      // Wraps text like the editor: ProseMirror's styles at the root and `pre-wrap` inside the
      // blocks drawn by React node views (callouts, columns, sections, tables). Checkboxes show
      // state only.
      className={`tiptap whitespace-break-spaces break-words [font-feature-settings:'liga'_0] [font-variant-ligatures:none] [&_.callout-content]:whitespace-pre-wrap [&_[data-type=columns]]:whitespace-pre-wrap [&_details]:whitespace-pre-wrap [&_table]:whitespace-pre-wrap [&_input]:pointer-events-none ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default StaticMarkdownRenderer;
