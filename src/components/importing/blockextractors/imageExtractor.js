import { generateId } from '../NotionImporter';

export async function extractImageBlocks(figureElement, zipFile, htmlFilePath) {
    const imgElement = figureElement.querySelector('img');
    if (!imgElement) return null;

    const src = imgElement.getAttribute('src');
    // Properly decode the entire URL
    const decodedSrc = decodeURIComponent(src);
    

    // the image file name is after the / of the src
    const imageName = decodedSrc.split('/').pop();

    //replace the '.html' at the end of htmlFilePath with the image name
    const finalPath = htmlFilePath.replace('.html', '/' + imageName);
    const width = extractWidth(imgElement);

    if (!src) return null;

    try {
        const imageData = await extractImageFromZip(finalPath, zipFile);

        return {
            id: generateId(),
            type: 'image',
            data: {
                imageSource: imageData.base64,
                sourceType: 'file',
                fileName: imageData.fileName,
                width: width,
                justify: 'center'
            }
        };
    } catch (error) {
        console.warn(`Failed to extract image: ${finalPath}`, htmlFilePath, error);
        // Fallback - return as text block
        return {
            id: generateId(),
            type: 'text',
            data: { text: figureElement.outerHTML }
        };
    }
}

function extractWidth(imgElement) {
    // Try to get width from style attribute
    const style = imgElement.getAttribute('style');
    if (style) {
        const widthMatch = style.match(/width:\s*(\d+)px/);
        if (widthMatch) {
            return widthMatch[1];
        }
    }

    // Try to get width attribute
    const widthAttr = imgElement.getAttribute('width');
    if (widthAttr) {
        return widthAttr;
    }

    // Default width
    return '600';
}

async function extractImageFromZip(imagePath, zipFile) {
    const JSZip = await import('jszip');
    const zip = await JSZip.default.loadAsync(zipFile);

    // Decode the URL-encoded path
    const decodedPath = decodeURIComponent(imagePath);

    // Try to find the image file in the zip
    const imageFile = zip.file(decodedPath);

    if (!imageFile) {
        throw new Error(`Image file not found: ${decodedPath}`);
    }

    // Get the image as base64
    const imageData = await imageFile.async('base64');
    const fileName = decodedPath.split('/').pop();

    // Determine the MIME type based on file extension
    const extension = fileName.split('.').pop().toLowerCase();
    const mimeType = getMimeType(extension);

    return {
        base64: `data:${mimeType};base64,${imageData}`,
        fileName: fileName
    };
}

function getMimeType(extension) {
    const mimeTypes = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp'
    };

    return mimeTypes[extension] || 'image/png';
}