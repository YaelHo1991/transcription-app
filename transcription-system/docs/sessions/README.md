# Session Documentation System

## Overview
This folder contains chronological documentation of all Claude development sessions for the Transcription System project.

## Purpose
- Track what was done in each session
- Link sessions together for continuity
- Document problems and solutions
- Maintain a development history
- Enable quick onboarding for new sessions

## File Naming Convention
```
YYYY-MM-DD_session_NNN.md
```
- **YYYY-MM-DD**: Date of the session
- **session**: Fixed identifier
- **NNN**: Sequential session number (001, 002, etc.)

Example: `2025-09-02_session_001.md`

## Session Document Structure

Each session document should contain:

```markdown
# Session: [Date] - [Brief Title]

## Session Information
- **Date**: YYYY-MM-DD
- **Time**: HH:MM - HH:MM (timezone)
- **Session Number**: NNN
- **Previous Session**: Link to previous session
- **Next Session**: Link to next session (added later)

## Objectives
- What we plan to accomplish
- User's specific requests
- Priority items from PROJECT_STATUS.md

## Initial State
- Current branch/commit
- Known issues
- Blocking problems

## Work Completed
### Task 1: [Description]
- Changes made
- Files modified
- Issues encountered
- Resolution

### Task 2: [Description]
...

## Issues & Resolutions
- Problems encountered
- How they were solved
- Workarounds applied

## Code Changes
- List of modified files
- Key code snippets
- Refactoring done

## Testing
- What was tested
- Test results
- Outstanding test needs

## Commits
- Commit hashes
- Commit messages
- Branch information

## Next Steps
- Incomplete tasks
- New issues discovered
- Recommendations for next session

## Notes
- Important observations
- Learning points
- Architecture decisions
```

## How Sessions Work

### Starting a Session
1. Create new session file with current date
2. Link to previous session
3. Review PROJECT_STATUS.md
4. Document objectives
5. Note initial state

### During the Session
1. Document changes as they happen
2. Capture error messages and solutions
3. Note important decisions
4. Track file modifications

### Ending a Session
1. Summarize accomplishments
2. List pending tasks
3. Update PROJECT_STATUS.md
4. Commit session documentation
5. Create git commit with session reference

## Automation with session-chronicler

The `session-chronicler` agent automates this process:
- Creates session files automatically
- Tracks changes in real-time
- Generates git commits
- Updates PROJECT_STATUS.md
- Links sessions together

To use:
```
"Use session-chronicler: document this session"
```

## Best Practices

1. **Be Specific**: Include file paths, function names, line numbers
2. **Include Context**: Why changes were made, not just what
3. **Document Errors**: Include full error messages and stack traces
4. **Link Issues**: Reference GitHub issues or bug reports
5. **Time Stamps**: Note when long operations start/end
6. **Code Snippets**: Include relevant code before/after changes
7. **Visual Markers**: Use emojis for quick scanning:
   - ✅ Completed
   - ⚠️ Warning/Issue
   - 🐛 Bug found
   - 🔧 Bug fixed
   - 📝 Documentation
   - ♻️ Refactoring
   - 🚀 Performance
   - 🔒 Security

## Session Index

### 2025 Sessions

#### September
- [2025-09-02_session_001.md](./2025-09-02_session_001.md) - Sub-Agent Design & Documentation System

#### August
- (Previous undocumented work - see git history)

## Integration with Other Documentation

- **PROJECT_STATUS.md**: Overall project state
- **SUB_AGENTS_DESIGN.md**: Available AI agents
- **ARCHITECTURE.md**: System architecture
- **Git History**: Detailed code changes

## Tips for Reviewing Sessions

1. **Quick Scan**: Look for emoji markers
2. **Problem Solving**: Search for "Issues & Resolutions"
3. **Code Changes**: Check "Files Modified" sections
4. **Continuity**: Follow "Previous/Next Session" links
5. **Decisions**: Look for "Architecture Decisions"

---

*This system ensures no work is lost between sessions and provides a clear development narrative.*