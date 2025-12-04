import { nanoid } from "nanoid";

export function extractCalloutBlock(figureNode) {
    // Check if this is actually a callout block
    if (!figureNode.classList.contains('callout')) {
        return null;
    }

    let emoji = '';
    let content = '';

    // Find the icon/emoji
    const iconSpan = figureNode.querySelector('.icon');
    if (iconSpan) {
        emoji = iconSpan.textContent.trim();
    }

    // Find the content div (the second div that contains the actual content)
    const contentDiv = figureNode.querySelector('div[style*="width:100%"]');
    if (contentDiv) {
        // Extract all text content from paragraphs and other elements within the content div
        const paragraphs = contentDiv.querySelectorAll('p');
        if (paragraphs.length > 0) {
            // Join all paragraph text with newlines if there are multiple paragraphs
            content = Array.from(paragraphs)
                .map(p => p.textContent.trim())
                .filter(text => text.length > 0)
                .join('\n');
        } else {
            // Fallback: get all text content from the content div
            content = contentDiv.textContent.trim();
        }
    }

    return {
        id: nanoid(),
        type: 'callout',
        data: {
            emoji: emoji,
            content: content
        }
    };
}