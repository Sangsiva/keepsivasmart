'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GenerateButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // For now, load settings from localStorage as mock auth/profile
      const rawSkills = localStorage.getItem('baseSkills') || 'AI, LLMs, System Architecture';
      const baseSkills = rawSkills.split(',').map(s => s.trim());
      const projectContext = localStorage.getItem('projectContext') || 'Building a robust full-stack AI agent.';
      
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseSkills,
          projectContext,
          durationMinutes: 60,
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
      <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
        {loading ? 'Curating 1-Hour Deep Dive... (Takes ~30s)' : '✨ Generate Today\'s Module'}
      </button>
    </div>
  );
}
