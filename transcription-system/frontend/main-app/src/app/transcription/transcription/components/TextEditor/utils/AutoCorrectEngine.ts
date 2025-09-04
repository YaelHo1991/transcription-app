import { AutoCorrectSettings } from '../components/AutoCorrectModal';

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  correctedText?: string;
}

export class AutoCorrectEngine {
  private settings: AutoCorrectSettings;

  constructor(settings: AutoCorrectSettings) {
    this.settings = settings;
  }

  updateSettings(settings: AutoCorrectSettings) {
    this.settings = settings;
  }

  // Check if trying to create duplicate speaker block
  validateDuplicateSpeaker(currentSpeaker: string, previousSpeaker: string): ValidationResult {
    if (this.settings.blockDuplicateSpeakers === 'disabled') {
      return { isValid: true };
    }

    if (currentSpeaker && previousSpeaker && currentSpeaker === previousSpeaker) {
      const mode = this.settings.blockDuplicateSpeakersMode || 'block';
      const isBlocking = mode === 'block';
      return {
        isValid: !isBlocking,
        message: 'לא ניתן ליצור בלוק עם אותו דובר ברצף'
      };
    }

    return { isValid: true };
  }

  // Check if text ends with proper punctuation before creating new block
  validatePunctuation(text: string): ValidationResult {
    if (this.settings.requirePunctuation === 'disabled' || !text.trim()) {
      return { isValid: true };
    }

    const trimmedText = text.trim();
    
    // Map of keys to actual punctuation symbols
    const punctMap: { [key: string]: string } = {
      period: '.',
      comma: ',',
      semicolon: ';',
      colon: ':',
      question: '?',
      exclamation: '!',
      dash: '-',
      ellipsis: '…',
      hebrewQuote: '״',
      englishQuote: '"',
      parenthesisClose: ')',
      bracketClose: ']',
      curlyClose: '}'
    };
    
    // Get valid endings from validEndingPunctuation settings
    const validEndings: string[] = [];
    
    // Check each punctuation mark from validEndingPunctuation
    if (this.settings.validEndingPunctuation) {
      Object.entries(this.settings.validEndingPunctuation).forEach(([key, enabled]) => {
        if (enabled && punctMap[key]) {
          validEndings.push(punctMap[key]);
        }
      });
    }
    
    // Check if the text ends with a valid punctuation mark
    const hasValidEnding = validEndings.some(punct => trimmedText.endsWith(punct));
    
    // If text doesn't end with valid punctuation, check the setting
    if (!hasValidEnding) {
      const mode = this.settings.requirePunctuationMode || 'block';
      const isBlocking = mode === 'block';
      return {
        isValid: !isBlocking,
        message: 'יש לסיים את המשפט בסימן פיסוק'
      };
    }

    return { isValid: true };
  }

  // Prevent double spaces
  preventDoubleSpace(text: string): ValidationResult {
    if (this.settings.preventDoubleSpace === 'disabled') {
      return { isValid: true, correctedText: text };
    }

    // Check if there are multiple spaces
    const hasDoubleSpaces = /\s{2,}/.test(text);
    
    if (hasDoubleSpaces) {
      const mode = this.settings.preventDoubleSpaceMode || 'block';
      // If in block mode, auto-correct
      if (mode === 'block') {
        const corrected = text.replace(/\s{2,}/g, ' ');
        return {
          isValid: true,
          correctedText: corrected
        };
      }
      // For notify mode, return original text with message
      return {
        isValid: true,
        correctedText: text,
        message: 'נמצאו רווחים כפולים'
      };
    }
    
    return {
      isValid: true,
      correctedText: text
    };
  }

  // Fix space before punctuation
  fixSpaceBeforePunctuation(text: string): ValidationResult {
    if (this.settings.fixSpaceBeforePunctuation === 'disabled') {
      return { isValid: true, correctedText: text };
    }
    
    // Check if there are spaces before punctuation
    const spaceBeforePunctPattern = /\s+([.,;:!?)])/g;
    const hasSpaceBeforePunct = spaceBeforePunctPattern.test(text);
    
    const mode = this.settings.fixSpaceBeforePunctuationMode || 'block';
    
    if (hasSpaceBeforePunct && mode === 'notify') {
      // For notify mode, don't auto-correct but show message
      return { 
        isValid: true, 
        correctedText: text,
        message: 'נמצאו רווחים לפני סימני פיסוק'
      };
    }
    
    if (mode !== 'block') {
      return { isValid: true, correctedText: text };
    }

    // Remove space before punctuation marks
    let corrected = text;
    
