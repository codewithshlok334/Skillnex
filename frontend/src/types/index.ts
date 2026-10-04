export interface User {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  college: string;
  course: string;
  branch: string;
  study_year: string;
  graduation_year: string;
  career_goal: string;
  skills: string;
  projects: string;
  reputation: number;
  public_profile: boolean;
  photo_url?: string;
  badges: { id: string; name: string; description: string }[];
}
export interface Config {
  demo: boolean;
  aiAvailable: boolean;
  semanticSearch: boolean;
  googleEnabled: boolean;
}
export interface Breakdown {
  label: string;
  score: number;
}
export interface Analysis {
  score: number;
  summary: string;
  demo?: boolean;
  breakdown: Breakdown[];
  issues: { title: string; original: string; suggestion: string; severity: string }[];
}
export interface Interview {
  id: string;
  role: string;
  kind: string;
  difficulty: string;
  duration: number;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
}
export interface RoadmapItem {
  id: string;
  title: string;
  progress: number;
  learn: string;
  practice: string;
  build: string;
  interview: string;
}
export interface Question {
  id: string;
  title: string;
  body: string;
  category: string;
  name: string;
  created_at: string;
  answer_count: number;
  verified_count: number;
}
export type Data = Record<string, any>;
