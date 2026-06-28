'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [baseSkills, setBaseSkills] = useState('');
  const [projectContext, setProjectContext] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    setBaseSkills(localStorage.getItem('baseSkills') || '');
    setProjectContext(localStorage.getItem('projectContext') || '');
    setApiKey(localStorage.getItem('geminiApiKey') || '');
  }, []);

  const handleSave = () => {
    localStorage.setItem('baseSkills', baseSkills);
    localStorage.setItem('projectContext', projectContext);
    localStorage.setItem('geminiApiKey', apiKey);
    alert('Settings saved locally! They will be used for your next AI generation.');
  };

  return (
    <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1>Profile Settings</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="baseSkills" style={{ display: 'block', marginBottom: '0.5rem' }}>
          Base Skills (comma separated)
        </label>
        <input 
          id="baseSkills" 
          type="text" 
          value={baseSkills} 
          onChange={(e) => setBaseSkills(e.target.value)} 
          placeholder="e.g. AI, React, Node"
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="projectContext" style={{ display: 'block', marginBottom: '0.5rem' }}>
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
        <label htmlFor="apiKey" style={{ display: 'block', marginBottom: '0.5rem' }}>
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
      >
        Save Settings
      </button>
    </div>
  );
}
