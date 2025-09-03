# Transcription Progress Tracking System

## Problem Statement

Accurately tracking transcription progress is complex because media playback time doesn't reflect actual transcription completion:

### Common Scenarios:
1. **Passive Listening**: User plays media without typing anything
2. **Selective Transcription**: Client requests only certain time ranges be transcribed
3. **Skip Sections**: Quiet moments, background noise, or irrelevant content
4. **Non-linear Work**: Users jump around the timeline while working
5. **Quality Variations**: Some sections need more detailed transcription than others

### Current Issues:
- Media player progress ≠ transcription progress
- No visibility into which sections are complete
- Difficult to track work across multiple sessions
- No way to measure transcription quality/completeness

## Proposed Solution: Multi-Metric Progress System

### Core Concept
Track transcription progress using multiple complementary metrics rather than relying on a single measure:

1. **Coverage Progress** (Primary): Which time segments have been transcribed
2. **Text Density Progress** (Quality): How thoroughly each segment is transcribed
3. **Active Range Progress** (Scope): Progress within client-defined ranges
4. **Work Session Progress** (Productivity): Active transcription vs listening time

## Technical Architecture

### Database Schema

```sql
-- Enhanced transcription metadata
CREATE TABLE transcription_progress (
  id UUID PRIMARY KEY,
  project_id VARCHAR(255),
  media_id VARCHAR(255),
  
  -- Media information
  total_duration INTEGER, -- seconds
  active_ranges JSON, -- [{"start": 120, "end": 480, "label": "Interview"}]
  skip_ranges JSON,  -- [{"start": 0, "end": 30, "reason": "silence"}]
  
  -- Progress tracking
  covered_segments JSON, -- 10-second segments: [true, true, false, ...]
  segment_quality JSON,  -- Quality score per segment: [0.8, 0.9, 0.0, ...]
  last_position INTEGER, -- Last edited timestamp in seconds
  
  -- Statistics
  total_words INTEGER,
  estimated_words INTEGER, -- Based on speech rate
  work_sessions JSON, -- [{"start": "2025-01-15T10:00", "duration": 3600}]
  
  -- Calculated progress
  coverage_percentage DECIMAL(5,2),
  density_percentage DECIMAL(5,2),
  overall_percentage DECIMAL(5,2),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Progress snapshots for historical tracking
CREATE TABLE progress_snapshots (
  id UUID PRIMARY KEY,
  project_id VARCHAR(255),
  media_id VARCHAR(255),
  snapshot_date DATE,
  coverage_percent DECIMAL(5,2),
  word_count INTEGER,
  work_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Core Algorithm: Segment-Based Coverage

```javascript
class TranscriptionProgressTracker {
  constructor(mediaDuration, segmentSize = 10) {
    this.mediaDuration = mediaDuration; // Total duration in seconds
    this.segmentSize = segmentSize; // Segment size in seconds
    this.totalSegments = Math.ceil(mediaDuration / segmentSize);
    this.segments = Array(this.totalSegments).fill(false);
    this.segmentQuality = Array(this.totalSegments).fill(0);
  }

  // Mark segments as transcribed based on block timestamps
  updateCoverage(blocks) {
    // Reset all segments
    this.segments.fill(false);
    this.segmentQuality.fill(0);

    blocks.forEach(block => {
      if (block.speakerTime && block.text.trim()) {
        const segmentIndex = Math.floor(block.speakerTime / this.segmentSize);
        
        if (segmentIndex >= 0 && segmentIndex < this.totalSegments) {
          // Mark segment as covered
          this.segments[segmentIndex] = true;
          
          // Calculate quality based on text density
          const wordsInBlock = block.text.trim().split(/\s+/).length;
          const expectedWords = this.segmentSize * 2.5; // ~150 words/min = 2.5 words/sec
          const quality = Math.min(wordsInBlock / expectedWords, 1.0);
          
          // Use the highest quality for this segment
          this.segmentQuality[segmentIndex] = Math.max(
            this.segmentQuality[segmentIndex], 
            quality
          );
        }
      }
    });
  }

