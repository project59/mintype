import { nanoid } from 'nanoid';
import { defaultBlockSchemas } from './constants.js';

export const createElementConfig = (type, options = {}) => {
    const { numElements, mini, scale } = options;

    switch (type) {
        case 'text':
        case 'textbox':
            return {
                id: nanoid(),
                type: 'dynamic',
                x: 0, // Will be set on click
                y: 0, // Will be set on click
                width: 180,
                zIndex: numElements + 1,
                content: [defaultBlockSchemas(type)]
            };
        case 'image':
            return {
                id: nanoid(),
                type: 'dynamic',
                x: 0, // Will be set on click
                y: 0, // Will be set on click
                width: 600,
                zIndex: numElements + 1,
                content: [defaultBlockSchemas(type)]
            };
        case 'video':
            return {
                id: nanoid(),
                type: 'dynamic',
                x: 0, // Will be set on click
                y: 0, // Will be set on click
                width: 600,
                zIndex: numElements + 1,
                content: [defaultBlockSchemas(type)]
            };
        case 'freehand':
            return {
                id: nanoid(),
                type: 'freehand',
                x: 0,
                y: 0,
                content: [],
                opacity: 1,
                zIndex: numElements + 1,
                strokeWidth: 5,
            };

        case 'shape':
            return {
                id: nanoid(),
                type: 'shape',
                x: mini ? 1000 : 5000,
                y: mini ? 1000 : 5000,
                width: 200,
                height: 150,
                zIndex: numElements + 1,
                shapeType: 'rectangle',
                backgroundColor: {r: 34, g: 197, b: 94, a: 0.3},
                backgroundPattern: 'solid',
                borderColor: {r: 20, g: 118, b: 56, a: 1},
                borderWidth: 1,
                borderRounding: 'sm',
                text: '',
                textAlign: 'center',
                textColor: {r: 20, g: 118, b: 56, a: 1},
                fontSize: 14,
            };
        case 'stickyNote':
            return {
                id: nanoid(),
                type: 'shape',
                x: mini ? 1000 : 5000,
                y: mini ? 1000 : 5000,
                width: 200,
                height: 200,
                zIndex: numElements + 1,
                shapeType: 'stickyNote',
                backgroundColor: {r: 248, g: 228, b: 92, a: 1},
                backgroundPattern: 'solid',
                borderColor: {r: 248, g: 228, b: 92, a: 1},
                borderWidth: 1,
                borderRounding: 'md',
                text: 'Hello!',
                textAlign: 'center',
                textColor: {r: 0, g: 0, b: 0, a: 1},
                fontSize: 14,
            };

        default:
            throw new Error(`Unknown element type: ${type}`);
    }
};

// Helper to determine if an element type needs placement mode
export const needsPlacement = (type) => {
    return ['text', 'textbox', 'image', 'shape', 'video', 'stickyNote'].includes(type);
};

// Helper to determine if an element type should activate a tool
export const getToolForElementType = (type) => {
    const toolMap = {
        'freehand': 'pen',
        'shape': 'shape',
        'stickyNote': 'shape',
    };
    return toolMap[type] || 'select';
};