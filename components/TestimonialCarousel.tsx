'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function TestimonialCarousel({ testimonials }: { testimonials: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef
      const scrollAmount = direction === 'left' ? -370 : 370 // Card width (350px) + gap
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div 
        ref={scrollRef}
        className="testi-grid" 
        style={{ 
          display: 'flex', 
          overflowX: 'auto', 
          scrollSnapType: 'x mandatory', 
          paddingBottom: '1rem',
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none', 
          gap: '2rem'
        }}
      >
        <style>{`.testi-grid::-webkit-scrollbar { display: none; }`}</style>
        {testimonials.map((testi: any) => (
          <div key={testi.id} className="testi-card" style={{ flex: '0 0 auto', width: '350px', scrollSnapAlign: 'start' }}>
            <span className="testi-quote">"</span>
            <p className="testi-text">{testi.quote}</p>
            <div className="testi-author">
              <div className="testi-avatar">{testi.initials}</div>
              <div>
                <div className="testi-name">{testi.name}</div>
                <div className="testi-biz">{testi.business}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
        <button 
          onClick={() => scroll('left')} 
          aria-label="Previous testimonial"
          style={{ 
            padding: '0.75rem', 
            borderRadius: '50%', 
            background: 'var(--paper)', 
            border: '1px solid rgba(245,242,236,0.12)', 
            color: 'var(--gold)', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--paper)'}
        >
          <ChevronLeft size={20} />
        </button>
        <button 
          onClick={() => scroll('right')} 
          aria-label="Next testimonial"
          style={{ 
            padding: '0.75rem', 
            borderRadius: '50%', 
            background: 'var(--paper)', 
            border: '1px solid rgba(245,242,236,0.12)', 
            color: 'var(--gold)', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--paper)'}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}
