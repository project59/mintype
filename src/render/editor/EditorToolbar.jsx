import { useState, useRef } from 'react';
import { useEditorState } from '@tiptap/react';
import { Popover, PopoverButton } from '@headlessui/react';
import {
  Bold, Italic, Underline, Code, List, ListOrdered,
  Link, Type, ALargeSmall, X, ChevronRight, ChevronLeft,
  Highlighter, Palette, Heading1, Strikethrough, Plus,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
} from 'lucide-react';
import MintypeColorPicker from '../../components/common/MintypeColorPicker.jsx';
import { ResponsivePopoverPanel } from '../../components/common/ResponsivePopover.jsx';
import { rgbObjectToString } from '../../utils/converters.js';
import { useEditorContext } from './EditorContext.jsx';
import { blockCommands } from './blockCommands.js';
import { OPEN_LINK_EDITOR_EVENT } from './LinkPopover.jsx';

const ToolbarButton = ({ icon: Icon, isActive, onClick, title }) => (
  <div
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`p-2 cursor-pointer transition-colors ${
      isActive ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'
    } hover:text-black dark:hover:text-gray-300 flex items-center justify-center w-8 h-8`}
    aria-label={title}
    title={title}
  >
    <Icon size={13} />
  </div>
);

const ToolbarDivider = () => <div className="w-px h-6 bg-gray-300 dark:bg-zinc-700 mx-1" />;
const activeMarkNames = ['bold', 'italic', 'underline', 'strike', 'code', 'bulletList', 'orderedList', 'link', 'superscript', 'subscript'];

const addBlockCommands = blockCommands.filter((command) => !command.textFormat);

