import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { SOP, Quiz, QuizQuestion, SOPStep } from './types.js';
import { storage } from './storage.js';

// Zod Schemas
export const SOPStepSchema = z.object({
  step_number: z.number(),
  title: z.string(),
  instructions: z.string(),
  expected_outcome: z.string(),
  materials: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  common_mistakes: z.array(z.string()).default([]),
  source_reference: z.string().default(''),
});

export const SOPSchema = z.object({
  title: z.string(),
  summary: z.string(),
  language: z.string().default('English'),
  estimated_duration: z.number().nullable().optional(),
  prerequisites: z.array(z.string()).default([]),
  materials: z.array(z.string()).default([]),
  steps: z.array(SOPStepSchema),
  completion_checklist: z.array(z.string()).default([]),
  knowledge_gaps: z.array(z.string()).default([]),
  owner_review_required: z.boolean().default(true),
});

export const QuizQuestionSchema = z.object({
  question: z.string(),
  type: z.enum(['multiple_choice', 'scenario', 'true_false']),
  options: z.array(z.string()),
  correct_answer_index: z.number(),
  explanation: z.string(),
  source_step_numbers: z.array(z.number()).default([]),
});

export const QuizSchema = z.object({
  passing_score: z.number().default(80),
  questions: z.array(QuizQuestionSchema),
});

export interface AIResult<T> {
  data: T;
  isRealAI: boolean;
  model: string;
  error?: string;
  note?: string;
}

function getApiKey(customKey?: string): string | undefined {
  if (customKey && customKey.trim().length > 0) return customKey.trim();
  const settings = storage.getSettings();
  if (settings.gemini_api_key && settings.gemini_api_key.trim().length > 0) {
    return settings.gemini_api_key.trim();
  }
  return process.env.GEMINI_API_KEY || undefined;
}

function getModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-3.5-flash';
}

const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];

