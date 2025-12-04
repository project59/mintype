// components/SearchBar.jsx
import React, { useContext, useEffect, useState } from 'react';
import { useSearch } from '../../lib/useSearch';
import dbService from '../../lib/dbService';
import { clearSearchIndex, initializeSearchIndex } from '../../lib/searchUtils';
import { Button, Dialog, DialogBackdrop, DialogPanel, Input } from '@headlessui/react';
import { Check, File, Image, Search, Terminal, Text, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SecureContext } from '../../layouts/secure-context/SecureContext';

export function SearchBar({ workspaceId = null, }) {
    const [isInitializing, setIsInitializing] = useState(true);
    const [db, setDb] = useState(null);
    const navigate = useNavigate();
    let [isOpen, setIsOpen] = useState(false)
    const { masterKey } = useContext(SecureContext);

    function open() {
        setIsOpen(true)
        initializeSearch();
    }

    function close() {
        setIsOpen(false)
        clearIndexes();
    }

    useEffect(() => {
        initializeDB();
    }, []);

    const initializeDB = async () => {
        const database = await dbService.initializeDB();
        setDb(database);
    };

    const initializeSearch = async () => {
        await initializeSearchIndex(db, masterKey);
        setIsInitializing(false);
    };

    const clearIndexes = async () => {
        await clearSearchIndex(db);
        setIsInitializing(true);
    };

    const {
        query,
        results,
        isSearching,
        hasSearched,
        handleQueryChange,
        handleEnterKey,
        clearSearch
    } = useSearch(db, workspaceId);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleEnterKey();
        } else if (e.key === 'Escape') {
            clearSearch();
        }
    };

    const handleResultClick = (result) => {
        navigate(`/workspace/${result.rootId}/${result.pageId}`);
        //?highlight=${result.elementId || result.blockId}
        close();
        clearSearch();
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'page_title': return <File size={12} />;
            case 'text': return <Text size={12} />;
            case 'code': return <Terminal size={12} />;
            case 'todo': return <Check size={12} />;
            case 'image': return <Image size={12} />;
            default: return <File size={12} />;
        }
    };

    const highlightQuery = (text, query) => {
        if (!query || !text) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        const parts = text.split(regex);

        return parts.map((part, index) =>
            regex.test(part) ? (
                <mark key={index} className="bg-yellow-200 rounded">
                    {part}
                </mark>
            ) : (
                part
            )
        );
    };

    return (
        <>
            <Button
                onClick={open}
                className="rounded-full h-7 w-8 btnBase bg-indigo-300/40 dark:bg-indigo-400/30 hover:bg-indigo-200 hover:dark:bg-indigo-400/50 text-indigo-800 dark:text-white"
            >
                <Search size={14} />
            </Button>

            <Dialog open={isOpen} as="div" className="relative z-40 focus:outline-none" onClose={close}>
                <DialogBackdrop className="fixed inset-0 bg-black/30" />
                <div className="fixed inset-0 flex w-screen items-start justify-center p-4 pt-24">
                    <DialogPanel
                        transition
                        className="dialogPanel !max-w-lg !p-4"
                    >
                        <div className="flex items-center gap-2">
                            <Input
                                type="text"
                                autoFocus
                                value={query}
                                onChange={(e) => handleQueryChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={"Search notes..."}
                                className="baseInput flex-1"
                            />

                            {/* Clear Button */}
                            {query && (
                                <button
                                    onClick={clearSearch}
                                    className="btnPrimary"
                                >
                                    <X size={14} className="text-black" />
                                </button>
                            )}
                        </div>

                        {isInitializing && (
                            <div className="flex items-center justify-center p-4 text-gray-500 text-xs">
                                <div className="text-center">
                                    <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p>Initializing search database...</p>
                                </div>
                            </div>
                        )}

                        {/* Search Results Dropdown */}
                        {(hasSearched || isSearching) && query.length >= 2 ? (
                            <div className=" mt-1 max-h-96 overflow-y-auto ">
                                {isSearching ? (
                                    <div className="p-4 text-center text-gray-500">
                                        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                        Searching...
                                    </div>
                                ) : results.length > 0 ? (
                                    <div className="mt-2">
                                        {results.map((result, index) => (
                                            <button
                                                key={`${result.pageId}_${result.elementId}_${result.blockId}_${index}`}
                                                onClick={() => handleResultClick(result)}
                                                className="w-full px-3 py-3 rounded-lg text-left hover:bg-gray-300/10 focus:bg-gray-300/10 focus:outline-none"
                                            >
                                                <div className="flex items-start space-x-2">
                                                    {/* <span className="text-xs mt-1 flex-shrink-0 text-black">
                                                        {getTypeIcon(result.type)}
                                                    </span> */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center space-x-2 mb-1">
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                {result.pageTitle}
                                                            </span>
                                                            {result.isFavorite && (
                                                                <span className="text-yellow-500 text-xs">⭐</span>
                                                            )}
                                                            <span className="text-[10px] text-indigo-800 dark:text-indigo-100 capitalize px-1 rounded-full bg-indigo-400/40">
                                                                {result.type === 'page_title' ? 'Page' : result.type}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-400 line-clamp-2">
                                                            {highlightQuery(result.snippet, query)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-gray-500">
                                        No results found for "{query}"
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                {!isInitializing && (
                                    <div className="p-4 text-center text-gray-500 text-sm">
                                        Search your notes by typing in the search bar.
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
}