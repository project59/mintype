import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import DragHandle from '@tiptap/extension-drag-handle';
import DOMPurify from 'dompurify';
import { useSidebar } from '../../layouts/root/SidebarContext.jsx';
import { useEditorContext } from './EditorContext.jsx';
import { buildExtensions } from './extensions.js';
import LinkPopover from './LinkPopover.jsx';
import BlockActionsMenu from './components/BlockActionsMenu.jsx';
import { createPointerTargetRule, getDragHandleRect } from './dragHandlePosition.js';
import { compressImage, readAsDataUrl } from './compressImage.js';

const sanitizePastedHtml = (html) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'sup', 'sub', 'code', 'pre', 'a', 'img',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
      'span', 'mark', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'data-page-id'],
    ALLOWED_URI_REGEXP: /^(https?:|data:image\/|\/page\/|mailto:)/i,
  });

const DocumentEditor = ({ markdown, onUpdate, onEditorReady, width = 'normal', placeholder = 'Type here...' }) => {
  const { setActiveEditor } = useEditorContext();
  const { setShowTextToolbar } = useSidebar();

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const editorRef = useRef(null);
  // The Markdown the editor currently holds: what it was created with, then its own output.
  const syncedMarkdownRef = useRef(markdown);
  const pointerTarget = useMemo(createPointerTargetRule, []);
  // The block the drag handle points at. The block actions menu takes it over (`locked`) while
  // open so it can follow the block as it moves; `element` is the handle the menu renders into.
  const handleTarget = useMemo(() => ({ pos: -1, locked: false, element: null }), []);

  const extensions = useMemo(() => {
    return [
      ...buildExtensions({ placeholder }),
      DragHandle.configure({
        nested: {
          // The handle sits flush against the hovered block, so moving toward it must not
          // switch the target to a parent. Parents are grabbed by hovering their own chrome.
          edgeDetection: 'none',
          rules: [
            pointerTarget.rule,
            // Columns move as a whole, a section title moves with its section, and a table
            // cell's paragraph stays in its cell.
            {
              id: 'structuralChildren',
              evaluate: ({ node, parent }) => (
                ['column', 'sectionTitle'].includes(node.type.name) || ['tableCell', 'tableHeader'].includes(parent?.type.name) ? 1000 : 0
              ),
            },
          ],
        },
        onNodeChange: ({ pos }) => {
          if (!handleTarget.locked) handleTarget.pos = pos ?? -1;
        },
        getReferencedVirtualElement: () => {
          const view = editorRef.current?.view;
          const rect = view ? getDragHandleRect(view, handleTarget.pos) : null;
          return rect ? { contextElement: view.dom, getBoundingClientRect: () => rect } : null;
        },
        // The plugin makes this container draggable; BlockActionsMenu renders the grip button
        // inside it, which opens the block actions on click or tap.
        render: () => {
          const handle = document.createElement('div');
          handle.className = "relative pointer-events-auto flex cursor-grab touch-none items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing dark:hover:bg-zinc-700 dark:hover:text-slate-200 after:absolute after:inset-y-0 after:left-full after:w-0.5 after:content-['']";
          // The plugin only hides the handle after a block was hovered and clears this inline
          // style to show it, so start hidden instead of at the editor's top-left corner.
          handle.style.visibility = 'hidden';
          handleTarget.element = handle;
          return handle;
        },
      }),
    ];
  }, [placeholder, pointerTarget, handleTarget]);

  const editor = useEditor({
    extensions,
    content: markdown,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'tiptap document-editor',
        spellcheck: 'true',
      },
      transformPastedHTML: sanitizePastedHtml,
      handleDOMEvents: { mousemove: pointerTarget.trackPointer },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find((item) => item.type.startsWith('image/'));
        if (!imageItem) return false;
        event.preventDefault();
        const file = imageItem.getAsFile();
        if (!file) return true;
        compressImage(file)
          .then(readAsDataUrl)
          .then((src) => {
            if (view.isDestroyed) return;
            const { schema, tr } = view.state;
            view.dispatch(tr.replaceSelectionWith(schema.nodes.image.create({ src })));
          })
          .catch((error) => console.error('Failed to paste image:', error));
        return true;
      },
    },
    onFocus: () => {
      setActiveEditor(editor);
      setShowTextToolbar(true);
    },
    onCreate: ({ editor: createdEditor }) => {
      editorRef.current = createdEditor;
      onEditorReady?.(createdEditor);
    },
    onUpdate: ({ editor: currentEditor }) => {
      const nextMarkdown = currentEditor.getMarkdown();
      syncedMarkdownRef.current = nextMarkdown;
      onUpdateRef.current(nextMarkdown);
    },
  });

  useEffect(() => () => {
    editorRef.current = null;
    onEditorReady?.(null);
  }, [onEditorReady]);

  // Only Markdown that did not come from this editor (e.g. a refresh) is loaded back in. It is
  // loaded without an update event so that opening or refreshing a page never saves it.
  useEffect(() => {
    if (!editor || markdown === syncedMarkdownRef.current) return;
    syncedMarkdownRef.current = markdown;
    editor.commands.setContent(markdown || '', { contentType: 'markdown', emitUpdate: false });
  }, [markdown, editor]);

  return (
    <div className="relative h-full w-full flex flex-col items-center rounded-t-xl bg-white dark:bg-[#1f1f2d] px-7 md:px-14 overflow-y-auto">
      <div className={`relative h-fit w-full pt-12 pb-12 md:pt-16 md:pb-24 ${width === 'full' ? 'max-w-none' : width === 'wide' ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <LinkPopover editor={editor}>
          <EditorContent editor={editor} />
        </LinkPopover>
        {editor && handleTarget.element && createPortal(
          <BlockActionsMenu editor={editor} target={handleTarget} />,
          handleTarget.element,
        )}
      </div>
    </div>
  );
};

export default DocumentEditor;
