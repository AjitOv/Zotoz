import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Play,
  CheckCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Award,
  Globe,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Volume2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import {
  fetchAssignments,
  saveAssignmentProgress,
  submitQuizAttempt,
} from '../../services/api';
import { TrainingAssignment, SOPStep, QuizQuestion } from '../../types';
import { AudioSpeaker } from '../common/AudioSpeaker';
import { NavigationTab } from '../layout/Sidebar';

interface EmployeeViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const EmployeeView: React.FC<EmployeeViewProps> = ({ onNavigate }) => {
  const { currentUser, showNotification } = useApp();
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [activeAssignment, setActiveAssignment] = useState<TrainingAssignment | null>(null);

  // Player state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [playerLanguage, setPlayerLanguage] = useState<string>('English');

  // Quiz state
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  const loadEmployeeAssignments = async () => {
    if (!currentUser) return;
    try {
      const data = await fetchAssignments(currentUser.id);
      setAssignments(data);
      if (data.length > 0 && !activeAssignment) {
        selectAssignmentForStudy(data[0]);
      }
    } catch (e: any) {
      console.error('Error loading assignments:', e);
    }
  };

  useEffect(() => {
    loadEmployeeAssignments();
  }, [currentUser]);

  const selectAssignmentForStudy = (asgn: TrainingAssignment) => {
    setActiveAssignment(asgn);
    setCompletedSteps(asgn.completedSteps || []);
    setCurrentStepIndex(Math.max(0, (asgn.lastStep || 1) - 1));
    setPlayerLanguage(asgn.employeeLanguage || currentUser?.preferred_language || 'English');
    setIsQuizMode(false);
    setQuizResult(null);
    setSelectedAnswers([]);
  };

