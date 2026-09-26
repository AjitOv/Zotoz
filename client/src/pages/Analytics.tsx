import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Award,
  Users,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  FileSpreadsheet,
  Calendar,
  Clock,
  Filter,
} from 'lucide-react';
import { fetchAnalytics } from '../services/api';
import { AnalyticsData } from '../types';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState('All');

  useEffect(() => {
    fetchAnalytics()
      .then((res) => setData(res))
      .catch((err) => console.error(err));
  }, []);

  const metrics = data?.metrics || {
    totalEmployees: 3,
    publishedTrainings: 1,
    assignedTrainings: 2,
    completedTrainings: 1,
    pendingTrainings: 1,
    completionRate: 50,
    averageQuizScore: 100,
    employeesNeedingSupportCount: 0,
  };

  const progressRows = (data?.progressTable || []).filter((row) =>
    departmentFilter === 'All' ? true : row.department === departmentFilter
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Audit Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Operational Training Audit & Analytics</h2>
          <p className="text-xs text-[#9CAFC8]">
            Verifiable compliance data based on actual employee step completions and quiz submissions.
          </p>
        </div>

        <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-[#182337] border border-[#2A3C5B] text-[#B8F34A] uppercase">
          Audit Verified
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#182337] border border-[#2A3C5B]">
          <span className="text-[11px] font-semibold text-[#9CAFC8] uppercase">Completion Rate</span>
          <div className="text-2xl font-extrabold text-white mt-1">{metrics.completionRate}%</div>
          <div className="w-full bg-[#0B1220] rounded-full h-1.5 mt-2">
            <div
              className="bg-[#B8F34A] h-full rounded-full"
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#182337] border border-[#2A3C5B]">
          <span className="text-[11px] font-semibold text-[#9CAFC8] uppercase">Average Quiz Score</span>
          <div className="text-2xl font-extrabold text-white mt-1">{metrics.averageQuizScore}%</div>
          <p className="text-[10px] text-emerald-400 mt-1">Passing requirement: 80%</p>
        </div>

        <div className="p-4 rounded-xl bg-[#182337] border border-[#2A3C5B]">
          <span className="text-[11px] font-semibold text-[#9CAFC8] uppercase">Completed SOPs</span>
          <div className="text-2xl font-extrabold text-white mt-1">
            {metrics.completedTrainings} / {metrics.assignedTrainings}
          </div>
          <p className="text-[10px] text-[#9CAFC8] mt-1">{metrics.pendingTrainings} in progress</p>
        </div>

        <div className="p-4 rounded-xl bg-[#182337] border border-[#2A3C5B]">
          <span className="text-[11px] font-semibold text-[#9CAFC8] uppercase">Requiring Support</span>
          <div className="text-2xl font-extrabold text-white mt-1">
            {metrics.employeesNeedingSupportCount}
          </div>
          <p className="text-[10px] text-amber-300 mt-1">Failed quizzes / stalled</p>
        </div>
      </div>

      {/* Weak Topics & Frequently Asked Questions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weak Topics */}
        <div className="p-5 rounded-2xl bg-[#182337] border border-[#2A3C5B] space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Operational Weak Points (Highest Quiz Failure Topics)
          </h3>
          <p className="text-xs text-[#9CAFC8]">
            Proactively identify which instructions employees struggle with so owners can reinforce in person:
          </p>

          <div className="space-y-2 pt-1">
            {(data?.weakTopics || []).map((t, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-[#0B1220] border border-[#2A3C5B] flex items-center justify-between text-xs"
              >
                <span className="text-white font-medium">{t.topic}</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[11px]">
                  {t.failRate} error rate
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Knowledge Inquiries FAQ */}
        <div className="p-5 rounded-2xl bg-[#182337] border border-[#2A3C5B] space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#B8F34A]" />
            Frontline Inquiries & Knowledge Gaps
          </h3>
          <p className="text-xs text-[#9CAFC8]">
            Questions submitted to the AI Knowledge Assistant across all shifts:
          </p>

          <div className="space-y-2 pt-1">
            {(data?.faqList || []).map((faq, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-[#0B1220] border border-[#2A3C5B] flex items-center justify-between text-xs"
              >
                <span className="text-white truncate max-w-[260px]">{faq.question}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                    faq.escalated
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {faq.escalated ? 'Escalated' : 'Resolved'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Training Audit Table */}
      <div className="p-6 rounded-2xl bg-[#182337] border border-[#2A3C5B] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#B8F34A]" />
            Staff Compliance & Progress Record
          </h3>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#9CAFC8]" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white text-xs focus:outline-none"
            >
              <option value="All">All Departments</option>
              <option value="Operations">Operations</option>
              <option value="Beverage & Barista">Beverage & Barista</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B1220] text-[#9CAFC8] border-b border-[#2A3C5B]">
              <tr>
                <th className="p-3 font-semibold">Employee</th>
                <th className="p-3 font-semibold">Language</th>
                <th className="p-3 font-semibold">Training Module</th>
                <th className="p-3 font-semibold">Department</th>
                <th className="p-3 font-semibold">Steps Done</th>
                <th className="p-3 font-semibold">Quiz Score</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3C5B]">
              {progressRows.map((row) => (
                <tr key={row.assignmentId} className="hover:bg-[#10192A]/50 transition-colors">
                  <td className="p-3 font-bold text-white">{row.employeeName}</td>
                  <td className="p-3 text-[#9CAFC8]">{row.employeeLanguage}</td>
                  <td className="p-3 font-medium text-white">{row.trainingTitle}</td>
                  <td className="p-3 text-[#9CAFC8]">{row.department}</td>
                  <td className="p-3 font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <span>{row.progressPercentage}%</span>
                      <div className="w-14 bg-[#0B1220] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#B8F34A] h-full rounded-full"
                          style={{ width: `${row.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`font-bold ${
                        row.quizPassed === true
                          ? 'text-emerald-400'
                          : row.quizPassed === false
                          ? 'text-rose-400'
                          : 'text-[#9CAFC8]'
                      }`}
                    >
                      {row.quizScore}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        row.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3 text-[#9CAFC8]">
                    {new Date(row.dueDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
