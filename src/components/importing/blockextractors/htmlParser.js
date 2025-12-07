import { extractImageBlocks } from "./imageExtractor";
import DOMPurify from 'dompurify';
import { extractCalloutBlock } from "./calloutExtractor";
import { extractCodeBlock } from "./codeExtractor";
import { transformNotionPageLinks } from "./tranformNotionLink";
import { nanoid } from "nanoid";

export async function parseHtmlToBlocks(htmlContent, zipFile, useCustomBlocks = false, htmlFilePath = '', rootId) {
    if (!useCustomBlocks) {
        // Original behavior - just wrap everything in a text block
        return [{
            id: nanoid(),
            type: "dynamic",
            x: 5000,
            y: 5000,
            width: 600,
            zIndex: 0,
            content: [{
                id: nanoid(),
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

    // Extract header
    const header = doc.querySelector('h1');
    if (header) {
        segments.push({
            id: nanoid(),
            type: 'text',
            data: { text: cleanHtml(header.outerHTML) }
        });
    }

    const bodyMatch = htmlContent.match(/<div class="page-body"[^>]*>([\s\S]*)<\/div>/i);
    const bodyContent = bodyMatch ? bodyMatch[1].trim() : htmlContent.trim();
    const divParse = parser.parseFromString(bodyContent, 'text/html');

    const bodyNodes = Array.from(divParse.body.childNodes);
    let currentTextContent = '';

    for (const node of bodyNodes) {
        // Helper function to get the actual content node (unwrap display:contents divs), fk off notion they keep changing their export format
        const getContentNode = (node) => {
            if (node.nodeType === Node.ELEMENT_NODE &&
                node.tagName === 'DIV' &&
                node.style.display === 'contents') {
                // Return the first child element if it exists
                const childElement = Array.from(node.childNodes).find(
                    child => child.nodeType === Node.ELEMENT_NODE
                );
                return childElement || node;
            }
            return node;
        };

        const contentNode = getContentNode(node);

        if (contentNode.nodeType === Node.ELEMENT_NODE && contentNode.tagName === 'FIGURE') {
            // Check if it's a callout block first
            if (contentNode.classList.contains('callout')) {
                console.log("found callout");
                // Save any accumulated text content before the callout
                if (currentTextContent.trim()) {
                    const transformedContent = transformNotionPageLinks(currentTextContent.trim(), rootId);
                    segments.push({
                        id: nanoid(),
                        type: 'text',
                        data: { text: transformedContent }
                    });
                    currentTextContent = '';
                }

                // Extract callout block
                const calloutBlock = extractCalloutBlock(contentNode);
                if (calloutBlock) {
                    segments.push(calloutBlock);
                }
            } else {
                // Check for image blocks
                const imgElement = contentNode.querySelector('img');
                console.log('image found');
                if (imgElement) {
                    // Save any accumulated text content before the image
                    if (currentTextContent.trim()) {
                        const transformedContent = transformNotionPageLinks(currentTextContent.trim(), rootId);
                        segments.push({
                            id: nanoid(),
                            type: 'text',
                            data: { text: transformedContent }
                        });
                        currentTextContent = '';
                    }

                    // Extract image block
                    const imageBlock = await extractImageBlocks(contentNode, zipFile, htmlFilePath);
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
                    id: nanoid(),
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
            id: nanoid(),
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
        id: nanoid(),
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