// Main plugin code - runs in the Figma sandbox
figma.showUI(__html__, { width: 600, height: 600 });

// Store the currently selected text node
let selectedTextNode = null;

// Function to get text from selected layer (handles mixed styles)
function getSelectedText() {
    const selection = figma.currentPage.selection;
    
    for (const node of selection) {
        if (node.type === "TEXT") {
            selectedTextNode = node;
            // Return full characters — preserves numbers, special chars, line breaks
            return node.characters;
        }
    }
    
    selectedTextNode = null;
    return null;
}

// Send initial selection status on load
const initialText = getSelectedText();
figma.ui.postMessage({
    type: 'selection-changed',
    hasTextSelection: initialText !== null,
    textContent: initialText || ''
});

// Listen for messages from the UI
figma.ui.onmessage = async (msg) => {
    if (msg.type === 'apply-copy') {
        if (!selectedTextNode) {
            figma.ui.postMessage({
                type: 'notification',
                message: 'No text layer selected. Please select a text layer first.'
            });
            return;
        }

        try {
            const fontName = selectedTextNode.fontName;
            
            if (fontName === figma.mixed) {
                // Mixed fonts — load all unique fonts used in the layer
                const len = selectedTextNode.characters.length;
                const fonts = new Set();
                
                for (let i = 0; i < len; i++) {
                    const font = selectedTextNode.getRangeFontName(i, i + 1);
                    fonts.add(JSON.stringify(font));
                }
                
                for (const fontStr of fonts) {
                    await figma.loadFontAsync(JSON.parse(fontStr));
                }
            } else {
                await figma.loadFontAsync(fontName);
            }
            
            selectedTextNode.characters = msg.text;
            
            figma.ui.postMessage({
                type: 'notification',
                message: '✓ Text applied!'
            });
        } catch (error) {
            console.error('Error applying text:', error);
            figma.ui.postMessage({
                type: 'notification',
                message: 'Error: ' + error.message
            });
        }
    }

    if (msg.type === 'save-api-key') {
        await figma.clientStorage.setAsync('GROQ_API_KEY', msg.apiKey);
        figma.ui.postMessage({ type: 'api-key-saved', success: true });
    }

    if (msg.type === 'get-api-key') {
        const apiKey = await figma.clientStorage.getAsync('GROQ_API_KEY');
        figma.ui.postMessage({ type: 'api-key-loaded', apiKey: apiKey || '' });
    }

    if (msg.type === 'check-selection') {
        const textContent = getSelectedText();
        figma.ui.postMessage({
            type: 'selection-changed',
            hasTextSelection: textContent !== null,
            textContent: textContent || ''
        });
    }
};

// Monitor selection changes in real-time
figma.on('selectionchange', () => {
    const textContent = getSelectedText();
    figma.ui.postMessage({
        type: 'selection-changed',
        hasTextSelection: textContent !== null,
        textContent: textContent || ''
    });
});