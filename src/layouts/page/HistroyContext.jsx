// UndoRedoContext.js
import { createContext, useContext, useState, useCallback } from 'react';

const UndoRedoContext = createContext();

export const UndoRedoProvider = ({ children }) => {
    const [undoRedoTrigger, setUndoRedoTrigger] = useState(0);

    const triggerUndo = useCallback(() => {
        setUndoRedoTrigger(prev => prev + 1);
    }, []);

    const triggerRedo = useCallback(() => {
        setUndoRedoTrigger(prev => prev + 1);
    }, []);

    return (
        <UndoRedoContext.Provider value={{ undoRedoTrigger, triggerUndo, triggerRedo }}>
            {children}
        </UndoRedoContext.Provider>
    );
};

export const useUndoRedo = () => {
    const context = useContext(UndoRedoContext);
    if (!context) {
        throw new Error('useUndoRedo must be used within UndoRedoProvider');
    }
    return context;
};