const BlockMenu = ({ onInsert }) => {
  return (
    <Popover className="relative inline-flex">
      {({ open }) => (
        <>
          <PopoverButton
            type="button"
            aria-label="Add block"
            title="Add block"
            onMouseDown={(event) => event.preventDefault()}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              open ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-300/70 hover:text-black dark:text-gray-400 dark:hover:bg-zinc-700 dark:hover:text-gray-200'
            }`}
          >
            <Plus size={16} />
          </PopoverButton>
          <ResponsivePopoverPanel
            anchor={{ to: 'top start', gap: '12px', padding: '12px' }}
            className="z-50"
          >
            {({ close, phone }) => (phone ? (
              <div role="menu" aria-label="Block types" className="sheetGrid grid-cols-1">
                {addBlockCommands.map((command) => (
                  <button
                    key={command.id}
                    type="button"
                    role="menuitem"
                    className="sheetButton"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onInsert(command);
                      close();
                    }}
                  >
                    <command.icon size={18} />
                    {command.label}
                  </button>
                ))}
              </div>
            ) : (
              <div
                role="menu"
                aria-label="Block types"
                className="grid max-h-[min(20rem,80dvh)] min-w-52 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
              >
                {addBlockCommands.map((command) => (
                  <button
                    key={command.id}
                    type="button"
                    role="menuitem"
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onInsert(command);
                      close();
                    }}
                  >
                    <command.icon size={14} />
                    {command.label}
                  </button>
                ))}
              </div>
            ))}
          </ResponsivePopoverPanel>
        </>
      )}
    </Popover>
  );
};

// `sheetColumns` sets how many options sit side by side in the phone sheet.
const Dropdown = ({ options, value, onChange, icon, title, type = null, sheetColumns = 'grid-cols-3' }) => {
  const optionLabel = (option) => (type === 'font'
    ? <span style={{ fontFamily: option.value || undefined }}>{option.label}</span>
    : option.label);

  return (
    <Popover className="relative inline-flex">
      <PopoverButton
        type="button"
        title={title}
        onMouseDown={(event) => event.preventDefault()}
        className={`inline-flex items-center gap-2 ${
          value ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'
        } dark:hover:text-gray-300 hover:text-black cursor-pointer duration-200 p-2 font-semibold`}
      >
        {icon}
      </PopoverButton>
      <ResponsivePopoverPanel
        anchor={{ to: 'top start', gap: '12px', padding: '12px' }}
        className="z-[9999]"
      >
        {({ close, phone }) => (phone ? (
          <div aria-label={title} className={`sheetGrid ${sheetColumns}`}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={value === option.value}
                className="sheetButton text-sm"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
              >
                {optionLabel(option)}
              </button>
            ))}
          </div>
        ) : (
          <div className="min-w-40 max-h-[min(15rem,80dvh)] overflow-y-auto rounded-xl shadow-lg bg-white dark:bg-zinc-900 p-1.5 flex flex-col border border-gray-200 dark:border-zinc-800">
            {options?.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`dropdownItem text-sm p-2 rounded text-left ${
                  value === option.value ? '!text-blue-600' : ''
                } hover:bg-gray-100 dark:hover:bg-zinc-800`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
              >
                {optionLabel(option)}
              </button>
            ))}
          </div>
        ))}
      </ResponsivePopoverPanel>
    </Popover>
  );
};

export const ExternalToolbar = () => {
  const { activeEditor: editor } = useEditorContext();
  const editorRef = useRef(editor);
  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => currentEditor ? ({
      activeMarks: Object.fromEntries(activeMarkNames.map((name) => [name, currentEditor.isActive(name)])),
      headingLevel: Array.from({ length: 6 }, (_, index) => index + 1)
        .find((level) => currentEditor.isActive('heading', { level })) || null,
      textStyleAttrs: currentEditor.getAttributes('textStyle'),
    }) : null,
  });
  const [expanded, setExpanded] = useState(false);

  if (editor) editorRef.current = editor;

  // `Default` (an empty value) clears the property so the text uses the editor's default style.
  const fonts = [
    { label: 'Default', value: '' },
    { label: 'Figtree', value: 'Figtree' },
    { label: 'Playpen Sans', value: 'Playpen Sans' },
    { label: 'Inclusive Sans', value: 'Inclusive Sans' },
    { label: 'Onest', value: 'Onest' },
    { label: 'JetBrains Mono', value: 'JetBrains Mono' },
    { label: 'Bebas Neue', value: 'Bebas Neue' },
  ];

  const sizes = [
    { label: 'Default', value: '' },
    ...['8px', '12px', '14px', '16px', '20px', '24px', '32px', '48px', '64px', '96px'].map((s) => ({ label: s, value: s })),
  ];

  const headers = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((h) => ({ label: h, value: h }));

  const isActive = (name, attrs) => name === 'heading'
    ? toolbarState?.headingLevel === attrs?.level
    : toolbarState?.activeMarks[name] || false;
  const textStyleAttrs = toolbarState?.textStyleAttrs || {};

  const run = (fn) => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;
    fn(currentEditor.chain().focus());
  };

  const toggle = (fn) => run((chain) => fn(chain).run());

  const applyPickerFormat = (fn) => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;
    fn(currentEditor.chain()).run();
  };

  // Opens the active editor's link editor (a sheet on phones) for the current selection.
  const editLink = () => editor?.emit(OPEN_LINK_EDITOR_EVENT);

  const insertBlock = (command) => {
    if (editor) command.run(editor.chain().focus()).run();
  };

  return (
    <div className="h-12 px-3 w-screen flex gap-1 items-center overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&>*]:shrink-0 md:w-fit md:overflow-visible text-gray-700">
      <BlockMenu onInsert={insertBlock} />
      <ToolbarDivider />
      <Dropdown
        options={fonts}
        value={textStyleAttrs.fontFamily || ''}
        onChange={(value) => toggle((chain) => (value ? chain.setFontFamily(value) : chain.unsetFontFamily()))}
        title="Font"
        icon={<Type size={13} />}
        type="font"
        sheetColumns="grid-cols-1"
      />
      <Dropdown
        options={sizes}
        value={textStyleAttrs.fontSize || ''}
        onChange={(value) => toggle((chain) => (value ? chain.setFontSize(value) : chain.unsetFontSize()))}
        title="Size"
        icon={<ALargeSmall size={13} />}
        sheetColumns="grid-cols-1"
      />
      <Dropdown
        options={headers}
        value={
          ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].find((h) => isActive('heading', { level: Number(h.slice(1)) })) || ''
        }
        onChange={(value) => {
          const level = Number(value.slice(1));
          toggle((chain) => (isActive('heading', { level }) ? chain.setParagraph() : chain.toggleHeading({ level })));
        }}
        title="Headers"
        icon={<Heading1 size={13} />}
        sheetColumns="grid-cols-1"
      />

      <ToolbarDivider />

      <ToolbarButton format="bold" icon={Bold} isActive={isActive('bold')} onClick={() => toggle((c) => c.toggleBold())} title="Bold" />
      <ToolbarButton format="italic" icon={Italic} isActive={isActive('italic')} onClick={() => toggle((c) => c.toggleItalic())} title="Italic" />
      <ToolbarButton format="underline" icon={Underline} isActive={isActive('underline')} onClick={() => toggle((c) => c.toggleUnderline())} title="Underline" />
      <ToolbarButton format="strike" icon={Strikethrough} isActive={isActive('strike')} onClick={() => toggle((c) => c.toggleStrike())} title="Strikethrough" />
      <ToolbarButton format="code" icon={Code} isActive={isActive('code')} onClick={() => toggle((c) => c.toggleCode())} title="Inline code" />

      <ToolbarButton format="bullet" icon={List} isActive={isActive('bulletList')} onClick={() => toggle((c) => c.toggleBulletList())} title="Bullet list" />
      <ToolbarButton format="ordered" icon={ListOrdered} isActive={isActive('orderedList')} onClick={() => toggle((c) => c.toggleOrderedList())} title="Ordered list" />

      <ToolbarDivider />

      <ToolbarButton
        format="link"
        icon={Link}
        isActive={isActive('link')}
        onClick={editLink}
        title="Link"
      />

      {expanded && (
        <div className="flex gap-3 px-1">
          <MintypeColorPicker
            popover
            label="Text color"
            icon={<Palette size={12} className="text-black dark:text-white" />}
            value={{ r: 0, b: 0, g: 0, a: 0 }}
            onChange={(color) => applyPickerFormat((chain) => chain.setColor(rgbObjectToString(color)))}
            onReset={() => applyPickerFormat((chain) => chain.unsetColor())}
          />
          <MintypeColorPicker
            popover
            label="Highlight color"
            hideRow1
            icon={<Highlighter size={12} className="text-black dark:text-white" />}
            value={{ r: 0, b: 0, g: 0, a: 0 }}
            onChange={(color) => applyPickerFormat((chain) => chain.setHighlight({ color: rgbObjectToString(color) }))}
            onReset={() => applyPickerFormat((chain) => chain.unsetHighlight())}
          />
        </div>
      )}

      {expanded && (
        <>
          <ToolbarButton format="sup" icon={SuperscriptIcon} isActive={isActive('superscript')} onClick={() => toggle((c) => c.toggleSuperscript())} title="Superscript" />
          <ToolbarButton format="sub" icon={SubscriptIcon} isActive={isActive('subscript')} onClick={() => toggle((c) => c.toggleSubscript())} title="Subscript" />
           <ToolbarDivider />
        </>
      )}

      <ToolbarButton
        format="expand"
        icon={expanded ? ChevronLeft : ChevronRight}
        isActive={false}
        onClick={() => setExpanded(!expanded)}
        title={expanded ? 'Collapse' : 'More'}
      />

      <ToolbarButton
        format="Clear Formatting"
        icon={X}
        isActive={false}
        onClick={() => toggle((c) => c.unsetAllMarks().clearNodes())}
        title="Clear formatting"
      />

    </div>
  );
};
