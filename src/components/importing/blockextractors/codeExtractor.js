import { nanoid } from "nanoid";

export function extractCodeBlock(preNode) {
    // Check if this is actually a code block (pre element with code child)
    const codeElement = preNode.querySelector('code');
    if (!codeElement) {
        return null;
    }

    // Extract the code content
    const code = codeElement.textContent || codeElement.innerText || '';

    return {
        id: nanoid(), // Using nanoId as shown in your example
        type: 'code',
        data: {
            language: 'js',
            code: code
        }
    };
}