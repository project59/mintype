import React from 'react';
import { Popover, PopoverButton } from '@headlessui/react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { ResponsivePopoverPanel } from '../../../components/common/ResponsivePopover.jsx';
import {
  CALLOUT_BOX_CLASS, CALLOUT_CONTENT_CLASS, CALLOUT_EMOJI_FONT_CLASS, CALLOUT_EMOJI_SLOT_CLASS, CALLOUT_ROW_CLASS, CALLOUT_TYPES, calloutEmoji, getCalloutType,
} from '../nodes/calloutTypes.js';

// Laid out exactly like the callout's static HTML; the emoji is a button that opens the type picker.
const CalloutView = ({ node, editor, updateAttributes }) => {
  const calloutType = getCalloutType(node.attrs.type);
  const emoji = calloutEmoji(node.attrs);

  return (
    <NodeViewWrapper className={`callout callout-${calloutType.value} ${CALLOUT_BOX_CLASS}`}>
      <div className={CALLOUT_ROW_CLASS}>
        {editor.isEditable ? (
          <Popover contentEditable={false} className="flex shrink-0">
            <PopoverButton
              aria-label={`Callout type: ${calloutType.label}`}
              title="Change callout type"
              onMouseDown={(event) => event.preventDefault()}
              className={`${CALLOUT_EMOJI_SLOT_CLASS} cursor-pointer outline-none duration-200 hover:bg-black/5 data-[focus]:ring-2 data-[focus]:ring-black/20 dark:hover:bg-white/10 dark:data-[focus]:ring-white/30`}
            >
              {emoji}
            </PopoverButton>
            <ResponsivePopoverPanel
              anchor={{ to: 'bottom start', gap: '6px', padding: '12px' }}
              className="z-50 flex gap-0.5 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-slate-900"
            >
              {({ close, phone }) => (
                <div className={phone ? 'sheetGrid grid-cols-4' : 'contents'}>
                  {CALLOUT_TYPES.map((option) => {
                    const selected = option.value === calloutType.value && !node.attrs.emoji;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        title={option.label}
                        aria-label={option.label}
                        aria-pressed={selected}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          updateAttributes({ type: option.value, emoji: null });
                          close();
                        }}
                        className={phone
                          ? 'sheetButton flex-col justify-center gap-1'
                          : `flex h-8 w-8 items-center justify-center rounded-lg duration-200 hover:bg-gray-100 dark:hover:bg-slate-800 ${selected ? 'bg-gray-100 dark:bg-slate-800' : ''}`}
                      >
                        <span className={`text-lg leading-none ${CALLOUT_EMOJI_FONT_CLASS}`}>{option.emoji}</span>
                        {phone && option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </ResponsivePopoverPanel>
          </Popover>
        ) : (
          <span contentEditable={false} aria-hidden="true" className={CALLOUT_EMOJI_SLOT_CLASS}>{emoji}</span>
        )}
        <NodeViewContent className={CALLOUT_CONTENT_CLASS} />
      </div>
    </NodeViewWrapper>
  );
};

export default CalloutView;
