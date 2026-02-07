// Main plugin code - runs in the Figma sandbox
figma.showUI(__html__, { width: 600, height: 600 });
// Listen for messages from the UI
figma.ui.onmessage = async (msg) => {
    if (msg.type === 'apply-copy') {
        // Check if a text layer is selected
        const selection = figma.currentPage.selection;
        if (selection.length === 0) {
            figma.ui.postMessage({
                type: 'notification',
                message: 'No text layer selected. Text copied to clipboard instead.'
            });
            return;
        }
        let applied = false;
        for (const node of selection) {
            if (node.type === "TEXT") {
                try {
                    // Load the font before modifying the text
                    await figma.loadFontAsync(node.fontName);
                    node.characters = msg.text;
                    applied = true;
                }
                catch (error) {
                    console.error('Error applying text:', error);
                    figma.ui.postMessage({
                        type: 'notification',
                        message: 'Error applying text to layer'
                    });
                }
            }
        }
        if (applied) {
            figma.ui.postMessage({
                type: 'notification',
                message: 'Text applied to selected layer!'
            });
        }
        else {
            figma.ui.postMessage({
                type: 'notification',
                message: 'No text layer selected. Text copied to clipboard instead.'
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
        // Check if a text layer is selected
        const selection = figma.currentPage.selection;
        const hasTextSelection = selection.some(node => node.type === "TEXT");
        figma.ui.postMessage({
            type: 'selection-status',
            hasTextSelection: hasTextSelection
        });
    }
};
// Monitor selection changes
figma.on('selectionchange', () => {
    const selection = figma.currentPage.selection;
    const hasTextSelection = selection.some(node => node.type === "TEXT");
    figma.ui.postMessage({
        type: 'selection-status',
        hasTextSelection: hasTextSelection
    });
});