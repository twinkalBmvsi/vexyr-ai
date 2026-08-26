'use client'

import { useState } from 'react'
import { Star, MessageSquare } from 'lucide-react'
import { submitFeedback } from '@/app/actions/submit-feedback'

interface FeedbackWidgetProps {
  tenantId: string
  tenantSlug: string
}

export default function FeedbackWidget({ tenantId, tenantSlug }: FeedbackWidgetProps) {
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a star rating.')
      return
    }
    if (!comment.trim()) {
      setError('Please provide a comment.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    
    const result = await submitFeedback(tenantId, rating, comment, tenantSlug)
    if (!result.success) {
      setError(result.error || 'Something went wrong.')
      setIsSubmitting(false)
    }
    // If successful, the server action revalidates the path and the component won't be rendered anymore.
  }

  return (
    <div style={{
      marginTop: '3rem',
      padding: '2rem',
      background: 'var(--paper)',
      border: '1px solid var(--border-strong)',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <MessageSquare size={20} color="var(--gold)" />
        <h3 style={{ fontSize: '1.2rem', fontFamily: 'DM Sans', fontWeight: 600, color: 'var(--ink)' }}>We value your feedback</h3>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: 1.6, maxWidth: '600px' }}>
        How is Vexyr working for your business? Your testimonial might be featured on our landing page.
      </p>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(220,38,38,0.08)', color: '#dc2626', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.2)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '600px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }}>Rating</label>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.1s'
                }}
              >
                <Star
                  size={28}
                  fill={(hoverRating || rating) >= star ? 'var(--gold)' : 'transparent'}
                  color={(hoverRating || rating) >= star ? 'var(--gold)' : 'var(--border-strong)'}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.5rem' }}>Your Testimonial</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience using Vexyr..."
            rows={4}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              color: 'var(--ink)',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--gold)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  )
}
