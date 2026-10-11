// Markdown rendered by the parity check (parity.html). Cover every block and the cases that
// have drifted before: long text that wraps (including inside node views), emoji callouts,
// task lists, open and closed sections, and columns. Add a case here for every new block.
// YouTube and Maps are left out: they load remote content.
const IMAGE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120"><rect width="240" height="120" fill="#94a3b8"/></svg>')}`;

export const PARITY_FIXTURE = `# Heading one

Paragraph with **bold**, *italic*, ~~strike~~, \`inline code\`, a [link](https://example.com), <u>underline</u>, <mark>highlight</mark> and a page link @page[parity-missing-page] that wraps onto a second line.

## Heading two

### Heading three

- Bullet one
- Bullet two with enough text to wrap onto another line inside a narrow Markdown object
  - Nested bullet

1. First
2. Second

- [ ] Open task with a longer label that wraps across more than one line of the box
- [x] Done task
  - [ ] Nested task

> A quote that is long enough to wrap onto a second line in the narrow case

:::callout{type=info}
Callout body
:::

:::callout{type=warning emoji="🔥"}
Emoji callout with a much longer body that wraps onto a second line inside the box

- A list inside the callout
:::

:::callout{type=error}
Error callout
:::

:::callout{type=success}
Success callout
:::

\`\`\`js
const greet = (name) => \`Hello, \${name}!\`;
// A long comment line that has to wrap when the Markdown object is narrow enough
\`\`\`

\`\`\`py
print("python")
\`\`\`

| Left | Centre | Right |
| :--- | :---: | ---: |
| 1 | two words | 3 |
| A longer cell that wraps | b | c |
|  |  |  |

:::section[Open **section** title]{color=green open}
Section body with text that wraps onto a second line inside the section

:::callout{type=info}
Callout in a section
:::
:::

:::section[Closed section]
Hidden body
:::

:::columns
:::col{width=2}
Left column with text that wraps inside the wider column
:::

:::col
Right
:::
:::

![Grey box](${IMAGE})

---

Final paragraph`;
