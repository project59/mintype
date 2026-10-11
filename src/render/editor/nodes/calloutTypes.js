// Shared by the callout's node view and its static HTML so both draw the same box (see
// blockStyles.js). Each type is shown by its emoji, which in the editor also picks the type.
export const CALLOUT_TYPES = [
  { value: 'info', label: 'Info', emoji: '💡' },
  { value: 'warning', label: 'Warning', emoji: '⚠️' },
  { value: 'error', label: 'Error', emoji: '🛑' },
  { value: 'success', label: 'Success', emoji: '✅' },
];

export const getCalloutType = (value) => CALLOUT_TYPES.find((option) => option.value === value) || CALLOUT_TYPES[0];

// Callouts written with a custom `emoji` attribute keep showing it until another type is picked.
export const calloutEmoji = (attrs) => attrs.emoji || getCalloutType(attrs.type).emoji;

// Emoji fonts first: text fonts on some systems draw ✅ as a faint monochrome glyph.
export const CALLOUT_EMOJI_FONT_CLASS = "[font-family:'Apple_Color_Emoji','Segoe_UI_Emoji','Noto_Color_Emoji',sans-serif]";

// Layout classes shared by both renderings: the emoji slot, the content beside it, and their row.
export const CALLOUT_EMOJI_SLOT_CLASS = `mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md p-0 text-lg leading-none ${CALLOUT_EMOJI_FONT_CLASS}`;
export const CALLOUT_ROW_CLASS = 'flex items-start gap-2 px-5 pt-4 pb-3';
export const CALLOUT_CONTENT_CLASS = 'callout-content ml-4 min-w-0 flex-1';
export const CALLOUT_BOX_CLASS = 'my-3 rounded-lg';
