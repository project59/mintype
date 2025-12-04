import { useParams } from "react-router-dom";
import { ExternalToolbar } from "../render/shared/RichTextToolbar.jsx";
import Whiteboard from "../render/whiteboard/components/Whiteboard";
import { useEffect, useState, useRef, useCallback, useContext } from "react";
import dbService from "../lib/dbService";
import toast from "react-hot-toast";
import FunctionBar from "../components/common/FunctionBar";
import { useSidebar } from "../layouts/root/SidebarContext.jsx";
import DocumentElement from "../render/document/DocumentElement.jsx";
import { useUndoRedo } from "../layouts/page/HistroyContext.jsx";
import { SecureContext } from "../layouts/secure-context/SecureContext.jsx";
import { decryptDataWithMasterKey, decryptWithKey, deriveKEK } from "../layouts/secure-context/secureUtils.js";
import { getItem } from "../layouts/secure-context/dbUtils.js";
import SensitiveDialog from "../layouts/secure-context/SensitiveDialog.jsx";

export default function Page() {
    const { pageId } = useParams();
    const [pageMeta, setPageMeta] = useState(null);
    const [pageContent, setPageContent] = useState(null);
    const [elements, setElements] = useState([]);
    const [showPassword, setShowPassword] = useState(null);
    const [error, setError] = useState(null);
    const { showTextToolbar, setShowTextToolbar } = useSidebar();
    const { triggerUndo, triggerRedo } = useUndoRedo();
    const { masterKey } = useContext(SecureContext);

    const saveTimeoutRef = useRef(null);
    const debouncedSave = useCallback((pageId, updatedElement) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await dbService.saveHistoryState(pageId, 'update element', masterKey);
                await dbService.updateElement(pageId, updatedElement, masterKey);
            } catch (error) {
                console.error('Failed to save element update:', error);
            }
        }, 500);
    }, []);

    // wrapper updates are handled separately, also their history is saved separately
    const debouncedWrapperSave = useCallback((pageId, updatedElement) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await dbService.updateElement(pageId, updatedElement, masterKey);
            } catch (error) {
                console.error('Failed to save wrapper update:', error);
            }
        }, 500);
    }, []);

    const fetchPage = async () => {
        try {
            const fetchedMeta = await dbService.getMeta(pageId);
            const fetchedContent = await dbService.getContent(pageId, masterKey);
            setPageMeta(fetchedMeta);
            if (fetchedMeta.sensitive) {
                setShowPassword(true);
            }
            setPageContent(fetchedContent);

            if (!fetchedContent) {
                setError('Page content not found');
                return;
            }

            if (!fetchedContent.elements) {
                setError('Page content is corrupted');
                return;
            }

            setElements(fetchedContent.elements || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleUndo = useCallback(async () => {
        if (!pageId) return;
        try {
            const undoState = await dbService.getUndoState(pageId, masterKey);
            if (undoState) {
                const decrypted = await decryptDataWithMasterKey(masterKey, undoState.page.iv, undoState.page.ciphertext);
                setElements(decrypted.elements || []);
                triggerUndo(); // Notify all listening components
                toast.success('Undone');
            } else {
                toast.error('Nothing to undo');
            }
        } catch (error) {
            console.error('Undo failed:', error);
        }
    }, [pageId, triggerUndo]);

    const handleRedo = useCallback(async () => {
        if (!pageId) return;
        try {
            const redoState = await dbService.getRedoState(pageId, masterKey);
            if (redoState) {
                const decrypted = await decryptDataWithMasterKey(masterKey, redoState.page.iv, redoState.page.ciphertext);
                setElements(decrypted.elements || []);
                triggerRedo(); // Notify all listening components
                toast.success('Redone');
            } else {
                toast.error('Nothing to redo');
            }
        } catch (error) {
            console.error('Redo failed:', error);
        }
    }, [pageId, triggerRedo]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event) => {
            // ctrl+z to undo, ctrl+shift+z to redo
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                event.stopPropagation();

                if (event.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [handleUndo, handleRedo]);

    useEffect(() => {
        // Clear history when pageId changes
        dbService.clearPageHistory();
        setShowTextToolbar(false);

        // Reset state immediately when pageId changes
        setPageMeta(null);
        setPageContent(null);
        setElements([]);
        setShowPassword(null);

        fetchPage();
    }, [pageId]);

    const handleElementUpdate = useCallback(async (updatedElement) => {
        try {
            setElements(prevElements => {
                const newElements = prevElements.map(element =>
                    element.id === updatedElement.id ? updatedElement : element
                );
                return newElements;
            });
            debouncedSave(pageId, updatedElement);
        } catch (error) {
            console.error('Failed to update element:', error);
        }
    }, [pageId, debouncedSave]);

    const handleWrapperUpdate = useCallback(async (updatedElement) => {
        // console.log("updating wrapper")
        try {
            setElements(prevElements => {
                const newElements = prevElements.map(element =>
                    element.id === updatedElement.id ? updatedElement : element
                );
                return newElements;
            });

            debouncedWrapperSave(pageId, updatedElement);
        } catch (error) {
            console.error('Failed to update element:', error);
        }
    }, [pageId, debouncedWrapperSave]);

    const handleElementAdd = useCallback(async (newElement) => {
        try {
            setElements(prev => [...prev, newElement]);
            await dbService.saveHistoryState(pageId, 'add element', masterKey);
            await dbService.updateElement(pageId, newElement, masterKey);
        } catch (error) {
            console.error('Failed to add element:', error);
        }
    }, [pageId]);

    const handleElementDelete = useCallback(async (elementId) => {
        try {
            setElements(prev => prev.filter(element => element.id !== elementId));
            await dbService.saveHistoryState(pageId, 'delete element', masterKey);
            await dbService.deleteElement(pageId, elementId, null, masterKey);
        } catch (error) {
            console.error('Failed to delete element:', error);
        }
    }, [pageId]);

    const handleMultiElementDelete = useCallback(async (elementIds) => {
        try {
            setElements(prev => prev.filter(element => !elementIds.includes(element.id)));
            await dbService.saveHistoryState(pageId, 'delete elements', masterKey);
            await dbService.deleteElement(pageId, null, elementIds, masterKey);
        } catch (error) {
            console.error('Failed to delete elements:', error);
        }
    }, [pageId]);

    // Rest of your existing functions remain the same...
    const updatePreferences = async (updatedPreferences, addToQueue = true) => {
        console.log(addToQueue)
        try {
            setPageContent(prevPage => ({
                ...prevPage,
                preferences: updatedPreferences
            }));

            await dbService.updateContentField({
                id: pageId,
                fieldName: 'preferences',
                newValue: updatedPreferences,
                addToQueue: addToQueue,
                updateLastModified: addToQueue,
                masterKey
            });
        } catch (error) {
            console.error('Failed to update preferences:', error);
        }
    };

    const timeoutRef = useRef();

    const handleTransformed = (ref, state) => {
        const newPanX = state.positionX + 5000;
        const newPanY = state.positionY + 5000;

        if (pageContent?.preferences && (pageContent.preferences.panX !== newPanX || pageContent.preferences.panY !== newPanY)) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                const updatedPreferences = {
                    ...pageContent.preferences,
                    panX: newPanX,
                    panY: newPanY,
                    zoom: state.scale
                };
                updatePreferences(updatedPreferences, false);
            }, 500);
        }
    };

    const setFavorite = async () => {
        try {
            await dbService.updateMetaField({ id: pageId, fieldName: 'isFavorite', newValue: !pageMeta.isFavorite });

        } catch (error) {
            console.error('Failed to set favorite:', error);
        }
    };

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleSubmit = async (passwordOrRecovery, isRecovery = false) => {
        const salt = isRecovery ? await getItem("recovery_salt") : await getItem("salt");
        const encBlob = isRecovery
            ? await getItem("recovery_key_enc")
            : await getItem("master_key_enc");
        if (!encBlob) return alert("No matching encrypted data found");

        const { iv, ciphertext } = encBlob;
        const kek = await deriveKEK(passwordOrRecovery, salt);

        try {
            const decrypted = await decryptWithKey(kek, iv, ciphertext);

            setShowPassword(false);
            toast.success("Unlocked");
        } catch (e) {
            toast.error("Failed to unlock");
        }
    };


    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-red-500">{error}</div>
            </div>
        );
    }

    if (showPassword) {
        return (
            <SensitiveDialog onSubmit={handleSubmit} />
        )
    }

    return (
        <div className="flex flex-col items-center relative h-full text-black overflow-hidden">
            <div className="sticky top-0 h-12 z-20 bg-slate-100 dark:bg-[#10101e] w-full">
                <FunctionBar handleUndo={handleUndo} handleRedo={handleRedo} setFavorite={setFavorite} updatePreferences={updatePreferences} />
            </div>

            {pageMeta && pageMeta.id === pageId && (
                (pageMeta.type === "document" ? (
                    <DocumentElement
                        key={pageId}
                        element={elements[0]}
                        onElementUpdate={handleElementUpdate}
                    />
                ) : (
                    <Whiteboard
                        key={pageId}
                        preferences={pageContent.preferences}
                        elements={elements}
                        onElementUpdate={handleElementUpdate}
                        onwrapperUpdate={handleWrapperUpdate}
                        onElementAdd={handleElementAdd}
                        onElementDelete={handleElementDelete}
                        onMultiDelete={handleMultiElementDelete}
                        handleTransformed={handleTransformed}
                    />
                ))
            )}
            <div className="w-full bg-white dark:bg-[#1f1f2d] flex justify-center">
                <div className={`h-12 bg-slate-200/80 md:mb-2 md:rounded-full dark:bg-[#2d2e3b]/80 backdrop-blur-sm z-10 ${pageMeta?.type == 'whiteboard' ? 'fixed bottom-0' : 'mt-2 static'}  ${showTextToolbar ? 'md:fixed bottom-0 md:bottom-2' : 'hidden'} flex items-center justify-center no-printme`}>
                    <ExternalToolbar />
                </div>
            </div>
        </div>
    );
}