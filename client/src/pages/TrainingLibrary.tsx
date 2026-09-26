import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Edit3,
  CheckCircle,
  Clock,
  Sparkles,
  Users,
  Send,
  Plus,
  Trash2,
  Globe,
  AlertTriangle,
  HelpCircle,
  Eye,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  X,
  Volume2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  fetchTrainings,
  fetchTraining,
  publishTraining,
  translateTraining,
  assignTrainingToEmployees,
  updateTrainingDraft,
  regenerateStepWithAI,
} from '../services/api';
import { TrainingModule, SOP, SOPStep, User } from '../types';
import { AudioSpeaker } from '../components/common/AudioSpeaker';
import { NavigationTab } from '../components/layout/Sidebar';

interface TrainingLibraryProps {
  onNavigate: (tab: NavigationTab) => void;
  selectedTrainingId?: string | null;
}

export const TrainingLibrary: React.FC<TrainingLibraryProps> = ({
  onNavigate,
  selectedTrainingId,
}) => {
  const { employees, showNotification, switchUser } = useApp();

  const [trainings, setTrainings] = useState<TrainingModule[]>([]);
  const [activeTraining, setActiveTraining] = useState<TrainingModule | null>(null);
  const [activeSOP, setActiveSOP] = useState<SOP | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<string>('English');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Editing state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingSummary, setEditingSummary] = useState('');
  const [steps, setSteps] = useState<SOPStep[]>([]);

  // Step AI Regeneration modal
  const [regeneratingStepIndex, setRegeneratingStepIndex] = useState<number | null>(null);
  const [regenFeedback, setRegenFeedback] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Assign Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [isAssigning, setIsAssigning] = useState(false);

  // Translating state
  const [isTranslating, setIsTranslating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const list = await fetchTrainings();
      setTrainings(list);

      // Select specific or first training
      const targetId = selectedTrainingId || list[0]?.id;
      if (targetId) {
        await loadTrainingDetails(targetId);
      }
    } catch (e: any) {
      showNotification(`Failed to load trainings: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTrainingId]);

  const loadTrainingDetails = async (id: string) => {
    try {
      const data = await fetchTraining(id);
      setActiveTraining(data.training);
      if (data.latestVersion) {
        setActiveSOP(data.latestVersion.sop_json);
        setEditingTitle(data.latestVersion.sop_json.title);
        setEditingSummary(data.latestVersion.sop_json.summary);
        setSteps(data.latestVersion.sop_json.steps || []);
        setActiveLanguage(data.latestVersion.sop_json.language || 'English');
      }
      setIsEditing(false);
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleSaveDraft = async () => {
    if (!activeTraining || !activeSOP) return;

    try {
      const updatedSOP: SOP = {
        ...activeSOP,
        title: editingTitle,
        summary: editingSummary,
        steps,
      };

      await updateTrainingDraft(activeTraining.id, {
        title: editingTitle,
        description: editingSummary,
        sop: updatedSOP,
      });

      setActiveSOP(updatedSOP);
      setIsEditing(false);
      showNotification('SOP draft changes saved successfully.', 'success');
      loadData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handlePublish = async () => {
    if (!activeTraining) return;
    try {
      await publishTraining(activeTraining.id);
      showNotification(
        `"${activeTraining.title}" is now published and available to employees!`,
        'success'
      );
      loadData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleTranslate = async (lang: string) => {
    if (!activeTraining) return;
    setIsTranslating(true);
    try {
      const res = await translateTraining(activeTraining.id, lang);
      if (res.translation?.sop_json) {
        setActiveSOP(res.translation.sop_json);
        setSteps(res.translation.sop_json.steps || []);
        setActiveLanguage(lang);
        showNotification(
          `SOP successfully translated into ${lang}${res.cached ? ' (cached)' : ''}!`,
          'success'
        );
      }
    } catch (err: any) {
      showNotification(`Translation error: ${err.message}`, 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleRegenerateStep = async () => {
    if (regeneratingStepIndex === null || !activeTraining) return;
    const currentStep = steps[regeneratingStepIndex];
    setIsRegenerating(true);

    try {
      const result = await regenerateStepWithAI(
        activeTraining.id,
        currentStep.step_number,
        currentStep,
        regenFeedback
      );

      const newSteps = [...steps];
      newSteps[regeneratingStepIndex] = result.data;
      setSteps(newSteps);
      setRegeneratingStepIndex(null);
      setRegenFeedback('');
      showNotification(`Step ${currentStep.step_number} updated with AI.`, 'success');
    } catch (err: any) {
      showNotification(`Regeneration failed: ${err.message}`, 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTraining || selectedEmployees.length === 0) return;

    setIsAssigning(true);
    try {
      await assignTrainingToEmployees(activeTraining.id, selectedEmployees, dueDate);
      showNotification(
        `Assigned "${activeTraining.title}" to ${selectedEmployees.length} employee(s).`,
        'success'
      );
      setIsAssignOpen(false);
      loadData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleEmployeeSelection = (id: string) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(selectedEmployees.filter((e) => e !== id));
    } else {
      setSelectedEmployees([...selectedEmployees, id]);
    }
  };

  const selectAllEmployees = () => {
    const frontline = employees.filter((e) => e.role === 'EMPLOYEE').map((e) => e.id);
    setSelectedEmployees(frontline);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
          {trainings.map((t) => (
            <button
              key={t.id}
              onClick={() => loadTrainingDetails(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                activeTraining?.id === t.id
                  ? 'bg-[#182337] text-white border-[#B8F34A] shadow-sm'
                  : 'bg-[#0B1220] text-[#9CAFC8] border-[#2A3C5B] hover:border-[#3D557F]'
              }`}
            >
              <span>{t.title}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded uppercase ${
                  t.status === 'published'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-400/20 text-amber-300'
                }`}
              >
                {t.status}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => onNavigate('create')}
          className="px-3.5 py-2 rounded-lg bg-[#B8F34A] hover:bg-[#A4DC3D] text-[#0B1220] font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Procedure</span>
        </button>
      </div>

      {activeTraining && activeSOP && (
        <div className="space-y-6">
          {/* Action Bar / Status Banner */}
          <div className="p-4 rounded-xl bg-[#182337] border border-[#2A3C5B] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  activeTraining.status === 'published'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                {activeTraining.status === 'published'
                  ? 'Published & Verified (v' + (activeTraining.current_version || 1) + ')'
                  : 'AI-Generated Draft — Review Before Publishing'}
              </span>
              <span className="text-xs text-[#9CAFC8]">
                {activeTraining.department} • For {activeTraining.target_role}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Language Switcher for SOP */}
              <div className="flex items-center bg-[#0B1220] rounded-lg p-1 border border-[#2A3C5B]">
                <Globe className="w-3.5 h-3.5 text-[#9CAFC8] ml-2 mr-1" />
                <button
                  onClick={() => handleTranslate('English')}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    activeLanguage === 'English'
                      ? 'bg-[#182337] text-white border border-[#2A3C5B]'
                      : 'text-[#9CAFC8] hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => handleTranslate('Marathi')}
                  disabled={isTranslating}
                  className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                    activeLanguage === 'Marathi'
                      ? 'bg-[#182337] text-white border border-[#2A3C5B]'
                      : 'text-[#9CAFC8] hover:text-white'
                  }`}
                >
                  <span>मराठी (MR)</span>
                  {isTranslating && activeLanguage === 'Marathi' && (
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  )}
                </button>
                <button
                  onClick={() => handleTranslate('Hindi')}
                  disabled={isTranslating}
                  className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                    activeLanguage === 'Hindi'
                      ? 'bg-[#182337] text-white border border-[#2A3C5B]'
                      : 'text-[#9CAFC8] hover:text-white'
                  }`}
                >
                  <span>हिन्दी (HI)</span>
                  {isTranslating && activeLanguage === 'Hindi' && (
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  )}
                </button>
              </div>

              {/* Edit Mode Toggle */}
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#0B1220] hover:bg-[#253757] text-white border border-[#2A3C5B] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#B8F34A]" />
                  <span>Edit SOP</span>
                </button>
              ) : (
                <button
                  onClick={handleSaveDraft}
                  className="px-3.5 py-1.5 rounded-lg bg-[#B8F34A] hover:bg-[#A4DC3D] text-[#0B1220] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Save Edits</span>
                </button>
              )}

              {/* Assign to Employees Button */}
              <button
                onClick={() => {
                  selectAllEmployees();
                  setIsAssignOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#253757] hover:bg-[#2D4268] text-white border border-[#2A3C5B] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-[#B8F34A]" />
                <span>Assign to Staff</span>
              </button>

              {/* Publish Button */}
              {activeTraining.status !== 'published' && (
                <button
                  onClick={handlePublish}
                  className="px-4 py-1.5 rounded-lg bg-[#B8F34A] hover:bg-[#A4DC3D] text-[#0B1220] font-bold text-xs flex items-center gap-1.5 shadow-glow-lime transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Publish Version</span>
                </button>
              )}
            </div>
          </div>

          {/* SOP Document Surface */}
          <div className="p-6 md:p-8 rounded-2xl bg-[#182337] border border-[#2A3C5B] space-y-6">
            {/* Title & Overview */}
            <div className="space-y-3 pb-6 border-b border-[#2A3C5B]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {!isEditing ? (
                    <div className="flex items-center gap-3">
                      <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                        {activeSOP.title}
                      </h1>
                      <AudioSpeaker text={activeSOP.title} language={activeLanguage} />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="w-full text-xl font-bold px-3 py-1.5 rounded bg-[#0B1220] border border-[#B8F34A] text-white focus:outline-none"
                    />
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-[#9CAFC8] shrink-0">
                  <Clock className="w-3.5 h-3.5 text-[#B8F34A]" />
                  <span>Est. Duration: {activeSOP.estimated_duration || 8} mins</span>
                </div>
              </div>

              {!isEditing ? (
                <p className="text-sm text-[#9CAFC8] leading-relaxed">{activeSOP.summary}</p>
              ) : (
                <textarea
                  rows={2}
                  value={editingSummary}
                  onChange={(e) => setEditingSummary(e.target.value)}
                  className="w-full p-2.5 rounded bg-[#0B1220] border border-[#2A3C5B] text-xs text-white focus:outline-none"
                />
              )}
            </div>

            {/* Prerequisites & Materials Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#0B1220] border border-[#2A3C5B] space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Prerequisites for Trainee
                </h4>
                <ul className="text-xs text-[#9CAFC8] space-y-1 list-disc list-inside">
                  {activeSOP.prerequisites && activeSOP.prerequisites.length > 0 ? (
                    activeSOP.prerequisites.map((pre, i) => <li key={i}>{pre}</li>)
                  ) : (
                    <li>Basic café station and food safety briefing</li>
                  )}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#0B1220] border border-[#2A3C5B] space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#B8F34A] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Required Materials & Tools
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeSOP.materials && activeSOP.materials.length > 0 ? (
                    activeSOP.materials.map((mat, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-[#182337] border border-[#2A3C5B] text-[11px] text-[#9CAFC8]"
                      >
                        {mat}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#9CAFC8]">Standard operational equipment</span>
                  )}
                </div>
              </div>
            </div>

            {/* Step-by-Step Procedure */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Standard Operating Steps ({steps.length})</span>
                  <span className="text-xs font-normal text-[#9CAFC8]">
                    (Language: {activeLanguage})
                  </span>
                </h3>

                {isEditing && (
                  <button
                    onClick={() => {
                      const newStep: SOPStep = {
                        step_number: steps.length + 1,
                        title: `Step ${steps.length + 1}`,
                        instructions: 'Enter instructions here...',
                        expected_outcome: 'Expected result...',
                        materials: [],
                        warnings: [],
                        common_mistakes: [],
                        source_reference: 'Manual addition',
                      };
                      setSteps([...steps, newStep]);
                    }}
                    className="text-xs text-[#B8F34A] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl bg-[#10192A] border border-[#2A3C5B] space-y-3 relative group"
                  >
                    {/* Step Title Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-[#B8F34A]/10 border border-[#B8F34A]/30 text-[#B8F34A] font-bold text-xs flex items-center justify-center shrink-0">
                          {step.step_number}
                        </span>

                        {!isEditing ? (
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{step.title}</h4>
                            <AudioSpeaker
                              text={`${step.title}. ${step.instructions}`}
                              language={activeLanguage}
                            />
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) => {
                              const updated = [...steps];
                              updated[idx].title = e.target.value;
                              setSteps(updated);
                            }}
                            className="px-2 py-1 rounded bg-[#0B1220] border border-[#2A3C5B] text-white text-xs font-bold focus:border-[#B8F34A] focus:outline-none"
                          />
                        )}
                      </div>

                      {/* Action buttons on step */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setRegeneratingStepIndex(idx);
                            setRegenFeedback(
                              `Make Step ${step.step_number} more specific regarding safety and temperature.`
                            );
                          }}
                          title="Refine this step using Gemini"
                          className="px-2.5 py-1 rounded bg-[#182337] hover:bg-[#253757] text-[#B8F34A] border border-[#2A3C5B] text-[11px] font-medium flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>AI Refine</span>
                        </button>

                        {isEditing && (
                          <button
                            onClick={() => {
                              const updated = steps.filter((_, i) => i !== idx);
                              // Re-number
                              setSteps(
                                updated.map((s, i) => ({ ...s, step_number: i + 1 }))
                              );
                            }}
                            className="p-1 rounded text-rose-400 hover:bg-rose-500/20"
                            title="Delete step"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Step Instructions */}
                    {!isEditing ? (
                      <p className="text-xs text-[#9CAFC8] leading-relaxed pl-10">
                        {step.instructions}
                      </p>
                    ) : (
                      <textarea
                        rows={2}
                        value={step.instructions}
                        onChange={(e) => {
                          const updated = [...steps];
                          updated[idx].instructions = e.target.value;
                          setSteps(updated);
                        }}
                        className="w-full ml-10 p-2 rounded bg-[#0B1220] border border-[#2A3C5B] text-white text-xs focus:outline-none"
                      />
                    )}

                    {/* Expected Outcome */}
                    <div className="ml-10 p-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white">Expected Outcome: </span>
                        <span className="text-[#9CAFC8]">{step.expected_outcome}</span>
                      </div>
                    </div>

                    {/* Warnings & Common Mistakes */}
                    {(step.warnings?.length > 0 || step.common_mistakes?.length > 0) && (
                      <div className="ml-10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {step.warnings && step.warnings.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                            <span className="font-bold flex items-center gap-1 mb-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Safety Warnings:
                            </span>
                            <ul className="list-disc list-inside space-y-0.5">
                              {step.warnings.map((w, wi) => (
                                <li key={wi}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {step.common_mistakes && step.common_mistakes.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                            <span className="font-bold flex items-center gap-1 mb-1">
                              <HelpCircle className="w-3.5 h-3.5" />
                              Common Mistakes:
                            </span>
                            <ul className="list-disc list-inside space-y-0.5">
                              {step.common_mistakes.map((m, mi) => (
                                <li key={mi}>{m}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Knowledge Gaps Callout if present */}
            {activeSOP.knowledge_gaps && activeSOP.knowledge_gaps.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Knowledge Gaps Requiring Owner Verification:
                </p>
                <ul className="list-disc list-inside space-y-0.5 pl-2">
                  {activeSOP.knowledge_gaps.map((gap, i) => (
                    <li key={i}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REGENERATE STEP MODAL */}
      {regeneratingStepIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#182337] border border-[#2A3C5B] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#B8F34A]" />
                Regenerate Step {steps[regeneratingStepIndex]?.step_number} with Gemini
              </h3>
              <button
                onClick={() => setRegeneratingStepIndex(null)}
                className="text-[#9CAFC8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#9CAFC8]">
              Instruct Gemini how to refine or adjust this step (e.g. emphasize safety rules, clarify machine settings, or simplify language).
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                Adjustment Instruction:
              </label>
              <textarea
                rows={3}
                value={regenFeedback}
                onChange={(e) => setRegenFeedback(e.target.value)}
                placeholder="e.g. Make sure to specify using a clean dry cloth before grinding beans."
                className="w-full p-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-xs text-white focus:border-[#B8F34A] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRegeneratingStepIndex(null)}
                className="px-3 py-1.5 text-xs text-[#9CAFC8] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegenerateStep}
                disabled={isRegenerating}
                className="px-4 py-2 rounded-lg bg-[#B8F34A] hover:bg-[#A4DC3D] text-[#0B1220] font-bold text-xs flex items-center gap-1.5"
              >
                {isRegenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Regenerating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply AI Update</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN TO EMPLOYEES MODAL */}
      {isAssignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#182337] border border-[#2A3C5B] rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#B8F34A]" />
                Assign Training: {activeTraining?.title}
              </h3>
              <button onClick={() => setIsAssignOpen(false)} className="text-[#9CAFC8] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#9CAFC8] mb-1.5">
                  Select Team Members:
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {employees
                    .filter((e) => e.role === 'EMPLOYEE')
                    .map((emp) => {
                      const isChecked = selectedEmployees.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => toggleEmployeeSelection(emp.id)}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-[#0B1220] border-[#B8F34A] text-white'
                              : 'bg-[#10192A] border-[#2A3C5B] text-[#9CAFC8]'
                          }`}
                        >
                          <div>
                            <span className="font-semibold text-white">{emp.full_name}</span>
                            <span className="text-[#9CAFC8] ml-2">({emp.preferred_language})</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-[#2A3C5B] text-[#B8F34A] focus:ring-[#B8F34A]"
                          />
                        </div>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white text-xs focus:border-[#B8F34A] focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-xs text-[#9CAFC8]">
                💡 Tip: When assigned, each employee will automatically see instructions and take the
                assessment in their preferred language.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#9CAFC8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedEmployees.length === 0 || isAssigning}
                  className="px-5 py-2.5 rounded-lg bg-[#B8F34A] hover:bg-[#A4DC3D] text-[#0B1220] font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isAssigning ? 'Assigning...' : 'Confirm Assignment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
