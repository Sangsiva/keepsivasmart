import { describe, it, expect } from 'vitest';
import { buildPromptPipeline } from '../PromptPipelines';

describe('PromptPipelines', () => {
  const defaultContext = 'Test Context';
  const defaultDuration = 15;

  it('routes to the News pipeline and enables Google Search for "latest AI news"', () => {
    const pipeline = buildPromptPipeline('latest AI news', defaultContext, defaultDuration);
    
    expect(pipeline.useSearchGrounding).toBe(true);
    expect(pipeline.systemPrompt).toContain('Executive News Briefing');
    expect(pipeline.userPrompt).toContain('Use Google Search');
  });

  it('routes to the Managerial Soft Skills pipeline for "leadership frameworks"', () => {
    const pipeline = buildPromptPipeline('leadership frameworks', defaultContext, defaultDuration);
    
    expect(pipeline.useSearchGrounding).toBe(false);
    expect(pipeline.systemPrompt).toContain('psychological and managerial coach');
    expect(pipeline.userPrompt).toContain('situational guide');
  });

  it('routes to the Technical Deep Dive pipeline for "System Design"', () => {
    const pipeline = buildPromptPipeline('System Design', defaultContext, defaultDuration);
    
    expect(pipeline.useSearchGrounding).toBe(false);
    expect(pipeline.systemPrompt).toContain('highly technical, deep-dive');
    expect(pipeline.userPrompt).toContain('advanced, highly-technical insights');
  });

  it('injects historical context memory correctly', () => {
    const historicalContext = ['Module 1', 'Module 2'];
    const pipeline = buildPromptPipeline('System Design', defaultContext, defaultDuration, historicalContext);
    
    expect(pipeline.systemPrompt).toContain('CRITICAL RULE: DO NOT REPEAT OR INTRODUCE THESE RECENTLY COVERED TOPICS: Module 1, Module 2');
  });

  it('handles empty historical context gracefully', () => {
    const pipeline = buildPromptPipeline('System Design', defaultContext, defaultDuration, []);
    
    expect(pipeline.systemPrompt).not.toContain('CRITICAL RULE');
  });
});
