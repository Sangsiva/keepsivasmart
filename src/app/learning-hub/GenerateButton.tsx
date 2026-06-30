'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const LOADING_MESSAGES = [
  '🧠 Analyzing your profile and knowledge gaps...',
  '📚 Curating a custom curriculum...',
  '🎧 Synthesizing audio and finalizing module...'
];

export default function GenerateButton() {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => Math.min(prev + 1, LOADING_MESSAGES.length - 1));
      }, 8000); // Change message every 8 seconds
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const projectContext = localStorage.getItem('projectContext') || 'Building a robust full-stack AI agent.';
      const apiKey = localStorage.getItem('geminiApiKey') || undefined;
      
      const topicWeightsRaw = localStorage.getItem('topicWeights');
      let topicWeights = [{ topic: 'AI & LLMs', weight: 100 }];
      
      if (topicWeightsRaw) {
        try {
          topicWeights = JSON.parse(topicWeightsRaw);
        } catch (e) {
          console.error("Failed to parse topic weights", e);
        }
      } else {
        // Fallback for legacy format
        const rawSkills = localStorage.getItem('baseSkills');
        if (rawSkills) {
           topicWeights = rawSkills.split(',').map(s => ({ topic: s.trim(), weight: 100 }));
        }
      }
      
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicWeights,
          projectContext,
          apiKey,
          durationMinutes: 15,
        })
      });
      
      if (res.ok) {
        router.refresh(); // Refresh the Server Component to show new modules
      } else {
        const err = await res.json();
        alert('Failed to generate: ' + err.error);
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred during generation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <p style={{ color: 'var(--text-secondary)' }}>
        Ready for your daily learning session? Let the agent curate your curriculum.
      </p>
      <button 
        className="btn-primary" 
        onClick={handleGenerate} 
        disabled={loading}
        style={{
          minWidth: '280px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          opacity: loading ? 0.8 : 1,
          cursor: loading ? 'wait' : 'pointer'
        }}
      >
        {loading ? (
          <>
            <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            {LOADING_MESSAGES[loadingStep]}
          </>
        ) : '✨ Generate Today\'s Module'}
      </button>
    </div>
  );
}