  // Calculate different progress metrics
  calculateProgress(activeRanges = null) {
    const relevantSegments = activeRanges ? 
      this.getSegmentsInRanges(activeRanges) : 
      [...Array(this.totalSegments).keys()];
    
    const totalRelevant = relevantSegments.length;
    const coveredCount = relevantSegments.filter(i => this.segments[i]).length;
    const totalQuality = relevantSegments.reduce((sum, i) => sum + this.segmentQuality[i], 0);
    
    return {
      // Basic coverage: what percentage of time is covered
      coverage: totalRelevant > 0 ? (coveredCount / totalRelevant) * 100 : 0,
      
      // Quality-weighted coverage: considers transcription density
      weightedCoverage: totalRelevant > 0 ? (totalQuality / totalRelevant) * 100 : 0,
      
      // Overall progress: combination of coverage and quality
      overall: totalRelevant > 0 ? 
        ((coveredCount * 0.6 + totalQuality * 0.4) / totalRelevant) * 100 : 0,
      
      // Detailed breakdown
      details: {
        totalSegments: totalRelevant,
        coveredSegments: coveredCount,
        averageQuality: totalQuality / Math.max(coveredCount, 1),
        gaps: this.findGaps(relevantSegments)
      }
    };
  }

  // Find uncovered gaps for user guidance
  findGaps(relevantSegments) {
    const gaps = [];
    let gapStart = null;

    relevantSegments.forEach(segmentIndex => {
      const timeStart = segmentIndex * this.segmentSize;
      
      if (!this.segments[segmentIndex]) {
        if (gapStart === null) gapStart = timeStart;
      } else {
        if (gapStart !== null) {
          gaps.push({
            start: gapStart,
            end: timeStart,
            duration: timeStart - gapStart
          });
          gapStart = null;
        }
      }
    });

    // Handle gap at the end
    if (gapStart !== null) {
      const lastIndex = relevantSegments[relevantSegments.length - 1];
      const endTime = (lastIndex + 1) * this.segmentSize;
      gaps.push({
        start: gapStart,
        end: Math.min(endTime, this.mediaDuration),
        duration: Math.min(endTime, this.mediaDuration) - gapStart
      });
    }

    return gaps;
  }

  // Get segment indices within specified time ranges
  getSegmentsInRanges(ranges) {
    const segments = [];
    ranges.forEach(range => {
      const startSegment = Math.floor(range.start / this.segmentSize);
      const endSegment = Math.floor(range.end / this.segmentSize);
      
      for (let i = startSegment; i <= endSegment; i++) {
        if (i < this.totalSegments) segments.push(i);
      }
    });
    return [...new Set(segments)]; // Remove duplicates
  }
}
```

### Smart Work Session Detection

```javascript
class WorkSessionTracker {
  constructor() {
    this.currentSession = null;
    this.idleThreshold = 180; // 3 minutes of inactivity = session end
    this.idleTimer = null;
  }

