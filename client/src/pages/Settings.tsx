import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Key,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Globe,
  ExternalLink,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchSettings, updateSettings, askKnowledgeAssistant } from '../services/api';

export const Settings: React.FC = () => {
  const { business, setIsOnboardingOpen, showNotification, resetDemo, refreshData } = useApp();

  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchSettings()
      .then((data) => {
        setHasExistingKey(data.hasApiKey);
        setIsDemoMode(data.is_demo_mode);
        if (data.gemini_model) setModel(data.gemini_model);
      })
      .catch((e) => console.error(e));
  }, []);

  const handleSaveAIConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTestResult(null);

    try {
      const res = await updateSettings({
        gemini_api_key: apiKey,
        gemini_model: model,
      });
      setHasExistingKey(res.hasApiKey);
      setIsDemoMode(res.is_demo_mode);
      await refreshData();
      showNotification('AI configuration updated successfully!', 'success');
      setApiKey('');
    } catch (err: any) {
      showNotification(`Failed to save: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const test = await askKnowledgeAssistant('What is the coffee dose for cappuccino?');
      if (test.isRealAI) {
        setTestResult({
          success: true,
          message: `Connection successful! Connected to Google Gemini (${test.model}).`,
        });
        showNotification('Gemini API verified and functioning!', 'success');
      } else {
        setTestResult({
          success: true,
          message: `Running in verified Demo Fallback Mode (${test.model}). Responses are grounded in local SOP data.`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `API check returned error: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Business Details Card */}
      <div className="p-6 rounded-2xl bg-[#182337] border border-[#2A3C5B] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B1220] border border-[#2A3C5B] flex items-center justify-center text-[#B8F34A]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Business Profile</h3>
              <p className="text-xs text-[#9CAFC8]">
                Registered operational identity and training language defaults.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-[#0B1220] hover:bg-[#253757] text-[#B8F34A] border border-[#2A3C5B] text-xs font-semibold"
          >
            Re-run Setup Wizard
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-lg bg-[#0B1220] border border-[#2A3C5B]">
            <span className="text-[10px] text-[#9CAFC8] block">Business Name</span>
            <span className="font-bold text-white text-sm">{business?.name}</span>
          </div>
          <div className="p-3 rounded-lg bg-[#0B1220] border border-[#2A3C5B]">
            <span className="text-[10px] text-[#9CAFC8] block">Industry Category</span>
            <span className="font-semibold text-white">{business?.category}</span>
          </div>
          <div className="p-3 rounded-lg bg-[#0B1220] border border-[#2A3C5B]">
            <span className="text-[10px] text-[#9CAFC8] block">Location</span>
            <span className="font-semibold text-white">{business?.location}</span>
          </div>
        </div>
      </div>

      {/* Google Gemini AI Configuration Card */}
      <div className="p-6 rounded-2xl bg-[#182337] border border-[#2A3C5B] space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B8F34A]/10 border border-[#B8F34A]/30 flex items-center justify-center text-[#B8F34A]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Google Gemini Flash Integration</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    hasExistingKey && !isDemoMode
                      ? 'bg-[#B8F34A]/20 text-[#B8F34A] border border-[#B8F34A]/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {hasExistingKey && !isDemoMode ? 'Live Key Active' : 'Demo Fallback Mode'}
                </span>
              </div>
              <p className="text-xs text-[#9CAFC8]">
                Powers automatic SOP extraction, translation into Indian languages, and quizzes.
              </p>
            </div>
          </div>
        </div>

        {/* Demo Mode Notice Banner */}
        <div className="p-4 rounded-xl bg-[#0B1220] border border-[#2A3C5B] text-xs text-[#9CAFC8] space-y-1.5">
          <div className="flex items-center gap-2 text-white font-semibold">
            <ShieldCheck className="w-4 h-4 text-[#B8F34A]" />
            <span>Zero-Friction Presentation Guarantee</span>
          </div>
          <p>
            If you do not provide a Gemini API key, Zotoz automatically uses high-fidelity Indian SMB
            demonstration models and labeled sample procedures without failing or crashing. You can also paste your Gemini API key below to test live generation immediately.
          </p>
        </div>

        <form onSubmit={handleSaveAIConfig} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                Google Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasExistingKey ? '•••••••••••••••••••• (Configured)' : 'AIzaSy...'}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white text-xs focus:border-[#B8F34A] focus:outline-none"
              />
              <p className="text-[10px] text-[#8496B0] mt-1">
                Server-side protected. Never sent to or exposed in the frontend browser code.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                Gemini Model Identifier
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white text-xs focus:border-[#B8F34A] focus:outline-none"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (Fast & Multilingual)</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash (Supported)</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash (General)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#B8F34A] hover:bg-[#A4DC3D] text-[#0B1220] font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save AI Credentials'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl bg-[#0B1220] hover:bg-[#253757] text-white border border-[#2A3C5B] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B8F34A]" />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
        </form>

        {testResult && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
              testResult.success
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Reset Demo State Card */}
      <div className="p-6 rounded-2xl bg-[#182337] border border-[#2A3C5B] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              Reset Demonstration State
            </h3>
            <p className="text-xs text-[#9CAFC8]">
              Resets all modules, assignments, quiz scores, and employee records back to pristine initial state for a fresh demonstration.
            </p>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Reset all demo modules, employee progress, and quiz attempts to initial sample state?')) {
                resetDemo();
              }
            }}
            className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-600/40 text-xs font-bold transition-colors"
          >
            Reset All Demo Data
          </button>
        </div>
      </div>
    </div>
  );
};
