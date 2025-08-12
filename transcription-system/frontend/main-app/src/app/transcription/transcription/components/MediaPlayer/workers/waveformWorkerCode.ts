export const waveformWorkerCode = `
// Waveform analysis Web Worker
// Processes audio data off the main thread for smooth performance

let isProcessing = false;
let shouldCancel = false;

// Process audio buffer and extract waveform peaks
async function analyzeAudioBuffer(audioBuffer, sampleRate) {
  try {
    isProcessing = true;
    shouldCancel = false;

    // Report initial progress
    self.postMessage({
      type: 'PROGRESS',
      data: { progress: 0 }
    });

    // Decode audio data using OfflineAudioContext for better performance
    const audioContext = new OfflineAudioContext(1, 1, sampleRate);
    const decodedData = await audioContext.decodeAudioData(audioBuffer.slice(0));

    if (shouldCancel) {
      isProcessing = false;
      return;
    }

    // Get audio channel data
    const channelData = decodedData.getChannelData(0);
    const duration = decodedData.duration;
    
    // Calculate resolution - aim for ~2000 points for smooth visualization
    const targetPoints = 2000;
    const samplesPerPoint = Math.floor(channelData.length / targetPoints);
    const actualPoints = Math.ceil(channelData.length / samplesPerPoint);
    
    const peaks = new Float32Array(actualPoints);
    
    // Extract peaks using RMS (Root Mean Square) for smoother visualization
    for (let i = 0; i < actualPoints; i++) {
      if (shouldCancel) {
        isProcessing = false;
        return;
      }

      const start = i * samplesPerPoint;
      const end = Math.min(start + samplesPerPoint, channelData.length);
      
      let sum = 0;
      let maxPeak = 0;
      
      // Calculate RMS and find max peak in this segment
      for (let j = start; j < end; j++) {
        const sample = channelData[j];
        sum += sample * sample;
        maxPeak = Math.max(maxPeak, Math.abs(sample));
      }
      
      // Use combination of RMS and peak for better visualization
      const rms = Math.sqrt(sum / (end - start));
      peaks[i] = (rms + maxPeak) / 2; // Average of RMS and peak
      
      // Report progress
      if (i % 100 === 0) {
        const progress = (i / actualPoints) * 100;
        self.postMessage({
          type: 'PROGRESS',
          data: { progress }
        });
      }
    }

    // Normalize peaks to 0-1 range
    const maxValue = Math.max(...peaks);
    if (maxValue > 0) {
      for (let i = 0; i < peaks.length; i++) {
        peaks[i] = peaks[i] / maxValue;
      }
    }

    // Send completed waveform data
    self.postMessage({
      type: 'COMPLETE',
      data: {
        peaks,
        duration,
        sampleRate,
        resolution: samplesPerPoint
      }
    });

  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      data: {
        error: error instanceof Error ? error.message : 'Failed to analyze audio'
      }
    });
  } finally {
    isProcessing = false;
  }
}

// Handle messages from main thread
self.onmessage = async (event) => {
  const { type, audioBuffer, sampleRate } = event.data;

  switch (type) {
    case 'ANALYZE':
      if (!isProcessing && audioBuffer && sampleRate) {
        await analyzeAudioBuffer(audioBuffer, sampleRate);
      }
      break;

    case 'CANCEL':
      shouldCancel = true;
      break;

    default:
      break;
  }
};
`;