  // Track user activity (typing, seeking, etc.)
  recordActivity(activityType = 'typing') {
    const now = new Date();
    
    // Start new session if none active
    if (!this.currentSession) {
      this.currentSession = {
        startTime: now,
        lastActivity: now,
        activities: [],
        transcriptionTime: 0,
        listeningTime: 0
      };
    }

    // Update session
    this.currentSession.lastActivity = now;
    this.currentSession.activities.push({
      type: activityType,
      timestamp: now
    });

    // Reset idle timer
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.endSession();
    }, this.idleThreshold * 1000);
  }

  // Track media position changes
  recordMediaActivity(currentTime, isPlaying, userSeek = false) {
    if (isPlaying && !userSeek) {
      // User is listening
      this.recordActivity('listening');
      if (this.currentSession) {
        this.currentSession.listeningTime += 1; // Assuming called every second
      }
    } else if (userSeek) {
      this.recordActivity('seeking');
    }
  }

  // End current work session
  endSession() {
    if (!this.currentSession) return null;

    const session = {
      ...this.currentSession,
      endTime: new Date(),
      duration: Date.now() - this.currentSession.startTime.getTime()
    };

    this.currentSession = null;
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    return session;
  }

  // Calculate productivity metrics
  getSessionStats() {
    if (!this.currentSession) return null;

    const duration = Date.now() - this.currentSession.startTime.getTime();
    const transcriptionRatio = this.currentSession.transcriptionTime / duration;
    
    return {
      duration,
      transcriptionTime: this.currentSession.transcriptionTime,
      listeningTime: this.currentSession.listeningTime,
      productivity: transcriptionRatio,
      activities: this.currentSession.activities.length
    };
  }
}
```

## User Interface Design

### Progress Visualization Components

#### 1. Timeline Progress Bar
```jsx
const TranscriptionTimeline = ({ segments, activeRanges, onSeek }) => {
  return (
    <div className="transcription-timeline">
      <div className="timeline-track">
        {segments.map((segment, index) => (
          <div
            key={index}
            className={`timeline-segment ${getSegmentClass(segment)}`}
            onClick={() => onSeek(index * 10)}
            title={getSegmentTooltip(segment, index)}
          >
            <div 
              className="quality-indicator" 
              style={{ height: `${segment.quality * 100}%` }}
            />
          </div>
        ))}
      </div>
      
      {/* Active ranges overlay */}
      {activeRanges.map((range, index) => (
        <div
          key={index}
          className="active-range"
          style={{
            left: `${(range.start / totalDuration) * 100}%`,
            width: `${((range.end - range.start) / totalDuration) * 100}%`
          }}
        />
      ))}
    </div>
  );
};

function getSegmentClass(segment) {
  if (!segment.covered) return 'segment-empty';
  if (segment.quality > 0.8) return 'segment-excellent';
  if (segment.quality > 0.5) return 'segment-good';
  return 'segment-basic';
}
```

#### 2. Progress Statistics Panel
```jsx
const ProgressStats = ({ progress, workSession }) => (
  <div className="progress-stats">
    <div className="stat-group">
      <h4>🎯 כיסוי תמלול</h4>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress.coverage}%` }}
        />
        <span className="progress-text">{progress.coverage.toFixed(1)}%</span>
      </div>
      <small>{progress.details.coveredSegments} מתוך {progress.details.totalSegments} קטעים</small>
    </div>

    <div className="stat-group">
      <h4>📝 איכות תמלול</h4>
      <div className="progress-bar">
        <div 
          className="progress-fill quality" 
          style={{ width: `${progress.weightedCoverage}%` }}
        />
        <span className="progress-text">{progress.weightedCoverage.toFixed(1)}%</span>
      </div>
      <small>ממוצע: {progress.details.averageQuality.toFixed(1)} מילים לשנייה</small>
    </div>

    <div className="stat-group">
      <h4>⏱️ זמן עבודה</h4>
      <div className="work-time">
        <span>סה"כ: {formatDuration(workSession?.totalTime || 0)}</span>
        <span>תמלול: {formatDuration(workSession?.transcriptionTime || 0)}</span>
        <span>האזנה: {formatDuration(workSession?.listeningTime || 0)}</span>
      </div>
    </div>

    {progress.details.gaps.length > 0 && (
      <div className="stat-group">
        <h4>⚠️ קטעים חסרים</h4>
        <div className="gaps-list">
          {progress.details.gaps.slice(0, 3).map((gap, index) => (
            <div key={index} className="gap-item" onClick={() => onSeekToGap(gap)}>
              {formatTime(gap.start)} - {formatTime(gap.end)}
              <small>({formatDuration(gap.duration)})</small>
            </div>
          ))}
          {progress.details.gaps.length > 3 && (
            <small>ועוד {progress.details.gaps.length - 3} קטעים...</small>
          )}
        </div>
      </div>
    )}
  </div>
);
```

