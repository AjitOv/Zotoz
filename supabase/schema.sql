-- ==============================================================================
-- Zotoz Capture — Database Schema & RLS Policies
-- Target: Supabase / PostgreSQL 15+
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Businesses
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    default_language TEXT NOT NULL DEFAULT 'English',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users (Owner, Trainer, Employee)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'TRAINER', 'EMPLOYEE')),
    preferred_language TEXT NOT NULL DEFAULT 'English',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Training Modules
CREATE TABLE IF NOT EXISTS training_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    department TEXT NOT NULL DEFAULT 'Operations',
    target_role TEXT NOT NULL DEFAULT 'Frontline Staff',
    source_language TEXT NOT NULL DEFAULT 'English',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    current_version INT NOT NULL DEFAULT 1,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Training Versions
CREATE TABLE IF NOT EXISTS training_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    sop_json JSONB NOT NULL,
    quiz_json JSONB,
    source_file_path TEXT,
    source_transcript TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    UNIQUE(training_module_id, version_number)
);

-- 5. Training Assignments
CREATE TABLE IF NOT EXISTS training_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    training_module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    training_version_id UUID NOT NULL REFERENCES training_versions(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 6. Training Progress
CREATE TABLE IF NOT EXISTS training_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL UNIQUE REFERENCES training_assignments(id) ON DELETE CASCADE,
    completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    progress_percentage INT NOT NULL DEFAULT 0,
    last_step INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES training_assignments(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INT NOT NULL,
    total_questions INT NOT NULL,
    passed BOOLEAN NOT NULL,
    answers_json JSONB NOT NULL,
    attempt_number INT NOT NULL DEFAULT 1,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Training Translations
CREATE TABLE IF NOT EXISTS training_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_version_id UUID NOT NULL REFERENCES training_versions(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    translated_content JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(training_version_id, language)
);

-- 9. Knowledge Questions (AI Grounded Q&A Log)
CREATE TABLE IF NOT EXISTS knowledge_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    training_module_id UUID REFERENCES training_modules(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source_references JSONB NOT NULL DEFAULT '[]'::jsonb,
    escalated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Processing Jobs
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    training_module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    progress INT NOT NULL DEFAULT 0,
    stage TEXT NOT NULL DEFAULT 'Reading recording',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Indexes for High Performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_business ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_trainings_business ON training_modules(business_id);
CREATE INDEX IF NOT EXISTS idx_assignments_employee ON training_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignments_business ON training_assignments(business_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_assignment ON quiz_attempts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_questions_business ON knowledge_questions(business_id);

-- ==============================================================================
-- Row Level Security (RLS) Setup
-- ==============================================================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically in Supabase
-- App user policy examples:
CREATE POLICY "Users can view members of same business"
    ON users FOR SELECT
    USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Employees can view assigned training modules"
    ON training_modules FOR SELECT
    USING (
        status = 'published' AND
        id IN (SELECT training_module_id FROM training_assignments WHERE employee_id = auth.uid())
        OR business_id = (SELECT business_id FROM users WHERE id = auth.uid() AND role IN ('OWNER', 'TRAINER'))
    );

CREATE POLICY "Employees can view own assignments and progress"
    ON training_assignments FOR ALL
    USING (employee_id = auth.uid() OR business_id = (SELECT business_id FROM users WHERE id = auth.uid() AND role = 'OWNER'));