async function generateWithModelFallback(
  ai: GoogleGenAI,
  options: {
    contents: string;
    systemInstruction?: string;
    responseMimeType?: string;
    preferredModel?: string;
  }
): Promise<{ text: string; usedModel: string }> {
  const preferred = options.preferredModel || getModelName();
  const candidates = [preferred, ...FALLBACK_MODELS.filter((m) => m !== preferred)];

  let lastError: any = null;
  for (const candidate of candidates) {
    try {
      const resp = await ai.models.generateContent({
        model: candidate,
        contents: options.contents,
        config: {
          ...(options.systemInstruction && { systemInstruction: options.systemInstruction }),
          ...(options.responseMimeType && { responseMimeType: options.responseMimeType }),
        },
      });
      return { text: resp.text || '', usedModel: candidate };
    } catch (err: any) {
      console.warn(`Gemini attempt with ${candidate} failed: ${err.message}.`);
      lastError = err;
    }
  }
  throw lastError;
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  // Strip markdown code fences if model returned them
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * CORE FEATURE B — AI SOP GENERATOR
 */
export async function generateSOP(
  transcript: string,
  metadata: {
    title?: string;
    department?: string;
    targetRole?: string;
    language?: string;
    additionalContext?: string;
  },
  customApiKey?: string
): Promise<AIResult<SOP>> {
  const apiKey = getApiKey(customApiKey);
  const modelName = getModelName();

  if (!apiKey) {
    // Return explicitly marked demo template
    const demoSOP = generateDemoFallbackSOP(transcript, metadata);
    return {
      data: demoSOP,
      isRealAI: false,
      model: 'demo-mode-fallback',
      note: 'Generated in Demo Mode (GEMINI_API_KEY not configured). This is a labeled sample structure for demonstration.',
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are an expert operational training specialist for Indian small and medium businesses.
Convert the supplied business process evidence into an accurate, easy-to-follow standard operating procedure.
Use simple language suitable for frontline employees.
Preserve the actual steps and instructions from the source.
Do not invent procedures, measurements, safety instructions, certifications, machine settings, or business policies.
Identify missing information and mark it as requiring owner verification.
Separate source-supported facts from suggestions.
Use short, numbered steps with clear action verbs.

For every step, provide:
- Step title
- Step instructions
- Required tools or materials, when known
- Expected outcome
- Safety warnings explicitly supported by the source
- Common mistakes supported by the source

Generate a concise overview, prerequisites, required materials, estimated duration if supported, and completion checklist.
If the source is incomplete or ambiguous, explicitly flag the uncertainty in knowledge_gaps.
Return valid structured JSON conforming to the supplied schema with owner_review_required set to true.`;

  const prompt = `Business Context:
Training Title: ${metadata.title || 'Standard Operating Procedure'}
Department: ${metadata.department || 'Operations'}
Target Role: ${metadata.targetRole || 'Frontline Staff'}
Language: ${metadata.language || 'English'}
Additional Notes / Safety Rules: ${metadata.additionalContext || 'None provided'}

Source Process Evidence / Recording Transcript:
"""
${transcript}
"""

Output pure JSON conforming to this schema:
{
  "title": string,
  "summary": string,
  "language": string,
  "estimated_duration": number | null,
  "prerequisites": string[],
  "materials": string[],
  "steps": [
    {
      "step_number": number,
      "title": string,
      "instructions": string,
      "expected_outcome": string,
      "materials": string[],
      "warnings": string[],
      "common_mistakes": string[],
      "source_reference": string
    }
  ],
  "completion_checklist": string[],
  "knowledge_gaps": string[],
  "owner_review_required": true
}`;

  try {
    const { text, usedModel } = await generateWithModelFallback(ai, {
      contents: prompt,
      systemInstruction,
      responseMimeType: 'application/json',
      preferredModel: modelName,
    });

    const cleaned = cleanJsonResponse(text);
    const parsedJson = JSON.parse(cleaned);
    const validated = SOPSchema.parse(parsedJson);

    return {
      data: validated,
      isRealAI: true,
      model: usedModel,
    };
  } catch (err: any) {
    console.error('Gemini SOP Generation Error:', err);
    // Graceful fallback with clear error explanation
    const demoFallback = generateDemoFallbackSOP(transcript, metadata);
    return {
      data: demoFallback,
      isRealAI: false,
      model: 'demo-mode-error-fallback',
      error: `Gemini API error (${err.message || 'Unknown error'}). Showing demo fallback.`,
      note: 'Error encountered connecting to Gemini. Showing local sample procedure.',
    };
  }
}

/**
 * Regenerate an individual step
 */
export async function regenerateStep(
  stepNumber: number,
  currentStep: SOPStep,
  feedback: string,
  sopTitle: string,
  customApiKey?: string
): Promise<AIResult<SOPStep>> {
  const apiKey = getApiKey(customApiKey);
  const modelName = getModelName();

  if (!apiKey) {
    return {
      data: {
        ...currentStep,
        instructions: `${currentStep.instructions} (Updated per note: ${feedback})`,
        warnings: [...currentStep.warnings, `Review note: ${feedback}`],
      },
      isRealAI: false,
      model: 'demo-mode-fallback',
      note: 'Demo mode simulated step update.',
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You are refining Step ${stepNumber} for the SOP titled "${sopTitle}".
Current Step details:
${JSON.stringify(currentStep, null, 2)}

Owner's Adjustment Instructions:
"${feedback}"

Update the step accordingly. Do not invent steps outside the owner instructions. Return pure JSON matching the SOPStep schema.`;

  try {
    const { text, usedModel } = await generateWithModelFallback(ai, {
      contents: prompt,
      responseMimeType: 'application/json',
      preferredModel: modelName,
    });

    const parsed = JSON.parse(cleanJsonResponse(text));
    const validated = SOPStepSchema.parse(parsed);
    return {
      data: validated,
      isRealAI: true,
      model: usedModel,
    };
  } catch (err: any) {
    console.error('Gemini step regeneration error:', err);
    return {
      data: currentStep,
      isRealAI: false,
      model: 'demo-mode-error-fallback',
      error: err.message,
    };
  }
}

/**
 * CORE FEATURE D — MULTILINGUAL TRANSLATION
 */
export async function translateSOPContent(
  sop: SOP,
  targetLanguage: string,
  customApiKey?: string
): Promise<AIResult<SOP>> {
  const apiKey = getApiKey(customApiKey);
  const modelName = getModelName();

  if (!apiKey) {
    // If Marathi or Hindi and matches Daily Grind Cafe sample, return high quality seeded translations
    if (sop.title.toLowerCase().includes('cappuccino') && targetLanguage.toLowerCase() === 'marathi') {
      const { storage } = await import('./storage.js');
      const seedTrans = storage.getTranslation('ver-cappuccino-v1', 'Marathi');
      if (seedTrans) {
        return {
          data: seedTrans.sop_json,
          isRealAI: false,
          model: 'demo-seeded-translation',
          note: 'Sample Marathi translation for demonstration (Demo Mode).',
        };
      }
    }

    // Generic translation demo fallback
    const simulated: SOP = {
      ...sop,
      title: `${sop.title} [${targetLanguage}]`,
      summary: `[${targetLanguage} Translation] ${sop.summary}`,
      language: targetLanguage,
      steps: sop.steps.map((s) => ({
        ...s,
        title: `[${targetLanguage}] ${s.title}`,
        instructions: `(${targetLanguage}) ${s.instructions}`,
      })),
    };
    return {
      data: simulated,
      isRealAI: false,
      model: 'demo-mode-fallback',
      note: `Simulated ${targetLanguage} translation in Demo Mode. Connect Gemini API key for authentic live translation.`,
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Translate the following business Standard Operating Procedure into natural, fluent ${targetLanguage} for frontline Indian workers.
Requirements:
1. Translate title, summary, step titles, instructions, expected outcomes, warnings, and mistakes.
2. Technical equipment terms and measurements (e.g., 18g, 60–65°C, 25–30 seconds, Portafilter, Steam Wand) must be preserved accurately in familiar localized or transliterated forms.
3. Use simple, direct, respectful everyday language.
4. Output valid JSON matching the exact SOP schema with "language": "${targetLanguage}".

Input SOP:
${JSON.stringify(sop, null, 2)}`;

  try {
    const { text, usedModel } = await generateWithModelFallback(ai, {
      contents: prompt,
      responseMimeType: 'application/json',
      preferredModel: modelName,
    });

    const parsed = JSON.parse(cleanJsonResponse(text));
    const validated = SOPSchema.parse(parsed);
    return {
      data: validated,
      isRealAI: true,
      model: usedModel,
    };
  } catch (err: any) {
    console.error('Gemini Translation Error:', err);
    return {
      data: { ...sop, language: targetLanguage },
      isRealAI: false,
      model: 'demo-mode-error-fallback',
      error: err.message,
    };
  }
}

/**
 * CORE FEATURE G — QUIZ AND ASSESSMENT GENERATOR
 */
export async function generateQuiz(
  sop: SOP,
  customApiKey?: string
): Promise<AIResult<Quiz>> {
  const apiKey = getApiKey(customApiKey);
  const modelName = getModelName();

  if (!apiKey) {
    const demoQuiz: Quiz = {
      passing_score: 80,
      questions: sop.steps.slice(0, 5).map((step, idx) => ({
        question: `In Step ${step.step_number} ("${step.title}"), what is the primary instruction?`,
        type: idx % 2 === 0 ? 'multiple_choice' : 'scenario',
        options: [
          step.instructions.substring(0, 60) + '...',
          'Skip this step and proceed directly to cleanup.',
          'Wait 30 minutes before starting.',
          'Ask the customer to perform this step.',
        ],
        correct_answer_index: 0,
        explanation: `As detailed in Step ${step.step_number}, ${step.expected_outcome}`,
        source_step_numbers: [step.step_number],
      })),
    };
    return {
      data: demoQuiz,
      isRealAI: false,
      model: 'demo-mode-fallback',
      note: 'Generated standard quiz structure in Demo Mode.',
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You are an assessment specialist for Indian SME workplace training.
Generate a 5-question knowledge check quiz based strictly on the approved SOP below.
Requirements:
- 5 high-quality questions (mix of multiple_choice and scenario-based).
- All questions MUST be answerable strictly from the provided SOP content.
- Do NOT test outside knowledge.
- Include 4 options per question, correct_answer_index (0-3), detailed explanation, and source_step_numbers.
- Passing score should default to 80.

SOP Title: ${sop.title}
Steps:
${JSON.stringify(sop.steps, null, 2)}

Return pure JSON conforming to this schema:
{
  "passing_score": 80,
  "questions": [
    {
      "question": string,
      "type": "multiple_choice" | "scenario" | "true_false",
      "options": string[],
      "correct_answer_index": number,
      "explanation": string,
      "source_step_numbers": number[]
    }
  ]
}`;

  try {
    const { text, usedModel } = await generateWithModelFallback(ai, {
      contents: prompt,
      responseMimeType: 'application/json',
      preferredModel: modelName,
    });

    const parsed = JSON.parse(cleanJsonResponse(text));
    const validated = QuizSchema.parse(parsed);
    return {
      data: validated,
      isRealAI: true,
      model: usedModel,
    };
  } catch (err: any) {
    console.error('Gemini Quiz Generation Error:', err);
    return {
      data: {
        passing_score: 80,
        questions: [],
      },
      isRealAI: false,
      model: 'demo-mode-error-fallback',
      error: err.message,
    };
  }
}

/**
 * CORE FEATURE F — GROUNDED AI KNOWLEDGE ASSISTANT
 */
export async function answerKnowledgeQuestion(
  question: string,
  approvedSOPs: SOP[],
  employeeLanguage: string = 'English',
  customApiKey?: string
): Promise<{
  answer: string;
  sourceReferences: string[];
  isRealAI: boolean;
  canEscalate: boolean;
  model: string;
}> {
  const apiKey = getApiKey(customApiKey);
  const modelName = getModelName();

  // Prepare context from approved SOPs
  const contextText = approvedSOPs
    .map(
      (sop) => `=== TRAINING: ${sop.title} ===
Summary: ${sop.summary}
Steps:
${sop.steps
  .map(
    (s) =>
      `Step ${s.step_number}: ${s.title}
Instructions: ${s.instructions}
Expected Outcome: ${s.expected_outcome}
Warnings: ${s.warnings.join(', ')}
Common Mistakes: ${s.common_mistakes.join(', ')}`
  )
  .join('\n\n')}`
    )
    .join('\n\n====================\n\n');

  if (!apiKey) {
    // Intelligent local matcher for offline/demo mode
    const qLower = question.toLowerCase();
    if (qLower.includes('दूध') || qLower.includes('milk') || qLower.includes('temperature') || qLower.includes('वाफव')) {
      return {
        answer:
          employeeLanguage === 'Marathi'
            ? 'कॅप्युचिनो तयार करताना थंड दूध ६०°C ते ६५°C (60–65°C) पर्यंत वाफवायचे असते. दूध कधीही ७०°C च्या वर गरम करू नका कारण दुधाची चव बिघडते.'
            : 'Cold milk should be steamed to 60–65°C to create velvety microfoam. Never heat milk above 70°C as proteins burn and taste bitter.',
        sourceReferences: ['Cappuccino Preparation — Step 4 (Milk Steaming and Microfoam Creation)'],
        isRealAI: false,
        canEscalate: false,
        model: 'demo-grounded-matcher',
      };
    }

    if (qLower.includes('coffee') || qLower.includes('gram') || qLower.includes('grind') || qLower.includes('दळणे')) {
      return {
        answer:
          employeeLanguage === 'Marathi'
            ? 'तंतोतंत १८.० ग्रॅम ताजी कॉफी बीन्स पोर्टाफिल्टर बास्केटमध्ये दळून घ्या.'
            : 'Grind exactly 18.0 grams of fresh coffee beans directly into the dry portafilter basket.',
        sourceReferences: ['Cappuccino Preparation — Step 2 (Dosing and Grinding Coffee Beans)'],
        isRealAI: false,
        canEscalate: false,
        model: 'demo-grounded-matcher',
      };
    }

    if (qLower.includes('serve') || qLower.includes('customer') || qLower.includes('वेळ')) {
      return {
        answer:
          employeeLanguage === 'Marathi'
            ? 'कॅप्युचिनो तयार झाल्यानंतर ६० सेकंदांच्या आत सॉसर आणि चमच्यासह ग्राहकास हसतमुखाने द्यावा.'
            : 'Serve the cappuccino within 60 seconds of preparation on a clean saucer with a teaspoon.',
        sourceReferences: ['Cappuccino Preparation — Step 7 (Service and Customer Confirmation)'],
        isRealAI: false,
        canEscalate: false,
        model: 'demo-grounded-matcher',
      };
    }

    return {
      answer:
        "I couldn't find that instruction in your approved training. Please ask your manager.",
      sourceReferences: [],
      isRealAI: false,
      canEscalate: true,
      model: 'demo-grounded-matcher',
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are Zotoz's business training assistant for frontline employees.
Answer employee questions using ONLY the approved training materials provided in the context.
Use clear, simple language and the employee's requested language (${employeeLanguage}).
Cite the training title and relevant step numbers in every answer when possible.
If the answer is not available in the approved training, clearly say:
"I couldn't find that instruction in your approved training. Please ask your manager."
Never invent business policies, machine instructions, safety procedures, payment terms, or operating instructions.
Never override the approved business SOP.
For safety-critical questions, direct employees to their manager or the official approved safety procedure.
Do not disclose private business data, employee records, or owner-only information.`;

  const prompt = `Approved Training Context:
${contextText}

Employee Question (in ${employeeLanguage}):
"${question}"

Provide a concise, helpful answer strictly grounded in the approved training above. If grounded, include citation line at the bottom: "Source: [Training Title] - Step X".`;

  try {
    const { text: answerText, usedModel } = await generateWithModelFallback(ai, {
      contents: prompt,
      systemInstruction,
      preferredModel: modelName,
    });

    const isUnanswerable =
      answerText.toLowerCase().includes("couldn't find that instruction") ||
      answerText.toLowerCase().includes('ask your manager');

    const sources: string[] = [];
    if (!isUnanswerable) {
      // Extract matched training or step references
      for (const sop of approvedSOPs) {
        if (answerText.toLowerCase().includes(sop.title.toLowerCase())) {
          sources.push(sop.title);
        }
      }
      if (sources.length === 0 && approvedSOPs.length > 0) {
        sources.push(`${approvedSOPs[0].title} (Approved SOP)`);
      }
    }

    return {
      answer: answerText,
      sourceReferences: sources,
      isRealAI: true,
      canEscalate: isUnanswerable,
      model: usedModel,
    };
  } catch (err: any) {
    console.error('Gemini Assistant Error:', err);
    return {
      answer: "I couldn't find that instruction in your approved training. Please ask your manager.",
      sourceReferences: [],
      isRealAI: false,
      canEscalate: true,
      model: 'demo-mode-error-fallback',
    };
  }
}

function generateDemoFallbackSOP(
  transcript: string,
  metadata: {
    title?: string;
    department?: string;
    targetRole?: string;
    language?: string;
    additionalContext?: string;
  }
): SOP {
  const lines = transcript
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const steps: SOPStep[] = lines.map((line, idx) => {
    // Strip leading numbers if present
    const cleanLine = line.replace(/^\d+[\.\)\-\s]+/, '').trim();
    return {
      step_number: idx + 1,
      title: cleanLine.length > 40 ? cleanLine.substring(0, 37) + '...' : cleanLine,
      instructions: cleanLine,
      expected_outcome: `Step completed satisfactorily as instructed: "${cleanLine}"`,
      materials: idx === 0 ? ['Workplace safety PPE'] : [],
      warnings: idx === 0 ? ['Verify area is safe before proceeding.'] : [],
      common_mistakes: ['Rushing the procedure without verifying alignment.'],
      source_reference: `Input line ${idx + 1}`,
    };
  });

  return {
    title: metadata.title || 'Standard Operating Procedure (Demo Draft)',
    summary: `Structured operational training procedure based on owner's recorded knowledge for ${metadata.targetRole || 'frontline staff'} in ${metadata.department || 'Operations'}.`,
    language: metadata.language || 'English',
    estimated_duration: Math.max(5, steps.length * 2),
    prerequisites: ['Standard onboarding briefing', 'Wear required uniform and badge'],
    materials: ['Operating equipment', 'Cleaning supplies'],
    steps: steps.length > 0 ? steps : [
      {
        step_number: 1,
        title: 'Initial Preparation',
        instructions: 'Inspect workstation and confirm all tools are ready.',
        expected_outcome: 'Workstation ready for operation.',
        materials: ['Checklist'],
        warnings: ['Ensure floor is dry.'],
        common_mistakes: ['Starting without tool check.'],
        source_reference: 'Owner induction',
      },
    ],
    completion_checklist: steps.map((s) => `Completed: ${s.title}`),
    knowledge_gaps: ['Confirm specific machine model and vendor maintenance schedule.'],
    owner_review_required: true,
  };
}
