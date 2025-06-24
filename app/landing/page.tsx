'use client';
import React, { useState, useEffect } from 'react';

export default function Home() {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const texts = [
    "being cut off from the words of Allah.",
    "being disconnected from the works of scholars.",
    "constantly forgetting vocabulary.",
    "being overwhelmed by grammar rules."
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentText = texts[currentIndex];
      
      if (isDeleting) {
        setDisplayText(currentText.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      } else {
        setDisplayText(currentText.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }
      
      let speed = isDeleting ? 30 : 80;
      
      if (!isDeleting && charIndex === currentText.length) {
        speed = 2000;
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setCurrentIndex((currentIndex + 1) % texts.length);
        speed = 500;
      }
    }, isDeleting ? 30 : 80);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, currentIndex]);

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#ffffff' }}>
      {/* Page 1 - White Background */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '4rem 0 6rem', position: 'relative', backgroundColor: '#ffffff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
            
            {/* Left side */}
            <div style={{ maxWidth: '100%' }}>
              <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: '900', lineHeight: '1.1', marginBottom: '1.5rem', color: '#000000' }}>
                Stop{' '}
                <span style={{ color: '#8b5cf6' }}>
                  {displayText}
                  <span style={{ borderRight: '3px solid #8b5cf6', animation: 'blink 1s infinite' }}></span>
                </span>
              </h1>
              
              <p style={{ fontSize: '1.2rem', color: '#666666', marginBottom: '3rem', lineHeight: '1.4', maxWidth: '100%' }}>
                The science-backed method that got me from 0 to understanding 80% of the Quran in 12 months
              </p>
              
              {/* Email Form */}
              <div style={{ 
                background: '#f8f8f8', 
                padding: '2rem', 
                borderRadius: '16px', 
                border: '2px solid #8b5cf6', 
                boxShadow: '0 10px 30px rgba(139, 92, 246, 0.15)' 
              }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#000000', marginBottom: '1rem', textAlign: 'center' }}>
                  Free Guide: Understand Arabic Faster
                </h3>
                <input 
                  type="text" 
                  placeholder="Enter your first name"
                  style={{ 
                    width: '100%', 
                    padding: '1rem 1.5rem', 
                    fontSize: '1.1rem',
                    border: '2px solid #e5e5e5', 
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    background: '#ffffff'
                  }}
                />
                <input 
                  type="email" 
                  placeholder="Enter your email address"
                  style={{ 
                    width: '100%', 
                    padding: '1rem 1.5rem', 
                    fontSize: '1.1rem',
                    border: '2px solid #e5e5e5', 
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    background: '#ffffff'
                  }}
                />
                <button style={{ 
                  width: '100%', 
                  padding: '1.2rem 2rem', 
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  background: '#8b5cf6', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  I want to understand the words of Allah!
                </button>
                <p style={{ textAlign: 'center', color: '#666666', fontSize: '0.9rem', marginTop: '1rem' }}>
                  🔒 We will never share your information
                </p>
              </div>
            </div>

            {/* Right side - Bigger Book */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{
                width: '400px',
                height: '520px',
                background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                textAlign: 'center',
                padding: '2.5rem',
                boxShadow: '0 20px 50px rgba(139, 92, 246, 0.3)',
                transform: 'perspective(600px) rotateY(-15deg)',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'perspective(600px) rotateY(0deg)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'perspective(600px) rotateY(-15deg)'}
              >
                <div style={{ fontSize: '2.2rem', fontWeight: '800', lineHeight: '1.2', marginBottom: '1.5rem' }}>
                  The Arabic Immersion Method
                </div>
                <div style={{ fontSize: '1.2rem', opacity: '0.9', lineHeight: '1.4' }}>
                  Stop Forgetting Vocabulary Forever
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simple Arrow */}
        <div 
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            cursor: 'pointer',
            fontSize: '2rem',
            color: '#000000',
            animation: 'bounce 2s infinite'
          }}
        >
          ▼
        </div>
      </section>

      {/* Page 2 */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '4rem 0', background: '#f8f8f8' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', width: '100%' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: '800', textAlign: 'left', marginBottom: '2rem', color: '#000000', maxWidth: '600px' }}>
            In this step-by-step guide, you'll uncover:
          </h2>
          
          <p style={{ fontSize: '1.2rem', color: '#666666', marginBottom: '4rem', lineHeight: '1.4', maxWidth: '700px' }}>
            Proven strategies used by successful polyglots (from Japanese to Norwegian) to go from overwhelmed beginners to native-level comprehension:
          </p>
          
          {/* Centered, Wider Benefits Grid */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '4rem', maxWidth: '1200px', margin: '0 auto 4rem auto' }}>
            <div style={{ 
              flex: '1', 
              background: '#ffffff', 
              padding: '2rem 1.5rem', 
              borderRadius: '16px', 
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)', 
              minHeight: '280px', 
              position: 'relative',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.boxShadow = '0 20px 50px rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.1)';
            }}
            >
              <span style={{ fontSize: '2.5rem', position: 'absolute', top: '1.5rem', right: '1.5rem' }}>📚</span>
              <div style={{ fontSize: '3rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '1rem' }}>One</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#000000', marginBottom: '1rem' }}>Stop Wasting Hours on Endless Vocab Repetition</h3>
              <p style={{ color: '#666666', fontSize: '0.95rem', lineHeight: '1.5' }}>The memory strategies that make Arabic words stick permanently (without drilling them 500 times)</p>
            </div>
            
            <div style={{ 
              flex: '1', 
              background: '#ffffff', 
              padding: '2rem 1.5rem', 
              borderRadius: '16px', 
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)', 
              minHeight: '280px', 
              position: 'relative', 
              marginTop: '2rem',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.boxShadow = '0 20px 50px rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(2rem)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.1)';
            }}
            >
              <span style={{ fontSize: '2.5rem', position: 'absolute', top: '1.5rem', right: '1.5rem' }}>🎯</span>
              <div style={{ fontSize: '3rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '1rem' }}>Two</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#000000', marginBottom: '1rem' }}>Why You're Learning Arabic the Hard Way</h3>
              <p style={{ color: '#666666', fontSize: '0.95rem', lineHeight: '1.5' }}>The evidence-based shortcut that gets results in months, not years</p>
            </div>
            
            <div style={{ 
              flex: '1', 
              background: '#ffffff', 
              padding: '2rem 1.5rem', 
              borderRadius: '16px', 
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)', 
              minHeight: '280px', 
              position: 'relative',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.boxShadow = '0 20px 50px rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.1)';
            }}
            >
              <span style={{ fontSize: '2.5rem', position: 'absolute', top: '1.5rem', right: '1.5rem' }}>🧩</span>
              <div style={{ fontSize: '3rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '1rem' }}>Three</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#000000', marginBottom: '1rem' }}>From Knowing Grammar Rules to Actually Understanding Arabic</h3>
              <p style={{ color: '#666666', fontSize: '0.95rem', lineHeight: '1.5' }}>How to bridge the gap between textbook knowledge and real comprehension</p>
            </div>

            <div style={{ 
              flex: '1', 
              background: '#ffffff', 
              padding: '2rem 1.5rem', 
              borderRadius: '16px', 
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)', 
              minHeight: '280px', 
              position: 'relative', 
              marginTop: '2rem',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.boxShadow = '0 20px 50px rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(2rem)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.1)';
            }}
            >
              <span style={{ fontSize: '2.5rem', position: 'absolute', top: '1.5rem', right: '1.5rem' }}>✨</span>
              <div style={{ fontSize: '3rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '1rem' }}>Four</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#000000', marginBottom: '1rem' }}>From Boring Lessons to Actually Enjoying Arabic</h3>
              <p style={{ color: '#666666', fontSize: '0.95rem', lineHeight: '1.5' }}>How to make Arabic learning engaging instead of a constant struggle</p>
            </div>
          </div>

          {/* Final CTA */}
          <div style={{ textAlign: 'center', background: '#8b5cf6', color: 'white', padding: '3rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '1rem' }}>Ready to finally understand the words of Allah?</h3>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{ background: '#ffffff', color: '#8b5cf6', padding: '1rem 2rem', fontSize: '1.2rem', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              I want to understand the words of Allah!
            </button>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes blink {
          0%, 50% { border-color: #8b5cf6; }
          51%, 100% { border-color: transparent; }
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}