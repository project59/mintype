// `background` tints the whole section; `swatch` is the solid color shown in the picker.
export const SECTION_COLORS = [
  { value: 'default', label: 'Default', background: 'transparent', swatch: 'transparent' },
  { value: 'gray', label: 'Gray', background: 'rgba(148, 163, 184, 0.14)', swatch: 'rgb(148, 163, 184)' },
  { value: 'green', label: 'Green', background: 'rgba(34, 197, 94, 0.12)', swatch: 'rgb(34, 197, 94)' },
  { value: 'red', label: 'Red', background: 'rgba(239, 68, 68, 0.12)', swatch: 'rgb(239, 68, 68)' },
  { value: 'blue', label: 'Blue', background: 'rgba(59, 130, 246, 0.12)', swatch: 'rgb(59, 130, 246)' },
  { value: 'pink', label: 'Pink', background: 'rgba(236, 72, 153, 0.12)', swatch: 'rgb(236, 72, 153)' },
];

export const getSectionColor = (color) =>
  SECTION_COLORS.find((option) => option.value === color) || SECTION_COLORS[0];
