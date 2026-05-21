/**
 * SentimentInsights Component
 * ============================
 * Displays sentiment analysis results for text columns in datasets.
 * Shows sentiment distribution (positive/negative/neutral) with confidence scores.
 * Includes detailed modal view with AI insights for each sentiment category.
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getTextColumns,
  analyzeSentiment,
  getSentimentSummary,
  analyzeSingleText,
} from '../../api/api';
import DetailedSentimentModal from './DetailedSentimentModal';
import './SentimentInsights.css';

function SentimentInsights({ sessionId, isCleaningPhase = true }) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [textColumns, setTextColumns] = useState([]);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [sentimentSummary, setSentimentSummary] = useState(null);
  const [allColumnSummaries, setAllColumnSummaries] = useState({});
  const [singleTextInput, setSingleTextInput] = useState('');
  const [singleTextResult, setSingleTextResult] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSentimentType, setModalSentimentType] = useState(null);
  const [modalColumnName, setModalColumnName] = useState(null);

  // ─ Load text columns on mount or when sessionId changes ─
  useEffect(() => {
    const loadTextColumns = async () => {
      try {
        setLoading(true);
        const response = await getTextColumns(sessionId);

        if (response.text_columns && response.text_columns.length > 0) {
          setTextColumns(response.text_columns);
          setSelectedColumn(response.text_columns[0]);
        } else {
          setTextColumns([]);
          setSelectedColumn(null);
        }
      } catch (error) {
        console.error('Failed to load text columns:', error);
        toast.error('Could not identify text columns');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      loadTextColumns();
    }
  }, [sessionId]);

  // ─ Analyze sentiment for selected columns ─
  const handleAnalyzeSentiment = async () => {
    if (textColumns.length === 0) {
      toast.error('No text columns available for analysis');
      return;
    }

    try {
      setAnalyzing(true);
      const columnsToAnalyze = selectedColumn ? [selectedColumn] : textColumns;

      const analysisResponse = await analyzeSentiment(sessionId, columnsToAnalyze);

      if (analysisResponse.status === 'success') {
        // Get sentiment summary after analysis
        const summaryResponse = await getSentimentSummary(sessionId);
        const summaryData = summaryResponse.sentiment_summary || summaryResponse.summary || {};
        setAllColumnSummaries(summaryData);
        setAnalyzed(true);
        
        // If specific column was selected, set it for display
        if (selectedColumn && summaryData[selectedColumn]) {
          setSentimentSummary(summaryData[selectedColumn]);
        }

        toast.success('✅ Sentiment analysis completed!');
      }
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      toast.error(error.response?.data?.detail || 'Sentiment analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  // ─ Get summary for a specific column ─
  const handleColumnChange = async (event) => {
    const columnName = event.target.value;
    setSelectedColumn(columnName);

    if (allColumnSummaries[columnName]) {
      setSentimentSummary(allColumnSummaries[columnName]);
    } else if (analyzed) {
      // If already analyzed globally, get specific column summary
      try {
        const response = await getSentimentSummary(sessionId, columnName);
        const summaryData = response.sentiment_summary || response.summary || {};
        setSentimentSummary(summaryData[columnName] || null);
      } catch (error) {
        console.error('Failed to load column summary:', error);
      }
    }
  };

  // ─ Analyze single text for demo/testing ─
  const handleAnalyzeSingleText = async () => {
    if (!singleTextInput.trim()) {
      toast.error('Please enter some text to analyze');
      return;
    }

    try {
      const response = await analyzeSingleText(singleTextInput);
      setSingleTextResult(response.analysis || response);
    } catch (error) {
      console.error('Single text analysis failed:', error);
      toast.error('Failed to analyze text');
    }
  };

  // ─ Handle sentiment card click to open detailed modal ─
  const handleSentimentCardClick = (sentimentType, columnForModal = null) => {
    setModalSentimentType(sentimentType);
    setModalColumnName(columnForModal || selectedColumn);
    setModalOpen(true);
  };

  // ─ Render sentiment distribution cards (clickable) ─
  const renderDistributionCards = (summary, columnForClick = null) => {
    if (!summary || !summary.distribution) return null;

    const { distribution, percentages } = summary;
    const sentiments = ['positive', 'negative', 'neutral'];

    return (
      <div className="distribution-grid">
        {sentiments.map((sentiment) => (
          <div
            key={sentiment}
            className={`distribution-card ${sentiment} clickable`}
            onClick={() => handleSentimentCardClick(sentiment, columnForClick)}
            title={`Click to see ${sentiment} entries`}
          >
            <div className="label">{sentiment}</div>
            <div className="count">{distribution[sentiment] || 0}</div>
            <div className="percentage">{percentages[sentiment] || 0}%</div>
            <div className="click-hint">Click for details →</div>
          </div>
        ))}
      </div>
    );
  };

  // ─ Render confidence statistics ─
  const renderConfidenceStats = (summary) => {
    if (!summary || !summary.confidence_stats || Object.keys(summary.confidence_stats).length === 0) {
      return null;
    }

    const stats = summary.confidence_stats;

    return (
      <div className="confidence-stats">
        <h3>📊 Confidence Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Avg Confidence</span>
            <span className="stat-value">{(stats.avg_confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Max Confidence</span>
            <span className="stat-value">{(stats.max_confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Min Confidence</span>
            <span className="stat-value">{(stats.min_confidence * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  };

  // ─ Render single text analysis result ─
  const renderSingleTextResult = () => {
    if (!singleTextResult) return null;

    const { sentiment, confidence, polarity, subjectivity, compound_score } = singleTextResult;
    const sentimentColor = {
      positive: '#10b981',
      negative: '#ef4444',
      neutral: '#f59e0b',
    }[sentiment] || '#64748b';

    return (
      <div className="single-text-result" style={{ borderLeftColor: sentimentColor }}>
        <div className="result-header">
          <strong>Analysis Result:</strong>
          <span
            className="sentiment-badge"
            style={{
              backgroundColor: sentimentColor,
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              marginLeft: '8px',
            }}
          >
            {sentiment.toUpperCase()}
          </span>
        </div>
        <div className="result-details">
          <div className="detail-item">
            <span className="detail-label">Confidence:</span>
            <span className="detail-value">{(confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Polarity:</span>
            <span className="detail-value">{polarity.toFixed(3)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Subjectivity:</span>
            <span className="detail-value">{subjectivity.toFixed(3)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Compound Score:</span>
            <span className="detail-value">{compound_score.toFixed(3)}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading text columns...</div>;
  }

  if (textColumns.length === 0) {
    return (
      <div className="sentiment-container empty-state">
        <div className="empty-message">
          <p>📝 No Text Columns Detected</p>
          <small>Sentiment analysis requires text columns in your dataset</small>
        </div>
      </div>
    );
  }

  return (
    <div className="sentiment-container">
      <div className="sentiment-header">
        <h2>💭 Sentiment Analysis</h2>
        <button
          className="analyze-btn"
          onClick={handleAnalyzeSentiment}
          disabled={analyzing || textColumns.length === 0}
        >
          {analyzing ? '⏳ Analyzing...' : '🔍 Analyze Sentiment'}
        </button>
      </div>

      {/* Column Selector */}
      {textColumns.length > 1 && (
        <div className="column-selector">
          <label htmlFor="column-select">Select Column:</label>
          <select
            id="column-select"
            className="column-select"
            value={selectedColumn || ''}
            onChange={handleColumnChange}
          >
            <option value="">All Text Columns</option>
            {textColumns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sentiment Distribution Results */}
      {analyzed && (sentimentSummary || Object.keys(allColumnSummaries).length > 0) && (
        <div className="sentiment-content">
          <div className="sentiment-distribution">
            <h3>📊 Sentiment Distribution</h3>

            {sentimentSummary && (
              <div>
                {renderDistributionCards(sentimentSummary, selectedColumn)}
                <div className="sentiment-summary-info">
                  <p>
                    <strong>{sentimentSummary.total_analyzed}</strong> text entries analyzed across {selectedColumn || 'multiple columns'}
                  </p>
                </div>
                {renderConfidenceStats(sentimentSummary)}
              </div>
            )}

            {!sentimentSummary && Object.keys(allColumnSummaries).length > 0 && (
              <div>
                {Object.entries(allColumnSummaries).map(([colName, summary]) => (
                  <div key={colName} style={{ marginBottom: '24px' }}>
                    <h4 style={{ color: '#475569', marginBottom: '10px' }}>📌 {colName}</h4>
                    {renderDistributionCards(summary, colName)}
                    <div className="sentiment-summary-info">
                      <p>
                        <strong>{summary.total_analyzed}</strong> entries analyzed
                      </p>
                    </div>
                    {renderConfidenceStats(summary)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!analyzed && (
        <div className="no-analysis">
          <p>👆 Click "Analyze Sentiment" to begin analyzing text columns for sentiment</p>
        </div>
      )}

      {/* Single Text Analyzer */}
      <div style={{ marginTop: '30px', paddingTop: '24px', borderTop: '2px solid #e2e8f0' }}>
        <h3 style={{ color: '#1e293b', marginBottom: '15px', fontSize: '16px', fontWeight: '600' }}>
          🧪 Test Single Text
        </h3>
        <div className="single-text-input-container" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Enter text to analyze sentiment..."
            value={singleTextInput}
            onChange={(e) => setSingleTextInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAnalyzeSingleText()}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '2px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleAnalyzeSingleText}
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => (e.target.style.background = '#764ba2')}
            onMouseLeave={(e) => (e.target.style.background = '#667eea')}
          >
            Analyze
          </button>
        </div>
        {renderSingleTextResult()}
      </div>

      {/* Detailed Sentiment Modal */}
      <DetailedSentimentModal
        sessionId={sessionId}
        columnName={modalColumnName}
        sentimentType={modalSentimentType}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

export default SentimentInsights;
