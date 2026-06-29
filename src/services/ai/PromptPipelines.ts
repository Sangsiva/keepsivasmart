export type PipelineResult = {
  systemPrompt: string;
  userPrompt: string;
  useSearchGrounding: boolean;
};

export function buildPromptPipeline(
  selectedTopic: string,
  projectContext: string,
  durationMinutes: number,
  historicalContext?: string[],
  dailyOverrides?: string[]
): PipelineResult {
  const lowerTopic = selectedTopic.toLowerCase();
  
  const isNews = lowerTopic.includes('news') || lowerTopic.includes('latest') || lowerTopic.includes('trend');
  const isSoftSkill = lowerTopic.includes('manager') || lowerTopic.includes('interpersonal') || lowerTopic.includes('leadership') || lowerTopic.includes('parenting');
  
  // Build Historical Context Memory
  let memoryStr = '';
  if (historicalContext && historicalContext.length > 0) {
    memoryStr = `\\nCRITICAL RULE: DO NOT REPEAT OR INTRODUCE THESE RECENTLY COVERED TOPICS: ${historicalContext.join(', ')}.\\nFocus strictly on new, unlearned subtopics or advanced progressions.`;
  }

  const baseUserPrompt = `
Today's Primary Focus Topic: ${selectedTopic}
Current Project Context: ${projectContext}
Daily Overrides (Topics to focus on today): ${dailyOverrides?.join(', ') || 'None'}
  `;

  if (isNews) {
    return {
      useSearchGrounding: true,
      systemPrompt: `You are an expert AI curator for an AI & LLM Technical Architect Manager. 
Your goal is to generate an Executive News Briefing.
The module should take approximately ${durationMinutes} minutes to consume.
Format strictly in JSON:
{
  "title": "Module Title",
  "markdownContent": "# Title\\n\\nChronological timeline, X/Reddit discourse summaries, and direct source URLs...",
  "suggestedTags": ["news"]
}
${memoryStr}`,
      userPrompt: `${baseUserPrompt}\\nUse Google Search to find the top 3 news items from the last 24-48 hours regarding this topic. Synthesize them into a highly technical briefing.`
    };
  }

  if (isSoftSkill) {
    return {
      useSearchGrounding: false,
      systemPrompt: `You are an expert psychological and managerial coach.
Your goal is to generate a highly actionable soft-skills or life-skills module.
The module should take approximately ${durationMinutes} minutes to consume.
Format strictly in JSON:
{
  "title": "Module Title",
  "markdownContent": "# Title\\n\\nSituational case studies, roleplay scenarios, and actionable behavioral frameworks...",
  "suggestedTags": ["soft-skills"]
}
${memoryStr}`,
      userPrompt: `${baseUserPrompt}\\nGenerate a practical, situational guide focusing heavily on scenarios and actionable reflection.`
    };
  }

  // Default: Technical Deep Dive
  return {
    useSearchGrounding: false,
    systemPrompt: `You are an expert AI curriculum curator for an AI & LLM Technical Architect Manager. 
Your goal is to generate a highly technical, deep-dive learning module.
The module should take approximately ${durationMinutes} minutes to consume.
Format strictly in JSON:
{
  "title": "Module Title",
  "markdownContent": "# Title\\n\\nDeep dive with Mermaid.js diagrams, trade-off matrices, and code snippets...",
  "suggestedTags": ["technical"]
}
${memoryStr}`,
    userPrompt: `${baseUserPrompt}\\nGenerate the deep dive explicitly focusing on advanced, highly-technical insights into this topic.`
  };
}
