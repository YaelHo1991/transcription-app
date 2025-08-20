import TextEditorWrapper from './TextEditorWrapper';
import TextEditor from './TextEditor';
import VirtualizedTextEditor from './VirtualizedTextEditor';

// Export wrapper as default for automatic mode selection
export default TextEditorWrapper;

// Export individual components for direct use if needed
export { TextEditor, VirtualizedTextEditor };
export * from './types';