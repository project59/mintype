// Shared by the callout's node view and its static HTML so both draw the same box (see
// blockStyles.js). Icons are lucide's Info, TriangleAlert, CircleX and CircleCheck as data.
export const CALLOUT_TYPES = [
  {
    value: 'info',
    label: 'Info',
    iconClassName: 'text-black dark:text-white',
    icon: [
      ['circle', { cx: '12', cy: '12', r: '10' }],
      ['path', { d: 'M12 16v-4' }],
      ['path', { d: 'M12 8h.01' }],
    ],
  },
  {
    value: 'warning',
    label: 'Warning',
    iconClassName: 'text-amber-900 dark:text-amber-200',
    icon: [
      ['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3' }],
      ['path', { d: 'M12 9v4' }],
      ['path', { d: 'M12 17h.01' }],
    ],
  },
  {
    value: 'error',
    label: 'Error',
    iconClassName: 'text-red-800 dark:text-red-200',
    icon: [
      ['circle', { cx: '12', cy: '12', r: '10' }],
      ['path', { d: 'm15 9-6 6' }],
      ['path', { d: 'm9 9 6 6' }],
    ],
  },
  {
    value: 'success',
    label: 'Success',
    iconClassName: 'text-green-800 dark:text-green-200',
    icon: [
      ['circle', { cx: '12', cy: '12', r: '10' }],
      ['path', { d: 'm9 12 2 2 4-4' }],
    ],
  },
];

export const getCalloutType = (value) => CALLOUT_TYPES.find((option) => option.value === value) || CALLOUT_TYPES[0];

export const CALLOUT_ICON_SIZE = 20;

// Layout classes shared by both renderings: the icon slot (an emoji or the type's icon) and the
// row holding it beside the content.
export const calloutIconSlotClass = (type) => `mt-1 flex h-5 w-5 shrink-0 items-center justify-center text-lg leading-none ${type.iconClassName}`;
export const CALLOUT_ROW_CLASS = 'flex items-start gap-3 px-4 py-3';
export const CALLOUT_BOX_CLASS = 'my-3 rounded-xl';
