export type TopicWeight = {
  topic: string;
  weight: number;
};

export function selectWeightedTopic(topicWeights: TopicWeight[], fallbackTopic: string = 'AI & LLMs'): string {
  if (!topicWeights || !Array.isArray(topicWeights) || topicWeights.length === 0) {
    return fallbackTopic;
  }

  const rand = Math.random() * 100;
  let sum = 0;
  
  for (const tw of topicWeights) {
    sum += tw.weight;
    if (rand <= sum) {
      return tw.topic;
    }
  }
  
  return fallbackTopic;
}
