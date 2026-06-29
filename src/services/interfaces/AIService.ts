export interface GenerateCurriculumParams {
  userId: string;
  selectedTopic: string;
  projectContext: string;
  dailyOverrides?: string[];
  durationMinutes: 30 | 60;
  historicalContext?: string[];
}

export interface GeneratedCurriculum {
  title: string;
  markdownContent: string;
  suggestedTags: string[];
}

export interface AIService {
  generateCurriculum(params: GenerateCurriculumParams): Promise<GeneratedCurriculum>;
}
