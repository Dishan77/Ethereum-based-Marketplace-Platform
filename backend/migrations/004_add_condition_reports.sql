CREATE TABLE IF NOT EXISTS condition_reports (
    id SERIAL PRIMARY KEY,
    artwork_id INTEGER NOT NULL,
    condition_hash VARCHAR(66) NOT NULL,
    report_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_condition_reports_artwork ON condition_reports(artwork_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_hash ON condition_reports(condition_hash);
