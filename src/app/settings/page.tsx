'use client';

import { useState, useEffect } from 'react';

type TopicWeight = { id: string; topic: string; weight: number };

export default function SettingsPage() {
  const [projectContext, setProjectContext] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [ttsVoice, setTtsVoice] = useState('alloy');
  const [topics, setTopics] = useState<TopicWeight[]>([]);

  useEffect(() => {
    setProjectContext(localStorage.getItem('projectContext') || '');
    setApiKey(localStorage.getItem('geminiApiKey') || '');
    setTtsVoice(localStorage.getItem('ttsVoice') || 'alloy');
    const savedTopics = localStorage.getItem('topicWeights');
    if (savedTopics) {
      try {
        setTopics(JSON.parse(savedTopics));
      } catch (e) {
        setTopics([{ id: '1', topic: 'AI & LLMs', weight: 100 }]);
      }
    } else {
      // Default migration from old baseSkills
      const oldSkills = localStorage.getItem('baseSkills');
      if (oldSkills) {
        const skillsArr = oldSkills.split(',').map(s => s.trim());
        const weightPerSkill = Math.floor(100 / skillsArr.length);
        const newTopics = skillsArr.map((s, i) => ({
          id: Math.random().toString(),
          topic: s,
          weight: i === skillsArr.length - 1 ? 100 - (weightPerSkill * i) : weightPerSkill
        }));
        setTopics(newTopics);
      } else {
        setTopics([{ id: '1', topic: 'AI & LLMs', weight: 100 }]);
      }
    }
  }, []);

  const handleSave = async () => {
    const totalWeight = topics.reduce((sum, t) => sum + t.weight, 0);
    if (totalWeight !== 100) {
      alert(`Total weights must equal 100%. Currently it is ${totalWeight}%`);
      return;
    }
    localStorage.setItem('projectContext', projectContext);
    localStorage.setItem('geminiApiKey', apiKey);
    localStorage.setItem('ttsVoice', ttsVoice);
    localStorage.setItem('topicWeights', JSON.stringify(topics));
    
    // Sync to backend for Cron job access
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectContext, 
          baseSkills: JSON.stringify(topics) // Save the JSON string into baseSkills
        })
      });
      alert('Settings saved successfully! Automated Daily Generation is now configured.');
    } catch (e) {
      console.error(e);
      alert('Settings saved locally, but backend sync failed.');
    }
  };

  const addTopic = () => {
    setTopics([...topics, { id: Math.random().toString(), topic: '', weight: 0 }]);
  };

  const updateTopic = (id: string, field: 'topic' | 'weight', value: string | number) => {
    setTopics(topics.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTopic = (id: string) => {
    setTopics(topics.filter(t => t.id !== id));
  };

  const totalWeight = topics.reduce((s, t) => s + t.weight, 0);

  return (
    <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1>Profile Settings</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Weighted Learning Topics
        </label>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
          Assign percentage weights to topics. The AI will randomly select ONE topic per day based on these probabilities. Total must equal 100%.
        </p>
        
        {topics.map((t) => (
          <div key={t.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input 
              type="text" 
              value={t.topic} 
              onChange={(e) => updateTopic(t.id, 'topic', e.target.value)}
              placeholder="e.g. System Design"
              style={{ flex: 1, padding: '0.5rem' }}
            />
            <input 
              type="number" 
              value={t.weight} 
              onChange={(e) => updateTopic(t.id, 'weight', parseInt(e.target.value) || 0)}
              style={{ width: '80px', padding: '0.5rem' }}
            />
            <span style={{ padding: '0.5rem 0' }}>%</span>
            <button onClick={() => removeTopic(t.id)} style={{ padding: '0.5rem', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>X</button>
          </div>
        ))}
        <button onClick={addTopic} style={{ padding: '0.5rem 1rem', background: '#eaeaea', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', marginTop: '0.5rem' }}>
          + Add Topic
        </button>
        <div style={{ marginTop: '1rem', fontWeight: 'bold', color: totalWeight === 100 ? 'green' : '#ff4444' }}>
          Total Weight: {totalWeight}% {totalWeight !== 100 && '(Must equal 100%)'}
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="projectContext" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Project Context
        </label>
        <textarea 
          id="projectContext" 
          value={projectContext} 
          onChange={(e) => setProjectContext(e.target.value)} 
          placeholder="What are you currently working on?"
          rows={4}
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="ttsVoice" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          AI Voice (OpenAI TTS)
        </label>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
          Select the voice for the generated audio modules (requires an API Key).
        </p>
        <select
          id="ttsVoice"
          value={ttsVoice}
          onChange={(e) => setTtsVoice(e.target.value)}
          className="input-field"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }}
        >
          <option value="alloy">Alloy (Neutral, versatile)</option>
          <option value="echo">Echo (Warm, round)</option>
          <option value="fable">Fable (Expressive, British-ish)</option>
          <option value="onyx">Onyx (Deep, authoritative)</option>
          <option value="nova">Nova (Energetic, female)</option>
          <option value="shimmer">Shimmer (Clear, female)</option>
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="apiKey" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Google Gemini API Key (Optional)
        </label>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
          Leave blank to use Demo Mode. Keys are stored safely in your browser.
        </p>
        <input 
          id="apiKey" 
          type="password" 
          value={apiKey} 
          onChange={(e) => setApiKey(e.target.value)} 
          placeholder="AIzaSy..."
          className="input-field"
        />
      </div>

      <button 
        onClick={handleSave}
        className="btn-primary"
        style={{ padding: '0.75rem 1.5rem', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        disabled={totalWeight !== 100}
      >
        Save Settings
      </button>
    </div>
  );
}
