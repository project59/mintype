import { extractImageBlocks } from "./imageExtractor";
import { generateId } from "../NotionImporter";
import DOMPurify from 'dompurify';
import { extractCalloutBlock } from "./calloutExtractor";
import { extractCodeBlock } from "./codeExtractor";
import { transformNotionPageLinks } from "./tranformNotionLink";

export async function parseHtmlToBlocks(htmlContent, zipFile, useCustomBlocks = false, htmlFilePath = '', rootId) {
    if (!useCustomBlocks) {
        // Original behavior - just wrap everything in a text block
        return [{
            id: generateId(),
            type: "dynamic",
            x: 5000,
            y: 5000,
            width: 800,
            zIndex: 0,
            content: [{
                id: generateId(),
                type: 'text',
                data: { text: htmlContent }
            }],
            locked: false
        }];
    }

    // Parse HTML into segments with custom blocks
    const segments = await parseHtmlSegments(htmlContent, zipFile, htmlFilePath, rootId);
    console.log(segments)

    // Convert segments to elements
    return segments;
}

async function parseHtmlSegments(htmlContent, zipFile, htmlFilePath, rootId) {
    const segments = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    //html content has a header, and a div. we want to pull the header as the first segment
    const header = doc.querySelector('h1');
    if (header) {
        segments.push({
            id: generateId(),
            type: 'text',
            data: { text: cleanHtml(header.outerHTML) }
        });
    }

    const bodyMatch = htmlContent.match(/<div class="page-body"[^>]*>([\s\S]*)<\/div>/i);
    const bodyContent = bodyMatch ? bodyMatch[1].trim() : htmlContent.trim();
    const divParse = parser.parseFromString(bodyContent, 'text/html');

    // console.log(bodyContent)

    // Get all child nodes from the bodyContent
    const bodyNodes = Array.from(divParse.body.childNodes);

    let currentTextContent = '';
    // console.log(bodyNodes)
    for (const node of bodyNodes) {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'FIGURE') {
            // Check if it's a callout block first
            if (node.classList.contains('callout')) {
                console.log("found callout");

                // Save any accumulated text content before the callout
                if (currentTextContent.trim()) {
                    // Transform page links before saving
                    const transformedContent = transformNotionPageLinks(currentTextContent.trim(), rootId);
                    segments.push({
                        id: generateId(),
                        type: 'text',
                        data: { text: transformedContent }
                    });
                    currentTextContent = '';
                }

                // Extract callout block
                const calloutBlock = extractCalloutBlock(node);
                if (calloutBlock) {
                    segments.push(calloutBlock);
                }
            } else {
                // Check for image blocks
                const imgElement = node.querySelector('img');
                if (imgElement) {
                    // Save any accumulated text content before the image
                    if (currentTextContent.trim()) {
                        const transformedContent = transformNotionPageLinks(currentTextContent.trim(), rootId);
                        segments.push({
                            id: generateId(),
                            type: 'text',
                            data: { text: transformedContent }
                        });
                        currentTextContent = '';
                    }

                    // Extract image block
                    const imageBlock = await extractImageBlocks(node, zipFile, htmlFilePath);
                    if (imageBlock) {
                        segments.push(imageBlock);
                    }
                } else {
                    // Non-image, non-callout figure, treat as text
                    currentTextContent += node.outerHTML;
                }
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'PRE') {
            console.log("found code block");

            // Save any accumulated text content before the code block
            if (currentTextContent.trim()) {
                const transformedContent = transformNotionPageLinks(currentTextContent.trim(), rootId);
                segments.push({
                    id: generateId(),
                    type: 'text',
                    data: { text: transformedContent }
                });
                currentTextContent = '';
            }

            // Extract code block
            const codeBlock = extractCodeBlock(node);
            if (codeBlock) {
                segments.push(codeBlock);
            }
        } else {
            if (node.nodeType === Node.TEXT_NODE) {
                currentTextContent += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // Clean the HTML before adding it
                const cleanedHtml = cleanHtml(node.outerHTML);
                currentTextContent += cleanedHtml;
            }
        }
    }

    // Add any remaining text content
    if (currentTextContent.trim()) {
        const transformedContent = transformNotionPageLinks(currentTextContent.trim(), rootId);
        segments.push({
            id: generateId(),
            type: 'text',
            data: { text: transformedContent }
        });
    }

    // Clean up text segments once more
    segments.forEach(segment => {
        if (segment.type === 'text') {
            segment.data.text = cleanHtml(segment.data.text);
        }
    })

    return segments.length > 0 ? segments : [{
        id: generateId(),
        type: 'text',
        data: { text: htmlContent }
    }];
}

export function cleanHtml(htmlString) {
    return DOMPurify.sanitize(htmlString, {
        // Remove all attributes except essential ones
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
        // Keep all safe HTML tags
        ALLOWED_TAGS: ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'strong', 'em', 'u', 'br', 'hr',
            'blockquote', 'code', 'pre', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
        
        KEEP_CONTENT: true,
        // Return clean HTML string
        RETURN_DOM: false
    });
}