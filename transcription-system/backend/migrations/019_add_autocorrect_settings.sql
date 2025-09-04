-- Migration 019: Add Auto-Correct Settings to Users Table
-- Purpose: Add auto-correct functionality settings for users

-- Add autocorrect_settings JSONB column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS autocorrect_settings JSONB DEFAULT '{
  "blockDuplicateSpeakers": "disabled",
  "requirePunctuation": "disabled", 
  "preventDoubleSpace": "notify",
  "fixSpaceBeforePunctuation": "notify",
  "validateParentheses": "notify",
  "validateQuotes": "notify",
  "autoCapitalize": "notify",
  "fixNumberFormatting": "notify",
  "validEndingPunctuation": {
    ".": true,
    "!": true,
    "?": true,
    ":": true,
    ";": true,
    ",": false
  },
  "punctuationForSpaceFix": {
    ".": true,
    ",": true,
    ";": true,
    ":": true,
    "!": true,
    "?": true,
    ")": true,
    "]": true,
    "}": true,
    "\"": true,
    "''": true
  }
}'::jsonb;

-- Create index on autocorrect_settings for better query performance
CREATE INDEX IF NOT EXISTS idx_users_autocorrect_settings ON users USING GIN (autocorrect_settings);

-- Add a comment for documentation
COMMENT ON COLUMN users.autocorrect_settings IS 'JSONB column storing auto-correct behavior settings for transcription editing. Each setting can be "block", "notify", or "disabled".';

-- Update existing users to have the default settings if they have null values
UPDATE users 
SET autocorrect_settings = '{
  "blockDuplicateSpeakers": "disabled",
  "requirePunctuation": "disabled", 
  "preventDoubleSpace": "notify",
  "fixSpaceBeforePunctuation": "notify",
  "validateParentheses": "notify",
  "validateQuotes": "notify",
  "autoCapitalize": "notify",
  "fixNumberFormatting": "notify",
  "validEndingPunctuation": {
    ".": true,
    "!": true,
    "?": true,
    ":": true,
    ";": true,
    ",": false
  },
  "punctuationForSpaceFix": {
    ".": true,
    ",": true,
    ";": true,
    ":": true,
    "!": true,
    "?": true,
    ")": true,
    "]": true,
    "}": true,
    "\"": true,
    "''": true
  }
}'::jsonb 
WHERE autocorrect_settings IS NULL;

-- Verification query (commented out for production)
-- SELECT id, username, autocorrect_settings FROM users LIMIT 5;