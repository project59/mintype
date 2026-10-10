import React from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import {
  CALLOUT_BOX_CLASS, CALLOUT_ICON_SIZE, CALLOUT_ROW_CLASS, CALLOUT_TYPES, calloutIconSlotClass, getCalloutType,
} from '../nodes/calloutTypes.js';
import IconSvg from './IconSvg.jsx';

// The type picker floats on the top border so the box is laid out exactly like its static HTML.
const CalloutView = ({ node, updateAttributes }) => {
  const calloutType = getCalloutType(node.attrs.type);

  return (
    <NodeViewWrapper className={`callout callout-${calloutType.value} group/callout relative ${CALLOUT_BOX_CLASS}`}>
      <div
        contentEditable={false}
        className="absolute -top-3 right-2 z-10 rounded-md border border-gray-200 bg-white p-0.5 opacity-0 shadow-sm transition-opacity focus-within:opacity-100 group-hover/callout:opacity-100 dark:border-zinc-700 dark:bg-zinc-900 [@media(hover:none)]:opacity-100"
      >
        <select
          value={calloutType.value}
          aria-label="Callout type"
          onChange={(event) => updateAttributes({ type: event.target.value })}
          className="h-6 cursor-pointer rounded bg-transparent px-1.5 text-xs font-medium text-gray-600 outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-black/20 dark:text-gray-300 dark:hover:bg-white/10 dark:focus-visible:ring-white/30"
        >
          {CALLOUT_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className={CALLOUT_ROW_CLASS}>
        <span contentEditable={false} aria-hidden="true" className={calloutIconSlotClass(calloutType)}>
          {node.attrs.emoji || <IconSvg icon={calloutType.icon} size={CALLOUT_ICON_SIZE} />}
        </span>
        <NodeViewContent className="callout-content min-w-0 flex-1" />
      </div>
    </NodeViewWrapper>
  );
};

export default CalloutView;
