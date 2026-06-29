import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GenerateButton from '../GenerateButton';

// Mock the global fetch API
global.fetch = vi.fn();

// Mock localStorage
const mockGetItem = vi.fn();
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: mockGetItem,
  },
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe('GenerateButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<GenerateButton />);
    expect(screen.getByText("✨ Generate Today's Module")).toBeInTheDocument();
  });

  it('calls the API with default values when localStorage is empty', async () => {
    mockGetItem.mockReturnValue(null);
    
    // Mock successful fetch
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ title: 'New Module' }),
    } as any);

    render(<GenerateButton />);

    fireEvent.click(screen.getByText("✨ Generate Today's Module"));

    expect(screen.getByText("Curating 15-Minute Deep Dive... (Takes ~30s)")).toBeInTheDocument();

    await waitFor(() => {
      // Need to grab the mocked push/refresh functions. 
      // Since we mocked `useRouter`, we can check the calls indirectly.
      // But we need a reference to the returned object. 
      // Let's refactor the mock slightly to be able to assert on it, or just assert fetch was called.
      expect(global.fetch).toHaveBeenCalled();
    });

    // Verify fetch was called with correct payload
    expect(global.fetch).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"durationMinutes":15'),
    }));
  });

  it('passes topicWeights from localStorage to the API', async () => {
    // Mock user having custom topics
    mockGetItem.mockImplementation((key) => {
      if (key === 'topicWeights') {
        return JSON.stringify([{ topic: 'React', weight: 100 }]);
      }
      return null;
    });

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ title: 'React Module' }),
    } as any);

    render(<GenerateButton />);
    fireEvent.click(screen.getByText("✨ Generate Today's Module"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const callArg = vi.mocked(global.fetch).mock.calls[0][1];
    const body = JSON.parse(callArg!.body as string);
    
    // Verify the correct topics are sent
    expect(body.topicWeights).toEqual([{ topic: 'React', weight: 100 }]);
    expect(body.durationMinutes).toBe(15);
  });
});
