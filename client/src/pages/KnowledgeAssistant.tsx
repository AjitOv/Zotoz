import React, { useState, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Volume2,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { askKnowledgeAssistant } from '../services/api';
import { AudioSpeaker } from '../components/common/AudioSpeaker';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sourceReferences?: string[];
  canEscalate?: boolean;
  isEscalated?: boolean;
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  {
    q: 'How do I grind and dose the coffee beans correctly?',
    lang: 'English',
    badge: 'Step 2',
  },
  {
    q: 'दूध किती तापमानापर्यंत वाफवायचे आहे?',
    lang: 'Marathi',
    badge: 'Step 4',
  },
  {
    q: 'कैपुचीनो के लिए दूध का सही तापमान क्या है?',
    lang: 'Hindi',
    badge: 'Step 4',
  },
  {
    q: 'What is the required extraction time for espresso?',
    lang: 'English',
    badge: 'Step 3',
  },
  {
    q: 'Can I offer a 50% discount to friends without owner approval?',
    lang: 'English',
    badge: 'Unapproved test',
  },
];

export const KnowledgeAssistant: React.FC = () => {
  const { currentUser, currentRole, showNotification } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello ${currentUser?.full_name || 'team member'}! I am your Zotoz Business Assistant. I answer frontline questions strictly using your café's verified operational procedures. Ask in English, हिन्दी, or मराठी.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isAsking) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsAsking(true);

    try {
      const res = await askKnowledgeAssistant(
        textToSend,
        currentUser?.id,
        currentUser?.preferred_language || 'English'
      );

      const botMsg: Message = {
        id: res.id || `bot-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        sourceReferences: res.sourceReferences || [],
        canEscalate: res.canEscalate || false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      showNotification(`Assistant error: ${err.message}`, 'error');
    } finally {
      setIsAsking(false);
    }
  };

  const handleEscalate = async (messageId: string) => {
    try {
      const res = await fetch('/api/assistant/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: messageId }),
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isEscalated: true } : m))
        );
        showNotification('Question escalated to Business Owner review!', 'success');
      }
    } catch (e: any) {
      showNotification(e.message, 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Assistant Grounding Badge Banner */}
      <div className="p-4 rounded-xl bg-[#182337] border border-[#2A3C5B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#B8F34A]/10 border border-[#B8F34A]/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#B8F34A]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Strict SOP Grounding Enforced</h3>
            <p className="text-[11px] text-[#9CAFC8]">
              Answers are restricted strictly to your business's approved SOPs. Unknown questions are safely deflected.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0B1220] border border-[#2A3C5B] text-[#B8F34A] uppercase">
          Zero Hallucination Policy
        </span>
      </div>

      {/* Suggested Questions Carousel */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-[#9CAFC8] uppercase tracking-wider">
          Suggested Training Inquiries:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {SUGGESTED_QUESTIONS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(item.q)}
              className="px-3 py-1.5 rounded-lg bg-[#182337] hover:bg-[#253757] border border-[#2A3C5B] text-xs text-white whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0"
            >
              <span>{item.q}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0B1220] text-[#B8F34A]">
                {item.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="rounded-2xl bg-[#182337] border border-[#2A3C5B] overflow-hidden flex flex-col h-[520px]">
        {/* Messages scroll */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-[#B8F34A] text-[#0B1220]'
                      : 'bg-[#10192A] border border-[#2A3C5B] text-[#B8F34A]'
                  }`}
                >
                  {isUser ? currentUser?.full_name?.charAt(0) || 'U' : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs space-y-2 ${
                    isUser
                      ? 'bg-[#B8F34A] text-[#0B1220] font-medium'
                      : 'bg-[#0B1220] border border-[#2A3C5B] text-white'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

                  {/* Sources citation */}
                  {!isUser && m.sourceReferences && m.sourceReferences.length > 0 && (
                    <div className="pt-2 border-t border-[#2A3C5B]/80 flex flex-wrap items-center gap-1.5 text-[10px] text-emerald-400">
                      <BookOpen className="w-3 h-3" />
                      <span className="font-semibold">Approved Source:</span>
                      {m.sourceReferences.map((ref, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-[#182337] border border-[#2A3C5B]">
                          {ref}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Audio speaker for assistant response */}
                  {!isUser && (
                    <div className="flex items-center justify-between pt-1">
                      <AudioSpeaker text={m.text} language={currentUser?.preferred_language} />
                      <span className="text-[10px] text-[#8496B0]">{m.timestamp}</span>
                    </div>
                  )}

                  {/* Escalation button if unanswered */}
                  {!isUser && m.canEscalate && (
                    <div className="pt-2">
                      {!m.isEscalated ? (
                        <button
                          type="button"
                          onClick={() => handleEscalate(m.id)}
                          className="px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Escalate question to Business Owner</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Escalated to owner review</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isAsking && (
            <div className="flex gap-3 max-w-lg">
              <div className="w-8 h-8 rounded-full bg-[#10192A] border border-[#2A3C5B] flex items-center justify-center text-[#B8F34A]">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-[#0B1220] border border-[#2A3C5B] text-xs text-[#9CAFC8] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#B8F34A] animate-spin" />
                <span>Checking approved SOP steps...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#2A3C5B] bg-[#10192A]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything about café procedures in English, मराठी, or हिन्दी..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#0B1220] border border-[#2A3C5B] text-white text-xs focus:border-[#B8F34A] focus:outline-none placeholder-[#8496B0]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isAsking}
              className="px-4 py-2.5 rounded-xl bg-[#B8F34A] hover:bg-[#A4DC3D] text-[#0B1220] font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask Assistant</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
