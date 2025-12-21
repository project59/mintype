// components/CommentPopup.jsx
import React, { useState, useRef, useEffect, useContext } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { Trash2, Edit2, Check, X, ArrowRight } from 'lucide-react';
import { COMMENT_TYPES, REACTION_TYPES } from '../../utils/constants.js';
import {
    addReplyToComment,
    editThreadItem,
    deleteThreadItem,
    addReaction,
    deleteComment,
    getComment
} from '../../lib/dbService.js';
import { useSupabaseAuth } from '../../layouts/auth/SupabaseAuthProvider.jsx';
import { SecureContext } from '../../layouts/secure-context/SecureContext.jsx';
import TextareaAutosize from 'react-textarea-autosize';

const CommentPopup = ({
    commentId,
    pageId,
    isOpen,
    onClose,
    onCommentDeleted
}) => {
    const [comment, setComment] = useState(null);
    const [editMode, setEditMode] = useState({ id: null, content: '' });
    const [replyText, setReplyText] = useState('');
    const [showReactions, setShowReactions] = useState('');
    const [loading, setLoading] = useState(true);
    const { profile } = useSupabaseAuth();
    const { masterKey } = useContext(SecureContext);

    const fetchComment = async () => {
        if (!commentId) return;
        setLoading(true);
        try {
            const commentData = await getComment(pageId, commentId, masterKey);
            setComment(commentData);
        } catch (error) {
            console.error('Error fetching comment:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && commentId) {
            fetchComment();
        }
    }, [isOpen, commentId, pageId]);

    const handleEditSubmit = async (threadIndex) => {
        if (editMode.content.trim()) {
            try {
                await editThreadItem(pageId, commentId, threadIndex, editMode.content, masterKey);
                setEditMode({ id: null, content: '' });
                await fetchComment();
            } catch (error) {
                console.error('Error editing comment:', error);
            }
        }
    };

    const handleReplySubmit = async () => {
        if (replyText.trim()) {
            try {
                await addReplyToComment(pageId, commentId, replyText, profile?.displayName || 'anonymous', masterKey);
                setReplyText('');
                await fetchComment();
            } catch (error) {
                console.error('Error adding reply:', error);
            }
        }
    };

    const handleReaction = async (threadIndex, reactionType) => {
        try {
            await addReaction(pageId, commentId, threadIndex, reactionType, masterKey);
            await fetchComment();
        } catch (error) {
            console.error('Error adding reaction:', error);
        }
    };

    const handleDeleteThread = async (threadIndex) => {
        try {
            await deleteThreadItem(pageId, commentId, threadIndex, masterKey);
            await fetchComment();
        } catch (error) {
            console.error('Error deleting thread item:', error);
        }
    };

    const handleDeleteComment = async () => {
        try {
            await deleteComment(pageId, commentId, masterKey);
            onCommentDeleted(commentId);
            onClose();
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    const ReactionButton = ({ reaction, count, onClick }) => (
        <button
            onClick={onClick}
            className={`btnChip 
        ${count > 0
                    ? '!bg-blue-500/20'
                    : ''
                }`}
        >
            <span>{reaction.emoji}</span>
            {count > 0 && <span className="font-medium">{count}</span>}
        </button>
    );

    const ReactionsPicker = ({ threadIndex, onClose: closeReactions }) => (
        <div className="absolute top-full right-0 z-50 mt-1">
            <div className="flex gap-1 p-1 bg-gray-200 dark:bg-black shadow rounded-xl">
                {Object.entries(REACTION_TYPES).map(([key, reaction]) => (
                    <button
                        key={key}
                        onClick={() => {
                            handleReaction(threadIndex, reaction.label);
                            closeReactions();
                        }}
                        className="btnChip"
                        title={reaction.label}
                    >
                        {reaction.emoji}
                    </button>
                ))}
            </div>
        </div>
    );

    // if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <DialogBackdrop transition className="dialogBackdrop" />
            <div className="dialogWrapper">
                <DialogPanel
                    transition
                    onMouseDown={(e) => e.stopPropagation()}
                    className="dialogPanel !bg-white dark:!bg-[#1f1f2d] !p-3 rounded-lg max-w-lg shadow absolute pointer-events-auto w-full max-h-96 overflow-y-auto"
                >
                    {loading ? (
                        <div className="p-4 text-center">Loading...</div>
                    ) : comment ? (
                        <div className="">
                            {/* Comment header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="textTitle"
                                    // style={{color: `${COMMENT_TYPES[comment.type]?.color}`}}
                                    >
                                        {COMMENT_TYPES[comment.type]?.label}
                                    </span>
                                </div>
                                <button
                                    onClick={handleDeleteComment}
                                    className="btnDestructiveSm"
                                    title="Delete entire comment"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Thread items */}
                            <div className="space-y-1 mt-2">
                                {comment.thread.map((threadItem, index) => (
                                    <div key={index} className="group bg-slate-50 dark:bg-slate-500/10 p-1 px-2 rounded-md">
                                        <div className="flex items-start justify-between mb-">
                                            <div className="flex items-center gap-2">
                                                <div className="rounded-full w-4 h-4 shadow-sm flex-shrink-0 bg-rose-300" />
                                                <span className="textLabel">
                                                    {threadItem.author || 'Unknown'}
                                                </span>
                                                <span className="text-[10px] mt-0.5 font-medium text-gray-400">
                                                    {new Date(threadItem.createdAt || Date.now()).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setShowReactions(showReactions === index ? '' : index)}
                                                        className="btnChip"
                                                    >
                                                        😊+
                                                    </button>
                                                    {showReactions === index && (
                                                        <ReactionsPicker
                                                            threadIndex={index}
                                                            onClose={() => setShowReactions('')}
                                                        />
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => setEditMode({
                                                        id: index,
                                                        content: threadItem.content
                                                    })}
                                                    className="btnChip"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                                {index > 0 && (
                                                    <button
                                                        onClick={() => handleDeleteThread(index)}
                                                        className="btnDestructiveSm"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {editMode.id === index ? (
                                            <div className="space-y-2 my-2">
                                                <TextareaAutosize
                                                    value={editMode.content}
                                                    onChange={(e) => setEditMode({
                                                        ...editMode,
                                                        content: e.target.value
                                                    })}
                                                    className="w-full p-2 bg-slate-400/10 text-black dark:text-white rounded-xl text-sm"
                                                    rows={2}
                                                />
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEditSubmit(index)}
                                                        className="btnChip"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditMode({ id: null, content: '' })}
                                                        className="btnChip"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="textRegular">
                                                    {threadItem.content}
                                                </div>

                                                {/* Reactions */}
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex gap-1 flex-wrap">
                                                        {Object.entries(REACTION_TYPES).map(([key, reaction]) => {
                                                            const count = threadItem.reactions?.[reaction.label] || 0;
                                                            if (count === 0) return null;
                                                            return (
                                                                <ReactionButton
                                                                    key={key}
                                                                    reaction={reaction}
                                                                    count={count}
                                                                    onClick={() => handleReaction(index, reaction.label)}
                                                                />
                                                            );
                                                        })}
                                                    </div>

                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Reply input */}
                            <div className="mt-3 flex gap-2">
                                <TextareaAutosize
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Add a reply..."
                                    className="w-full h-8 bg-slate-100 dark:bg-slate-500/10 text-black dark:text-white rounded-xl p-1.5 pl-2 resize-none"
                                    rows={2}
                                />
                                <div className="flex">
                                    <button
                                        onClick={handleReplySubmit}
                                        disabled={!replyText.trim()}
                                        className="btnPrimary"
                                    >
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 text-center text-gray-500">
                            Comment not found
                        </div>
                    )}
                </DialogPanel>
            </div>
        </Dialog>
    );
};

export default CommentPopup;