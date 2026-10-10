// Markdown directives for Mintype's custom blocks, following the remark-directive convention:
//
//   :::name[label]{key=value flag}   container; its body is Markdown, closed by a `:::` line
//   ::name[label]{key=value flag}    leaf; a single line
//
// A label is either plain text (brackets and backslashes escaped) or, for containers created
// with `markdownLabel`, inline Markdown kept verbatim; like link text, it may contain balanced
// brackets and code spans.
//
// Containers nest by counting every directive opener and closer, and ignore lines inside
// fenced code blocks, so any block can hold any other. Bodies are lexed with the active
// marked lexer (never a separate parse) so nested inline content is tokenized correctly.

const CONTAINER_OPENER = /^:::[A-Za-z][\w-]*/;
const CONTAINER_CLOSER = /^:::[ \t]*$/;
const FENCE_OPENER = /^ {0,3}(`{3,}|~{3,})/;
const SIMPLE_VALUE = /^[\w.%#:/-]+$/;

const lineEndAt = (src, from) => {
  const index = src.indexOf('\n', from);
  return index === -1 ? src.length : index;
};

const unescape = (char) => (char === 'n' ? '\n' : char);

// Returns the label both unescaped (for plain-text labels) and verbatim (for Markdown labels).
const readLabel = (line, start) => {
  if (line[start] !== '[') return { label: null, raw: null, next: start };
  let label = '';
  let depth = 1;
  for (let i = start + 1; i < line.length; i += 1) {
    const char = line[i];
    if (char === '\\' && i + 1 < line.length) {
      i += 1;
      label += unescape(line[i]);
    } else if (char === '`') {
      const fence = /^`+/.exec(line.slice(i))[0];
      const close = line.indexOf(fence, i + fence.length);
      const end = close === -1 ? i + fence.length : close + fence.length;
      label += line.slice(i, end);
      i = end - 1;
    } else if (char === ']' && --depth === 0) {
      return { label, raw: line.slice(start + 1, i), next: i + 1 };
    } else {
      if (char === '[') depth += 1;
      label += char;
    }
  }
  return null;
};

const readQuoted = (line, start) => {
  let value = '';
  for (let i = start + 1; i < line.length; i += 1) {
    if (line[i] === '\\' && i + 1 < line.length) {
      i += 1;
      value += unescape(line[i]);
    } else if (line[i] === '"') {
      return { value, next: i + 1 };
    } else {
      value += line[i];
    }
  }
  return null;
};

const readAttributes = (line, start) => {
  const attrs = {};
  if (line[start] !== '{') return { attrs, next: start };
  let i = start + 1;
  while (i < line.length) {
    while (line[i] === ' ' || line[i] === '\t') i += 1;
    if (line[i] === '}') return { attrs, next: i + 1 };
    const key = /^[\w-]+/.exec(line.slice(i))?.[0];
    if (!key) return null;
    i += key.length;
    if (line[i] !== '=') {
      attrs[key] = true;
      continue;
    }
    i += 1;
    if (line[i] === '"') {
      const quoted = readQuoted(line, i);
      if (!quoted) return null;
      attrs[key] = quoted.value;
      i = quoted.next;
    } else {
      const value = /^[^\s"}]+/.exec(line.slice(i))?.[0];
      if (!value) return null;
      attrs[key] = value;
      i += value.length;
    }
  }
  return null;
};

const parseDirectiveLine = (line, marker, name) => {
  const prefix = `${marker}${name}`;
  if (!line.startsWith(prefix) || /[\w-]/.test(line[prefix.length] || '')) return null;
  const labelPart = readLabel(line, prefix.length);
  if (!labelPart) return null;
  const attrPart = readAttributes(line, labelPart.next);
  if (!attrPart || line.slice(attrPart.next).trim()) return null;
  return { label: labelPart.label, rawLabel: labelPart.raw, attrs: attrPart.attrs };
};

const findLineStart = (src, prefix) => {
  if (src.startsWith(prefix)) return 0;
  const index = src.indexOf(`\n${prefix}`);
  return index === -1 ? -1 : index + 1;
};

// Returns the index of the line that closes the container whose body starts at `from`,
// or -1 when it is never closed.
const findContainerEnd = (src, from) => {
  let depth = 1;
  let fence = null;
  for (let start = from; start < src.length; start = lineEndAt(src, start) + 1) {
    const line = src.slice(start, lineEndAt(src, start));
    if (fence) {
      const closing = FENCE_OPENER.exec(line);
      if (closing && closing[1][0] === fence[0] && closing[1].length >= fence.length && !line.slice(closing[0].length).trim()) {
        fence = null;
      }
    } else if (FENCE_OPENER.test(line)) {
      fence = FENCE_OPENER.exec(line)[1];
    } else if (CONTAINER_CLOSER.test(line)) {
      depth -= 1;
      if (depth === 0) return start;
    } else if (CONTAINER_OPENER.test(line)) {
      depth += 1;
    }
  }
  return -1;
};

// Blocks lexed while marked is inside a tight list come back as `text` tokens; at the top
// of a container they are paragraphs (marked does the same for loose lists).
const toBlockTokens = (tokens) => tokens.map((token) => (token.type === 'text' ? { ...token, type: 'paragraph' } : token));

// With `markdownLabel`, the label is lexed as inline Markdown into `labelTokens`.
export const containerDirectiveTokenizer = (name, { markdownLabel = false } = {}) => ({
  name,
  level: 'block',
  start: (src) => findLineStart(src, `:::${name}`),
  tokenize: (src, _tokens, lexer) => {
    const headerEnd = lineEndAt(src, 0);
    const header = parseDirectiveLine(src.slice(0, headerEnd), ':::', name);
    if (!header) return undefined;

    const bodyStart = Math.min(headerEnd + 1, src.length);
    const closeStart = findContainerEnd(src, bodyStart);
    const bodyEnd = closeStart === -1 ? src.length : closeStart;
    const rawEnd = closeStart === -1 ? src.length : Math.min(lineEndAt(src, closeStart) + 1, src.length);
    return {
      type: name,
      raw: src.slice(0, rawEnd),
      label: header.label,
      labelTokens: markdownLabel && header.rawLabel ? lexer.inlineTokens(header.rawLabel) : [],
      attrs: header.attrs,
      tokens: toBlockTokens(lexer.blockTokens(src.slice(bodyStart, bodyEnd))),
    };
  },
});

export const leafDirectiveTokenizer = (name) => ({
  name,
  level: 'block',
  start: (src) => findLineStart(src, `::${name}`),
  tokenize: (src) => {
    const lineEnd = lineEndAt(src, 0);
    const directive = parseDirectiveLine(src.slice(0, lineEnd), '::', name);
    if (!directive) return undefined;
    return {
      type: name,
      raw: src.slice(0, Math.min(lineEnd + 1, src.length)),
      label: directive.label,
      attrs: directive.attrs,
    };
  },
});

const escapeLabel = (value) => value.replace(/[\\[\]`]/g, '\\$&').replace(/\n/g, '\\n');