#### 3. Progress Configuration (Admin)
```jsx
const ProgressConfig = ({ projectId, mediaId, config, onUpdate }) => (
  <div className="progress-config">
    <h3>הגדרות מעקב התקדמות</h3>
    
    <div className="config-section">
      <h4>טווחי זמן פעילים</h4>
      <div className="range-list">
        {config.activeRanges.map((range, index) => (
          <div key={index} className="range-item">
            <input
              type="time"
              value={secondsToTimeInput(range.start)}
              onChange={(e) => updateRange(index, 'start', timeInputToSeconds(e.target.value))}
            />
            <span>עד</span>
            <input
              type="time"
              value={secondsToTimeInput(range.end)}
              onChange={(e) => updateRange(index, 'end', timeInputToSeconds(e.target.value))}
            />
            <input
              type="text"
              placeholder="תווית (אופציונלי)"
              value={range.label || ''}
              onChange={(e) => updateRange(index, 'label', e.target.value)}
            />
            <button onClick={() => removeRange(index)}>🗑️</button>
          </div>
        ))}
        <button onClick={addRange}>+ הוסף טווח</button>
      </div>
    </div>

    <div className="config-section">
      <h4>הגדרות איכות</h4>
      <label>
        מילים מינימליות לשנייה:
        <input
          type="number"
          step="0.1"
          value={config.minWordsPerSecond || 2.0}
          onChange={(e) => onUpdate({...config, minWordsPerSecond: parseFloat(e.target.value)})}
        />
      </label>
      
      <label>
        <input
          type="checkbox"
          checked={config.requireSpeakerNames}
          onChange={(e) => onUpdate({...config, requireSpeakerNames: e.target.checked})}
        />
        דרוש שמות דוברים לסיום
      </label>
    </div>

    <div className="config-section">
      <h4>התרעות</h4>
      <label>
        <input
          type="checkbox"
          checked={config.showGapWarnings}
          onChange={(e) => onUpdate({...config, showGapWarnings: e.target.checked})}
        />
        הצג התרעות על קטעים חסרים
      </label>
      
      <label>
        <input
          type="checkbox"
          checked={config.autoSaveProgress}
          onChange={(e) => onUpdate({...config, autoSaveProgress: e.target.checked})}
        />
        שמירת התקדמות אוטומטית
      </label>
    </div>
  </div>
);
```

## API Endpoints

### 1. Progress Tracking
```javascript
// Get current progress
GET /api/projects/:projectId/media/:mediaId/progress
Response: {
  coverage: 65.2,
  weightedCoverage: 58.7,
  overall: 62.4,
  details: {
    totalSegments: 120,
    coveredSegments: 78,
    averageQuality: 0.75,
    gaps: [
      { start: 120, end: 180, duration: 60 },
      { start: 300, end: 340, duration: 40 }
    ]
  },
  workSession: {
    totalTime: 7200,
    transcriptionTime: 4800,
    listeningTime: 2400,
    productivity: 0.67
  }
}

// Update progress (called when blocks change)
POST /api/projects/:projectId/media/:mediaId/progress
Body: {
  blocks: [...],
  sessionActivity: {
    type: 'typing',
    timestamp: '2025-01-15T10:30:00Z'
  }
}

// Configure progress settings
PUT /api/projects/:projectId/media/:mediaId/progress/config
Body: {
  activeRanges: [
    { start: 120, end: 480, label: "Interview" },
    { start: 600, end: 900, label: "Q&A" }
  ],
  skipRanges: [
    { start: 0, end: 30, reason: "Intro music" }
  ],
  minWordsPerSecond: 2.0,
  requireSpeakerNames: true
}
```

### 2. Progress Analytics
```javascript
// Get progress history
GET /api/projects/:projectId/media/:mediaId/progress/history
Response: {
  snapshots: [
    { date: '2025-01-15', coverage: 45.2, wordCount: 1203 },
    { date: '2025-01-16', coverage: 65.8, wordCount: 1756 }
  ],
  trend: 'increasing',
  estimatedCompletion: '2025-01-18',
  averageDaily: 20.6
}

// Get productivity report
GET /api/projects/:projectId/media/:mediaId/progress/productivity
Response: {
  totalWorkTime: 14400, // seconds
  transcriptionTime: 9600,
  listeningTime: 4800,
  sessionsCount: 8,
  avgSessionLength: 1800,
  productivityScore: 0.72,
  peakHours: [14, 15, 16] // Hours of day with highest productivity
}
```

## Use Cases & Scenarios

