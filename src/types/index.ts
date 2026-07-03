export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";
export type AccessLevel = "FREE" | "PREMIUM";

export interface PaperSummary {
  id: string;
  code: string;
  title: string;
  description: string | null;
  accessLevel: AccessLevel;
  topicCount: number;
}

export interface TopicSummary {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
}

export interface QuizQuestionView {
  id: string;
  text: string;
  imageUrl: string | null;
  difficulty: DifficultyLevel;
  marks: number;
  options: { id: string; text: string }[];
}

export interface QuizResultTopicBreakdown {
  topicId: string;
  topicTitle: string;
  total: number;
  correct: number;
  percent: number;
}

export interface QuizResultSummary {
  attemptId: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  scorePercent: number;
  passed: boolean;
  topicBreakdown: QuizResultTopicBreakdown[];
}

export type TopicPerformanceStatus = "Weak" | "Average" | "Strong";

export interface DashboardTopicDetail {
  id: string;
  title: string;
  paperId: string;
  accuracy: number;
  status: TopicPerformanceStatus;
}

export interface DashboardPaperProgress {
  id: string;
  code: string;
  title: string;
  lastPracticeDate: string | null;
  progressPercent: number;
  topicsAttempted: number;
  totalTopics: number;
}

export interface DashboardRecommendedPractice {
  topicId: string;
  paperId: string;
  topic: string;
  reason: string;
}

export interface DashboardRecentActivity {
  id: string;
  paper: string;
  topic: string | null;
  score: number | null;
  passed: boolean | null;
  date: string | null;
}

export interface DashboardOverview {
  studentName: string;
  totalAttempts: number;
  averageScore: number;
  completedQuizzes: number;
  bestScore: number;
  weakTopicCount: number;
  studyStreak: number;
  weakTopics: string[];
  topicDetails: DashboardTopicDetail[];
  paperProgress: DashboardPaperProgress[];
  recommendedPractice: DashboardRecommendedPractice[];
  recentActivity: DashboardRecentActivity[];
  scoreHistory: { date: string; score: number; paper: string }[];
  trends?: {
    attempts: number | null;
    averageScore: number | null;
    completedQuizzes: number | null;
  };
}

// Future-ready (not used in Phase 1 UI yet)
export type AccessControlLevel = "FREE" | "PREMIUM";
