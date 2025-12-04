import { useState, useEffect, useCallback, useRef } from 'react';
import { performSearch } from './searchUtils';

export function useSearch(db, workspaceId = null) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const debounceRef = useRef(null);

    const search = useCallback(async (searchQuery) => {
        if (!db || !searchQuery || searchQuery.length < 2) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        setIsSearching(true);
        try {
            const searchResults = await performSearch(db, searchQuery, workspaceId);
            setResults(searchResults);
            setHasSearched(true);
        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [db, workspaceId]);

    const debouncedSearch = useCallback((searchQuery) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            search(searchQuery);
        }, 300);
    }, [search]);

    const handleQueryChange = useCallback((newQuery) => {
        setQuery(newQuery);
        if (newQuery.length >= 2) {
            debouncedSearch(newQuery);
        } else {
            setResults([]);
            setHasSearched(false);
            setIsSearching(false);
        }
    }, [debouncedSearch]);

    const handleEnterKey = useCallback(() => {
        if (query.length >= 2) {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
            search(query);
        }
    }, [query, search]);

    const clearSearch = useCallback(() => {
        setQuery('');
        setResults([]);
        setHasSearched(false);
        setIsSearching(false);
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    return {
        query,
        results,
        isSearching,
        hasSearched,
        handleQueryChange,
        handleEnterKey,
        clearSearch
    };
}