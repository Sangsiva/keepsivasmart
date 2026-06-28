import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SettingsPage from '../page';

describe('SettingsPage UI', () => {
  it('renders all required form fields for User Profile', () => {
    render(<SettingsPage />);
    
    // Check if the primary fields are present
    expect(screen.getByLabelText(/Base Skills/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Context/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
  });

  it('allows user to type in fields', () => {
    render(<SettingsPage />);
    
    const skillsInput = screen.getByLabelText(/Base Skills/i) as HTMLInputElement;
    fireEvent.change(skillsInput, { target: { value: 'AI, React, Node' } });
    
    expect(skillsInput.value).toBe('AI, React, Node');
  });
});
