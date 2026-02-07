// Main plugin code - runs in the Figma sandbox
figma.showUI(__html__, { width: 600, height: 600 });

// Store the currently selected text node
let selectedTextNode = null;

// Function to get text from selected layer
function getSelectedText() {
    const selection = figma.currentPage.selection;
    
    // Find the first text layer in selection
    for (const node of selection) {
        if (node.type === "TEXT") {
            selectedTextNode = node; // Store reference
            return node.characters;
        }
    }
    
    selectedTextNode = null; // Clear if no text layer
    return null;
}

// Send initial selection status and text on load
const initialText = getSelectedText();
figma.ui.postMessage({
    type: 'selection-changed',
    hasTextSelection: initialText !== null,
    textContent: initialText || ''
});

// Listen for messages from the UI
figma.ui.onmessage = async (msg) => {
    if (msg.type === 'apply-copy') {
        // Use the stored text node instead of current selection
        if (!selectedTextNode) {
            figma.ui.postMessage({
                type: 'notification',
                message: 'No text layer selected. Please select a text layer first.'
            });
            return;
        }

        try {
            // Handle mixed fonts by loading all unique fonts
            const fontName = selectedTextNode.fontName;
            
            if (fontName === figma.mixed) {
                // Text has mixed fonts - load all unique fonts used
                const len = selectedTextNode.characters.length;
                const fonts = new Set();
                
                for (let i = 0; i < len; i++) {
                    const font = selectedTextNode.getRangeFontName(i, i + 1);
                    fonts.add(JSON.stringify(font));
                }
                
                // Load all unique fonts
                for (const fontStr of fonts) {
                    await figma.loadFontAsync(JSON.parse(fontStr));
                }
            } else {
                // Single font - load it
                await figma.loadFontAsync(fontName);
            }
            
            // Apply the new text
            selectedTextNode.characters = msg.text;
            
            figma.ui.postMessage({
                type: 'notification',
                message: '✓ Text applied!'
            });
        }
        catch (error) {
            console.error('Error applying text:', error);
            figma.ui.postMessage({
                type: 'notification',
                message: 'Error: ' + error.message
            });
        }
    }
    if (msg.type === 'save-api-key') {
        // Store the API key in Figma's client storage
        await figma.clientStorage.setAsync('GROQ_API_KEY', msg.apiKey);
        figma.ui.postMessage({
            type: 'api-key-saved',
            success: true
        });
    }
    if (msg.type === 'get-api-key') {
        // Retrieve the stored API key
        const apiKey = await figma.clientStorage.getAsync('GROQ_API_KEY');
        figma.ui.postMessage({
            type: 'api-key-loaded',
            apiKey: apiKey || ''
        });
    }
    if (msg.type === 'check-selection') {
        // Check if a text layer is selected and send its content
        const textContent = getSelectedText();
        figma.ui.postMessage({
            type: 'selection-changed',
            hasTextSelection: textContent !== null,
            textContent: textContent || ''
        });
    }
};

// Monitor selection changes
figma.on('selectionchange', () => {
    const textContent = getSelectedText();
    figma.ui.postMessage({
        type: 'selection-changed',
        hasTextSelection: textContent !== null,
        textContent: textContent || ''
    });
});