'use client';

import { useState, useEffect } from 'react';

export default function ModuleCard({ mod }: { mod: any }) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Cleanup speech if component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleSpeech = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      // Very basic markdown stripper so the bot doesn't read out "hash hash"
      const cleanText = mod.content.replace(/[#*`_-]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Try to find a good English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US English'));
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  return (
    <div style={{ border: '1px solid #eaeaea', background: 'white', padding: '2rem', marginBottom: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>
          {mod.title} <br/>
          <span style={{ fontSize: '0.9rem', color: '#888', fontWeight: 'normal' }}>
            ({mod.type === 'primary' ? '1 Hour Deep Dive' : '30 Min Quick Session'})
          </span>
        </h2>
        <button 
          onClick={toggleSpeech} 
          className="btn-primary" 
          style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {isPlaying ? '⏹ Stop Audio' : '🔊 Listen (Commute Mode)'}
        </button>
      </div>
      
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#333' }}>
        {mod.content}
      </div>
      
      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #eaeaea' }}>
        <p style={{ margin: '0 0 1rem 0', fontWeight: 'bold' }}>How was this module?</p>
        <button style={{ marginRight: '1rem', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid #ccc', background: 'transparent', cursor: 'pointer' }}>📉 Too Basic</button>
        <button style={{ marginRight: '1rem', padding: '0.5rem 1rem', borderRadius: '20px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer' }}>🎯 Spot On</button>
        <button style={{ padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid #ccc', background: 'transparent', cursor: 'pointer' }}>📈 Too Advanced</button>
      </div>
    </div>
  );
}
