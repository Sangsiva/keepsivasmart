import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShareStreakButton from '../ShareStreakButton';

describe('ShareStreakButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.alert
    vi.stubGlobal('alert', vi.fn());
  });

  it('uses navigator.share when available', async () => {
    const mockShare = vi.fn().mockResolvedValue(true);
    Object.assign(navigator, {
      share: mockShare,
    });

    render(<ShareStreakButton streak={5} totalModules={10} />);
    
    const button = screen.getByText('↗ Share My Streak');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: 'My Learning Streak',
        text: "🔥 I'm on a 5-day learning streak on KeepSivaSmart! I've completed 10 modules so far. 🧠",
        url: window.location.origin,
      });
    });
  });

  it('falls back to navigator.clipboard when share is not available', async () => {
    // Remove navigator.share to trigger fallback
    Object.assign(navigator, {
      share: undefined,
      clipboard: {
        writeText: vi.fn().mockResolvedValue(true),
      },
    });

    render(<ShareStreakButton streak={5} totalModules={10} />);
    
    const button = screen.getByText('↗ Share My Streak');
    fireEvent.click(button);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "🔥 I'm on a 5-day learning streak on KeepSivaSmart! I've completed 10 modules so far. 🧠"
      );
      expect(window.alert).toHaveBeenCalledWith('Streak copied to clipboard! Share it anywhere.');
    });
  });
});
