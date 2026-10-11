import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor as useTiptapEditor } from '@tiptap/react';
import { LayoutTemplate } from 'lucide-react';
import {
    ArrowDownToolbarItem,
    ArrowLeftToolbarItem,
    ArrowRightToolbarItem,
    ArrowToolbarItem,
    ArrowUpToolbarItem,
    AssetToolbarItem,
    CheckBoxToolbarItem,
    CloudToolbarItem,
    DefaultToolbar,
    DiamondToolbarItem,
    DrawToolbarItem,
    EllipseToolbarItem,
    EraserToolbarItem,
    FrameToolbarItem,
    HandToolbarItem,
    HeartToolbarItem,
    HexagonToolbarItem,
    HighlightToolbarItem,
    LaserToolbarItem,
    LineToolbarItem,
    NoteToolbarItem,
    OvalToolbarItem,
    RectangleToolbarItem,
    RhombusToolbarItem,
    SelectToolbarItem,
    StarToolbarItem,
    TextToolbarItem,
    Tldraw,
    ToolbarItem,
    TriangleToolbarItem,
    XBoxToolbarItem,
    toRichText,
    useEditor as useTldrawEditor,
    useValue,
} from 'tldraw';
import 'tldraw/tldraw.css';
import { useEditorContext } from '../editor/EditorContext.jsx';
import { buildExtensions } from '../editor/extensions.js';
import { ExternalToolbar } from '../editor/EditorToolbar.jsx';
import LinkPopover from '../editor/LinkPopover.jsx';
import { MarkdownShapeBody, MarkdownShapeFrame, MarkdownShapeUtilBase, StaticMarkdownShapeBody } from './markdownShape.jsx';
import { TLDRAW_LICENSE_KEY } from './tldrawLicense.js';
import { MARKDOWN_SHAPE_TYPE } from '../../utils/constants.js';
import { useTheme } from '../../utils/theme.js';

const MAX_ASSET_SIZE = 5 * 1024 * 1024;

class MarkdownShapeUtil extends MarkdownShapeUtilBase {
    component(shape) {
        return <MarkdownShapeView shape={shape} />;
    }

    canEdit() {
        return true;
    }
}

const shapeUtils = [MarkdownShapeUtil];

const MARKDOWN_TOOL_ID = 'markdown';

// The Markdown tool places a new object in the middle of the viewport rather than
// switching to a placement tool, so it never shows as the active tool.
const uiOverrides = {
    tools(editor, tools) {
        return {
            ...tools,
            [MARKDOWN_TOOL_ID]: {
                id: MARKDOWN_TOOL_ID,
                label: 'tool.markdown',
                icon: <LayoutTemplate size={18} />,
                kbd: 'm',
                onSelect: () => {
                    const center = editor.getViewportPageBounds().center;
                    editor.markHistoryStoppingPoint('create markdown object');
                    editor.createShape({
                        type: MARKDOWN_SHAPE_TYPE,
                        x: center.x - 260,
                        y: center.y - 180,
                        props: {
                            w: 520,
                            h: 360,
                            markdown: '# New Markdown object\n\nDouble-click to edit.',
                        },
                    });
                },
            },
        };
    },
    translations: { en: { 'tool.markdown': 'Markdown object' } },
};

// While a Markdown object is being edited the canvas tools don't apply, so the text toolbar
// takes their place. Otherwise this is tldraw's default toolbar order, with the Markdown object
// in the arrow's place so it stays among the tools shown on mobile.
const MintypeToolbar = () => {
    const editor = useTldrawEditor();
    const isEditingMarkdown = useValue(
        'is editing Markdown object',
        () => editor.getEditingShape()?.type === MARKDOWN_SHAPE_TYPE,
        [editor],
    );

    if (isEditingMarkdown) {
        return (
            <div className="pointer-events-auto w-full pb-[env(safe-area-inset-bottom)] md:w-fit md:pb-2">
                <div className="flex h-12 items-center justify-center bg-slate-200/80 backdrop-blur-sm dark:bg-[#2d2e3b]/80 md:rounded-full">
                    <ExternalToolbar />
                </div>
            </div>
        );
    }

    return (
        <DefaultToolbar>
            <SelectToolbarItem />
            <HandToolbarItem />
            <DrawToolbarItem />
            <EraserToolbarItem />
            <ToolbarItem tool={MARKDOWN_TOOL_ID} />
            <TextToolbarItem />
            <NoteToolbarItem />
            <ArrowToolbarItem />
            <AssetToolbarItem />
            <RectangleToolbarItem />
            <EllipseToolbarItem />
            <TriangleToolbarItem />
            <DiamondToolbarItem />
            <HexagonToolbarItem />
            <OvalToolbarItem />
            <RhombusToolbarItem />
            <StarToolbarItem />
            <CloudToolbarItem />
            <HeartToolbarItem />
            <XBoxToolbarItem />
            <CheckBoxToolbarItem />
            <ArrowLeftToolbarItem />
            <ArrowUpToolbarItem />
            <ArrowDownToolbarItem />
            <ArrowRightToolbarItem />
            <LineToolbarItem />
            <HighlightToolbarItem />
            <LaserToolbarItem />
            <FrameToolbarItem />
        </DefaultToolbar>
    );
};

