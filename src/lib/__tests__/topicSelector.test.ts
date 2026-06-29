import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { selectWeightedTopic, TopicWeight } from '../topicSelector';

describe('selectWeightedTopic', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns fallback topic when array is empty', () => {
    expect(selectWeightedTopic([])).toBe('AI & LLMs');
  });

  it('returns custom fallback topic when array is empty', () => {
    expect(selectWeightedTopic([], 'Custom Fallback')).toBe('Custom Fallback');
  });

  it('returns the first topic if random hits its weight exactly', () => {
    // Mock random to return 0.5 (which translates to 50 when multiplied by 100)
    vi.mocked(Math.random).mockReturnValue(0.5);
    const weights: TopicWeight[] = [
      { topic: 'A', weight: 50 },
      { topic: 'B', weight: 50 },
    ];
    expect(selectWeightedTopic(weights)).toBe('A');
  });

  it('returns the second topic if random hits its weight', () => {
    // Mock random to return 0.6 (60)
    vi.mocked(Math.random).mockReturnValue(0.6);
    const weights: TopicWeight[] = [
      { topic: 'A', weight: 50 },
      { topic: 'B', weight: 50 },
    ];
    expect(selectWeightedTopic(weights)).toBe('B');
  });

  it('handles weights that do not add up to 100', () => {
    // Mock random to return 0.3 (30)
    vi.mocked(Math.random).mockReturnValue(0.3);
    const weights: TopicWeight[] = [
      { topic: 'A', weight: 10 }, // sum 10
      { topic: 'B', weight: 10 }, // sum 20
      { topic: 'C', weight: 10 }, // sum 30
      { topic: 'D', weight: 10 }, // sum 40
    ];
    expect(selectWeightedTopic(weights)).toBe('C');
  });

  it('returns fallback if random is higher than total weights', () => {
    // Mock random to return 0.9 (90)
    vi.mocked(Math.random).mockReturnValue(0.9);
    const weights: TopicWeight[] = [
      { topic: 'A', weight: 10 },
      { topic: 'B', weight: 10 },
    ];
    expect(selectWeightedTopic(weights)).toBe('AI & LLMs');
  });
});
