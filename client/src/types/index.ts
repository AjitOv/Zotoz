export type UserRole = 'OWNER' | 'TRAINER' | 'EMPLOYEE';

export interface Business {
  id: string;
  name: string;
  category: string;
  location: string;
  default_language: string;
  created_at: string;
}

export interface User {
  id: string;
  business_id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  preferred_language: string;
  active: boolean;
  created_at: string;
}

export interface SOPStep {
  step_number: number;
  title: string;
  instructions: string;
  expected_outcome: string;
  materials: string[];
  warnings: string[];
  common_mistakes: string[];
  source_reference: string;
}

export interface SOP {
  title: string;
  summary: string;
  language: string;
  estimated_duration?: number | null;
  prerequisites: string[];
  materials: string[];
  steps: SOPStep[];
  completion_checklist: string[];
  knowledge_gaps: string[];
  owner_review_required: boolean;
}

export interface QuizQuestion {
  question: string;
  type: 'multiple_choice' | 'scenario' | 'true_false';
  options: string[];
  correct_answer_index: number;
  explanation: string;
  source_step_numbers: number[];
}

export interface Quiz {
  passing_score: number;
  questions: QuizQuestion[];
}

export type TrainingStatus = 'draft' | 'published' | 'archived';

export interface TrainingModule {
  id: string;
  business_id: string;
  title: string;
  description: string;
  department: string;
  target_role: string;
  source_language: string;
  status: TrainingStatus;
  current_version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  latestVersion?: TrainingVersion;
  assignedCount?: number;
  completedCount?: number;
}

export interface TrainingVersion {
  id: string;
  training_module_id: string;
  version_number: number;
  sop_json: SOP;
  quiz_json?: Quiz;
  source_file_path?: string;
  source_transcript?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  published_at?: string;
}

export interface TrainingTranslation {
  id: string;
  training_version_id: string;
  language: string;
  sop_json: SOP;
  quiz_json?: Quiz;
  created_at: string;
}

export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'overdue';

export interface TrainingAssignment {
  id: string;
  business_id: string;
  training_module_id: string;
  training_version_id: string;
  employee_id: string;
  assigned_by: string;
  due_date: string;
  status: AssignmentStatus;
  assigned_at: string;
  completed_at?: string;
  trainingTitle?: string;
  trainingDepartment?: string;
  trainingTargetRole?: string;
  employeeName?: string;
  employeeLanguage?: string;
  progressPercentage?: number;
  completedSteps?: number[];
  lastStep?: number;
  totalSteps?: number;
  sop?: SOP;
  originalSOP?: SOP;
  quiz?: Quiz;
  quizPassed?: boolean;
  quizScore?: number | null;
  quizAttemptNumber?: number;
}

export interface TrainingProgress {
  id: string;
  assignment_id: string;
  completed_steps: number[];
  progress_percentage: number;
  last_step: number;
  updated_at: string;
}

export interface QuizAttempt {
  id: string;
  assignment_id: string;
  employee_id: string;
  score: number;
  total_questions: number;
  passed: boolean;
  answers_json: number[];
  attempt_number: number;
  completed_at: string;
}

export interface KnowledgeQuestion {
  id: string;
  business_id: string;
  employee_id: string;
  training_module_id?: string;
  question: string;
  answer: string;
  source_references: string[];
  escalated: boolean;
  created_at: string;
}

export interface AnalyticsData {
  metrics: {
    totalEmployees: number;
    publishedTrainings: number;
    totalTrainings: number;
    assignedTrainings: number;
    completedTrainings: number;
    inProgressTrainings: number;
    pendingTrainings: number;
    completionRate: number;
    averageQuizScore: number;
    employeesNeedingSupportCount: number;
  };
  employeesNeedingSupport: {
    id: string;
    name: string;
    role: string;
    language: string;
  }[];
  progressTable: {
    assignmentId: string;
    employeeId: string;
    employeeName: string;
    employeeLanguage: string;
    trainingTitle: string;
    department: string;
    status: AssignmentStatus;
    progressPercentage: number;
    quizScore: string;
    quizPassed: boolean | null;
    dueDate: string;
    assignedAt: string;
  }[];
  faqList: {
    question: string;
    count: number;
    escalated: boolean;
    createdAt: string;
  }[];
  weakTopics: {
    topic: string;
    failRate: string;
  }[];
}
