import { useEffect } from 'react';
import { Popover, PopoverButton } from '@headlessui/react';
import { closeHistory } from '@tiptap/pm/history';
import { useEditorState } from '@tiptap/react';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import { ResponsivePopoverPanel } from '../../../components/common/ResponsivePopover.jsx';
import { deleteBlock, duplicateBlock, getBlockActions, moveBlock } from '../blockActions.js';

const GRIP_ICON = (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="5" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="9" cy="19" r="1.5" />
    <circle cx="15" cy="5" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="15" cy="19" r="1.5" />
  </svg>
);

// Approximate sheet height plus a gap; blocks are kept above it while it is open.
const SHEET_CLEARANCE = 112;

const scrollBlockIntoView = (editor, pos) => {
  const dom = pos >= 0 ? editor.view.nodeDOM(pos) : null;
  if (!(dom instanceof HTMLElement)) return;
  const rect = dom.getBoundingClientRect();
  if (rect.top < 16 || rect.bottom > window.innerHeight - SHEET_CLEARANCE) {
    dom.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
};

// While the menu is open it owns the target block: the drag handle stays locked to it and
// follows it as it moves. Closing releases the handle and hides it.
const MenuSession = ({ editor, target, children }) => {
  useEffect(() => {
    target.locked = true;
    editor.commands.lockDragHandle();
    return () => {
      target.locked = false;
      if (editor.isDestroyed) return;
      editor.commands.unlockDragHandle();
      editor.view.dispatch(editor.state.tr.setMeta('hideDragHandle', true));
    };
  }, [editor, target]);
  return children;
};

const SheetButton = ({ icon: Icon, label, onClick, disabled = false, danger = false }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`sheetButton ${danger ? 'sheetButtonDanger' : ''}`}
  >
    <Icon size={18} />
    {label}
  </button>
);

const MenuItem = ({ icon: Icon, label, onClick, disabled = false, danger = false }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
      danger
        ? 'text-zinc-700 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-200 dark:hover:bg-rose-950/40'
        : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
    }`}
  >
    <Icon size={14} />
    {label}
  </button>
);

const BlockActions = ({ editor, target, phone, close }) => {
  const actions = useEditorState({
    editor,
    selector: ({ editor: current }) => getBlockActions(current.state.doc, target.pos),
  });

  useEffect(() => {
    if (!actions.valid) close();
  }, [actions.valid, close]);

  // Runs one block operation as its own undo step, even when tapped in quick succession, and
  // retargets the menu.
  const run = (operation, { keepOpen }) => () => {
    const tr = closeHistory(editor.state.tr);
    const nextPos = operation(tr, target.pos);
    target.pos = nextPos;
    editor.view.dispatch(tr);
    if (keepOpen && nextPos >= 0) {
      if (phone) scrollBlockIntoView(editor, nextPos);
    } else {
      close();
    }
  };

  const moveUp = run((tr, pos) => moveBlock(tr, pos, 'up'), { keepOpen: true });
  const moveDown = run((tr, pos) => moveBlock(tr, pos, 'down'), { keepOpen: true });
  const duplicate = run(duplicateBlock, { keepOpen: phone });
  const remove = run(deleteBlock, { keepOpen: false });

  if (phone) {
    return (
      <div className="sheetGrid grid-cols-4">
        <SheetButton icon={ArrowUp} label="Up" disabled={!actions.canMoveUp} onClick={moveUp} />
        <SheetButton icon={ArrowDown} label="Down" disabled={!actions.canMoveDown} onClick={moveDown} />
        <SheetButton icon={Copy} label="Copy" disabled={!actions.valid} onClick={duplicate} />
        <SheetButton icon={Trash2} label="Delete" danger disabled={!actions.canDelete} onClick={remove} />
      </div>
    );
  }

  return (
    <>
      <MenuItem icon={ArrowUp} label="Move up" disabled={!actions.canMoveUp} onClick={moveUp} />
      <MenuItem icon={ArrowDown} label="Move down" disabled={!actions.canMoveDown} onClick={moveDown} />
      <MenuItem icon={Copy} label="Copy" disabled={!actions.valid} onClick={duplicate} />
      <MenuItem icon={Trash2} label="Delete" danger disabled={!actions.canDelete} onClick={remove} />
    </>
  );
};

// Rendered inside the drag handle. Clicking or tapping the handle opens the block's actions:
// a bottom sheet on phones (easy to tap repeatedly) and an anchored popover otherwise.
// Dragging the handle never produces a click, so desktop drag is unaffected.
const BlockActionsMenu = ({ editor, target }) => (
  <Popover className="flex">
    <PopoverButton
      as="div"
      role="button"
      aria-label="Block actions"
      title="Click for actions, drag to move"
      className="flex h-6 w-5 rounded outline-none [@media(pointer:coarse)]:h-8 [@media(pointer:coarse)]:w-6"
    >
      {/* PopoverButton cancels mousedown, which would stop the handle from starting a native
          drag. Keeping mousedown from reaching it leaves dragging to the browser; the click
          still bubbles up and opens the menu. */}
      <span className="flex h-full w-full items-center justify-center" onMouseDown={(event) => event.stopPropagation()}>
        {GRIP_ICON}
      </span>
    </PopoverButton>
    <ResponsivePopoverPanel
      anchor={{ to: 'bottom start', gap: '6px', padding: '12px' }}
      className="z-50 w-44 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
    >
      {({ close, phone }) => (
        <MenuSession editor={editor} target={target}>
          <BlockActions editor={editor} target={target} phone={phone} close={close} />
        </MenuSession>
      )}
    </ResponsivePopoverPanel>
  </Popover>
);

export default BlockActionsMenu;
