import { EmojiPicker } from "frimousse";
import dbService from "../../lib/dbService.js";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { FileLock, FileText, PanelsLeftBottom, XCircle } from "lucide-react";

export default function PageEmojiPicker({ page }) {
    const handleUpdatePageEmoji = async (emoji) => {
        try {
            await dbService.updateMetaField({
                id: page.id,
                fieldName: 'emoji',
                newValue: emoji
            });
        } catch (error) {
            console.error('Failed to update page emoji:', error);
        }
    }

    const renderIcon = () => {
        if (page.emoji) {
            return page.emoji;
        } else if (page.type === 'whiteboard') {
            return <PanelsLeftBottom className="text-indigo-500" size={14} />;
        } else if (page.type === 'document') {
            return <FileText size={14} className="text-blue-500" />;
        }
    }

    return (
        <Popover className="relative">
            <PopoverButton className="h-6 w-6 flex items-center justify-center text-sm hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-md mx-1">
                {renderIcon()}
            </PopoverButton>
            <PopoverPanel
                portal={true}
                transition
                anchor="bottom start"
                className="text-sm absolute z-50 rounded-lg"
            >
                <EmojiPicker.Root className="isolate flex h-[368px] w-72 flex-col bg-white dark:bg-slate-900 "
                    onEmojiSelect={(emoji) => handleUpdatePageEmoji(emoji.emoji)}
                >
                    <div className="p-2 flex gap-1">
                        <EmojiPicker.Search className="baseInput"/>
                        <button onClick={() => handleUpdatePageEmoji(null)} className="rounded-lg duration-200 p-1 w-10 flex items-center justify-center bg-red-300/20 dark:bg-red-600/20 hover:bg-red-100 dark:hover:bg-red-800/50 text-red-600 dark:text-red-300">
                            <XCircle size={16} />
                        </button>
                    </div>
                    <EmojiPicker.Viewport className="relative flex-1 outline-hidden no-scrollbar">
                        <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm dark:text-neutral-500">
                            Loading…
                        </EmojiPicker.Loading>
                        <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm dark:text-neutral-500">
                            No emoji found.
                        </EmojiPicker.Empty>
                        <EmojiPicker.List
                            className="select-none pb-1.5"
                            components={{
                                CategoryHeader: ({ category, ...props }) => (
                                    <div
                                        className="px-3 pt-3 pb-1.5 font-medium text-neutral-600 text-xs bg-white dark:bg-slate-900 dark:text-neutral-400"
                                        {...props}
                                    >
                                        {category.label}
                                    </div>
                                ),
                                Row: ({ children, ...props }) => (
                                    <div className="scroll-my-1.5 px-1.5" {...props}>
                                        {children}
                                    </div>
                                ),
                                Emoji: ({ emoji, ...props }) => (
                                    <button
                                        className="flex size-8 items-center justify-center rounded-md text-lg data-[active]:bg-slate-100 dark:data-[active]:bg-slate-800"
                                        {...props}
                                    >
                                        {emoji.emoji}
                                    </button>
                                ),
                            }}
                        />
                    </EmojiPicker.Viewport>
                </EmojiPicker.Root>
            </PopoverPanel>
        </Popover>
    )
}