    // Build regex pattern from selected punctuation marks
    const selectedPunct: string[] = [];
    const punctMap: { [key: string]: string } = {
      period: '.',
      comma: ',',
      semicolon: ';',
      colon: ':',
      question: '?',
      exclamation: '!',
      dash: '-'
    };
    
    for (const [key, symbol] of Object.entries(punctMap)) {
      if (this.settings.punctuationForSpaceFix[key]) {
        // Escape special regex characters
        const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        selectedPunct.push(escaped);
      }
    }
    
    if (selectedPunct.length > 0) {
      const pattern = new RegExp(`\\s+([${selectedPunct.join('')}])`, 'g');
      corrected = corrected.replace(pattern, '$1');
    }
    
    // Handle parentheses spacing only (quotes are too complex with nesting)
    // Opening parenthesis: k(d -> k (d
    // - Must have space before if attached to letter
    // - Must NOT have space after (attached to next letter)
    
    // Fix opening parenthesis
    // Step 1: Add space before ( if attached to letter
    corrected = corrected.replace(/([\w\u0590-\u05FF])(\()/g, '$1 $2');
    
    // Step 2: Remove space after (
    corrected = corrected.replace(/(\()\s+/g, '$1');
    
    // Fix closing parenthesis - opposite rules
    // Closing parenthesis: d)k -> d) k
    // - Must NOT have space before (attached to previous letter)
    // - Must have space after if followed by letter
    
    // Step 3: Remove space before )
    corrected = corrected.replace(/\s+(\))/g, '$1');
    
    // Step 4: Add space after ) if attached to letter
    corrected = corrected.replace(/(\))([\w\u0590-\u05FF])/g, '$1 $2');
    
