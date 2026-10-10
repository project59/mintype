import { ReactRenderer } from '@tiptap/react';
import SuggestionList from './components/SuggestionList.jsx';

// Builds a @tiptap/suggestion `render` option that shows SuggestionList with the given
// presentation props (label, emptyText, renderItem).
export const renderSuggestionList = (listProps) => () => {
  let component = null;
  let unmount = null;

  return {
    onStart: (props) => {
      component = new ReactRenderer(SuggestionList, {
        props: { ...props, ...listProps },
        editor: props.editor,
        className: 'z-[10000]',
      });
      unmount = props.mount(component.element);
    },
    onUpdate: (props) => component?.updateProps({ ...props, ...listProps }),
    onKeyDown: ({ event }) => {
      if (event.key === 'Escape') return false;
      return component?.ref?.onKeyDown(event) ?? false;
    },
    onExit: () => {
      unmount?.();
      component?.destroy();
      component = null;
      unmount = null;
    },
  };
};
