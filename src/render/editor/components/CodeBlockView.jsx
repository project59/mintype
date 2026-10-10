import React from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { codeBlockLanguages } from '../codeBlockLanguages.js';
import { CODE_LANGUAGE_CLASS } from '../nodes/blockStyles.js';

const CodeBlockView = ({ node, updateAttributes }) => {
  const language = codeBlockLanguages[node.attrs.language] ? node.attrs.language : 'js';

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div className="code-block-header">
        <select
          contentEditable={false}
          value={language}
          aria-label="Code language"
          title="Code language"
          onChange={(event) => updateAttributes({ language: event.target.value })}
          className={`${CODE_LANGUAGE_CLASS} cursor-pointer bg-transparent outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-black/20 dark:hover:bg-white/10 dark:focus-visible:ring-white/30`}
        >
          {Object.entries(codeBlockLanguages).map(([value, option]) => (
            <option key={value} value={value}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
};

export default CodeBlockView;
