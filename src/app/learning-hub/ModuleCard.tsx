'use client';

import { useState } from 'react';
import AudioPlayer from '@/components/AudioPlayer';
import QuizModal from '@/components/QuizModal';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export default function ModuleCard({ mod }: { mod: any }) {
  const [feedback, setFeedback] = useState<string | null>(mod.feedback || null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [isCompleted, setIsCompleted] = useState(mod.status === 'completed');

  const handleMarkComplete = async () => {
    setIsCompleted(true);
    try {
      await fetch(`/api/modules/${mod.id}/complete`, { method: 'POST' });
    } catch (e) {
      console.error("Failed to mark complete", e);
    }
  };

  const handleFeedback = async (vote: string) => {
    setFeedback(vote);
    try {
      await fetch(`/api/modules/${mod.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: vote })
      });
    } catch (e) {
      console.error("Failed to save feedback", e);
    }
  };

  return (
    <div style={{ border: '1px solid #eaeaea', background: 'white', padding: '2rem', marginBottom: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>
          {mod.title} <br/>
          <span style={{ fontSize: '0.9rem', color: '#888', fontWeight: 'normal' }}>
            ({mod.type === 'primary' ? '1 Hour Deep Dive' : '15 Min Quick Session'})
          </span>
        </h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {isCompleted ? (
            <div style={{ padding: '0.5rem 1rem', background: '#e8f5e9', color: '#2e7d32', borderRadius: '4px', fontWeight: 'bold' }}>
              ✓ Completed
            </div>
          ) : (
            <button 
              onClick={handleMarkComplete}
              style={{ padding: '0.5rem 1rem', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✅ Mark as Complete
            </button>
          )}
          <button 
            onClick={() => setShowQuiz(true)}
            style={{ padding: '0.5rem 1rem', background: '#9c27b0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🧠 Test My Knowledge
          </button>
        </div>
      </div>
      
      <AudioPlayer title={mod.title} markdownContent={mod.content} />
      
      <MarkdownRenderer content={mod.content} />
      
      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #eaeaea', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: '0 0 1rem 0', fontWeight: 'bold' }}>How was this module?</p>
          <button 
            onClick={() => handleFeedback('too_basic')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', borderRadius: '20px', border: feedback === 'too_basic' ? 'none' : '1px solid #ccc', background: feedback === 'too_basic' ? 'var(--primary)' : 'transparent', color: feedback === 'too_basic' ? 'white' : 'black', cursor: 'pointer' }}
          >
            📉 Too Basic
          </button>
          <button 
            onClick={() => handleFeedback('spot_on')}
            style={{ marginRight: '1rem', padding: '0.5rem 1rem', borderRadius: '20px', border: feedback === 'spot_on' ? 'none' : '1px solid #ccc', background: feedback === 'spot_on' ? 'var(--primary)' : 'transparent', color: feedback === 'spot_on' ? 'white' : 'black', cursor: 'pointer' }}
          >
            🎯 Spot On
          </button>
          <button 
            onClick={() => handleFeedback('too_advanced')}
            style={{ padding: '0.5rem 1rem', borderRadius: '20px', border: feedback === 'too_advanced' ? 'none' : '1px solid #ccc', background: feedback === 'too_advanced' ? 'var(--primary)' : 'transparent', color: feedback === 'too_advanced' ? 'white' : 'black', cursor: 'pointer' }}
          >
            📈 Too Advanced
          </button>
        </div>
      </div>
      
      {showQuiz && (
        <QuizModal 
          moduleId={mod.id} 
          markdownContent={mod.content} 
          onClose={() => setShowQuiz(false)} 
          onComplete={handleMarkComplete}
        />
      )}
    </div>
  );
}