### Scenario 1: Complete Transcription
```
Media Duration: 60 minutes
Requirement: Full transcription
Progress Calculation:
- Coverage: % of 60 minutes with text blocks
- Quality: Average words per minute vs expected
- Target: 90%+ coverage, 80%+ quality
```

### Scenario 2: Partial Transcription
```
Media Duration: 120 minutes
Active Ranges: [10:00-25:00, 45:00-75:00, 90:00-110:00]
Total Active: 50 minutes
Progress Calculation:
- Coverage: % of 50 active minutes transcribed
- Skip inactive ranges entirely
- Target: 95%+ coverage of active ranges
```

### Scenario 3: Interview with Breaks
```
Media Duration: 90 minutes
Skip Ranges: [0:00-2:00, 30:00-35:00, 60:00-62:00] (intro/breaks)
Effective Duration: 85 minutes
Progress Calculation:
- Ignore skip ranges
- Focus on interview content
- Mark breaks as "completed" automatically
```

### Scenario 4: Quality-Focused Transcription
```
Requirement: Detailed transcription with speaker identification
Quality Threshold: 3+ words per second average
Progress Calculation:
- Coverage: Basic time coverage
- Quality: Weighted by word density and speaker names
- Completion requires both coverage AND quality thresholds
```

## Implementation Phases

### Phase 1: Core Progress Tracking (Week 1-2)
- [ ] Implement segment-based coverage calculation
- [ ] Add progress database tables
- [ ] Create basic progress API endpoints
- [ ] Add simple progress indicator to UI

### Phase 2: Visual Timeline (Week 3)
- [ ] Build interactive timeline component
- [ ] Add segment quality visualization
- [ ] Implement click-to-seek functionality
- [ ] Show active/skip ranges overlay

### Phase 3: Work Session Tracking (Week 4)
- [ ] Implement work session detection
- [ ] Track typing vs listening activity
- [ ] Add productivity metrics
- [ ] Create session analytics

### Phase 4: Admin Configuration (Week 5)
- [ ] Build admin progress configuration UI
- [ ] Add active/skip ranges management
- [ ] Implement quality thresholds
- [ ] Create progress templates for project types

### Phase 5: Advanced Features (Week 6)
- [ ] Progress history and trends
- [ ] Automated gap detection and warnings
- [ ] Export progress reports
- [ ] Productivity insights and recommendations

## Success Metrics

### Accuracy Goals
- Progress accuracy within ±5% of manual review
- Real-time updates with <2 second delay
- Reliable gap detection (90%+ accurate)

### User Experience Goals
- Clear visual indication of progress status
- Intuitive gap navigation
- Helpful productivity insights
- Minimal performance impact on editor

### Business Value
- Accurate project completion estimates
- Better resource planning for transcription teams
- Client transparency on work progress
- Data-driven productivity improvements

## Technical Considerations

### Performance Optimizations
1. **Segment Caching**: Cache segment calculations, update only on change
2. **Debounced Updates**: Update progress max once per 5 seconds during active editing
3. **Background Processing**: Calculate complex analytics in background workers
4. **Efficient Storage**: Compress segment data for large media files

### Edge Cases
1. **Very Long Media**: Use larger segments (30s) for files >2 hours
2. **Multiple Sessions**: Merge progress across different work sessions
3. **Concurrent Editing**: Handle progress conflicts in multi-user scenarios
4. **Corrupted Data**: Graceful fallback to basic time-based progress

### Monitoring & Analytics
- Track system accuracy vs user-reported completion
- Monitor performance impact on editor responsiveness
- A/B test different progress calculation weights
- Collect feedback on progress indicator usefulness

## Future Enhancements

### Machine Learning Integration
- Learn user patterns to predict completion times
- Automatically detect speech vs silence segments  
- Suggest optimal work session lengths

### Collaboration Features
- Show progress from multiple transcribers
- Coordinate work on different sections
- Progress handoff between team members

### Client Integration
- Real-time progress dashboards for clients
- Automated progress notifications
- Integration with project management tools

This comprehensive progress tracking system provides accurate, actionable insights into transcription work while maintaining excellent user experience and system performance.