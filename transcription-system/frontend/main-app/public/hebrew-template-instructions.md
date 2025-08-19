# Hebrew Template - Hanging Indent Instructions

## Manual Setup in Word

### 1. Open the template in Word
### 2. Select the line: {lineNumber}    {speaker}    {text}
### 3. Apply these settings:

#### Paragraph Settings (Alt+O+P):
- **Indentation**:
  - Right (Before text): 0 cm
  - Left (After text): 4 cm  
  - Special: **Hanging**
  - By: 4 cm

#### Tab Settings:
- 0.5 cm - Right aligned (for line numbers)
- 2.5 cm - Left aligned (for speakers)
- 4.0 cm - Left aligned (for text)

#### Text Direction:
- Alignment: Justified
- Direction: Right-to-left

### Result:
First line starts at margin, continuation lines indent 4cm

### Example Output:
```
5    דובר א:    טקסט ראשון שממשיך
                לשורה שנייה עם הזחה
10   דובר ב:    תשובה קצרה
```

## Why This Works:
- **Hanging indent** automatically indents wrapped/continued lines
- **Tab stops** ensure consistent alignment
- **RTL direction** maintains proper Hebrew flow
- Works with both single and multi-line text blocks