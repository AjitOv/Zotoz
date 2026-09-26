import React, { useState } from 'react';
import {
  X,
  Building2,
  Globe,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { createEmployee } from '../../services/api';

const INDIAN_LANGUAGES = [
  { code: 'English', label: 'English', native: 'English' },
  { code: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'Marathi', label: 'Marathi', native: 'मराठी' },
  { code: 'Gujarati', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'Tamil', label: 'Tamil', native: 'தமிழ்' },
  { code: 'Telugu', label: 'Telugu', native: 'తెలుగు' },
  { code: 'Kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'Bengali', label: 'Bengali', native: 'বাংলা' },
  { code: 'Malayalam', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'Punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
];

export const OnboardingModal: React.FC = () => {
  const { isOnboardingOpen, setIsOnboardingOpen, business, showNotification, refreshData } =
    useApp();
  const [step, setStep] = useState(1);

  // Business profile form
  const [bizName, setBizName] = useState(business?.name || 'Apex Supplies');
  const [bizCategory, setBizCategory] = useState(business?.category || 'SME · Business supplies');
  const [bizLocation, setBizLocation] = useState(business?.location || 'MIDC Bhosari, Pune');
  const [employeeCount, setEmployeeCount] = useState('1 - 10 employees');
  const [defaultLang, setDefaultLang] = useState('English');

  // Selected languages for business
  const [selectedLangs, setSelectedLangs] = useState<string[]>([
    'English',
    'Hindi',
    'Marathi',
  ]);

  // Invite employee
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empRole, setEmpRole] = useState('Barista');
  const [empLang, setEmpLang] = useState('Marathi');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOnboardingOpen) return null;

  const toggleLanguage = (lang: string) => {
    if (selectedLangs.includes(lang)) {
      if (selectedLangs.length > 1) {
        setSelectedLangs(selectedLangs.filter((l) => l !== lang));
      }
    } else {
      setSelectedLangs([...selectedLangs, lang]);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empEmail) return;

    try {
      setIsSubmitting(true);
      await createEmployee({
        full_name: empName,
        email: empEmail,
        role: 'EMPLOYEE',
        preferred_language: empLang,
      });
      await refreshData();
      showNotification(`Added ${empName} (${empLang}) to your team!`, 'success');
      setEmpName('');
      setEmpEmail('');
    } catch (err: any) {
      showNotification(err.message || 'Failed to add employee', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#182337] border border-[#2A3C5B] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#2A3C5B] flex items-center justify-between bg-[#10192A]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#B8F34A]/15 border border-[#B8F34A]/30 flex items-center justify-center text-[#B8F34A] font-bold text-sm">
              {step}/4
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {step === 1 && 'Welcome to Zotoz Capture'}
                {step === 2 && 'Step 2: Business Profile'}
                {step === 3 && 'Step 3: Select Training Languages'}
                {step === 4 && 'Step 4: Invite Frontline Employees'}
              </h2>
              <p className="text-xs text-[#9CAFC8]">
                Setup your multilingual employee training environment
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOnboardingOpen(false)}
            className="p-1.5 rounded-lg text-[#9CAFC8] hover:text-white hover:bg-[#253757]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-sm space-y-6">
          {/* STEP 1: WELCOME SCREEN */}
          {step === 1 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-[#182337] to-[#253757] border border-[#B8F34A]/50 flex items-center justify-center shadow-glow-lime">
                <Sparkles className="w-8 h-8 text-[#B8F34A]" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  "Turn what you know into what your team can do."
                </h1>
                <p className="text-sm text-[#9CAFC8] max-w-lg mx-auto">
                  Every business owner has vital knowledge locked in their head. Employees ask the
                  same questions, training takes hours, and turnover loses expertise.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left pt-2">
                <div className="p-4 rounded-xl bg-[#0B1220] border border-[#2A3C5B]">
                  <div className="text-[#B8F34A] font-bold text-lg mb-1">1. Record Once</div>
                  <p className="text-xs text-[#9CAFC8]">
                    Record a phone video or speak the process. No writing manuals by hand.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#0B1220] border border-[#2A3C5B]">
                  <div className="text-[#B8F34A] font-bold text-lg mb-1">2. AI SOP & Quizzes</div>
                  <p className="text-xs text-[#9CAFC8]">
                    Gemini Flash extracts numbered steps, safety warnings, and knowledge checks.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#0B1220] border border-[#2A3C5B]">
                  <div className="text-[#B8F34A] font-bold text-lg mb-1">3. Multilingual Team</div>
                  <p className="text-xs text-[#9CAFC8]">
                    Employees learn and take quizzes in Marathi, Hindi, or their mother tongue.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: BUSINESS PROFILE */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white focus:border-[#B8F34A] focus:outline-none"
                  placeholder="e.g. Apex Supplies"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                    Business Category *
                  </label>
                  <select
                    value={bizCategory}
                    onChange={(e) => setBizCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white focus:border-[#B8F34A] focus:outline-none"
                  >
                    <option>Café, Restaurant & Food</option>
                    <option>Retail Shop & Local Store</option>
                    <option>Manufacturing Workshop & Factory</option>
                    <option>Clinic & Healthcare Service</option>
                    <option>Coaching & Educational Center</option>
                    <option>Other Service Business</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                    Location / City *
                  </label>
                  <input
                    type="text"
                    value={bizLocation}
                    onChange={(e) => setBizLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white focus:border-[#B8F34A] focus:outline-none"
                    placeholder="e.g. Bandra West, Mumbai"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                    Number of Frontline Employees
                  </label>
                  <select
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white focus:border-[#B8F34A] focus:outline-none"
                  >
                    <option>1 - 10 employees</option>
                    <option>11 - 25 employees</option>
                    <option>26 - 50 employees</option>
                    <option>50+ employees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                    Default Operations Language
                  </label>
                  <select
                    value={defaultLang}
                    onChange={(e) => setDefaultLang(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white focus:border-[#B8F34A] focus:outline-none"
                  >
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Marathi</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SELECT LANGUAGES */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white">Select Supported Workplace Languages</h3>
                <p className="text-xs text-[#9CAFC8]">
                  Zotoz will automatically translate approved standard operating procedures and
                  quizzes into these languages for employees.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                {INDIAN_LANGUAGES.map((lang) => {
                  const isChecked = selectedLangs.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => toggleLanguage(lang.code)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-[#B8F34A]/10 border-[#B8F34A] text-white'
                          : 'bg-[#0B1220] border-[#2A3C5B] text-[#9CAFC8] hover:border-[#3B537D]'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs text-white">{lang.label}</div>
                        <div className="text-[11px] text-[#9CAFC8]">{lang.native}</div>
                      </div>
                      {isChecked && <Check className="w-4 h-4 text-[#B8F34A]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: INVITE EMPLOYEES */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-white">Add Team Members</h3>
                <p className="text-xs text-[#9CAFC8]">
                  Frontline staff will receive assignments in their selected preferred language.
                </p>
              </div>

              <form onSubmit={handleAddEmployee} className="p-4 rounded-xl bg-[#0B1220] border border-[#2A3C5B] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#9CAFC8] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={empName}
                      onChange={(e) => setEmpName(e.target.value)}
                      placeholder="e.g. Ramesh Kadam"
                      className="w-full px-3 py-2 rounded-lg bg-[#182337] border border-[#2A3C5B] text-white text-xs focus:border-[#B8F34A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#9CAFC8] mb-1">
                      Email or Mobile *
                    </label>
                    <input
                      type="text"
                      value={empEmail}
                      onChange={(e) => setEmpEmail(e.target.value)}
                      placeholder="ramesh@dailygrind.in"
                      className="w-full px-3 py-2 rounded-lg bg-[#182337] border border-[#2A3C5B] text-white text-xs focus:border-[#B8F34A] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#9CAFC8] mb-1">Role</label>
                    <input
                      type="text"
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value)}
                      placeholder="e.g. Junior Barista / Counter Staff"
                      className="w-full px-3 py-2 rounded-lg bg-[#182337] border border-[#2A3C5B] text-white text-xs focus:border-[#B8F34A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#9CAFC8] mb-1">
                      Learning Language
                    </label>
                    <select
                      value={empLang}
                      onChange={(e) => setEmpLang(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#182337] border border-[#2A3C5B] text-white text-xs focus:border-[#B8F34A] focus:outline-none"
                    >
                      {INDIAN_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label} ({l.native})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!empName || !empEmail || isSubmitting}
                  className="w-full mt-2 py-2 rounded-lg bg-[#182337] hover:bg-[#253757] text-[#B8F34A] border border-[#B8F34A]/30 text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : '+ Add Employee to Team'}
                </button>
              </form>

              <div className="p-3 rounded-lg bg-[#10192A] border border-[#2A3C5B]/60 text-xs text-[#9CAFC8] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#B8F34A] shrink-0" />
                <span>
                  Demo accounts for <strong>Rahul Sharma</strong> (English), <strong>Priya Patil</strong> (Marathi), and <strong>Amit Kumar</strong> (Hindi) are already pre-loaded for your demo.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-[#2A3C5B] bg-[#10192A] flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-[#9CAFC8] hover:text-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 rounded-lg text-xs font-bold bg-[#B8F34A] text-[#0B1220] hover:bg-[#A4DC3D] flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                setIsOnboardingOpen(false);
                showNotification('Business profile setup completed!', 'success');
              }}
              className="px-5 py-2.5 rounded-lg text-xs font-bold bg-[#B8F34A] text-[#0B1220] hover:bg-[#A4DC3D] flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Finish & Open Workspace</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
