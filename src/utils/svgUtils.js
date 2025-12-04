import getStroke from "perfect-freehand";
import { getSvgPathFromStroke } from "./converters";

const strokeOptions = {
    size: 3,
    thinning: 0,
    smoothing: 0,
    streamline: 0,
    easing: (t) => t,
    start: {
        taper: 0,
        easing: (t) => t,
        cap: true
    },
};

function exportToSVG(strokes, options = {}) {
    const {
        padding = 4,
    } = options;

    // Calculate bounds to fit the drawing
    const bounds = calculateBounds(strokes, padding);

    // Use calculated bounds for tight fit
    const svgWidth = bounds.width;
    const svgHeight = bounds.height;
    const offsetX = bounds.minX - padding;
    const offsetY = bounds.minY - padding;

    // Start building the SVG (no background rect)
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
`;

    // Convert each stroke to SVG path
    strokes.forEach(stroke => {
        // Adjust points: subtract 5000 and apply offset for positioning
        const adjustedPoints = stroke.points.map(point => [
            point[0] - 5000 - offsetX,
            point[1] - 5000 - offsetY,
            point[2]
        ]);

        const pathData = getSvgPathFromStroke(getStroke(adjustedPoints, strokeOptions));
        svgContent += `  <path d="${pathData}" fill="${stroke.color}"/>\n`;
    });

    svgContent += '</svg>';
    return svgContent;
}

function downloadPNG(svgContent, filename = 'drawing.png', scale = 2) {
    // Create an image element
    const img = new Image();

    // Create a blob from the SVG content
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = function () {
        // Create a canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');

        // Scale for better quality
        ctx.scale(scale, scale);

        // Draw the image onto the canvas
        ctx.drawImage(img, 0, 0);

        // Convert canvas to PNG and download
        canvas.toBlob(function (blob) {
            const pngUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up
            URL.revokeObjectURL(pngUrl);
            URL.revokeObjectURL(url);
        }, 'image/png');
    };

    img.src = url;
}

function calculateBounds(strokes, padding = 20) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    strokes.forEach(stroke => {
        // Iterate through points - they're in [x, y, pressure] format
        stroke.points.forEach(point => {
            // Subtract 5000 to get actual coordinates
            const x = point[0] - 5000;
            const y = point[1] - 5000;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });
    });

    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX + (padding * 2),
        height: maxY - minY + (padding * 2)
    };
}

function downloadSVG(svgContent, filename = 'drawing.svg') {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL
    URL.revokeObjectURL(url);
}

// Usage example:
export function handleExportToSvg(strokes, format = 'svg') {
    const svgContent = exportToSVG(strokes, {
        padding: 4,
    });

    if (format === 'png') {
        downloadPNG(svgContent, 'my-drawing.png', 2); // scale=2 for better quality
    } else {
        downloadSVG(svgContent, 'my-drawing.svg');
    }
}