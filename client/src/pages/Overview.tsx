import React, { useEffect, useState } from 'react';
import {
  Video,
  BookOpen,
  Users,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchAnalytics, fetchTrainings } from '../services/api';
import { AnalyticsData, TrainingModule } from '../types';
import { NavigationTab } from '../components/layout/Sidebar';

interface OverviewProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const Overview: React.FC<OverviewProps> = ({ onNavigate }) => {
  const { business, employees, isDemoMode, geminiConfigured, geminiModel } = useApp();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [trainings, setTrainings] = useState<TrainingModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [aData, tData] = await Promise.all([fetchAnalytics(), fetchTrainings()]);
        setAnalytics(aData);
        setTrainings(tData);
      } catch (e) {
        console.error('Error loading overview:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const metrics = analytics?.metrics || {
    totalEmployees: employees.length || 3,
    publishedTrainings: 1,
    assignedTrainings: 2,
    completedTrainings: 1,
    completionRate: 50,
    averageQuizScore: 100,
    employeesNeedingSupportCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Demo Highlights Banner for Judges */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#182337] via-[#1E2D47] to-[#182337] border border-[#2A3C5B] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B8F34A]/10 border border-[#B8F34A]/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#B8F34A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Startup Judge Demonstration Mode</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#B8F34A]/15 text-[#B8F34A] font-bold border border-[#B8F34A]/30 uppercase">
                Ready
              </span>
            </div>
            <p className="text-xs text-[#9CAFC8]">
              Sample business is loaded: <strong>{business?.name}</strong>. Test the complete flow:
              Record & AI SOP → Translate to Marathi → Publish → Switch to Priya Patil to learn & quiz → Inspect updated analytics!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => onNavigate('create')}
            className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-[#B8F34A] hover:bg-[#A4DC3D] text-[#0B1220] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-glow-lime"
          >
            <Video className="w-4 h-4" />
            <span>+ Capture New SOP</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Employees */}
        <div className="p-5 rounded-xl bg-[#182337] border border-[#2A3C5B] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9CAFC8]">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Employees</span>
            <Users className="w-4 h-4 text-[#B8F34A]" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white">{metrics.totalEmployees}</div>
            <p className="text-xs text-[#9CAFC8] mt-1">
              English, Marathi, and Hindi learners
            </p>
          </div>
          <button
            onClick={() => onNavigate('employees')}
            className="mt-4 pt-3 border-t border-[#2A3C5B] text-xs font-medium text-[#B8F34A] flex items-center justify-between group"
          >
            <span>Manage team</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Metric 2: Published SOPs */}
        <div className="p-5 rounded-xl bg-[#182337] border border-[#2A3C5B] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9CAFC8]">
            <span className="text-xs font-semibold uppercase tracking-wider">Approved SOPs</span>
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white">{metrics.publishedTrainings}</div>
            <p className="text-xs text-[#9CAFC8] mt-1">
              {trainings.length} total operational modules
            </p>
          </div>
          <button
            onClick={() => onNavigate('library')}
            className="mt-4 pt-3 border-t border-[#2A3C5B] text-xs font-medium text-emerald-400 flex items-center justify-between group"
          >
            <span>View library</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Metric 3: Completion Rate */}
        <div className="p-5 rounded-xl bg-[#182337] border border-[#2A3C5B] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9CAFC8]">
            <span className="text-xs font-semibold uppercase tracking-wider">Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white">{metrics.completionRate}%</div>
            <div className="w-full bg-[#0B1220] rounded-full h-1.5 mt-2 overflow-hidden border border-[#2A3C5B]">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.completionRate}%` }}
              />
            </div>
          </div>
          <button
            onClick={() => onNavigate('analytics')}
            className="mt-4 pt-3 border-t border-[#2A3C5B] text-xs font-medium text-cyan-400 flex items-center justify-between group"
          >
            <span>Progress metrics</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Metric 4: Quiz Avg Score */}
        <div className="p-5 rounded-xl bg-[#182337] border border-[#2A3C5B] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9CAFC8]">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Comprehension</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white">{metrics.averageQuizScore}%</div>
            <p className="text-xs text-[#9CAFC8] mt-1">Passing standard: 80%</p>
          </div>
          <button
            onClick={() => onNavigate('analytics')}
            className="mt-4 pt-3 border-t border-[#2A3C5B] text-xs font-medium text-amber-400 flex items-center justify-between group"
          >
            <span>Quiz breakdown</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Main Grid: Trainings List + Grounded Assistant Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Procedures (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Active Training Procedures</h2>
            <button
              onClick={() => onNavigate('library')}
              className="text-xs text-[#B8F34A] hover:underline"
            >
              View all ({trainings.length})
            </button>
          </div>

          <div className="space-y-3">
            {trainings.map((t) => (
              <div
                key={t.id}
                className="p-5 rounded-xl bg-[#182337] border border-[#2A3C5B] hover:border-[#3D557F] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        t.status === 'published'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {t.status}
                    </span>
                    <span className="text-xs text-[#9CAFC8]">{t.department}</span>
                    <span className="text-xs text-[#9CAFC8]">• For {t.target_role}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{t.title}</h3>
                  <p className="text-xs text-[#9CAFC8] line-clamp-1">{t.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-[#2A3C5B]">
                  <div className="text-right text-xs">
                    <span className="text-[#9CAFC8] block text-[11px]">Assigned</span>
                    <span className="font-semibold text-white">
                      {t.completedCount || 0}/{t.assignedCount || 0} Finished
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigate('library')}
                    className="px-3.5 py-1.5 rounded-lg bg-[#0B1220] hover:bg-[#253757] text-[#B8F34A] border border-[#2A3C5B] text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Start Guide for New Business Owner */}
          <div className="p-5 rounded-xl bg-[#0B1220] border border-[#2A3C5B] space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B8F34A]" />
              How Zotoz Solves Employee Turnover for Indian SMEs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#9CAFC8]">
              <div className="p-3 rounded-lg bg-[#182337] border border-[#2A3C5B]/60">
                <p className="font-semibold text-white mb-1">1. Voice & Video First</p>
                <p>
                  No manual typing. Record in kitchen, shop floor, or clinic. AI extracts the standard operating steps.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#182337] border border-[#2A3C5B]/60">
                <p className="font-semibold text-white mb-1">2. Multilingual Fluency</p>
                <p>
                  Frontline staff learn in Hindi, Marathi, Tamil, etc., with audio playback and localized terminology.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#182337] border border-[#2A3C5B]/60">
                <p className="font-semibold text-white mb-1">3. Verifiable Compliance</p>
                <p>
                  Quizzes and step completion verify that every staff member understood the procedure before starting shift.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Grounded AI Assistant & Team Health (1 Col) */}
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-[#182337] border border-[#2A3C5B] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#B8F34A]" />
                Employee Q&A Log
              </h3>
              <button
                onClick={() => onNavigate('assistant')}
                className="text-xs text-[#B8F34A] hover:underline"
              >
                Open chat
              </button>
            </div>
            <p className="text-xs text-[#9CAFC8]">
              Recent questions asked by frontline staff, grounded in your approved procedures:
            </p>

            <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">दूध किती तापमानापर्यंत वाफवायचे?</span>
                  <span className="text-[10px] text-emerald-400">Answered (Step 4)</span>
                </div>
                <p className="text-[#9CAFC8] text-[11px]">
                  Asked by <strong>Priya Patil</strong> (Marathi)
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">What is the exact coffee bean dose?</span>
                  <span className="text-[10px] text-emerald-400">Answered (Step 2)</span>
                </div>
                <p className="text-[#9CAFC8] text-[11px]">
                  Asked by <strong>Rahul Sharma</strong> (English)
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('assistant')}
              className="w-full py-2.5 rounded-lg bg-[#253757] hover:bg-[#2D4268] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Test Knowledge Assistant</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Team Status */}
          <div className="p-5 rounded-xl bg-[#182337] border border-[#2A3C5B] space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Frontline Staff Progress</span>
              <button
                onClick={() => onNavigate('employees')}
                className="text-xs text-[#B8F34A] hover:underline"
              >
                All team
              </button>
            </h3>

            <div className="space-y-2">
              {employees.slice(0, 3).map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#0B1220] border border-[#2A3C5B]/70 text-xs"
                >
                  <div className="truncate">
                    <p className="font-semibold text-white truncate">{emp.full_name}</p>
                    <p className="text-[10px] text-[#9CAFC8]">
                      {emp.role === 'OWNER' ? 'Owner' : `Language: ${emp.preferred_language}`}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      emp.role === 'OWNER'
                        ? 'bg-[#B8F34A]/10 text-[#B8F34A]'
                        : emp.preferred_language === 'Marathi'
                        ? 'bg-amber-400/10 text-amber-300'
                        : 'bg-emerald-400/10 text-emerald-300'
                    }`}
                  >
                    {emp.role === 'OWNER' ? 'Owner' : 'Active'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
