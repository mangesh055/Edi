/**
 * DetailedSentimentModal Component
 * ================================
 * Two-panel layout:
 *  TOP  – AI insights (compact, scrollable)
 *  BOTTOM – All flagged text entries (always visible, independently scrollable)
 */

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getDetailedSentimentAnalysis } from '../../api/api';
import './DetailedSentimentModal.css';

const SENTIMENT_CONFIG = {
  positive: {
    icon: '😊',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    accentColor: '#10b981',
    label: 'Positive',
  },
  negative: {
    icon: '😞',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    accentColor: '#ef4444',
    label: 'Negative',
  },
  neutral: {
    icon: '😐',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    accentColor: '#f59e0b',
    label: 'Neutral',
  },
};

/* ── Tiny helpers ── */
function Chip({ children, color }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      border: `1.5px solid ${color}`,
      color,
      background: 'white',
    }}>
      {children}
    </span>
  );
}

function InsightBlock({ title, icon, color, children }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      borderLeft: `4px solid ${color}`,
      marginBottom: '10px',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
      }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '12px 14px' }}>{children}</div>
    </div>
  );
}

/* ── Main component ── */
function DetailedSentimentModal({ sessionId, columnName, sentimentType, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [showEntries, setShowEntries] = useState(true);


  const cfg = SENTIMENT_CONFIG[sentimentType] || SENTIMENT_CONFIG.neutral;

  // Lock background scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  const loadData = useCallback(async () => {
    if (!sessionId || !sentimentType) return;
    setLoading(true);
    setData(null);
    setExpandedIdx(null);
    try {
      const res = await getDetailedSentimentAnalysis(sessionId, columnName, sentimentType);
      console.log('[SentimentModal] response:', res);
      setData(res);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load sentiment details');
    } finally {
      setLoading(false);
    }
  }, [sessionId, columnName, sentimentType]);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const rows = data?.rows || [];
  const hasRows = rows.length > 0;

  return (
    /* Overlay */
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: '16px',
        overflow: 'hidden',
        overscrollBehavior: 'contain',
      }}
      onClick={onClose}
    >
      {/* Card — stop propagation so inner clicks don't close */}
      <div
        style={{
          background: '#f8fafc',
          borderRadius: '18px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '820px',
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'dsm-in 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── HEADER ── */}
        <div style={{
          background: cfg.gradient,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', zIndex: 1 }}>
            <span style={{ fontSize: '34px' }}>{cfg.icon}</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'white' }}>
                {cfg.label} Sentiment
              </h2>
              {columnName && (
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>
                  Column: <strong>{columnName}</strong>
                  {data?.domain && <span style={{ fontStyle: 'italic', marginLeft: '4px' }}>· {data.domain}</span>}
                </p>
              )}
            </div>
          </div>
          {/* decorative circle */}
          <div style={{
            position: 'absolute', right: '-50px', top: '-40px',
            width: '160px', height: '160px',
            background: 'rgba(255,255,255,0.1)', borderRadius: '50%',
          }} />
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
              color: 'white', width: '34px', height: '34px', borderRadius: '50%',
              fontSize: '16px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 1, flexShrink: 0,
            }}
          >✕</button>
        </div>

        {/* ── BODY: two panels ── */}
        {loading ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '12px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: `4px solid #e2e8f0`, borderTopColor: cfg.accentColor,
              animation: 'dsm-spin 0.75s linear infinite',
            }} />
            <p style={{ margin: 0, color: '#334155', fontWeight: 600 }}>
              🤖 AI is analyzing {sentimentType} entries…
            </p>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>
              Domain-aware analysis via Groq LLM
            </p>
          </div>
        ) : data ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* COUNT ROW */}
            <div style={{ padding: '12px 24px 0', display: 'flex', gap: '8px', flexShrink: 0 }}>
              <span style={{
                display: 'inline-block', padding: '5px 14px',
                borderRadius: '20px', fontSize: '13px', fontWeight: 700,
                color: 'white', background: cfg.gradient,
              }}>
                {data.count} {cfg.label} {data.count === 1 ? 'Entry' : 'Entries'}
              </span>
              {data.domain && (
                <span style={{
                  display: 'inline-block', padding: '5px 14px',
                  borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                  color: '#475569', background: 'white', border: '1.5px solid #e2e8f0',
                }}>
                  📂 {data.domain}
                </span>
              )}
            </div>

            {/* PANEL A: AI Insights — expands to fill space when entries hidden */}
            <div style={{
              padding: '12px 24px',
              overflowY: 'auto',
              flex: showEntries ? '0 0 auto' : 1,
              maxHeight: showEntries ? '40%' : 'none',
              flexShrink: showEntries ? 0 : 1,
              borderBottom: showEntries ? '2px solid #e2e8f0' : 'none',
            }}>
              {/* AI Summary */}
              <InsightBlock title="AI Summary" icon="🤖" color={cfg.accentColor}>
                {data.summary && data.summary.trim()
                  ? <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.65 }}>{data.summary}</p>
                  : <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>AI summary is generating — click Refresh to update.</p>
                }
              </InsightBlock>

              {/* Themes */}
              {data.themes && data.themes.length > 0 && (
                <InsightBlock title="Key Themes" icon="📌" color={cfg.accentColor}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {data.themes.map((t, i) => <Chip key={i} color={cfg.accentColor}>{t}</Chip>)}
                  </div>
                </InsightBlock>
              )}

              {/* NEGATIVE specific */}
              {sentimentType === 'negative' && (
                <>
                  {data.problems && data.problems.length > 0 && (
                    <InsightBlock title="Identified Problems" icon="⚠️" color="#ef4444">
                      {data.problems.map((p, i) => (
                        <div key={i} style={{ marginBottom: '8px', padding: '8px', background: '#fef2f2', borderRadius: '6px' }}>
                          <strong style={{ fontSize: '13px', color: '#1e293b' }}>● {p.issue || p}</strong>
                          {p.example_quote && (
                            <blockquote style={{ margin: '4px 0 0 16px', padding: '4px 8px', borderLeft: '3px solid #ef4444', fontStyle: 'italic', fontSize: '12px', color: '#64748b' }}>
                              "{p.example_quote}"
                            </blockquote>
                          )}
                        </div>
                      ))}
                    </InsightBlock>
                  )}
                  {data.workarounds && data.workarounds.length > 0 && (
                    <InsightBlock title="Recommended Improvements" icon="🔧" color="#ef4444">
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {data.workarounds.map((w, i) => (
                          <li key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '13px', color: '#334155' }}>
                            <span style={{ color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>→</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </InsightBlock>
                  )}
                  {data.actionable_insights && data.actionable_insights.length > 0 && (
                    <InsightBlock title="Action Items" icon="✅" color="#7c3aed">
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {data.actionable_insights.map((a, i) => (
                          <li key={i} style={{ display: 'flex', gap: '10px', marginBottom: '6px', alignItems: 'flex-start' }}>
                            <span style={{
                              width: '20px', height: '20px', borderRadius: '50%',
                              background: '#7c3aed', color: 'white', fontSize: '11px',
                              fontWeight: 700, display: 'flex', alignItems: 'center',
                              justifyContent: 'center', flexShrink: 0,
                            }}>{i + 1}</span>
                            <span style={{ fontSize: '13px', color: '#334155' }}>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </InsightBlock>
                  )}
                </>
              )}

              {/* POSITIVE specific */}
              {sentimentType === 'positive' && (
                <>
                  {data.strengths && data.strengths.length > 0 && (
                    <InsightBlock title="Key Strengths" icon="✨" color="#10b981">
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {data.strengths.map((s, i) => (
                          <li key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '13px', color: '#334155' }}>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </InsightBlock>
                  )}
                  {data.why_satisfied && data.why_satisfied.trim() && (
                    <InsightBlock title="Why They're Satisfied" icon="💡" color="#10b981">
                      <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>{data.why_satisfied}</p>
                    </InsightBlock>
                  )}
                  {data.standout_quotes && data.standout_quotes.length > 0 && (
                    <InsightBlock title="Standout Quotes" icon="💬" color="#10b981">
                      {data.standout_quotes.map((q, i) => (
                        <blockquote key={i} style={{
                          margin: '0 0 8px 0', padding: '8px 12px',
                          background: '#ecfdf5', borderLeft: '3px solid #10b981',
                          borderRadius: '0 6px 6px 0', fontStyle: 'italic',
                          fontSize: '13px', color: '#1e293b',
                        }}>"{q}"</blockquote>
                      ))}
                    </InsightBlock>
                  )}
                </>
              )}

              {/* NEUTRAL specific */}
              {sentimentType === 'neutral' && (
                <>
                  {data.mixed_signals && data.mixed_signals.length > 0 && (
                    <InsightBlock title="Mixed Signals" icon="↔️" color="#f59e0b">
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {data.mixed_signals.map((s, i) => (
                          <li key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '13px', color: '#334155' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0, marginTop: '5px' }} />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </InsightBlock>
                  )}
                  {data.opportunities && data.opportunities.length > 0 && (
                    <InsightBlock title="Improvement Opportunities" icon="🚀" color="#f59e0b">
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {data.opportunities.map((o, i) => (
                          <li key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '13px', color: '#334155' }}>
                            <span style={{ color: '#f59e0b', fontWeight: 700, flexShrink: 0 }}>→</span>
                            {o}
                          </li>
                        ))}
                      </ul>
                    </InsightBlock>
                  )}
                </>
              )}
            </div>

            {/* PANEL B: ALL Flagged Rows — collapses fully when hidden */}
            <div style={{ flex: showEntries ? 1 : 0, display: showEntries ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              {/* Rows header — count only, no toggle here */}
              <div style={{
                padding: '10px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'white', borderBottom: '1px solid #e2e8f0',
                flexShrink: 0, borderTop: '2px solid #e2e8f0',
              }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                  📋 All Flagged Text Entries
                </h3>
                <span style={{
                  fontSize: '12px', fontWeight: 600, color: '#64748b',
                  background: '#e2e8f0', padding: '3px 10px', borderRadius: '20px',
                }}>
                  {rows.length} {cfg.label}
                </span>
              </div>

              {/* Rows list — scrollable, only when showEntries is true */}
              {showEntries && (
                <div style={{ flex: 1, overflowY: 'auto', background: 'white' }}>
                {!hasRows ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No {sentimentType} entries found.
                  </div>
                ) : (
                  rows.map((row, idx) => {
                    const isExp = expandedIdx === idx;
                    const text = row.text || '';
                    const preview = text.length > 120 ? text.slice(0, 120) + '…' : text;
                    const confPct = Math.round((row.confidence || 0) * 100);
                    return (
                      <div
                        key={`row-${idx}`}
                        style={{ borderBottom: '1px solid #f1f5f9' }}
                      >
                        {/* Row header — clickable */}
                        <div
                          onClick={() => setExpandedIdx(isExp ? null : idx)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '12px 24px', cursor: 'pointer',
                            background: isExp ? '#f8fafc' : 'white',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = isExp ? '#f8fafc' : 'white'}
                        >
                          {/* Index badge */}
                          <span style={{
                            minWidth: '28px', height: '22px', borderRadius: '20px',
                            background: cfg.accentColor, color: 'white',
                            fontSize: '10px', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '0 6px', flexShrink: 0,
                          }}>#{idx + 1}</span>

                          {/* Text preview */}
                          <p style={{
                            flex: 1, margin: 0, fontSize: '13px',
                            color: '#334155', lineHeight: 1.5,
                          }}>
                            {isExp ? text : preview}
                          </p>

                          {/* Confidence + caret */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{
                              fontSize: '11px', fontWeight: 600, color: '#667eea',
                              background: '#ede9fe', padding: '2px 8px', borderRadius: '20px',
                            }}>
                              {confPct}%
                            </span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {isExp ? '▲' : '▼'}
                            </span>
                          </div>
                        </div>

                        {/* Expanded metadata */}
                        {isExp && (
                          <div style={{
                            padding: '8px 24px 12px',
                            background: '#f8fafc',
                            borderTop: '1px solid #f1f5f9',
                            display: 'flex', gap: '8px', flexWrap: 'wrap',
                          }}>
                            <span style={{ fontSize: '11px', color: '#64748b', background: 'white', border: '1px solid #e2e8f0', padding: '3px 9px', borderRadius: '20px' }}>
                              Row #{row.index}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b', background: 'white', border: '1px solid #e2e8f0', padding: '3px 9px', borderRadius: '20px' }}>
                              Confidence: {(row.confidence * 100).toFixed(1)}%
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b', background: 'white', border: '1px solid #e2e8f0', padding: '3px 9px', borderRadius: '20px' }}>
                              Sentiment: {row.sentiment}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              )}
            </div>

          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            No data available.
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{
          padding: '12px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid #e2e8f0', background: 'white', flexShrink: 0,
        }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
            🤖 Insights powered by Groq AI · llama-3.3-70b
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Toggle entries — always visible in footer */}
            {data && data.count > 0 && (
              <button
                onClick={() => setShowEntries(v => !v)}
                style={{
                  padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer',
                  border: `1.5px solid ${cfg.accentColor}`,
                  background: showEntries ? cfg.accentColor : 'white',
                  color: showEntries ? 'white' : cfg.accentColor,
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}
              >
                {showEntries ? '📋 Hide Entries' : '📋 Show Entries'}
              </button>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
                fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                background: '#f1f5f9', color: '#334155',
                border: '1px solid #e2e8f0', opacity: loading ? 0.6 : 1,
              }}
            >🔄 Refresh</button>
            <button
              onClick={onClose}
              style={{
                padding: '8px 20px', borderRadius: '8px', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer',
                background: cfg.gradient, color: 'white', border: 'none',
              }}
            >Close</button>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes dsm-in {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dsm-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default DetailedSentimentModal;