const uiComponents = { Toolbar: MintypeToolbar };

const MarkdownShapeView = ({ shape }) => {
    const tldrawEditor = useTldrawEditor();
    const [isEditing, setIsEditing] = useState(false);
    const editHistoryMarkRef = useRef(null);

    useEffect(() => {
        const updateEditingState = () => {
            const next = tldrawEditor.getEditingShapeId() === shape.id;
            setIsEditing((current) => current === next ? current : next);

            if (next && !editHistoryMarkRef.current) {
                editHistoryMarkRef.current = tldrawEditor.markHistoryStoppingPoint('markdown-shape-edit');
            } else if (!next && editHistoryMarkRef.current) {
                tldrawEditor.squashToMark(editHistoryMarkRef.current);
                editHistoryMarkRef.current = null;
            }
        };

        updateEditingState();
        const stopListening = tldrawEditor.store.listen(updateEditingState, { scope: 'session' });
        return () => {
            stopListening();
            if (editHistoryMarkRef.current) {
                tldrawEditor.squashToMark(editHistoryMarkRef.current);
                editHistoryMarkRef.current = null;
            }
        };
    }, [shape.id, tldrawEditor]);

    const contentRef = useAutoHeight(shape, tldrawEditor, isEditing);

    return (
        <MarkdownShapeFrame interactive={isEditing}>
            {isEditing ? (
                <MarkdownShapeEditor shape={shape} tldrawEditor={tldrawEditor} contentRef={contentRef} />
            ) : (
                <StaticMarkdownShapeBody markdown={shape.props.markdown} inWorkspace contentRef={contentRef} autoHeight />
            )}
        </MarkdownShapeFrame>
    );
};

// Keeps the object's height equal to its content's, in both views. The height follows from
// the content and width, so it's set outside the undo history: undoing an edit or a resize
// restores those, and the height follows again. It is also reapplied when the stored height
// changes on its own (e.g. undoing a deletion, or sync), since the content then keeps its size.
const useAutoHeight = (shape, tldrawEditor, isEditing) => {
    const contentRef = useRef(null);
    const fittedHeightRef = useRef(null);
    const { id: shapeId, props: { h: storedHeight } } = shape;

    const applyHeight = useCallback(() => {
        const h = fittedHeightRef.current;
        if (!h || tldrawEditor.getShape(shapeId)?.props.h === h) return;
        tldrawEditor.run(() => {
            tldrawEditor.updateShape({ id: shapeId, type: MARKDOWN_SHAPE_TYPE, props: { h } });
        }, { history: 'ignore' });
    }, [shapeId, tldrawEditor]);

    useEffect(() => {
        const content = contentRef.current;
        if (!content) return undefined;
        const body = content.parentElement;
        const frame = body.parentElement;

        const observer = new ResizeObserver(([entry]) => {
            // Shapes outside the viewport are hidden and measure 0.
            const contentHeight = entry.borderBoxSize[0].blockSize;
            if (!contentHeight) return;
            const bodyStyle = getComputedStyle(body);
            const frameStyle = getComputedStyle(frame);
            fittedHeightRef.current = Math.ceil(
                contentHeight
                + parseFloat(bodyStyle.paddingTop) + parseFloat(bodyStyle.paddingBottom)
                + parseFloat(frameStyle.borderTopWidth) + parseFloat(frameStyle.borderBottomWidth),
            );
            applyHeight();
        });
        observer.observe(content);
        return () => observer.disconnect();
    }, [applyHeight, isEditing]);

    useEffect(applyHeight, [applyHeight, storedHeight]);

    return contentRef;
};

