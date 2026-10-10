import { useEffect, useState } from 'react';
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';
import { useTheme } from '../../utils/theme.js';
import { ReadOnlyMarkdownShapeUtil } from './markdownShape.jsx';
import { TLDRAW_LICENSE_KEY } from './tldrawLicense.js';

const shapeUtils = [ReadOnlyMarkdownShapeUtil];

// A pan-and-zoom view of a whiteboard snapshot. Nothing is persisted: tldraw keeps the
// snapshot in memory and read-only mode blocks edits.
export default function ReadOnlyWhiteboard({ snapshot, className = 'relative min-h-0 flex-1' }) {
    const [editor, setEditor] = useState(null);
    const theme = useTheme();

    useEffect(() => {
        editor?.setColorMode(theme);
    }, [editor, theme]);

    const handleMount = (mounted) => {
        mounted.updateInstanceState({ isReadonly: true });
        mounted.setColorMode(theme);
        mounted.zoomToFit();
        setEditor(mounted);
    };

    // tldraw's container sets no z-index, so its panels would otherwise stack above app UI.
    return (
        <div className={`isolate ${className}`}>
            <Tldraw licenseKey={TLDRAW_LICENSE_KEY} snapshot={snapshot} shapeUtils={shapeUtils} onMount={handleMount} />
        </div>
    );
}
