import { useEffect } from 'react';

export const SITE_URL = 'https://mintype.app';

// Sets a head element's attribute while the component is mounted, creating the element if
// index.html has none, and restores the previous state on unmount.
function useHeadAttribute(selector, create, attribute, value) {
    useEffect(() => {
        if (value == null) return undefined;
        let element = document.head.querySelector(selector);
        const created = !element;
        if (created) {
            element = create();
            document.head.appendChild(element);
        }
        const previous = element.getAttribute(attribute);
        element.setAttribute(attribute, value);
        return () => {
            if (created) element.remove();
            else if (previous == null) element.removeAttribute(attribute);
            else element.setAttribute(attribute, previous);
        };
    }, [selector, attribute, value]);
}

const createMeta = (name) => () => Object.assign(document.createElement('meta'), { name });
const createCanonical = () => Object.assign(document.createElement('link'), { rel: 'canonical' });

// Per-route title, description, canonical URL and robots directive. Search engines that render
// JavaScript read these; link previews only see the defaults in index.html.
export default function useDocumentMeta({ title, description, path, noindex = false }) {
    useEffect(() => {
        if (!title) return undefined;
        const previous = document.title;
        document.title = title;
        return () => {
            document.title = previous;
        };
    }, [title]);

    useHeadAttribute('meta[name="description"]', createMeta('description'), 'content', description);
    useHeadAttribute('link[rel="canonical"]', createCanonical, 'href', path == null ? null : `${SITE_URL}${path}`);
    useHeadAttribute('meta[name="robots"]', createMeta('robots'), 'content', noindex ? 'noindex' : null);
}
