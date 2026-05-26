import React, { useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import type { TaskNode } from '../types.js'

interface ReviewPanelProps {
  task: TaskNode
  onApprove: (taskId: string, feedback?: string) => void
  onReject: (taskId: string, feedback: string) => void
}

export function ReviewPanel({ task, onApprove, onReject }: ReviewPanelProps) {
  const intl = useIntl()
  const [feedback, setFeedback] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  if (task.status !== 'awaiting_review') return null

  const result = task.result

  return (
    <div style={{
      borderTop: '1px solid #30363d', background: '#161b22',
      padding: '12px 16px', fontSize: 13,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🟡</span>
        <span style={{ fontWeight: 600, color: '#d29922' }}>
          <FormattedMessage id="review.title" />
        </span>
      </div>

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          <div style={{ color: '#8b949e' }}>
            <FormattedMessage id="review.summary" />
          </div>
          <div style={{
            background: '#0d1117', border: '1px solid #30363d', borderRadius: 4,
            padding: 8, color: '#c9d1d9', fontSize: 12, maxHeight: 100, overflow: 'auto',
          }}>
            {result.summary}
          </div>

          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#8b949e' }}>
            <span>
              <FormattedMessage id="review.cost" values={{ cost: result.cost.toFixed(4) }}
              />
            </span>
            {result.tokens && (
              <span>
                <FormattedMessage id="review.tokens" values={{ input: result.tokens.input, output: result.tokens.output }}
                />
              </span>
            )}
          </div>

          {result.artifacts.length > 0 && (
            <div>
              <div style={{ color: '#8b949e', marginBottom: 4 }}>
                <FormattedMessage id="review.files" />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {result.artifacts.map((f, i) => (
                  <span key={i} style={{
                    background: '#21262d', color: '#58a6ff', padding: '2px 6px',
                    borderRadius: 4, fontSize: 11, fontFamily: 'monospace',
                  }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!showRejectForm ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onApprove(task.id)}
            style={{
              padding: '6px 16px', background: '#238636', color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13,
            }}
          >
            <FormattedMessage id="review.approve" />
          </button>
          <button
            onClick={() => setShowRejectForm(true)}
            style={{
              padding: '6px 16px', background: '#da3633', color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13,
            }}
          >
            <FormattedMessage id="review.reject" />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={intl.formatMessage({ id: 'review.feedbackPlaceholder' })}
            rows={3}
            style={{
              width: '100%', padding: '6px 10px', background: '#0d1117', color: '#c9d1d9',
              border: '1px solid #30363d', borderRadius: 4, fontSize: 12, resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                onReject(task.id, feedback)
                setFeedback('')
                setShowRejectForm(false)
              }}
              disabled={!feedback.trim()}
              style={{
                padding: '6px 16px', background: feedback.trim() ? '#da3633' : '#484f58',
                color: '#fff', border: 'none', borderRadius: 4, cursor: feedback.trim() ? 'pointer' : 'not-allowed',
                fontSize: 13,
              }}
            >
              <FormattedMessage id="review.submitReject" />
            </button>
            <button
              onClick={() => { setShowRejectForm(false); setFeedback('') }}
              style={{
                padding: '6px 16px', background: '#21262d', color: '#c9d1d9',
                border: '1px solid #30363d', borderRadius: 4, cursor: 'pointer', fontSize: 13,
              }}
            >
              <FormattedMessage id="review.cancel" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
