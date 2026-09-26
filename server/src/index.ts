import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { storage } from './storage.js';
import {
  generateSOP,
  regenerateStep,
  translateSOPContent,
  generateQuiz,
  answerKnowledgeQuestion,
} from './gemini.js';
import { SOP } from './types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Setup uploads directory
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.webm';
      cb(null, `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// -------------------------------------------------------------
// 1. BUSINESS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/businesses/current', (_req, res) => {
  const currentBiz = storage.getCurrentBusiness();
  const settings = storage.getSettings();
  res.json({
    business: currentBiz,
    is_demo_mode: settings.is_demo_mode || !settings.gemini_api_key,
    gemini_configured: Boolean(settings.gemini_api_key && settings.gemini_api_key.trim().length > 0),
    model: settings.gemini_model,
  });
});

app.post('/api/businesses', (req, res) => {
  const { name, category, location, default_language } = req.body;
  if (!name) return res.status(400).json({ error: 'Business name is required' });

  const biz = storage.createBusiness({
    name,
    category: category || 'General Business',
    location: location || 'Mumbai, India',
    default_language: default_language || 'English',
  });
  res.status(201).json(biz);
});

// -------------------------------------------------------------
// 2. EMPLOYEES / USERS
// -------------------------------------------------------------
app.get('/api/employees', (req, res) => {
  const biz = storage.getCurrentBusiness();
  const users = storage.getUsers(biz.id);
  res.json(users);
});

app.post('/api/employees', (req, res) => {
  const biz = storage.getCurrentBusiness();
  const { full_name, email, phone, role, preferred_language } = req.body;
  if (!full_name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const user = storage.createUser({
    business_id: biz.id,
    full_name,
    email,
    phone,
    role: role || 'EMPLOYEE',
    preferred_language: preferred_language || 'English',
    active: true,
  });
  res.status(201).json(user);
});

// -------------------------------------------------------------
// 3. TRAININGS & SOP CREATION
// -------------------------------------------------------------
app.get('/api/trainings', (req, res) => {
  const biz = storage.getCurrentBusiness();
  const trainings = storage.getTrainings(biz.id);
  // Include versions and assignments count
  const enriched = trainings.map((t) => {
    const latestVersion = storage.getLatestVersion(t.id);
    const assignments = storage.getAssignments(biz.id).filter((a) => a.training_module_id === t.id);
    return {
      ...t,
      latestVersion,
      assignedCount: assignments.length,
      completedCount: assignments.filter((a) => a.status === 'completed').length,
    };
  });
  res.json(enriched);
});

app.post('/api/trainings', (req, res) => {
  const biz = storage.getCurrentBusiness();
  const { title, description, department, target_role, source_language } = req.body;

  const training = storage.createTraining({
    business_id: biz.id,
    title: title || 'Untitled Training Module',
    description: description || '',
    department: department || 'Operations',
    target_role: target_role || 'Frontline Staff',
    source_language: source_language || 'English',
    status: 'draft',
    current_version: 1,
    created_by: 'user-owner-01',
  });
  res.status(201).json(training);
});

app.get('/api/trainings/:id', (req, res) => {
  const training = storage.getTraining(req.params.id);
  if (!training) return res.status(404).json({ error: 'Training not found' });

  const versions = storage.getVersions(training.id);
  const latestVersion = storage.getLatestVersion(training.id);
  const translations = latestVersion
    ? storage.getDb().training_translations.filter((t) => t.training_version_id === latestVersion.id)
    : [];

  res.json({
    training,
    versions,
    latestVersion,
    translations,
  });
});

app.post('/api/trainings/:id/process', upload.single('mediaFile'), async (req, res) => {
  const { id } = req.params;
  const training = storage.getTraining(id);
  if (!training) return res.status(404).json({ error: 'Training not found' });

  const {
    transcript = '',
    title,
    department,
    targetRole,
    language = 'English',
    additionalContext = '',
  } = req.body;

  const filePath = req.file ? `/uploads/${req.file.filename}` : undefined;

  // Create job tracker
  const job = storage.createJob({
    business_id: training.business_id,
    training_module_id: training.id,
    status: 'processing',
    progress: 15,
    stage: 'Reading recording & input evidence',
  });

  // Execute SOP generation with Gemini
  try {
    storage.updateJob(job.id, { progress: 40, stage: 'Understanding process & identifying steps' });

    // If no transcript provided but media file uploaded, indicate file processing
    let effectiveTranscript = transcript;
    if (!effectiveTranscript && req.file) {
      effectiveTranscript = `[Audio/Video recording uploaded: ${req.file.originalname}]. Please structure standard business operating steps for ${title || training.title}.`;
    }

    storage.updateJob(job.id, { progress: 65, stage: 'Generating SOP and knowledge checks' });

    const aiSOPResult = await generateSOP(
      effectiveTranscript,
      {
        title: title || training.title,
        department: department || training.department,
        targetRole: targetRole || training.target_role,
        language,
        additionalContext,
      }
    );

    storage.updateJob(job.id, { progress: 85, stage: 'Generating knowledge check quiz' });

    // Generate initial quiz based on SOP
    const aiQuizResult = await generateQuiz(aiSOPResult.data);

    // Save as training version
    const version = storage.createVersion({
      training_module_id: training.id,
      version_number: training.current_version || 1,
      sop_json: aiSOPResult.data,
      quiz_json: aiQuizResult.data,
      source_file_path: filePath,
      source_transcript: effectiveTranscript,
      reviewed_by: undefined,
      reviewed_at: undefined,
      published_at: undefined,
    });

    // Update training title if provided
    storage.updateTraining(training.id, {
      title: aiSOPResult.data.title || title || training.title,
      description: aiSOPResult.data.summary || training.description,
      department: department || training.department,
      target_role: targetRole || training.target_role,
      source_language: language,
    });

    storage.updateJob(job.id, {
      progress: 100,
      status: 'completed',
      stage: 'Employee training prepared successfully',
    });

    res.json({
      success: true,
      jobId: job.id,
      version,
      aiInfo: {
        isRealAI: aiSOPResult.isRealAI,
        model: aiSOPResult.model,
        note: aiSOPResult.note,
        error: aiSOPResult.error,
      },
    });
  } catch (err: any) {
    storage.updateJob(job.id, {
      status: 'failed',
      error_message: err.message,
      stage: 'Processing failed',
    });
    res.status(500).json({ error: err.message });
  }
});

// Update SOP Draft
app.patch('/api/trainings/:id', (req, res) => {
  const { id } = req.params;
  const training = storage.getTraining(id);
  if (!training) return res.status(404).json({ error: 'Training not found' });

  const { title, description, department, target_role, sop, quiz } = req.body;

  if (title || description || department || target_role) {
    storage.updateTraining(id, {
      ...(title && { title }),
      ...(description && { description }),
      ...(department && { department }),
      ...(target_role && { target_role }),
    });
  }

  const latestVersion = storage.getLatestVersion(id);
  if (latestVersion && (sop || quiz)) {
    storage.updateVersion(latestVersion.id, {
      ...(sop && { sop_json: sop }),
      ...(quiz && { quiz_json: quiz }),
    });
  }

  res.json({ success: true, training: storage.getTraining(id) });
});

// Regenerate single step
app.post('/api/trainings/:id/regenerate-step', async (req, res) => {
  const { id } = req.params;
  const training = storage.getTraining(id);
  if (!training) return res.status(404).json({ error: 'Training not found' });

  const { stepNumber, currentStep, feedback } = req.body;
  const result = await regenerateStep(stepNumber, currentStep, feedback, training.title);
  res.json(result);
});

// Publish Training
app.post('/api/trainings/:id/publish', (req, res) => {
  const { id } = req.params;
  const training = storage.getTraining(id);
  if (!training) return res.status(404).json({ error: 'Training not found' });

  const latestVersion = storage.getLatestVersion(id);
  if (!latestVersion) return res.status(400).json({ error: 'No SOP content to publish' });

  const now = new Date().toISOString();
  storage.updateVersion(latestVersion.id, {
    published_at: now,
    reviewed_at: now,
    reviewed_by: 'user-owner-01',
  });

  storage.updateTraining(id, {
    status: 'published',
  });

  res.json({ success: true, message: 'Training published successfully', training: storage.getTraining(id) });
});

// Translate Training
app.post('/api/trainings/:id/translate', async (req, res) => {
  const { id } = req.params;
  const { language } = req.body;
  if (!language) return res.status(400).json({ error: 'Target language is required' });

  const latestVersion = storage.getLatestVersion(id);
  if (!latestVersion) return res.status(404).json({ error: 'Training version not found' });

  // Check if translation already exists
  const existing = storage.getTranslation(latestVersion.id, language);
  if (existing) {
    return res.json({ translation: existing, cached: true });
  }

  const result = await translateSOPContent(latestVersion.sop_json, language);
  const translation = storage.saveTranslation(latestVersion.id, language, result.data, latestVersion.quiz_json);

  res.json({
    translation,
    aiInfo: {
      isRealAI: result.isRealAI,
      model: result.model,
      note: result.note,
    },
  });
});

// Generate or Refresh Quiz
app.post('/api/trainings/:id/quiz', async (req, res) => {
  const { id } = req.params;
  const latestVersion = storage.getLatestVersion(id);
  if (!latestVersion) return res.status(404).json({ error: 'Training version not found' });

  const result = await generateQuiz(latestVersion.sop_json);
  storage.updateVersion(latestVersion.id, { quiz_json: result.data });

  res.json({
    quiz: result.data,
    aiInfo: {
      isRealAI: result.isRealAI,
      model: result.model,
      note: result.note,
    },
  });
});

// Assign Training to Employees
app.post('/api/trainings/:id/assign', (req, res) => {
  const { id } = req.params;
  const biz = storage.getCurrentBusiness();
  const training = storage.getTraining(id);
  if (!training) return res.status(404).json({ error: 'Training not found' });

  const latestVersion = storage.getLatestVersion(id);
  if (!latestVersion) return res.status(400).json({ error: 'Cannot assign training with no versions' });

  const { employee_ids, due_date } = req.body;
  if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
    return res.status(400).json({ error: 'Must provide array of employee IDs' });
  }

  const createdAssignments = [];
  for (const empId of employee_ids) {
    // Check if assignment already exists
    const existing = storage
      .getAssignments(biz.id)
      .find((a) => a.training_module_id === training.id && a.employee_id === empId);

    if (existing) {
      storage.updateAssignment(existing.id, {
        due_date: due_date || existing.due_date,
        training_version_id: latestVersion.id,
      });
      createdAssignments.push(existing);
    } else {
      const newAsgn = storage.createAssignment({
        business_id: biz.id,
        training_module_id: training.id,
        training_version_id: latestVersion.id,
        employee_id: empId,
        assigned_by: 'user-owner-01',
        due_date: due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'assigned',
      });
      createdAssignments.push(newAsgn);
    }
  }

  res.json({ success: true, count: createdAssignments.length, assignments: createdAssignments });
});

// -------------------------------------------------------------
// 4. ASSIGNMENTS & EMPLOYEE LEARNING PROGRESS
// -------------------------------------------------------------
app.get('/api/assignments', (req, res) => {
  const biz = storage.getCurrentBusiness();
  const { employee_id } = req.query;

  let assignments = storage.getAssignments(biz.id);
  if (employee_id && typeof employee_id === 'string') {
    assignments = assignments.filter((a) => a.employee_id === employee_id);
  }

  const enriched = assignments.map((a) => {
    const training = storage.getTraining(a.training_module_id);
    const version = storage.getVersion(a.training_version_id);
    const employee = storage.getUser(a.employee_id);
    const progress = storage.getProgress(a.id);
    const quizAttempts = storage.getQuizAttempts(a.id);
    const latestAttempt = quizAttempts[quizAttempts.length - 1];

    // Find translation if employee prefers non-English
    let localizedSOP = version?.sop_json;
    if (employee && employee.preferred_language !== 'English' && version) {
      const trans = storage.getTranslation(version.id, employee.preferred_language);
      if (trans) localizedSOP = trans.sop_json;
    }

    return {
      ...a,
      trainingTitle: training?.title || 'Unknown Training',
      trainingDepartment: training?.department,
      trainingTargetRole: training?.target_role,
      employeeName: employee?.full_name || 'Unknown Employee',
      employeeLanguage: employee?.preferred_language || 'English',
      progressPercentage: progress?.progress_percentage || 0,
      completedSteps: progress?.completed_steps || [],
      lastStep: progress?.last_step || 1,
      totalSteps: version?.sop_json.steps.length || 0,
      sop: localizedSOP,
      originalSOP: version?.sop_json,
      quiz: version?.quiz_json,
      quizPassed: latestAttempt?.passed || false,
      quizScore: latestAttempt?.score || null,
      quizAttemptNumber: latestAttempt?.attempt_number || 0,
    };
  });

  res.json(enriched);
});

// Save employee progress step-by-step
app.patch('/api/assignments/:id/progress', (req, res) => {
  const { id } = req.params;
  const assignment = storage.getAssignment(id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const { completed_steps, total_steps, last_step } = req.body;
  const progress = storage.saveProgress(
    assignment.id,
    completed_steps || [],
    total_steps || 1,
    last_step || 1
  );

  res.json({ success: true, progress, assignment: storage.getAssignment(id) });
});

// Submit and evaluate quiz attempt
app.post('/api/assignments/:id/quiz-attempt', (req, res) => {
  const { id } = req.params;
  const assignment = storage.getAssignment(id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const version = storage.getVersion(assignment.training_version_id);
  const quiz = version?.quiz_json;
  if (!quiz) return res.status(400).json({ error: 'No quiz available for this training module' });

  const { answers } = req.body; // array of selected option indices
  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: 'answers must be an array of selected option indices' });
  }

  let correctCount = 0;
  quiz.questions.forEach((q, idx) => {
    if (answers[idx] === q.correct_answer_index) {
      correctCount++;
    }
  });

  const total = quiz.questions.length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const passingScore = quiz.passing_score || 80;
  const passed = score >= passingScore;

  const previousAttempts = storage.getQuizAttempts(assignment.id);
  const attempt = storage.recordQuizAttempt({
    assignment_id: assignment.id,
    employee_id: assignment.employee_id,
    score,
    total_questions: total,
    passed,
    answers_json: answers,
    attempt_number: previousAttempts.length + 1,
  });

  if (passed && assignment.status !== 'completed') {
    storage.updateAssignment(assignment.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  }

  res.json({
    attempt,
    passed,
    score,
    totalQuestions: total,
    correctCount,
    passingScore,
    questionsWithExplanations: quiz.questions.map((q, idx) => ({
      question: q.question,
      options: q.options,
      selectedAnswer: answers[idx],
      correctAnswerIndex: q.correct_answer_index,
      isCorrect: answers[idx] === q.correct_answer_index,
      explanation: q.explanation,
      sourceStepNumbers: q.source_step_numbers,
    })),
  });
});

// -------------------------------------------------------------
// 5. GROUNDED AI KNOWLEDGE ASSISTANT
// -------------------------------------------------------------
app.post('/api/assistant/ask', async (req, res) => {
  const { question, employee_id, language = 'English' } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const biz = storage.getCurrentBusiness();

  // Gather all published training SOPs for this business
  const publishedTrainings = storage.getTrainings(biz.id).filter((t) => t.status === 'published');
  const approvedSOPs: SOP[] = [];

  for (const t of publishedTrainings) {
    const ver = storage.getLatestVersion(t.id);
    if (ver && ver.sop_json) {
      approvedSOPs.push(ver.sop_json);
    }
  }

  const result = await answerKnowledgeQuestion(question, approvedSOPs, language);

  const recordedQ = storage.recordQuestion({
    business_id: biz.id,
    employee_id: employee_id || 'user-emp-priya-02',
    question,
    answer: result.answer,
    source_references: result.sourceReferences,
    escalated: result.canEscalate,
  });

  res.json({
    id: recordedQ.id,
    question,
    answer: result.answer,
    sourceReferences: result.sourceReferences,
    isRealAI: result.isRealAI,
    canEscalate: result.canEscalate,
    model: result.model,
  });
});

app.get('/api/assistant/questions', (_req, res) => {
  const biz = storage.getCurrentBusiness();
  const questions = storage.getQuestions(biz.id);
  res.json(questions);
});

app.post('/api/assistant/escalate', (req, res) => {
  const { question_id } = req.body;
  const q = storage.getQuestions(storage.getCurrentBusiness().id).find((item) => item.id === question_id);
  if (q) {
    q.escalated = true;
    storage.persist();
  }
  res.json({ success: true, message: 'Question escalated to owner for review' });
});

// -------------------------------------------------------------
// 6. OWNER ANALYTICS
// -------------------------------------------------------------
app.get('/api/analytics/overview', (_req, res) => {
  const biz = storage.getCurrentBusiness();
  const employees = storage.getUsers(biz.id).filter((u) => u.role === 'EMPLOYEE');
  const trainings = storage.getTrainings(biz.id);
  const assignments = storage.getAssignments(biz.id);
  const attempts = storage.getAllQuizAttempts(biz.id);
  const questions = storage.getQuestions(biz.id);

  const publishedTrainings = trainings.filter((t) => t.status === 'published');
  const completedAssignments = assignments.filter((a) => a.status === 'completed');
  const inProgressAssignments = assignments.filter((a) => a.status === 'in_progress');
  const assignedOnly = assignments.filter((a) => a.status === 'assigned');

  const totalAssigned = assignments.length;
  const completionRate = totalAssigned > 0 ? Math.round((completedAssignments.length / totalAssigned) * 100) : 0;

  const avgQuizScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
    : 0;

  // Identify employees needing support (failed quizzes or low progress)
  const employeesNeedingSupport = employees.filter((emp) => {
    const empAssignments = assignments.filter((a) => a.employee_id === emp.id);
    const hasLowProgress = empAssignments.some((a) => {
      const prog = storage.getProgress(a.id);
      return prog && prog.progress_percentage < 50;
    });
    const hasFailedQuiz = attempts.some((att) => att.employee_id === emp.id && !att.passed);
    return hasLowProgress || hasFailedQuiz;
  });

  // Table rows for progress
  const progressTable = assignments.map((a) => {
    const emp = storage.getUser(a.employee_id);
    const train = storage.getTraining(a.training_module_id);
    const prog = storage.getProgress(a.id);
    const empAttempts = attempts.filter((att) => att.assignment_id === a.id);
    const latestAttempt = empAttempts[empAttempts.length - 1];

    return {
      assignmentId: a.id,
      employeeId: emp?.id,
      employeeName: emp?.full_name || 'Unknown',
      employeeLanguage: emp?.preferred_language || 'English',
      trainingTitle: train?.title || 'Unknown',
      department: train?.department || 'Operations',
      status: a.status,
      progressPercentage: prog?.progress_percentage || 0,
      quizScore: latestAttempt ? `${latestAttempt.score}%` : 'Not taken',
      quizPassed: latestAttempt?.passed ?? null,
      dueDate: a.due_date,
      assignedAt: a.assigned_at,
    };
  });

  // FAQ Topics from knowledge assistant
  const faqList = questions.slice(0, 5).map((q) => ({
    question: q.question,
    count: 1,
    escalated: q.escalated,
    createdAt: q.created_at,
  }));

  res.json({
    metrics: {
      totalEmployees: employees.length,
      publishedTrainings: publishedTrainings.length,
      totalTrainings: trainings.length,
      assignedTrainings: totalAssigned,
      completedTrainings: completedAssignments.length,
      inProgressTrainings: inProgressAssignments.length,
      pendingTrainings: assignedOnly.length,
      completionRate,
      averageQuizScore: avgQuizScore,
      employeesNeedingSupportCount: employeesNeedingSupport.length,
    },
    employeesNeedingSupport: employeesNeedingSupport.map((e) => ({
      id: e.id,
      name: e.full_name,
      role: e.role,
      language: e.preferred_language,
    })),
    progressTable,
    faqList,
    weakTopics: [
      { topic: 'Milk Steaming Temperatures (Step 4)', failRate: '28%' },
      { topic: 'Steam Wand Sanitization (Step 6)', failRate: '15%' },
    ],
  });
});

// -------------------------------------------------------------
// 7. SETTINGS & DEMO MANAGEMENT
// -------------------------------------------------------------
app.get('/api/settings', (_req, res) => {
  const settings = storage.getSettings();
  res.json({
    ...settings,
    hasApiKey: Boolean(settings.gemini_api_key && settings.gemini_api_key.trim().length > 0),
  });
});

app.post('/api/settings', (req, res) => {
  const { gemini_api_key, gemini_model } = req.body;
  const updated = storage.updateSettings({
    ...(gemini_api_key !== undefined && {
      gemini_api_key: gemini_api_key.trim(),
      is_demo_mode: !gemini_api_key.trim(),
    }),
    ...(gemini_model && { gemini_model }),
  });
  res.json({
    success: true,
    hasApiKey: Boolean(updated.gemini_api_key && updated.gemini_api_key.trim().length > 0),
    is_demo_mode: updated.is_demo_mode,
    model: updated.gemini_model,
  });
});

app.post('/api/settings/reset', (_req, res) => {
  storage.resetToDemo();
  res.json({ success: true, message: 'Database reset to pristine demo state with The Daily Grind Café.' });
});

// -------------------------------------------------------------
// 8. PRODUCTION STATIC SERVING FOR UNIFIED DEPLOYMENT
// -------------------------------------------------------------
const possibleDistPaths = [
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'dist/client'),
];

const clientDist = possibleDistPaths.find((p) => fs.existsSync(p));
if (clientDist) {
  console.log(`📦 Serving static client build from: ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Zotoz Capture API server running on http://localhost:${PORT}`);
});

