'use client';

import { useState, useRef, useEffect } from 'react';
import { useAudio } from '@/context/AudioContext';
import AudioPlayer from '@/components/AudioPlayer';
import QuizModal from '@/components/QuizModal';
import MarkdownRenderer from '@/components/MarkdownRenderer';

const getRelativeTime = (dateString: string) => {
  if (!dateString) return '';
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const date = new Date(dateString);
  const diffInMinutes = Math.round((date.getTime() - Date.now()) / (1000 * 60));
  const diffInHours = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60));
  const diffInDays = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (Math.abs(diffInMinutes) < 60) return rtf.format(diffInMinutes, 'minute');
  if (Math.abs(diffInHours) < 24) return rtf.format(diffInHours, 'hour');
  return rtf.format(diffInDays, 'day');
};

export default function ModuleCard({ mod }: { mod: any }) {
  const [feedback, setFeedback] = useState<string | null>(mod.feedback || null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [isCompleted, setIsCompleted] = useState(mod.status === 'completed');
  
  const { currentTrackTitle, isPlaying, currentTime, duration } = useAudio();
  const markdownContainerRef = useRef<HTMLDivElement>(null);
  const isThisTrackActive = currentTrackTitle === mod.title;

  const [autoScroll, setAutoScroll] = useState(true);
  const lastScrolledNode = useRef<Node | null>(null);

  // Disable auto-scroll if the user manually scrolls
  useEffect(() => {
    const handleUserInteraction = () => {
      if (autoScroll) setAutoScroll(false);
    };
    
    // Listen to wheel and touchmove to detect manual scrolling
    window.addEventListener('wheel', handleUserInteraction, { passive: true });
    window.addEventListener('touchmove', handleUserInteraction, { passive: true });
    
    return () => {
      window.removeEventListener('wheel', handleUserInteraction);
      window.removeEventListener('touchmove', handleUserInteraction);
    };
  }, [autoScroll]);

  // Re-enable auto-scroll when audio starts playing again
  useEffect(() => {
    if (isPlaying && isThisTrackActive) {
      setAutoScroll(true);
    }
  }, [isPlaying, isThisTrackActive]);

  // Perform paragraph-level auto-scrolling
  useEffect(() => {
    if (!isThisTrackActive || !isPlaying || !autoScroll || !markdownContainerRef.current) return;
    if (!duration || duration <= 0) return;

    const progressPercentage = currentTime / duration;
    
    // Walk all text nodes to find the one corresponding to the audio progress
    const walker = document.createTreeWalker(
      markdownContainerRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let totalChars = 0;
    const textNodes: { node: Node; len: number }[] = [];
    
    let currentNode = walker.nextNode();
    while (currentNode) {
      const len = currentNode.textContent?.trim().length || 0;
      if (len > 0) {
        textNodes.push({ node: currentNode, len });
        totalChars += len;
      }
      currentNode = walker.nextNode();
    }
    
    if (totalChars === 0) return;
    
    const targetChar = progressPercentage * totalChars;
    let charCount = 0;
    let targetNode: Node | null = null;
    
    for (const { node, len } of textNodes) {
      charCount += len;
      if (charCount >= targetChar) {
        targetNode = node;
        break;
      }
    }
    
    if (targetNode && targetNode !== lastScrolledNode.current && targetNode.parentElement) {
      lastScrolledNode.current = targetNode;
      targetNode.parentElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentTime, duration, isThisTrackActive, isPlaying, autoScroll]);

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
            {mod.createdAt && ` • Generated ${new Date(mod.createdAt).toLocaleDateString()} (${getRelativeTime(mod.createdAt)})`}
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
      
      <AudioPlayer moduleId={mod.id} title={mod.title} markdownContent={mod.content} initialProgress={mod.progressSeconds} />
      
      <div ref={markdownContainerRef} style={{ position: 'relative' }}>
        {!autoScroll && isThisTrackActive && (
          <button 
            onClick={() => setAutoScroll(true)}
            style={{
              position: 'sticky',
              top: '20px',
              float: 'right',
              padding: '0.5rem 1rem',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              fontWeight: 'bold',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ↓ Sync to Audio
          </button>
        )}
        <MarkdownRenderer content={mod.content} />
      </div>
      
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
