import TextEditorWrapper from './TextEditorWrapper';
import TextEditor from './TextEditor';
import SlidingWindowTextEditor from './SlidingWindowTextEditor';

// Export wrapper as default for automatic mode selection
export default TextEditorWrapper;

// Export individual components for direct use if needed
export { TextEditor, SlidingWindowTextEditor };
export * from './types';