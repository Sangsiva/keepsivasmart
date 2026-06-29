import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SettingsPage from '../page';

// Mock localStorage to prevent errors in testing
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: () => null,
    setItem: () => null,
  },
  writable: true
});

describe('SettingsPage UI', () => {
  it('renders all required form fields for User Profile', () => {
    render(<SettingsPage />);
    
    // Check if the primary fields are present
    expect(screen.getByText(/Weighted Learning Topics/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Context/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Google Gemini API Key/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
  });

  it('allows user to type in the project context field', () => {
    render(<SettingsPage />);
    
    const projectContextInput = screen.getByLabelText(/Project Context/i) as HTMLTextAreaElement;
    fireEvent.change(projectContextInput, { target: { value: 'Building an AI Agent' } });
    
    expect(projectContextInput.value).toBe('Building an AI Agent');
  });

  it('can add a new weighted topic', () => {
    render(<SettingsPage />);
    
    const addTopicBtn = screen.getByText('+ Add Topic');
    fireEvent.click(addTopicBtn);
    
    // There should now be two "New Topic" inputs (one from default, one newly added)
    const topicInputs = screen.getAllByPlaceholderText('e.g. System Design');
    expect(topicInputs.length).toBeGreaterThan(1);
  });
});
