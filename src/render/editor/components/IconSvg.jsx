import React from 'react';
import { iconSvgAttrs } from '../nodes/blockStyles.js';

const toReactProps = (attrs) => Object.fromEntries(
  Object.entries(attrs).map(([name, value]) => [name.replace(/-(\w)/g, (_, char) => char.toUpperCase()), value]),
);

// Draws an icon kept as data in blockStyles.js, the same way its static HTML does.
const IconSvg = ({ icon, size, className }) => (
  <svg {...toReactProps(iconSvgAttrs(size))} className={className}>
    {icon.map(([tag, attrs]) => React.createElement(tag, { key: JSON.stringify(attrs), ...attrs }))}
  </svg>
);

export default IconSvg;
