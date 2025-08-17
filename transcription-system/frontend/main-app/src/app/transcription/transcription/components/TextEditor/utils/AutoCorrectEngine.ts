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
    if (!this.settings.blockDuplicateSpeakers) {
      return { isValid: true };
    }

    if (currentSpeaker && previousSpeaker && currentSpeaker === previousSpeaker) {
      return {
        isValid: false,
        message: 'לא ניתן ליצור בלוק עם אותו דובר ברצף'
      };
    }

    return { isValid: true };
  }

  // Check if text ends with proper punctuation before creating new block
  validatePunctuation(text: string): ValidationResult {
    if (!this.settings.requirePunctuation || !text.trim()) {
      return { isValid: true };
    }

    const trimmedText = text.trim();
    const lastChar = trimmedText[trimmedText.length - 1];
    
    // Hebrew and English punctuation marks that are valid endings
    const validEndings = ['.', '!', '?', ':', ';', '…', '״', '"', '\'', ')', ']', '}'];
    
    // Check if ends with a letter (Hebrew or English) without punctuation
    const hebrewLetterPattern = /[\u0590-\u05FF]$/;
    const englishLetterPattern = /[a-zA-Z]$/;
    
    if ((hebrewLetterPattern.test(lastChar) || englishLetterPattern.test(lastChar)) && 
        !validEndings.includes(lastChar)) {
      return {
        isValid: false,
        message: 'יש לסיים את המשפט בסימן פיסוק'
      };
    }

    return { isValid: true };
  }

  // Prevent double spaces
  preventDoubleSpace(text: string): ValidationResult {
    if (!this.settings.preventDoubleSpace) {
      return { isValid: true, correctedText: text };
    }

    // Replace multiple spaces with single space
    const corrected = text.replace(/\s{2,}/g, ' ');
    
    return {
      isValid: true,
      correctedText: corrected
    };
  }

  // Fix space before punctuation
  fixSpaceBeforePunctuation(text: string): ValidationResult {
    if (!this.settings.fixSpaceBeforePunctuation) {
      return { isValid: true, correctedText: text };
    }

    // Remove space before punctuation marks
    let corrected = text;
    
    // Remove space before regular punctuation marks
    corrected = corrected.replace(/\s+([,.\-:;!?])/g, '$1');
    
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
    if (!this.settings.validateParentheses || !text) {
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
      if (openCount > closeCount) {
        return {
          isValid: false,
          message: 'יש סוגריים פתוחים ללא סגירה'
        };
      } else {
        return {
          isValid: false,
          message: 'יש סוגריים סגורים ללא פתיחה'
        };
      }
    }

    // Check order (considering RTL display)
    let balance = 0;
    for (const char of text) {
      if (char === '(') balance++;
      if (char === ')') balance--;
      if (balance < 0) {
        return {
          isValid: false,
          message: 'סדר הסוגריים שגוי'
        };
      }
    }

    return { isValid: true };
  }

  // Validate quotes are balanced
  validateQuotes(text: string): ValidationResult {
    if (!this.settings.validateQuotes || !text) {
      return { isValid: true };
    }

    // Count different types of quotes
    const doubleQuotes = (text.match(/"/g) || []).length;
    const hebrewDoubleQuotes = (text.match(/״/g) || []).length;
    const singleQuotes = (text.match(/'/g) || []).length;
    const hebrewSingleQuotes = (text.match(/׳/g) || []).length;

    // Check if even number (paired)
    if (doubleQuotes % 2 !== 0) {
      return {
        isValid: false,
        message: 'יש מרכאות כפולות ללא סגירה'
      };
    }

    if (hebrewDoubleQuotes % 2 !== 0) {
      return {
        isValid: false,
        message: 'יש מרכאות עבריות ללא סגירה'
      };
    }

    if (singleQuotes % 2 !== 0) {
      return {
        isValid: false,
        message: 'יש מרכאות בודדות ללא סגירה'
      };
    }

    if (hebrewSingleQuotes % 2 !== 0) {
      return {
        isValid: false,
        message: 'יש גרש ללא סגירה'
      };
    }

    return { isValid: true };
  }

  // Auto-capitalize first letter after sentence end (for English)
  autoCapitalize(text: string): ValidationResult {
    if (!this.settings.autoCapitalize) {
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
    if (!this.settings.fixNumberFormatting) {
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
  applyAutoCorrections(text: string): string {
    let corrected = text;

    // Apply corrections in order
    corrected = this.preventDoubleSpace(corrected).correctedText || corrected;
    corrected = this.fixSpaceBeforePunctuation(corrected).correctedText || corrected;
    corrected = this.autoCapitalize(corrected).correctedText || corrected;
    corrected = this.fixNumberFormatting(corrected).correctedText || corrected;

    return corrected;
  }

  // Validate before allowing block transition
  validateBlockTransition(text: string): ValidationResult {
    // Check punctuation
    const punctuationResult = this.validatePunctuation(text);
    if (!punctuationResult.isValid) {
      return punctuationResult;
    }

    // Check parentheses
    const parenthesesResult = this.validateParentheses(text);
    if (!parenthesesResult.isValid) {
      return parenthesesResult;
    }

    // Check quotes
    const quotesResult = this.validateQuotes(text);
    if (!quotesResult.isValid) {
      return quotesResult;
    }

    return { isValid: true };
  }
}