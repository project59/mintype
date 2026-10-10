import { ReactNodeViewRenderer } from '@tiptap/react';

// TipTap marks both the NodeViewWrapper and the content element it moves into NodeViewContent.
const isNodeViewScaffold = (node) => node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('data-node-view-wrapper');

// ReactNodeViewRenderer for nodes with editable content. React renders the wrapper and TipTap
// moves the content element into NodeViewContent after ProseMirror has drawn the node. On
// iOS/Android TipTap passes those DOM changes to ProseMirror, which reads an added block
// element as the virtual keyboard's Enter: the simulated Enter splits or lifts the new block,
// the view re-renders, and the loop floods the document with paragraphs.
export const reactNodeView = (component, options) => {
  const createView = ReactNodeViewRenderer(component, options);
  return (props) => {
    const view = createView(props);
    if (!view.ignoreMutation) return view;
    const ignoreMutation = view.ignoreMutation.bind(view);
    view.ignoreMutation = (mutation) => {
      const changed = mutation.type === 'childList' ? [...mutation.addedNodes, ...mutation.removedNodes] : [];
      const isScaffoldChange = changed.length > 0
        && !view.contentDOM?.contains(mutation.target)
        && changed.every(isNodeViewScaffold);
      return isScaffoldChange || ignoreMutation(mutation);
    };
    return view;
  };
};
