import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
    // Which nodes are collapsed
    const [collapsedNodes, setCollapsedNodes] = useState(() => {
        // Load from localStorage (stored as JSON array)
        try {
            const stored = localStorage.getItem("collapsedNodes");
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch {
            return new Set();
        }
    });

    // Which disclosure panels are open
    const [openSections, setOpenSections] = useState({
        workspaces: false,
        favorites: false,
        quickNotes: true,
        notes: true,
    });

    // Entries/favorites/quickNotes are stored here instead of inside FileStructureContent
    const [entries, setEntries] = useState([]);
    const [quickNotes, setQuickNotes] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [workspaces, setWorkspaces] = useState([]);
    const [showTextToolbar, setShowTextToolbar] = useState(false);
    const [allowDragSelect, setAllowDragSelect] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(true);

    // Toggle a collapsed node
    const toggleCollapse = useCallback((nodeId, isExpanded) => {
        setCollapsedNodes((prev) => {
            const newSet = new Set(prev);
            if (isExpanded) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    }, []);

    useEffect(() => {
        localStorage.setItem("collapsedNodes", JSON.stringify([...collapsedNodes]));
    }, [collapsedNodes]);

    const value = useMemo(
        () => ({
            collapsedNodes,
            toggleCollapse,
            openSections,
            setOpenSections,
            entries,
            setEntries,
            quickNotes,
            setQuickNotes,
            favorites,
            setFavorites,
            workspaces,
            setWorkspaces,
            showTextToolbar,
            setShowTextToolbar,
            allowDragSelect,
            setAllowDragSelect,
            isDrawerOpen,
            setIsDrawerOpen,
            isNavOpen,
            setIsNavOpen
        }),
        [
            collapsedNodes,
            openSections,
            entries,
            quickNotes,
            favorites,
            workspaces,
            showTextToolbar,
            allowDragSelect,
            isDrawerOpen,
            isNavOpen
        ]
    );

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    );
};

export const useSidebar = () => useContext(SidebarContext);
