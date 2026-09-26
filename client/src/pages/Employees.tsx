import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Send,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  ShieldCheck,
  UserCheck,
  Search,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchEmployees, createEmployee, fetchAssignments } from '../services/api';
import { User, TrainingAssignment } from '../types';

export const Employees: React.FC = () => {
  const { employees, switchUser, showNotification, refreshData } = useApp();
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New employee form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [lang, setLang] = useState('English');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignments()
      .then((data) => setAssignments(data))
      .catch((e) => console.error(e));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setIsSubmitting(true);
    try {
      await createEmployee({
        full_name: name,
        email,
        phone,
        role,
        preferred_language: lang,
      });
      await refreshData();
      showNotification(`Added ${name} to the team!`, 'success');
      setName('');
      setEmail('');
      setPhone('');
      setIsAddOpen(false);
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.preferred_language.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Employee Roster & Learning Status</h2>
          <p className="text-xs text-[#9CAFC8]">
            Manage frontline workers, set language preferences, and review individual certification scores.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#B8F34A] hover:bg-[#A4DC3D] text-[#0B1220] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Employee</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#9CAFC8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employees by name, language, or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#182337] border border-[#2A3C5B] text-white text-xs focus:border-[#B8F34A] focus:outline-none"
          />
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((emp) => {
          const empAssignments = assignments.filter((a) => a.employee_id === emp.id);
          const completedCount = empAssignments.filter((a) => a.status === 'completed').length;
          const passedQuizzes = empAssignments.filter((a) => a.quizPassed).length;

          return (
            <div
              key={emp.id}
              className="p-5 rounded-2xl bg-[#182337] border border-[#2A3C5B] space-y-4 hover:border-[#3D557F] transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[#0B1220] border border-[#2A3C5B] flex items-center justify-center text-sm font-bold text-[#B8F34A]">
                      {emp.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{emp.full_name}</h3>
                      <p className="text-[11px] text-[#9CAFC8]">{emp.email}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      emp.role === 'OWNER'
                        ? 'bg-[#B8F34A]/10 text-[#B8F34A] border border-[#B8F34A]/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {emp.role}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B]">
                    <span className="text-[10px] text-[#9CAFC8] block">Preferred Language</span>
                    <span className="font-semibold text-white">{emp.preferred_language}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B]">
                    <span className="text-[10px] text-[#9CAFC8] block">SOPs Completed</span>
                    <span className="font-semibold text-white">
                      {completedCount} / {empAssignments.length}
                    </span>
                  </div>
                </div>

                {empAssignments.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-[#9CAFC8] uppercase tracking-wider block">
                      Assignments:
                    </span>
                    {empAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="p-2 rounded bg-[#0B1220] border border-[#2A3C5B] text-xs flex items-center justify-between"
                      >
                        <span className="text-white truncate max-w-[140px]">
                          {a.trainingTitle}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {a.quizPassed && (
                            <span className="text-[10px] text-emerald-400 font-bold">
                              {a.quizScore}% ✓
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded ${
                              a.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {a.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action: Switch to this employee for demo */}
              <div className="pt-3 border-t border-[#2A3C5B]">
                <button
                  type="button"
                  onClick={() => switchUser(emp)}
                  className="w-full py-2 rounded-lg bg-[#0B1220] hover:bg-[#253757] text-[#B8F34A] border border-[#2A3C5B] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Preview Portal as {emp.full_name.split(' ')[0]}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Employee Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#182337] border border-[#2A3C5B] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#B8F34A]" />
              Add Frontline Team Member
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kadam"
                  className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white text-xs focus:border-[#B8F34A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@dailygrind.in"
                  className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white text-xs focus:border-[#B8F34A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                  Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98000 00000"
                  className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white text-xs focus:border-[#B8F34A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                  Preferred Training Language
                </label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white text-xs focus:border-[#B8F34A] focus:outline-none"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                  <option value="Marathi">Marathi (मराठी)</option>
                  <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                  <option value="Tamil">Tamil (தமிழ்)</option>
                  <option value="Telugu">Telugu (తెలుగు)</option>
                  <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                  <option value="Bengali">Bengali (বাংলা)</option>
                  <option value="Punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#9CAFC8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#B8F34A] hover:bg-[#A4DC3D] text-[#0B1220] font-bold text-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Add Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