const formatValue = (value) => (SIMPLE_VALUE.test(value)
  ? value
  : `"${value.replace(/[\\"]/g, '\\$&').replace(/\n/g, '\\n')}"`);

// `attrs` values: strings are written as key=value, `true` as a bare flag; empty, false and
// null values are omitted.
const formatDirective = (marker, name, { label, markdownLabel, attrs = {} } = {}) => {
  const attrText = Object.entries(attrs)
    .filter(([, value]) => value !== null && value !== undefined && value !== false && value !== '')
    .map(([key, value]) => (value === true ? key : `${key}=${formatValue(String(value))}`))
    .join(' ');
  const labelText = markdownLabel != null ? markdownLabel : label != null ? escapeLabel(label) : null;
  return `${marker}${name}${labelText != null ? `[${labelText}]` : ''}${attrText ? `{${attrText}}` : ''}`;
};

// `children` are the body nodes, rendered as blocks separated by blank lines.
export const renderContainerDirective = (name, children, helpers, options) => {
  const body = helpers.renderChildren(children || [], '\n\n').trim();
  return `${formatDirective(':::', name, options)}\n${body ? `${body}\n` : ''}:::`;
};

export const renderLeafDirective = (name, options) => formatDirective('::', name, options);

export const parseContainerChildren = (token, helpers) => {
  const content = helpers.parseChildren(token.tokens || []);
  return content.length ? content : [{ type: 'paragraph' }];
};
