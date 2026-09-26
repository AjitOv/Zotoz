import {
  Business,
  User,
  TrainingModule,
  TrainingAssignment,
  AnalyticsData,
  SOP,
  Quiz,
  SOPStep,
} from '../types';

const API_BASE = '/api';

export async function fetchCurrentBusiness(): Promise<{
  business: Business;
  is_demo_mode: boolean;
  gemini_configured: boolean;
  model: string;
}> {
  const res = await fetch(`${API_BASE}/businesses/current`);
  if (!res.ok) throw new Error('Failed to fetch business');
  return res.json();
}

export async function fetchEmployees(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/employees`);
  if (!res.ok) throw new Error('Failed to fetch employees');
  return res.json();
}

export async function createEmployee(data: {
  full_name: string;
  email: string;
  phone?: string;
  role?: string;
  preferred_language?: string;
}): Promise<User> {
  const res = await fetch(`${API_BASE}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create employee');
  return res.json();
}

export async function fetchTrainings(): Promise<TrainingModule[]> {
  const res = await fetch(`${API_BASE}/trainings`);
  if (!res.ok) throw new Error('Failed to fetch trainings');
  return res.json();
}

export async function fetchTraining(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/trainings/${id}`);
  if (!res.ok) throw new Error('Failed to fetch training');
  return res.json();
}

export async function createTrainingDraft(data: {
  title: string;
  description?: string;
  department?: string;
  target_role?: string;
  source_language?: string;
}): Promise<TrainingModule> {
  const res = await fetch(`${API_BASE}/trainings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create training');
  return res.json();
}

export async function processTrainingMedia(
  trainingId: string,
  formData: FormData
): Promise<any> {
  const res = await fetch(`${API_BASE}/trainings/${trainingId}/process`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to process training with AI');
  }
  return res.json();
}

export async function updateTrainingDraft(
  trainingId: string,
  data: {
    title?: string;
    description?: string;
    department?: string;
    target_role?: string;
    sop?: SOP;
    quiz?: Quiz;
  }
): Promise<any> {
  const res = await fetch(`${API_BASE}/trainings/${trainingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update training draft');
  return res.json();
}

export async function regenerateStepWithAI(
  trainingId: string,
  stepNumber: number,
  currentStep: SOPStep,
  feedback: string
): Promise<{ data: SOPStep; isRealAI: boolean; note?: string }> {
  const res = await fetch(`${API_BASE}/trainings/${trainingId}/regenerate-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stepNumber, currentStep, feedback }),
  });
  if (!res.ok) throw new Error('Failed to regenerate step');
  return res.json();
}

export async function publishTraining(trainingId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/trainings/${trainingId}/publish`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to publish training');
  return res.json();
}

export async function translateTraining(
  trainingId: string,
  language: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/trainings/${trainingId}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language }),
  });
  if (!res.ok) throw new Error('Failed to translate training');
  return res.json();
}

export async function assignTrainingToEmployees(
  trainingId: string,
  employeeIds: string[],
  dueDate?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/trainings/${trainingId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_ids: employeeIds, due_date: dueDate }),
  });
  if (!res.ok) throw new Error('Failed to assign training');
  return res.json();
}

export async function fetchAssignments(employeeId?: string): Promise<TrainingAssignment[]> {
  const url = employeeId ? `${API_BASE}/assignments?employee_id=${employeeId}` : `${API_BASE}/assignments`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch assignments');
  return res.json();
}

export async function saveAssignmentProgress(
  assignmentId: string,
  completedSteps: number[],
  totalSteps: number,
  lastStep: number
): Promise<any> {
  const res = await fetch(`${API_BASE}/assignments/${assignmentId}/progress`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed_steps: completedSteps, total_steps: totalSteps, last_step: lastStep }),
  });
  if (!res.ok) throw new Error('Failed to save progress');
  return res.json();
}

export async function submitQuizAttempt(
  assignmentId: string,
  answers: number[]
): Promise<any> {
  const res = await fetch(`${API_BASE}/assignments/${assignmentId}/quiz-attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error('Failed to submit quiz attempt');
  return res.json();
}

export async function askKnowledgeAssistant(
  question: string,
  employeeId?: string,
  language: string = 'English'
): Promise<any> {
  const res = await fetch(`${API_BASE}/assistant/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, employee_id: employeeId, language }),
  });
  if (!res.ok) throw new Error('Failed to query knowledge assistant');
  return res.json();
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchSettings(): Promise<any> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(data: {
  gemini_api_key?: string;
  gemini_model?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function resetDemoData(): Promise<any> {
  const res = await fetch(`${API_BASE}/settings/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset demo data');
  return res.json();
}
