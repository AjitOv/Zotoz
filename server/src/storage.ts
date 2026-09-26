import './env.js';
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import {
  Business,
  User,
  TrainingModule,
  TrainingVersion,
  TrainingAssignment,
  TrainingProgress,
  QuizAttempt,
  TrainingTranslation,
  KnowledgeQuestion,
  ProcessingJob,
  SOP,
  Quiz,
} from './types.js';

interface DatabaseSchema {
  businesses: Business[];
  users: User[];
  training_modules: TrainingModule[];
  training_versions: TrainingVersion[];
  training_assignments: TrainingAssignment[];
  training_progress: TrainingProgress[];
  quiz_attempts: QuizAttempt[];
  training_translations: TrainingTranslation[];
  knowledge_questions: KnowledgeQuestion[];
  processing_jobs: ProcessingJob[];
  system_settings: {
    gemini_api_key?: string;
    gemini_model?: string;
    is_demo_mode: boolean;
    storage_type: 'supabase' | 'local';
    supabase_connected: boolean;
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Initial seed data for The Daily Grind Café
const SEED_BUSINESS_ID = 'biz-daily-grind-01';
const SEED_OWNER_ID = 'user-owner-01';
const SEED_RAHUL_ID = 'user-emp-rahul-01';
const SEED_PRIYA_ID = 'user-emp-priya-02';
const SEED_AMIT_ID = 'user-emp-amit-03';
const SEED_TRAINING_ID = 'train-cappuccino-01';
const SEED_VERSION_ID = 'ver-cappuccino-v1';
const SEED_ASSIGNMENT_PRIYA_ID = 'asgn-priya-01';
const SEED_ASSIGNMENT_RAHUL_ID = 'asgn-rahul-01';

const sampleSOP: SOP = {
  title: 'Cappuccino Preparation',
  summary: 'Standard operating procedure for preparing and serving a consistent, high-quality artisanal cappuccino for café guests.',
  language: 'English',
  estimated_duration: 8,
  prerequisites: [
    'Completed basic café safety and hygiene induction',
    'Espresso machine warmed up to operating pressure (9 bar)',
    'Fresh whole milk refrigerated at 4°C'
  ],
  materials: [
    'Commercial espresso grinder',
    '18g fresh specialty coffee beans',
    'Commercial espresso machine & portafilter',
    'Calibrated 58mm coffee tamper',
    'Stainless steel milk frothing pitcher (350ml)',
    '150ml cold whole milk',
    'Digital milk thermometer',
    'Clean microfiber cloth for steam wand'
  ],
  steps: [
    {
      step_number: 1,
      title: 'Hygiene & Machine Preparation',
      instructions: 'Thoroughly wash and sanitize hands with warm water and soap for 20 seconds. Inspect the espresso group head and run a 2-second blank water flush to clear residual coffee oils.',
      expected_outcome: 'Hands are sanitized and group head is clean and pre-warmed for brewing.',
      materials: ['Sanitizing soap', 'Warm water'],
      warnings: ['Group head and shower screen are extremely hot (93°C). Do not touch directly with bare hands.'],
      common_mistakes: ['Skipping the blank water flush, which causes stale coffee taste.'],
      source_reference: 'Step 1 of owner operational manual'
    },
    {
      step_number: 2,
      title: 'Dosing and Grinding Coffee Beans',
      instructions: 'Remove the portafilter, wipe the basket dry with a clean cloth. Grind exactly 18.0 grams of fresh coffee beans directly into the portafilter basket.',
      expected_outcome: 'Dry basket filled with 18g clump-free espresso coffee grounds.',
      materials: ['Specialty coffee beans', 'Digital precision scale'],
      warnings: ['Moisture in the portafilter basket leads to channeling and bitter espresso.'],
      common_mistakes: ['Grinding too far in advance, resulting in oxidized coffee.'],
      source_reference: 'Step 2 of owner operational manual'
    },
    {
      step_number: 3,
      title: 'Tamping and Espresso Extraction',
      instructions: 'Level the coffee grounds gently. Hold the tamper perpendicular and press firmly with approximately 15 kg of even pressure. Lock portafilter firmly into group head and immediately begin extraction. Extract 36ml of double espresso in 25 to 30 seconds.',
      expected_outcome: 'A rich double espresso shot with dense golden-hazelnut crema.',
      materials: ['Calibrated tamper', 'Pre-warmed ceramic cappuccino cup'],
      warnings: ['Do not bang the portafilter after tamping, as this cracks the coffee puck.'],
      common_mistakes: ['Uneven tamping causing fast watery flow under 20 seconds.'],
      source_reference: 'Step 3 of owner operational manual'
    },
    {
      step_number: 4,
      title: 'Milk Steaming and Microfoam Creation',
      instructions: 'Pour 150 ml of cold milk (4°C) into the stainless steel pitcher. Purge steam wand for 1 second. Submerge wand tip 1 cm below milk surface at an angle to create a whirlpool vortex. Stretch milk until warm to touch, then submerge slightly deeper until thermometer reads 60–65°C.',
      expected_outcome: 'Silky, glossy microfoam resembling wet paint with no large bubbles.',
      materials: ['Cold whole milk', 'Frothing pitcher', 'Milk thermometer'],
      warnings: ['Never heat milk above 70°C as proteins burn and create bitter, sour flavors. Steam wand burns skin quickly.'],
      common_mistakes: ['Holding steam wand too deep early on, causing heated flat milk without foam.'],
      source_reference: 'Step 4 of owner operational manual'
    },
    {
      step_number: 5,
      title: 'Pouring and Cup Integration',
      instructions: 'Swirl and tap the pitcher on the counter to settle foam. Slowly pour steamed milk into the center of the espresso shot from a height of 5 cm to integrate milk and crema, then lower the spout close to the surface to finish with a clean white foam circle or latte art.',
      expected_outcome: 'Harmonious drink balance of 1/3 espresso, 1/3 steamed milk, and 1/3 velvety microfoam.',
      materials: ['Cappuccino cup with extracted espresso'],
      warnings: ['Pour slowly to avoid splashing hot liquid on hands or counter.'],
      common_mistakes: ['Dumping milk too fast, breaking the golden crema ring.'],
      source_reference: 'Step 5 of owner operational manual'
    },
    {
      step_number: 6,
      title: 'Steam Wand Cleaning and Station Sanitization',
      instructions: 'Immediately wipe the steam wand with a dedicated damp microfiber cloth. Purge steam wand for 2 seconds to blow out internal milk residue. Knock out used coffee puck and rinse portafilter.',
      expected_outcome: 'Pristine steam wand free of baked milk crust and tidy barista station.',
      materials: ['Damp microfiber cloth'],
      warnings: ['Always point steam wand down into the drip tray when purging to prevent steam burns.'],
      common_mistakes: ['Delaying wand wiping, causing milk to bake onto wand and breed bacteria.'],
      source_reference: 'Step 6 of owner operational manual'
    },
    {
      step_number: 7,
      title: 'Service and Customer Confirmation',
      instructions: 'Place the cappuccino cup on a clean saucer with a teaspoon and brown sugar sachet. Serve to customer with a smile within 60 seconds of preparation. Warmly confirm order: "Here is your fresh Cappuccino, enjoy!"',
      expected_outcome: 'Delighted customer receiving hot, fresh coffee with verified order accuracy.',
      materials: ['Ceramic saucer', 'Teaspoon', 'Napkin'],
      warnings: ['Ensure saucer base is dry to avoid cup sliding.'],
      common_mistakes: ['Letting cup sit on counter until foam collapses.'],
      source_reference: 'Step 7 of owner operational manual'
    }
  ],
  completion_checklist: [
    'Espresso extracted between 25-30s with rich crema',
    'Milk steamed between 60-65°C with silky microfoam',
    'Steam wand wiped and purged immediately',
    'Served hot with clean saucer and smile'
  ],
  knowledge_gaps: [],
  owner_review_required: false
};

const sampleQuiz: Quiz = {
  passing_score: 80,
  questions: [
    {
      question: 'What is the correct dose of coffee beans for preparing a standard double espresso shot?',
      type: 'multiple_choice',
      options: ['12 grams', '18 grams', '25 grams', '30 grams'],
      correct_answer_index: 1,
      explanation: 'According to Step 2 of the SOP, exactly 18.0 grams of fresh coffee beans should be ground into the portafilter basket.',
      source_step_numbers: [2]
    },
    {
      question: 'What is the ideal extraction time window for 36ml of double espresso?',
      type: 'multiple_choice',
      options: ['10 to 15 seconds', '15 to 20 seconds', '25 to 30 seconds', '40 to 50 seconds'],
      correct_answer_index: 2,
      explanation: 'Step 3 states that 36ml of double espresso should be extracted in 25 to 30 seconds for optimal flavor extraction.',
      source_step_numbers: [3]
    },
    {
      question: 'What is the target temperature range when steaming milk for a cappuccino?',
      type: 'multiple_choice',
      options: ['40–45°C', '50–55°C', '60–65°C', '80–85°C'],
      correct_answer_index: 2,
      explanation: 'Step 4 specifies steaming cold milk to 60–65°C to create sweet, velvety microfoam without scorching milk proteins.',
      source_step_numbers: [4]
    },
    {
      question: 'Why must you immediately wipe and purge the steam wand after steaming milk?',
      type: 'scenario',
      options: [
        'To look busy in front of customers',
        'To prevent milk from baking onto wand and blowing out internal residue',
        'To cool down the coffee machine quickly',
        'To decrease machine water pressure'
      ],
      correct_answer_index: 1,
      explanation: 'Step 6 highlights wiping immediately to prevent milk crust from baking onto hot metal and purging to blow out any milk sucked into the wand tip.',
      source_step_numbers: [6]
    },
    {
      question: 'Within how many seconds should a fresh cappuccino be served to the customer?',
      type: 'multiple_choice',
      options: ['Within 60 seconds', 'Within 5 minutes', 'Within 10 minutes', 'Whenever barista is free'],
      correct_answer_index: 0,
      explanation: 'Step 7 specifies serving the cappuccino within 60 seconds to ensure the customer receives hot coffee before the delicate microfoam begins to separate.',
      source_step_numbers: [7]
    }
  ]
};

// Seed Marathi Translation for Priya Patil
const sampleMarathiSOP: SOP = {
  ...sampleSOP,
  title: 'कॅप्युचिनो बनवण्याची कार्यपद्धती (SOP)',
  summary: 'कॅफेमधील पाहुण्यांसाठी दर्जेदार आणि चवदार कॅप्युचिनो तयार करण्यासाठी प्रमाणित मार्गदर्शक कार्यपद्धती.',
  language: 'Marathi',
  prerequisites: [
    'कॅफे स्वच्छता आणि सुरक्षा नियम समजून घेतलेले असावेत',
    'एस्प्रेसो मशीन योग्य दाबावर (9 bar) चालू असावे',
    'ताजे दूध 4°C तापमानावर थंड असावे'
  ],
  materials: [
    'कॉफी ग्राइंडर',
    '१८ ग्रॅम ताजी कॉफी बीन्स',
    'एस्प्रेसो मशीन आणि पोर्टाफिल्टर',
    '५८ मिमी टॅम्पिंग टूल',
    'स्टेनलेस स्टील मिल्क पिक्चर (३५० मिली)',
    '१५० मिली थंड दूध',
    'मिल्क थर्मामीटर',
    'मायक्रोफायबर कापड'
  ],
  steps: [
    {
      step_number: 1,
      title: 'स्वच्छता आणि मशीनची तयारी',
      instructions: '२० सेकंद साबण आणि कोमट पाण्याने हात स्वच्छ धुवा. मशीनचे ग्रुप हेड २ सेकंद फ्लश करून जुनी कॉफी साफ करा.',
      expected_outcome: 'हात स्वच्छ आणि ग्रुप हेड कॉफी गाळण्यासाठी तयार.',
      materials: ['साबण', 'कोमट पाणी'],
      warnings: ['ग्रुप हेड खूप गरम असते (९३°C), हाताने थेट स्पर्श करू नका.'],
      common_mistakes: ['फ्लश न करणे, ज्यामुळे कॉफीची चव कडवट लागते.'],
      source_reference: 'पायरी १'
    },
    {
      step_number: 2,
      title: 'कॉफी बीन्स बारीक दळणे',
      instructions: 'पोर्टाफिल्टर कोरड्या कापडाने पुसा. काट्यावर तंतोतंत १८ ग्रॅम ताजी कॉफी पावडर दळून घ्या.',
      expected_outcome: '१८ ग्रॅम व्यवस्थित दळलेली ताजी कॉफी पावडर.',
      materials: ['कॉफी बीन्स', 'वजन काटा'],
      warnings: ['फिल्टरमध्ये ओलावा असल्यास कॉफी खराब होते.'],
      common_mistakes: ['खूप आधी दळून ठेवणे, ज्यामुळे कॉफीचा सुगंध उडतो.'],
      source_reference: 'पायरी २'
    },
    {
      step_number: 3,
      title: 'टॅम्पिंग आणि एस्प्रेसो काढणे',
      instructions: 'कॉफी पावडर समान पातळीवर करा आणि १५ किलो दाबाने टँप करा. मशीनमध्ये लावून २५ ते ३० सेकंदात ३६ मिली एस्प्रेसो काढा.',
      expected_outcome: 'सोनेरी रंगाची दाट फेस असलेली (Crema) एस्प्रेसो तयार होईल.',
      materials: ['टॅम्पर', 'कप'],
      warnings: ['टँप केल्यावर फिल्टरवर जोरात आदळू नका.'],
      common_mistakes: ['असमांतर टॅम्पिंगमुळे कॉफी पातळ आणि पाण्यासारखी निघणे.'],
      source_reference: 'पायरी ३'
    },
    {
      step_number: 4,
      title: 'दूध वाफवणे (Steaming)',
      instructions: '१५० मिली थंड दूध भांड्यात घ्या. वाफेचा पाईप (Steam wand) दुधात १ सेमी बुडवून वाफ सोडा आणि तापमान ६०-६५°C पर्यंत आणा.',
      expected_outcome: 'मखमली, चमकदार आणि बारीक फेस असलेले गरम दूध.',
      materials: ['थंड दूध', 'भांडे', 'थर्मामीटर'],
      warnings: ['दूध ७०°C च्या वर गरम करू नका, दुधाची चव बिघडते.'],
      common_mistakes: ['पाईप खूप खोल बुडवल्यास फेस तयार होत नाही.'],
      source_reference: 'पायरी ४'
    },
    {
      step_number: 5,
      title: 'दूध आणि एस्प्रेसो एकत्र करणे',
      instructions: 'वाफवलेले दूध ५ सेमी उंचीवरून हळूच एस्प्रेसोच्या मध्यभागी ओता आणि शेवटी सुंदर पांढरा फेस तयार करा.',
      expected_outcome: '१/३ एस्प्रेसो, १/३ गरम दूध आणि १/३ मखमली फेस असलेला संतुलित कॅप्युचिनो.',
      materials: ['कॅप्युचिनो कप'],
      warnings: ['गरम दूध अंगावर उडणार नाही याची काळजी घ्या.'],
      common_mistakes: ['दूध खूप वेगाने ओतल्यास क्रीम विरघळते.'],
      source_reference: 'पायरी ५'
    },
    {
      step_number: 6,
      title: 'वाफेचा पाईप स्वच्छ करणे',
      instructions: 'दुधाचे काम संपताच पाईप ओल्या कापडाने ताबडतोब पुसा आणि २ सेकंद वाफ सोडून आतील दूध बाहेर टाका.',
      expected_outcome: 'स्वच्छ पाईप आणि निरोगी कामाची जागा.',
      materials: ['मायक्रोफायबर कापड'],
      warnings: ['वाफ सोडताना पाईप नेहमी खालच्या दिशेने ठेवा.'],
      common_mistakes: ['पाईप न पुसल्यास दुधाचा थर जमून घाण वास येतो.'],
      source_reference: 'पायरी ६'
    },
    {
      step_number: 7,
      title: 'ग्राहकाला आदराने सर्व्ह करणे',
      instructions: 'कॅप्युचिनो कप सॉसरवर ठेवा, सोबत चमचा द्या. ६० सेकंदांच्या आत हसतमुखाने ग्राहकास द्या: "हा घ्या तुमचा गरमागरम कॅप्युचिनो!".',
      expected_outcome: 'आनंदी ग्राहक आणि अचूक ऑर्डर सेवा.',
      materials: ['सॉसर', 'चमचा'],
      warnings: ['सॉसर कोरडी असल्याची खात्री करा.'],
      common_mistakes: ['कॉफी बराच वेळ काउंटरवर ठेवणे ज्यामुळे फेस बसतो.'],
      source_reference: 'पायरी ७'
    }
  ],
  completion_checklist: [
    '२५-३० सेकंदात एस्प्रेसो काढली',
    'दूध ६०-६५°C वर वाफवले',
    'पाईप लगेच पुसून वाफ काढली',
    '६० सेकंदात हसतमुखाने सर्व्ह केले'
  ],
  knowledge_gaps: [],
  owner_review_required: false
};

// Seed Hindi Translation for Amit Kumar
const sampleHindiSOP: SOP = {
  ...sampleSOP,
  title: 'कैपुचीनो बनाने की मानक प्रक्रिया (SOP)',
  summary: 'कैफे के ग्राहकों के लिए उच्च गुणवत्ता और स्वादिष्ट कैपुचीनो तैयार करने की चरणबद्ध मार्गदर्शिका।',
  language: 'Hindi',
  steps: sampleSOP.steps.map((s) => ({
    ...s,
    title: s.step_number === 1 ? 'स्वच्छता और मशीन की तैयारी' :
           s.step_number === 2 ? 'कॉफी बीन्स का सटीक वजन और पिसाई' :
           s.step_number === 3 ? 'टैम्पिंग और एस्प्रेसो निकालना' :
           s.step_number === 4 ? 'दूध को स्टीम करना और माइक्रोफोम बनाना' :
           s.step_number === 5 ? 'कप में दूध और एस्प्रेसो मिलाना' :
           s.step_number === 6 ? 'स्टीम वैंड की तुरंत सफाई' : 'ग्राहक को परोसना'
  }))
};

function createInitialDatabase(): DatabaseSchema {
  const now = new Date().toISOString();

  return {
    businesses: [
      {
        id: SEED_BUSINESS_ID,
        name: 'Apex Supplies',
        category: 'SME · Business supplies',
        location: 'MIDC Bhosari, Pune',
        default_language: 'English',
        created_at: now,
      },
    ],
    users: [
      {
        id: SEED_OWNER_ID,
        business_id: SEED_BUSINESS_ID,
        full_name: 'Vikram Mehta (Owner)',
        email: 'vikram@apexsupplies.in',
        phone: '+91 98200 11223',
        role: 'OWNER',
        preferred_language: 'English',
        active: true,
        created_at: now,
      },
      {
        id: SEED_RAHUL_ID,
        business_id: SEED_BUSINESS_ID,
        full_name: 'Rahul Sharma',
        email: 'rahul@apexsupplies.in',
        phone: '+91 98111 22334',
        role: 'EMPLOYEE',
        preferred_language: 'English',
        active: true,
        created_at: now,
      },
      {
        id: SEED_PRIYA_ID,
        business_id: SEED_BUSINESS_ID,
        full_name: 'Priya Patil',
        email: 'priya@apexsupplies.in',
        phone: '+91 98333 44556',
        role: 'EMPLOYEE',
        preferred_language: 'Marathi',
        active: true,
        created_at: now,
      },
      {
        id: SEED_AMIT_ID,
        business_id: SEED_BUSINESS_ID,
        full_name: 'Amit Kumar',
        email: 'amit@apexsupplies.in',
        phone: '+91 98444 55667',
        role: 'EMPLOYEE',
        preferred_language: 'Hindi',
        active: true,
        created_at: now,
      },
    ],
    training_modules: [
      {
        id: SEED_TRAINING_ID,
        business_id: SEED_BUSINESS_ID,
        title: 'Cappuccino Preparation',
        description: 'Complete operational guide for grinding, extracting espresso, steaming milk, and serving standard café cappuccinos.',
        department: 'Operations',
        target_role: 'Barista & Frontline Staff',
        source_language: 'English',
        status: 'published',
        current_version: 1,
        created_by: SEED_OWNER_ID,
        created_at: now,
        updated_at: now,
      },
    ],
    training_versions: [
      {
        id: SEED_VERSION_ID,
        training_module_id: SEED_TRAINING_ID,
        version_number: 1,
        sop_json: sampleSOP,
        quiz_json: sampleQuiz,
        source_transcript: `1. Wash hands and clean the espresso machine.\n2. Grind 18 grams of fresh coffee beans.\n3. Tamp the coffee evenly and extract espresso for 25–30 seconds.\n4. Steam 150 ml of cold milk to 60–65°C, creating smooth microfoam.\n5. Pour milk slowly into the espresso.\n6. Wipe the steam wand and clean the machine after use.\n7. Serve immediately and confirm the customer order.`,
        reviewed_by: SEED_OWNER_ID,
        reviewed_at: now,
        published_at: now,
      },
    ],
    training_assignments: [
      {
        id: SEED_ASSIGNMENT_PRIYA_ID,
        business_id: SEED_BUSINESS_ID,
        training_module_id: SEED_TRAINING_ID,
        training_version_id: SEED_VERSION_ID,
        employee_id: SEED_PRIYA_ID,
        assigned_by: SEED_OWNER_ID,
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'in_progress',
        assigned_at: now,
      },
      {
        id: SEED_ASSIGNMENT_RAHUL_ID,
        business_id: SEED_BUSINESS_ID,
        training_module_id: SEED_TRAINING_ID,
        training_version_id: SEED_VERSION_ID,
        employee_id: SEED_RAHUL_ID,
        assigned_by: SEED_OWNER_ID,
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        assigned_at: now,
        completed_at: now,
      },
    ],
    training_progress: [
      {
        id: 'prog-priya-01',
        assignment_id: SEED_ASSIGNMENT_PRIYA_ID,
        completed_steps: [1, 2, 3],
        progress_percentage: 43,
        last_step: 3,
        updated_at: now,
      },
      {
        id: 'prog-rahul-01',
        assignment_id: SEED_ASSIGNMENT_RAHUL_ID,
        completed_steps: [1, 2, 3, 4, 5, 6, 7],
        progress_percentage: 100,
        last_step: 7,
        updated_at: now,
      },
    ],
    quiz_attempts: [
      {
        id: 'quiz-att-rahul-01',
        assignment_id: SEED_ASSIGNMENT_RAHUL_ID,
        employee_id: SEED_RAHUL_ID,
        score: 100,
        total_questions: 5,
        passed: true,
        answers_json: [1, 2, 2, 1, 0],
        attempt_number: 1,
        completed_at: now,
      },
    ],
    training_translations: [
      {
        id: 'trans-cappuccino-mr',
        training_version_id: SEED_VERSION_ID,
        language: 'Marathi',
        sop_json: sampleMarathiSOP,
        quiz_json: sampleQuiz,
        created_at: now,
      },
      {
        id: 'trans-cappuccino-hi',
        training_version_id: SEED_VERSION_ID,
        language: 'Hindi',
        sop_json: sampleHindiSOP,
        quiz_json: sampleQuiz,
        created_at: now,
      },
    ],
    knowledge_questions: [
      {
        id: 'kq-01',
        business_id: SEED_BUSINESS_ID,
        employee_id: SEED_PRIYA_ID,
        training_module_id: SEED_TRAINING_ID,
        question: 'दूध किती तापमानापर्यंत वाफवायचे आहे?',
        answer: 'कॅप्युचिनो तयार करताना थंड दूध ६०°C ते ६५°C (60–65°C) पर्यंत वाफवायचे असते, ज्यामुळे मखमली माइक्रोफोम तयार होतो. दूध कधीही ७०°C च्या वर गरम करू नका.',
        source_references: ['Cappuccino Preparation — Step 4 (Milk Steaming and Microfoam Creation)'],
        escalated: false,
        created_at: now,
      },
    ],
    processing_jobs: [],
    system_settings: {
      gemini_api_key: process.env.GEMINI_API_KEY || '',
      gemini_model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      is_demo_mode: !process.env.GEMINI_API_KEY,
      storage_type: process.env.SUPABASE_URL ? 'supabase' : 'local',
      supabase_connected: Boolean(process.env.SUPABASE_URL),
    },
  };
}

class StorageEngine {
  private db: DatabaseSchema;
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.ensureDataDir();
    this.db = this.loadDatabase();
    this.initSupabase();
  }

  private initSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        this.supabase = createClient(url, key, {
          auth: { persistSession: false },
          realtime: { transport: ws as any },
        });
        this.syncSupabase();
      } catch (e) {
        console.warn('Could not initialize Supabase client:', e);
      }
    }
  }

  private async syncSupabase() {
    if (!this.supabase) return;
    try {
      const { data: businesses, error } = await this.supabase.from('businesses').select('*').limit(1);
      if (!error) {
        this.db.system_settings.storage_type = 'supabase';
        this.db.system_settings.supabase_connected = true;
        console.log('✅ Supabase PostgreSQL live connection verified and active');

        // If remote database is empty, seed it
        if (!businesses || businesses.length === 0) {
          console.log('⚡ Initializing remote Supabase tables with seed data...');
          await this.seedSupabase();
        }
      }
    } catch (e) {
      console.warn('Supabase sync warning:', e);
    }
  }

  private async seedSupabase() {
    if (!this.supabase) return;
    try {
      await this.supabase.from('businesses').upsert(this.db.businesses);
      await this.supabase.from('users').upsert(this.db.users);
      await this.supabase.from('training_modules').upsert(this.db.training_modules);
      await this.supabase.from('training_versions').upsert(this.db.training_versions);
      await this.supabase.from('training_assignments').upsert(this.db.training_assignments);
      await this.supabase.from('training_progress').upsert(this.db.training_progress);
      await this.supabase.from('quiz_attempts').upsert(this.db.quiz_attempts);
      await this.supabase.from('training_translations').upsert(this.db.training_translations);
      await this.supabase.from('knowledge_questions').upsert(this.db.knowledge_questions);
      console.log('✅ Remote Supabase tables successfully populated');
    } catch (e) {
      console.warn('Supabase seeding failed:', e);
    }
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Refresh API key from env if available
        if (process.env.GEMINI_API_KEY) {
          parsed.system_settings.gemini_api_key = process.env.GEMINI_API_KEY;
          parsed.system_settings.is_demo_mode = false;
        }
        if (process.env.GEMINI_MODEL) {
          parsed.system_settings.gemini_model = process.env.GEMINI_MODEL;
        } else if (!parsed.system_settings.gemini_model || parsed.system_settings.gemini_model.includes('2.5')) {
          parsed.system_settings.gemini_model = 'gemini-3.5-flash';
        }
        if (process.env.SUPABASE_URL) {
          parsed.system_settings.storage_type = 'supabase';
          parsed.system_settings.supabase_connected = true;
        }
        if (parsed.businesses && parsed.businesses[0] && (parsed.businesses[0].name.includes('Daily Grind') || !parsed.businesses[0].name)) {
          parsed.businesses[0].name = 'Apex Supplies';
          parsed.businesses[0].category = 'SME · Business supplies';
          parsed.businesses[0].location = 'MIDC Bhosari, Pune';
        }
        if (parsed.users) {
          for (const u of parsed.users) {
            if (u.email && u.email.includes('dailygrindcafe.in')) {
              u.email = u.email.replace('dailygrindcafe.in', 'apexsupplies.in');
            }
          }
        }
        return parsed;
      } catch (e) {
        console.error('Error reading db.json, recreating initial database:', e);
      }
    }
    const initial = createInitialDatabase();
    this.saveDatabase(initial);
    return initial;
  }

  private saveDatabase(data: DatabaseSchema) {
    try {
      const sanitized = {
        ...data,
        system_settings: {
          ...data.system_settings,
          gemini_api_key: '', // Never persist raw API credentials to disk file
        },
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(sanitized, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving db.json:', e);
    }
  }

  public resetToDemo(): DatabaseSchema {
    this.db = createInitialDatabase();
    this.saveDatabase(this.db);
    return this.db;
  }

  public getDb(): DatabaseSchema {
    return this.db;
  }

  public persist() {
    this.saveDatabase(this.db);
  }

  // --- Businesses ---
  public getBusiness(id: string): Business | undefined {
    return this.db.businesses.find((b) => b.id === id);
  }

  public getCurrentBusiness(): Business {
    return this.db.businesses[0] || createInitialDatabase().businesses[0];
  }

  public updateBusiness(id: string, updates: Partial<Business>): Business | undefined {
    const biz = this.getBusiness(id);
    if (!biz) return undefined;
    Object.assign(biz, updates);
    this.persist();
    return biz;
  }

  public createBusiness(data: Omit<Business, 'id' | 'created_at'>): Business {
    const biz: Business = {
      ...data,
      id: `biz-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.db.businesses.push(biz);
    this.persist();
    return biz;
  }

  // --- Users / Employees ---
  public getUsers(businessId: string): User[] {
    return this.db.users.filter((u) => u.business_id === businessId);
  }

  public getUser(id: string): User | undefined {
    return this.db.users.find((u) => u.id === id);
  }

  public createUser(user: Omit<User, 'id' | 'created_at'>): User {
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.db.users.push(newUser);
    this.persist();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const u = this.getUser(id);
    if (!u) return undefined;
    Object.assign(u, updates);
    this.persist();
    return u;
  }

  // --- Trainings ---
  public getTrainings(businessId: string): TrainingModule[] {
    return this.db.training_modules.filter((t) => t.business_id === businessId);
  }

  public getTraining(id: string): TrainingModule | undefined {
    return this.db.training_modules.find((t) => t.id === id);
  }

  public createTraining(training: Omit<TrainingModule, 'id' | 'created_at' | 'updated_at'>): TrainingModule {
    const now = new Date().toISOString();
    const newTrain: TrainingModule = {
      ...training,
      id: `train-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: now,
      updated_at: now,
    };
    this.db.training_modules.push(newTrain);
    this.persist();
    return newTrain;
  }

  public updateTraining(id: string, updates: Partial<TrainingModule>): TrainingModule | undefined {
    const t = this.getTraining(id);
    if (!t) return undefined;
    Object.assign(t, updates, { updated_at: new Date().toISOString() });
    this.persist();
    return t;
  }

  // --- Versions ---
  public getVersions(trainingId: string): TrainingVersion[] {
    return this.db.training_versions.filter((v) => v.training_module_id === trainingId);
  }

  public getLatestVersion(trainingId: string): TrainingVersion | undefined {
    const versions = this.getVersions(trainingId);
    if (versions.length === 0) return undefined;
    return versions.sort((a, b) => b.version_number - a.version_number)[0];
  }

  public getVersion(id: string): TrainingVersion | undefined {
    return this.db.training_versions.find((v) => v.id === id);
  }

  public createVersion(version: Omit<TrainingVersion, 'id'>): TrainingVersion {
    const newVer: TrainingVersion = {
      ...version,
      id: `ver-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    this.db.training_versions.push(newVer);
    this.persist();
    return newVer;
  }

  public updateVersion(id: string, updates: Partial<TrainingVersion>): TrainingVersion | undefined {
    const v = this.getVersion(id);
    if (!v) return undefined;
    Object.assign(v, updates);
    this.persist();
    return v;
  }

  // --- Translations ---
  public getTranslation(versionId: string, language: string): TrainingTranslation | undefined {
    return this.db.training_translations.find(
      (t) => t.training_version_id === versionId && t.language.toLowerCase() === language.toLowerCase()
    );
  }

  public saveTranslation(versionId: string, language: string, sop: SOP, quiz?: Quiz): TrainingTranslation {
    const existing = this.getTranslation(versionId, language);
    if (existing) {
      existing.sop_json = sop;
      if (quiz) existing.quiz_json = quiz;
      this.persist();
      return existing;
    }
    const newTrans: TrainingTranslation = {
      id: `trans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      training_version_id: versionId,
      language,
      sop_json: sop,
      quiz_json: quiz,
      created_at: new Date().toISOString(),
    };
    this.db.training_translations.push(newTrans);
    this.persist();
    return newTrans;
  }

  // --- Assignments & Progress ---
  public getAssignments(businessId: string): TrainingAssignment[] {
    return this.db.training_assignments.filter((a) => a.business_id === businessId);
  }

  public getEmployeeAssignments(employeeId: string): TrainingAssignment[] {
    return this.db.training_assignments.filter((a) => a.employee_id === employeeId);
  }

  public getAssignment(id: string): TrainingAssignment | undefined {
    return this.db.training_assignments.find((a) => a.id === id);
  }

  public createAssignment(data: Omit<TrainingAssignment, 'id' | 'assigned_at'>): TrainingAssignment {
    const asgn: TrainingAssignment = {
      ...data,
      id: `asgn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      assigned_at: new Date().toISOString(),
    };
    this.db.training_assignments.push(asgn);

    // Create initial progress record
    const prog: TrainingProgress = {
      id: `prog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      assignment_id: asgn.id,
      completed_steps: [],
      progress_percentage: 0,
      last_step: 1,
      updated_at: new Date().toISOString(),
    };
    this.db.training_progress.push(prog);

    this.persist();
    return asgn;
  }

  public updateAssignment(id: string, updates: Partial<TrainingAssignment>): TrainingAssignment | undefined {
    const a = this.getAssignment(id);
    if (!a) return undefined;
    Object.assign(a, updates);
    this.persist();
    return a;
  }

  public getProgress(assignmentId: string): TrainingProgress | undefined {
    return this.db.training_progress.find((p) => p.assignment_id === assignmentId);
  }

  public saveProgress(assignmentId: string, completedSteps: number[], totalSteps: number, lastStep: number): TrainingProgress {
    let p = this.getProgress(assignmentId);
    const percentage = totalSteps > 0 ? Math.round((completedSteps.length / totalSteps) * 100) : 0;
    const now = new Date().toISOString();

    if (!p) {
      p = {
        id: `prog-${Date.now()}`,
        assignment_id: assignmentId,
        completed_steps: completedSteps,
        progress_percentage: percentage,
        last_step: lastStep,
        updated_at: now,
      };
      this.db.training_progress.push(p);
    } else {
      p.completed_steps = completedSteps;
      p.progress_percentage = percentage;
      p.last_step = lastStep;
      p.updated_at = now;
    }

    // Update assignment status if completed or in progress
    const asgn = this.getAssignment(assignmentId);
    if (asgn) {
      if (percentage >= 100 && asgn.status !== 'completed') {
        asgn.status = 'completed';
        asgn.completed_at = now;
      } else if (percentage > 0 && asgn.status === 'assigned') {
        asgn.status = 'in_progress';
      }
    }

    this.persist();
    return p;
  }

  // --- Quiz Attempts ---
  public getQuizAttempts(assignmentId: string): QuizAttempt[] {
    return this.db.quiz_attempts.filter((q) => q.assignment_id === assignmentId);
  }

  public getAllQuizAttempts(businessId: string): QuizAttempt[] {
    const asgnIds = new Set(this.getAssignments(businessId).map((a) => a.id));
    return this.db.quiz_attempts.filter((q) => asgnIds.has(q.assignment_id));
  }

  public recordQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'completed_at'>): QuizAttempt {
    const newAttempt: QuizAttempt = {
      ...attempt,
      id: `quiz-att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      completed_at: new Date().toISOString(),
    };
    this.db.quiz_attempts.push(newAttempt);
    this.persist();
    return newAttempt;
  }

  // --- Knowledge Questions ---
  public getQuestions(businessId: string): KnowledgeQuestion[] {
    return this.db.knowledge_questions.filter((k) => k.business_id === businessId);
  }

  public recordQuestion(q: Omit<KnowledgeQuestion, 'id' | 'created_at'>): KnowledgeQuestion {
    const newQ: KnowledgeQuestion = {
      ...q,
      id: `kq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };
    this.db.knowledge_questions.push(newQ);
    this.persist();
    return newQ;
  }

  // --- Processing Jobs ---
  public getJob(id: string): ProcessingJob | undefined {
    return this.db.processing_jobs.find((j) => j.id === id);
  }

  public createJob(job: Omit<ProcessingJob, 'id' | 'created_at' | 'updated_at'>): ProcessingJob {
    const now = new Date().toISOString();
    const newJob: ProcessingJob = {
      ...job,
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: now,
      updated_at: now,
    };
    this.db.processing_jobs.push(newJob);
    this.persist();
    return newJob;
  }

  public updateJob(id: string, updates: Partial<ProcessingJob>): ProcessingJob | undefined {
    const j = this.getJob(id);
    if (!j) return undefined;
    Object.assign(j, updates, { updated_at: new Date().toISOString() });
    this.persist();
    return j;
  }

  // --- Settings ---
  public getSettings() {
    if (process.env.GEMINI_API_KEY && (!this.db.system_settings.gemini_api_key || this.db.system_settings.gemini_api_key !== process.env.GEMINI_API_KEY)) {
      this.db.system_settings.gemini_api_key = process.env.GEMINI_API_KEY;
      this.db.system_settings.is_demo_mode = false;
    }
    if (process.env.GEMINI_MODEL) {
      this.db.system_settings.gemini_model = process.env.GEMINI_MODEL;
    }
    if (process.env.SUPABASE_URL) {
      this.db.system_settings.storage_type = 'supabase';
      this.db.system_settings.supabase_connected = true;
    }
    return this.db.system_settings;
  }

  public updateSettings(settings: Partial<DatabaseSchema['system_settings']>) {
    Object.assign(this.db.system_settings, settings);
    this.persist();
    return this.db.system_settings;
  }
}

export const storage = new StorageEngine();
