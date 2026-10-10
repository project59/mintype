import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { Check, Triangle, X } from 'lucide-react';
import { getSectionColor, SECTION_COLORS } from '../sectionColors.js';
import {
  SECTION_BOX_CLASS, SECTION_GUIDE_CLASS, SECTION_TOGGLE_CLASS, SECTION_TOGGLE_ICON_SIZE,
} from '../nodes/blockStyles.js';

const ColorSwatch = ({ color, className = '' }) => (
  <span
    aria-hidden="true"
    className={`block rounded-full border ${color.value === 'default' ? 'border-dashed border-gray-400 dark:border-zinc-500' : 'border-transparent'} ${className}`}
    style={{ backgroundColor: color.swatch }}
  />
);

const SectionView = ({ node, editor, getPos, updateAttributes, deleteNode }) => {
  const { open } = node.attrs;
  const color = getSectionColor(node.attrs.color);

  // Open state is saved with the note but isn't an undo step. Closing moves a cursor that
  // was in the body to the end of the title, so it doesn't sit in hidden content.
  const toggle = () => {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    const { state } = editor;
    const titleEnd = pos + node.firstChild.nodeSize;
    const tr = state.tr.setNodeMarkup(pos, null, { ...node.attrs, open: !open }).setMeta('addToHistory', false);
    if (open && state.selection.from > titleEnd && state.selection.from < pos + node.nodeSize) {
      tr.setSelection(TextSelection.create(tr.doc, titleEnd));
    }
    editor.view.dispatch(tr);
  };

  return (
    <NodeViewWrapper
      data-section-color={color.value}
      className={`group/section ${SECTION_BOX_CLASS}`}
      style={{ backgroundColor: color.background }}
    >
      <button
        type="button"
        contentEditable={false}
        aria-label={open ? 'Collapse section' : 'Expand section'}
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggle}
        className={SECTION_TOGGLE_CLASS}
      >
        <Triangle
          size={SECTION_TOGGLE_ICON_SIZE}
          fill="currentColor"
          className={`transition-transform duration-150 ${open ? 'rotate-180' : 'rotate-90'}`}
        />
      </button>

      {open && (
        <span
          aria-hidden="true"
          contentEditable={false}
          className={SECTION_GUIDE_CLASS}
        />
      )}

      <div
        contentEditable={false}
        className="absolute right-1.5 top-2 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/section:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <Popover className="relative">
          <PopoverButton
            aria-label="Section color"
            title="Section color"
            onMouseDown={(event) => event.preventDefault()}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/10"
          >
            <ColorSwatch color={color} className="h-3.5 w-3.5" />
          </PopoverButton>
          <PopoverPanel
            portal
            anchor={{ to: 'bottom end', gap: '6px', padding: '12px' }}
            className="z-50 flex gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            {({ close }) => SECTION_COLORS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-label={option.label}
                title={option.label}
                aria-pressed={option.value === color.value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  updateAttributes({ color: option.value });
                  close();
                }}
                className="relative flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <ColorSwatch color={option} className="h-4 w-4" />
                {option.value === color.value && (
                  <Check size={10} strokeWidth={3} className="absolute text-white mix-blend-difference" />
                )}
              </button>
            ))}
          </PopoverPanel>
        </Popover>
        <button
          type="button"
          aria-label="Delete section"
          title="Delete section"
          onMouseDown={(event) => event.preventDefault()}
          onClick={deleteNode}
          className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-black/5 hover:text-rose-500 dark:hover:bg-white/10"
        >
          <X size={13} />
        </button>
      </div>

      {/* NodeViewContent wraps ProseMirror's content element; the blocks are its children, the
          first being the title. */}
      <NodeViewContent
        className={open ? '' : '[&>[data-node-view-content-react]>*:not(summary)]:hidden'}
      />
    </NodeViewWrapper>
  );
};

export default SectionView;
