import React, { createContext, useContext, useState, useCallback } from 'react';

const EditorContext = createContext({ activeEditor: null, setActiveEditor: () => {} });

export const EditorProvider = ({ children }) => {
  const [activeEditor, setActiveEditor] = useState(null);

  const setActiveEditorSafe = useCallback((editor) => {
    setActiveEditor(editor);
  }, []);

  return (
    <EditorContext.Provider value={{ activeEditor, setActiveEditor: setActiveEditorSafe }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditorContext = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorContext must be used within an EditorProvider');
  }
  return context;
};