  const handleStepComplete = async (stepNumber: number) => {
    if (!activeAssignment) return;

    let updatedCompleted = [...completedSteps];
    if (!updatedCompleted.includes(stepNumber)) {
      updatedCompleted.push(stepNumber);
      setCompletedSteps(updatedCompleted);
    }

    const totalSteps = activeAssignment.totalSteps || 7;
    const nextStep = Math.min(totalSteps, stepNumber + 1);

    try {
      await saveAssignmentProgress(
        activeAssignment.id,
        updatedCompleted,
        totalSteps,
        nextStep
      );
      showNotification(`Step ${stepNumber} completed!`, 'success');

      if (currentStepIndex < totalSteps - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        showNotification('All operational steps completed! Ready for Knowledge Quiz.', 'success');
      }
    } catch (e: any) {
      showNotification(e.message, 'error');
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeAssignment || !activeAssignment.quiz) return;

    const questionsCount = activeAssignment.quiz.questions.length;
    if (selectedAnswers.length < questionsCount) {
      showNotification(`Please answer all ${questionsCount} questions before submitting.`, 'warning');
      return;
    }

    setIsSubmittingQuiz(true);
    try {
      const result = await submitQuizAttempt(activeAssignment.id, selectedAnswers);
      setQuizResult(result);

      if (result.passed) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        showNotification(`🎉 Congratulations! You passed with ${result.score}%!`, 'success');
      } else {
        showNotification(`Score: ${result.score}%. Passing score is 80%. Review and retry.`, 'warning');
      }

      loadEmployeeAssignments();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const activeSOP = activeAssignment?.sop || activeAssignment?.originalSOP;
  const currentStepData: SOPStep | undefined = activeSOP?.steps?.[currentStepIndex];
  const totalSteps = activeSOP?.steps?.length || 0;
  const progressPct =
    totalSteps > 0 ? Math.round((completedSteps.length / totalSteps) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Frontline Employee Welcome Bar */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#182337] via-[#1E2D47] to-[#182337] border border-[#2A3C5B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#B8F34A]/15 text-[#B8F34A] border border-[#B8F34A]/30 uppercase">
              Frontline Training Portal
            </span>
            <span className="text-xs text-[#9CAFC8]">
              Language: <strong>{currentUser?.preferred_language}</strong>
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">
            Welcome, {currentUser?.full_name}!
          </h1>
          <p className="text-xs text-[#9CAFC8]">
            Study approved standard operating procedures and verify your knowledge before working the shift.
          </p>
        </div>

        <button
          onClick={() => onNavigate('assistant')}
          className="px-4 py-2 rounded-xl bg-[#253757] hover:bg-[#2D4268] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Sparkles className="w-4 h-4 text-[#B8F34A]" />
          <span>Ask SOP Questions</span>
        </button>
      </div>

      {/* Main Learning Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Assigned Modules (1 Col) */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#9CAFC8]">
            Your Assigned Modules ({assignments.length})
          </h2>

          <div className="space-y-2.5">
            {assignments.map((asgn) => {
              const isSelected = activeAssignment?.id === asgn.id;
              const isDone = asgn.status === 'completed';
              return (
                <div
                  key={asgn.id}
                  onClick={() => selectAssignmentForStudy(asgn)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#182337] border-[#B8F34A] shadow-md'
                      : 'bg-[#10192A] border-[#2A3C5B] hover:border-[#3D557F]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isDone
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : asgn.status === 'in_progress'
                          ? 'bg-amber-400/20 text-amber-300'
                          : 'bg-blue-400/20 text-blue-300'
                      }`}
                    >
                      {isDone ? 'Completed' : asgn.status}
                    </span>
                    <span className="text-[11px] text-[#9CAFC8] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Due {new Date(asgn.due_date).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-white mt-2 leading-tight">
                    {asgn.trainingTitle}
                  </h3>

                  {/* Progress bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#9CAFC8]">
                      <span>Progress</span>
                      <span className="font-semibold text-white">
                        {asgn.progressPercentage || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-[#0B1220] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#B8F34A] h-full rounded-full transition-all"
                        style={{ width: `${asgn.progressPercentage || 0}%` }}
                      />
                    </div>
                  </div>

                  {asgn.quizPassed && (
                    <div className="mt-2.5 pt-2 border-t border-[#2A3C5B] flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        <span>Quiz Certified</span>
                      </span>
                      <span>{asgn.quizScore}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Interactive Player / Quiz Player (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {activeAssignment && activeSOP && (
            <div className="p-6 md:p-8 rounded-2xl bg-[#182337] border border-[#2A3C5B] space-y-6">
              {/* Header with Title & Mode Switcher */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#2A3C5B]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9CAFC8]">{activeSOP.language} Training</span>
                    <span className="text-xs text-[#9CAFC8]">• {activeSOP.estimated_duration || 8} mins</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-white mt-1">
                    {activeSOP.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsQuizMode(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      !isQuizMode
                        ? 'bg-[#B8F34A] text-[#0B1220]'
                        : 'bg-[#0B1220] text-[#9CAFC8] hover:text-white'
                    }`}
                  >
                    1. Study Steps ({completedSteps.length}/{totalSteps})
                  </button>

                  <button
                    onClick={() => {
                      setIsQuizMode(true);
                      setQuizResult(null);
                      setSelectedAnswers([]);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isQuizMode
                        ? 'bg-[#B8F34A] text-[#0B1220]'
                        : 'bg-[#0B1220] text-[#9CAFC8] hover:text-white'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>2. Knowledge Quiz</span>
                  </button>
                </div>
              </div>

              {/* MODE 1: STEP-BY-STEP PLAYER */}
              {!isQuizMode && currentStepData && (
                <div className="space-y-6">
                  {/* Step Progress Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {activeSOP.steps.map((s, idx) => {
                      const isCompleted = completedSteps.includes(s.step_number);
                      const isCurrent = currentStepIndex === idx;
                      return (
                        <button
                          key={s.step_number}
                          onClick={() => setCurrentStepIndex(idx)}
                          className={`h-2 flex-1 min-w-[28px] rounded-full transition-all ${
                            isCurrent
                              ? 'bg-[#B8F34A] ring-2 ring-[#B8F34A]/30'
                              : isCompleted
                              ? 'bg-emerald-500'
                              : 'bg-[#0B1220]'
                          }`}
                          title={`Step ${s.step_number}: ${s.title}`}
                        />
                      );
                    })}
                  </div>

                  {/* Step Card */}
                  <div className="p-6 rounded-xl bg-[#10192A] border border-[#2A3C5B] space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-[#B8F34A]/10 border border-[#B8F34A]/30 text-[#B8F34A] font-bold text-sm flex items-center justify-center">
                          {currentStepData.step_number}
                        </span>
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9CAFC8]">
                            Step {currentStepData.step_number} of {totalSteps}
                          </span>
                          <h3 className="text-base font-bold text-white">
                            {currentStepData.title}
                          </h3>
                        </div>
                      </div>

                      <AudioSpeaker
                        text={`${currentStepData.title}. ${currentStepData.instructions}`}
                        language={playerLanguage}
                      />
                    </div>

                    {/* Step instruction content */}
                    <div className="p-4 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-sm text-white leading-relaxed font-normal">
                      {currentStepData.instructions}
                    </div>

                    {/* Expected Outcome */}
                    <div className="p-3 rounded-lg bg-[#182337] border border-[#2A3C5B] text-xs flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-white">Expected Outcome: </span>
                        <span className="text-[#9CAFC8]">{currentStepData.expected_outcome}</span>
                      </div>
                    </div>

                    {/* Safety Warnings & Mistakes */}
                    {(currentStepData.warnings?.length > 0 ||
                      currentStepData.common_mistakes?.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {currentStepData.warnings && currentStepData.warnings.length > 0 && (
                          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                            <span className="font-bold flex items-center gap-1 mb-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Safety Rules:
                            </span>
                            <ul className="list-disc list-inside space-y-0.5">
                              {currentStepData.warnings.map((w, wi) => (
                                <li key={wi}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {currentStepData.common_mistakes &&
                          currentStepData.common_mistakes.length > 0 && (
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                              <span className="font-bold flex items-center gap-1 mb-1">
                                <HelpCircle className="w-3.5 h-3.5" />
                                Don't Make This Mistake:
                              </span>
                              <ul className="list-disc list-inside space-y-0.5">
                                {currentStepData.common_mistakes.map((m, mi) => (
                                  <li key={mi}>{m}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {/* Navigation & Mark Complete Controls */}
                  <div className="flex items-center justify-between gap-4 pt-2">
                    <button
                      type="button"
                      disabled={currentStepIndex === 0}
                      onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#9CAFC8] hover:text-white flex items-center gap-1.5 disabled:opacity-30"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Previous Step</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleStepComplete(currentStepData.step_number)}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                          completedSteps.includes(currentStepData.step_number)
                            ? 'bg-emerald-500 text-white'
                            : 'bg-[#B8F34A] hover:bg-[#A4DC3D] text-[#0B1220]'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          {completedSteps.includes(currentStepData.step_number)
                            ? 'Step Completed ✓'
                            : 'Mark Step Done'}
                        </span>
                      </button>

                      {currentStepIndex < totalSteps - 1 ? (
                        <button
                          type="button"
                          onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                          className="px-4 py-2.5 rounded-xl bg-[#253757] hover:bg-[#2D4268] text-white text-xs font-semibold flex items-center gap-1.5"
                        >
                          <span>Next</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsQuizMode(true)}
                          className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0B1220] text-xs font-bold flex items-center gap-1.5"
                        >
                          <Award className="w-4 h-4" />
                          <span>Take Quiz Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: KNOWLEDGE CHECK QUIZ */}
              {isQuizMode && activeAssignment.quiz && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-400" />
                      Knowledge Check Assessment
                    </h3>
                    <p className="text-xs text-[#9CAFC8]">
                      Answer all questions based on the SOP. Passing score: {activeAssignment.quiz.passing_score || 80}%.
                    </p>
                  </div>

                  {/* Quiz questions list */}
                  <div className="space-y-5">
                    {activeAssignment.quiz.questions.map((q: QuizQuestion, qIdx: number) => {
                      const selected = selectedAnswers[qIdx];
                      const evaluated = quizResult?.questionsWithExplanations?.[qIdx];

                      return (
                        <div
                          key={qIdx}
                          className="p-5 rounded-xl bg-[#10192A] border border-[#2A3C5B] space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-bold text-white">
                              Q{qIdx + 1}. {q.question}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-[#9CAFC8] bg-[#0B1220] px-2 py-0.5 rounded">
                              {q.type.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Options */}
                          <div className="space-y-2 pt-1">
                            {q.options.map((opt: string, optIdx: number) => {
                              const isChecked = selected === optIdx;
                              let optionClass =
                                'bg-[#0B1220] border-[#2A3C5B] text-[#9CAFC8] hover:border-[#3D557F]';

                              if (evaluated) {
                                if (optIdx === evaluated.correctAnswerIndex) {
                                  optionClass = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold';
                                } else if (isChecked && !evaluated.isCorrect) {
                                  optionClass = 'bg-rose-500/20 border-rose-500 text-rose-300';
                                }
                              } else if (isChecked) {
                                optionClass = 'bg-[#B8F34A]/10 border-[#B8F34A] text-white font-semibold';
                              }

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  disabled={Boolean(quizResult)}
                                  onClick={() => {
                                    const updated = [...selectedAnswers];
                                    updated[qIdx] = optIdx;
                                    setSelectedAnswers(updated);
                                  }}
                                  className={`w-full text-left p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${optionClass}`}
                                >
                                  <span>{opt}</span>
                                  {isChecked && (
                                    <span className="w-2 h-2 rounded-full bg-[#B8F34A]" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Review feedback after submission */}
                          {evaluated && (
                            <div
                              className={`p-3 rounded-lg text-xs mt-2 space-y-1 ${
                                evaluated.isCorrect
                                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                              }`}
                            >
                              <p className="font-bold">
                                {evaluated.isCorrect ? '✓ Correct Answer' : '✗ Incorrect'}
                              </p>
                              <p className="text-[#9CAFC8]">{evaluated.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Submission & Score Footer */}
                  {!quizResult ? (
                    <button
                      type="button"
                      disabled={isSubmittingQuiz}
                      onClick={handleSubmitQuiz}
                      className="w-full py-3 rounded-xl bg-[#B8F34A] hover:bg-[#A4DC3D] text-[#0B1220] font-bold text-xs flex items-center justify-center gap-2 shadow-glow-lime transition-all disabled:opacity-50"
                    >
                      <Award className="w-4 h-4" />
                      <span>{isSubmittingQuiz ? 'Evaluating Answers...' : 'Submit Assessment'}</span>
                    </button>
                  ) : (
                    <div className="p-6 rounded-xl bg-[#0B1220] border border-[#2A3C5B] text-center space-y-3">
                      <div className="text-2xl font-extrabold text-white">
                        Assessment Score: {quizResult.score}%
                      </div>
                      <p className="text-xs text-[#9CAFC8]">
                        {quizResult.passed
                          ? '🌟 Congratulations! You have successfully passed and are certified for this procedure.'
                          : 'You did not achieve the required 80% passing grade. Review the procedure and retry.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setQuizResult(null);
                          setSelectedAnswers([]);
                        }}
                        className="px-5 py-2 rounded-lg bg-[#182337] hover:bg-[#253757] text-[#B8F34A] border border-[#2A3C5B] text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retake Quiz</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
