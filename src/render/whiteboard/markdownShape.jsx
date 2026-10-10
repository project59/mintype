import { BaseBoxShapeUtil, HTMLContainer, T, Vec } from 'tldraw';
import StaticMarkdownRenderer from '../shared/read-only/StaticMarkdownRenderer.jsx';
import { MARKDOWN_SHAPE_TYPE } from '../../utils/constants.js';

const MIN_WIDTH = 160;

// The Markdown object's schema, shared by the editable canvas and read-only viewers so both
// accept the same snapshots. Subclasses supply `component`.
export class MarkdownShapeUtilBase extends BaseBoxShapeUtil {
    static type = MARKDOWN_SHAPE_TYPE;
    static props = {
        w: T.number,
        h: T.number,
        markdown: T.string,
    };

    getDefaultProps() {
        return {
            w: 520,
            h: 360,
            markdown: '# Markdown object\n\nDouble-click to edit this TipTap-backed shape.',
        };
    }

    // The editable canvas sizes the height to the content, so resizing only changes the width,
    // keeping the edge opposite the dragged handle in place. Top and bottom handles do nothing.
    onResize(shape, { initialShape, handle, scaleX }) {
        const w = Math.max(MIN_WIDTH, initialShape.props.w * scaleX);
        const fromLeft = handle === 'left' || handle === 'top_left' || handle === 'bottom_left';
        const shift = Vec.FromAngle(initialShape.rotation).mul(fromLeft ? initialShape.props.w - w : 0);
        return { x: initialShape.x + shift.x, y: initialShape.y + shift.y, props: { w } };
    }

    getIndicatorPath(shape) {
        const path = new Path2D();
        path.rect(0, 0, shape.props.w, shape.props.h);
        return path;
    }
}

export const MarkdownShapeFrame = ({ interactive = false, children }) => (
    <HTMLContainer
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-black"
        style={{
            width: '100%',
            height: '100%',
            pointerEvents: interactive ? 'all' : 'none',
        }}
    >
        {children}
    </HTMLContainer>
);

// The body of both the static and the editing view. `contentRef` gets the element wrapping the
// Markdown, whose height is the content's: it is a flow root so the first and last blocks'
// margins stay inside it. With `autoHeight` the object is sized to that height, so the body
// never scrolls; otherwise (e.g. read-only viewers, which keep the stored height) it can.
export const MarkdownShapeBody = ({ children, contentRef, autoHeight = false, ...props }) => (
    <div className={`h-full p-4 ${autoHeight ? 'overflow-hidden' : 'overflow-auto'}`} {...props}>
        <div ref={contentRef} className="flow-root">
            {children}
        </div>
    </div>
);

export const StaticMarkdownShapeBody = ({ markdown, inWorkspace = false, contentRef, autoHeight }) => (
    <MarkdownShapeBody contentRef={contentRef} autoHeight={autoHeight}>
        <StaticMarkdownRenderer markdown={markdown} inWorkspace={inWorkspace} />
    </MarkdownShapeBody>
);

export class ReadOnlyMarkdownShapeUtil extends MarkdownShapeUtilBase {
    component(shape) {
        return (
            <MarkdownShapeFrame>
                <StaticMarkdownShapeBody markdown={shape.props.markdown} />
            </MarkdownShapeFrame>
        );
    }

    canEdit() {
        return false;
    }
}