    return {
      isValid: true,
      correctedText: corrected
    };
  }

  // Validate parentheses are balanced
  validateParentheses(text: string): ValidationResult {
    if (this.settings.validateParentheses === 'disabled' || !text) {
      return { isValid: true };
    }

    let openCount = 0;
    let closeCount = 0;
    
    // In RTL, ) comes before (
    for (const char of text) {
      if (char === '(') openCount++;
      if (char === ')') closeCount++;
    }

    // Check if balanced
    if (openCount !== closeCount) {
      const mode = this.settings.validateParenthesesMode || 'block';
      const isBlocking = mode === 'block';
      const message = openCount > closeCount 
        ? 'יש סוגריים פתוחים ללא סגירה'
        : 'יש סוגריים סגורים ללא פתיחה';
      return {
        isValid: !isBlocking,
        message: message // Always return message for notification
      };
    }

    // Check order (considering RTL display)
    let balance = 0;
    for (const char of text) {
      if (char === '(') balance++;
      if (char === ')') balance--;
      if (balance < 0) {
        const mode = this.settings.validateParenthesesMode || 'block';
        const isBlocking = mode === 'block';
        return {
          isValid: !isBlocking,
          message: 'סדר הסוגריים שגוי' // Always return message
        };
      }
    }

    return { isValid: true };
  }

  // Validate quotes are balanced
  validateQuotes(text: string): ValidationResult {
    if (this.settings.validateQuotes === 'disabled' || !text) {
      return { isValid: true };
    }

    // Count different types of quotes
    const doubleQuotes = (text.match(/"/g) || []).length;
    const hebrewDoubleQuotes = (text.match(/״/g) || []).length;
    const singleQuotes = (text.match(/'/g) || []).length;
    const hebrewSingleQuotes = (text.match(/׳/g) || []).length;

    // Check if even number (paired)
    const mode = this.settings.validateQuotesMode || 'block';
    const isBlocking = mode === 'block';
    
    if (doubleQuotes % 2 !== 0) {
      return {
        isValid: !isBlocking,
        message: 'יש מרכאות כפולות ללא סגירה' // Always return message
      };
    }

    if (hebrewDoubleQuotes % 2 !== 0) {
      return {
        isValid: !isBlocking,
        message: 'יש מרכאות עבריות ללא סגירה' // Always return message
      };
    }

    if (singleQuotes % 2 !== 0) {
      return {
        isValid: !isBlocking,
        message: 'יש מרכאות בודדות ללא סגירה' // Always return message
      };
    }

    if (hebrewSingleQuotes % 2 !== 0) {
      return {
        isValid: !isBlocking,
        message: 'יש גרש ללא סגירה' // Always return message
      };
    }

    return { isValid: true };
  }

  // Auto-capitalize first letter after sentence end (for English)
  autoCapitalize(text: string): ValidationResult {
    if (this.settings.autoCapitalize === 'disabled') {
      return { isValid: true, correctedText: text };
    }
    
    const mode = this.settings.autoCapitalizeMode || 'block';
    if (mode !== 'block') {
      // For notify mode, don't auto-correct
      return { isValid: true, correctedText: text };
    }

    let corrected = text;
    
    // Capitalize first letter of text
    corrected = corrected.replace(/^([a-z])/, (match) => match.toUpperCase());
    
    // Capitalize after sentence endings
    corrected = corrected.replace(/([.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());

    return {
      isValid: true,
      correctedText: corrected
    };
  }

  // Format numbers with commas
  fixNumberFormatting(text: string): ValidationResult {
    if (this.settings.fixNumberFormatting === 'disabled') {
      return { isValid: true, correctedText: text };
    }
    
    const mode = this.settings.fixNumberFormattingMode || 'block';
    if (mode !== 'block') {
      // For notify mode, don't auto-correct
      return { isValid: true, correctedText: text };
    }

    let corrected = text;
    
    // Add commas to numbers (1000 -> 1,000)
    corrected = corrected.replace(/\b(\d{1,3})(\d{3})\b/g, '$1,$2');
    corrected = corrected.replace(/\b(\d{1,3}),(\d{3}),(\d{3})\b/g, '$1,$2,$3');

    return {
      isValid: true,
      correctedText: corrected
    };
  }

  // Apply all auto-corrections to text
  applyAutoCorrections(text: string): { correctedText: string; messages: string[] } {
    // Ensure we always return the expected format
    if (!text) {
      return { correctedText: text || '', messages: [] };
    }
    
    let corrected = text;
    const messages: string[] = [];

    // Apply corrections in order and collect messages
    const doubleSpaceResult = this.preventDoubleSpace(corrected);
    corrected = doubleSpaceResult.correctedText || corrected;
    if (doubleSpaceResult.message && (this.settings as any).preventDoubleSpaceMode === 'notify') {
      messages.push(doubleSpaceResult.message);
    }
    
    const punctResult = this.fixSpaceBeforePunctuation(corrected);
    corrected = punctResult.correctedText || corrected;
    if (punctResult.message && (this.settings as any).fixSpaceBeforePunctuationMode === 'notify') {
      messages.push(punctResult.message);
    }
    
    const capitalResult = this.autoCapitalize(corrected);
    corrected = capitalResult.correctedText || corrected;
    if (capitalResult.message && (this.settings as any).autoCapitalizeMode === 'notify') {
      messages.push(capitalResult.message);
    }
    
    const numberResult = this.fixNumberFormatting(corrected);
    corrected = numberResult.correctedText || corrected;
    if (numberResult.message && (this.settings as any).fixNumberFormattingMode === 'notify') {
      messages.push(numberResult.message);
    }

    return { correctedText: corrected, messages };
  }

  // Validate before allowing block transition
  validateBlockTransition(text: string): ValidationResult {
    const messages: string[] = [];
    let isValid = true;

    // Check punctuation
    const punctuationResult = this.validatePunctuation(text);
    if (!punctuationResult.isValid) {
      isValid = false;
      if (punctuationResult.message) {
        messages.push(punctuationResult.message);
      }
      // If in block mode, return immediately
      if (this.settings.requirePunctuationMode === 'block') {
        return punctuationResult;
      }
    }

    // Check parentheses
    const parenthesesResult = this.validateParentheses(text);
    if (!parenthesesResult.isValid) {
      isValid = false;
      // In notify mode, we still have a message to show
      if (parenthesesResult.message) {
        messages.push(parenthesesResult.message);
      }
      // If in block mode, return immediately
      if (this.settings.validateParenthesesMode === 'block') {
        return parenthesesResult;
      }
    } else if (parenthesesResult.message) {
      // Even if valid, there might be a notification message
      messages.push(parenthesesResult.message);
    }

    // Check quotes
    const quotesResult = this.validateQuotes(text);
    if (!quotesResult.isValid) {
      isValid = false;
      // In notify mode, we still have a message to show
      if (quotesResult.message) {
        messages.push(quotesResult.message);
      }
      // If in block mode, return immediately
      if (this.settings.validateQuotesMode === 'block') {
        return quotesResult;
      }
    } else if (quotesResult.message) {
      // Even if valid, there might be a notification message
      messages.push(quotesResult.message);
    }

    // If we have messages in notify mode, return them
    if (messages.length > 0) {
      return { 
        isValid: true, // In notify mode, we allow the transition
        message: messages.join(' • ')
      };
    }

    return { isValid: true };
  }
}