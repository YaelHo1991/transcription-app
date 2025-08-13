-- Migration: Create waveforms table for storing pre-generated waveform data
-- This table stores waveform data for large audio/video files to avoid client-side processing

CREATE TABLE IF NOT EXISTS waveforms (
  id SERIAL PRIMARY KEY,
  file_id VARCHAR(255) UNIQUE NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  duration FLOAT NOT NULL,
  sample_rate INTEGER DEFAULT 44100,
  peaks JSONB NOT NULL, -- Compressed peak data array
  peak_count INTEGER NOT NULL,
  processing_time FLOAT, -- Time taken to generate waveform in seconds
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups by file_id
CREATE INDEX idx_waveforms_file_id ON waveforms(file_id);

-- Index for finding old waveforms to clean up
CREATE INDEX idx_waveforms_created_at ON waveforms(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_waveforms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_waveforms_updated_at_trigger
BEFORE UPDATE ON waveforms
FOR EACH ROW
EXECUTE FUNCTION update_waveforms_updated_at();

-- Comments for documentation
COMMENT ON TABLE waveforms IS 'Stores pre-generated waveform data for large media files';
COMMENT ON COLUMN waveforms.file_id IS 'Unique identifier for the media file';
COMMENT ON COLUMN waveforms.file_url IS 'URL or path to the original media file';
COMMENT ON COLUMN waveforms.file_size IS 'Size of the original file in bytes';
COMMENT ON COLUMN waveforms.duration IS 'Duration of the media in seconds';
COMMENT ON COLUMN waveforms.sample_rate IS 'Sample rate used for waveform generation';
COMMENT ON COLUMN waveforms.peaks IS 'JSON array of normalized peak values (0-1)';
COMMENT ON COLUMN waveforms.peak_count IS 'Number of peaks in the waveform data';
COMMENT ON COLUMN waveforms.processing_time IS 'Time taken to generate the waveform';