const MarkdownShapeEditor = ({ shape, tldrawEditor, contentRef }) => {
    const extensions = useMemo(() => buildExtensions({ placeholder: 'Write in Markdown...', slashCommands: false }), []);
    const shapeRef = useRef(shape);
    const { setActiveEditor } = useEditorContext();
    shapeRef.current = shape;

    const onUpdate = useCallback(({ editor }) => {
        const markdown = editor.getMarkdown();
        if (markdown === shapeRef.current.props.markdown) return;

        tldrawEditor.updateShape({
            id: shapeRef.current.id,
            type: MARKDOWN_SHAPE_TYPE,
            props: { markdown },
        });
    }, [tldrawEditor]);

    const editor = useTiptapEditor({
        extensions,
        content: shape.props.markdown,
        contentType: 'markdown',
        autofocus: true,
        onUpdate,
        editorProps: {
            attributes: {
                class: 'tiptap min-h-full outline-none',
                spellcheck: 'true',
            },
        },
    });

    useEffect(() => {
        if (!editor) return undefined;
        setActiveEditor(editor);
        return () => setActiveEditor(null);
    }, [editor, setActiveEditor]);

    useEffect(() => {
        if (!editor || editor.getMarkdown() === shape.props.markdown) return;
        editor.commands.setContent(shape.props.markdown || '', { contentType: 'markdown', emitUpdate: false });
    }, [editor, shape.props.markdown]);

    // Menus and sheets opened from the editor are portaled out of the canvas in the DOM, but React
    // still bubbles their events through it. tldraw's canvas cancels touchstart/touchend, which
    // stops a tap from becoming a click, so their touches must not reach it.
    const stopPortaledTouch = (event) => {
        if (!event.currentTarget.contains(event.target)) event.stopPropagation();
    };

    return (
        <MarkdownShapeBody
            contentRef={contentRef}
            autoHeight
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={stopPortaledTouch}
            onTouchEnd={stopPortaledTouch}
            onKeyDownCapture={(event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    tldrawEditor.setEditingShape(null);
                }
            }}
        >
            <LinkPopover editor={editor}>
                <EditorContent editor={editor} />
            </LinkPopover>
        </MarkdownShapeBody>
    );
};

export default function TldrawCanvas({ snapshot, onMount, seedInitialScene = false, className = 'relative min-h-0 flex-1' }) {
    const didSeedRef = useRef(false);
    const [canvasEditor, setCanvasEditor] = useState(null);
    const theme = useTheme();

    // Follow the app theme. Changing tldraw's colorScheme prop would recreate the editor,
    // so the mode is set on the live editor instead.
    useEffect(() => {
        canvasEditor?.setColorMode(theme);
    }, [canvasEditor, theme]);

    const handleMount = (editor) => {
        editor.setColorMode(theme);
        setCanvasEditor(editor);
        onMount?.(editor);
        if (seedInitialScene && !snapshot && !didSeedRef.current) {
            didSeedRef.current = true;
            const center = editor.getViewportPageBounds().center;
            editor.createShape({
                type: 'note',
                x: center.x - 360,
                y: center.y - 140,
                props: { richText: toRichText('A sticky note') },
            });
            editor.createShape({
                type: MARKDOWN_SHAPE_TYPE,
                x: center.x - 70,
                y: center.y - 180,
                props: {
                    w: 520,
                    h: 360,
                    markdown: '# TipTap / Markdown\n\nDouble-click to edit.\n\n- Rich text lives in a real TipTap editor\n- The scene is saved in Mintype encrypted storage',
                },
            });
        }
    };

    // tldraw's container sets no z-index, so its toolbar and panels (z-index 300) would
    // otherwise stack above app dialogs and their backdrops.
    return (
        <div className={`isolate ${className}`}>
            <Tldraw
                licenseKey={TLDRAW_LICENSE_KEY}
                snapshot={snapshot || undefined}
                shapeUtils={shapeUtils}
                maxAssetSize={MAX_ASSET_SIZE}
                overrides={uiOverrides}
                components={uiComponents}
                onMount={handleMount}
            />
        </div>
    );
}
