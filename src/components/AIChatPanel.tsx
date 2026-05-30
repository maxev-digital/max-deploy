'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  MessageSquare, Send, ChevronRight, Loader2, Bot, Trash2,
  Check, X, Mic, MicOff, Volume2, VolumeX, Briefcase, CheckSquare,
} from 'lucide-react';
import { useAIHighlight, HighlightTarget } from '@/lib/ai-highlight';

// ── Types ──────────────────────────────────────────────────────────────────────

interface NavigateAction  { type: 'navigate'; path: string; description: string; }
interface FilterAction    { type: 'filter';   path: string; params: Record<string, string>; description: string; }
interface ConfirmAction   { type: 'confirm';  operation: string; description: string; payload: Record<string, unknown>; }
interface DraftOppAction  { type: 'draft';    docType: 'opportunity'; description: string; data: Record<string, unknown>; }
interface DraftTaskAction { type: 'draft';    docType: 'task';        description: string; data: Record<string, unknown>; }
type ChatAction = NavigateAction | FilterAction | ConfirmAction | DraftOppAction | DraftTaskAction;
type ActionStatus = 'pending' | 'saving' | 'done' | 'error' | 'cancelled';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: ChatAction;
  actionStatus?: ActionStatus;
  actionResult?: string;
  model?: string;
}

const SUGGESTIONS = [
  'What\'s in my inbox right now?',
  'Show me my hot leads',
  'Any follow-ups due today?',
  'How is my job search health?',
  'What tasks are overdue?',
  'Draft a follow-up for Curative',
];

// ── Typewriter ─────────────────────────────────────────────────────────────────

function TypewriterText({ text, animate, speed }: { text: string; animate?: boolean; speed?: number }) {
  const [displayed, setDisplayed] = useState(animate ? '' : text);
  const [done, setDone]           = useState(!animate);

  useEffect(() => {
    if (!animate) { setDisplayed(text); setDone(true); return; }
    setDisplayed(''); setDone(false);
    if (!text) return;
    const ms = speed ?? Math.max(5, Math.min(18, 2400 / text.length));
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { setDone(true); clearInterval(iv); }
    }, ms);
    return () => clearInterval(iv);
  }, [text, animate, speed]);

  return (
    <>
      {displayed}
      {!done && (
        <span style={{
          display: 'inline-block', width: 2, height: '0.85em',
          background: 'var(--primary)', marginLeft: 1, verticalAlign: 'text-bottom',
          animation: 'chatDotPulse 0.8s ease-in-out infinite',
        }} />
      )}
    </>
  );
}

// ── Draft card ─────────────────────────────────────────────────────────────────

function DraftCard({
  action, status, result, onApprove, onCancel, animate,
}: {
  action: DraftOppAction | DraftTaskAction;
  status: ActionStatus; result?: string;
  onApprove: () => void; onCancel: () => void; animate?: boolean;
}) {
  void animate;
  const done = status === 'done', saving = status === 'saving', cancelled = status === 'cancelled';
  const isOpp = action.docType === 'opportunity';
  const { data } = action;

  return (
    <div style={{
      marginTop: 8, background: 'var(--card2)',
      border: `1px solid ${done ? 'var(--green)' : cancelled ? 'var(--border)' : 'rgba(37,99,235,0.4)'}`,
      borderRadius: 10, overflow: 'hidden', opacity: cancelled ? 0.5 : 1,
    }}>
      <div style={{
        padding: '8px 12px', background: done ? 'rgba(34,197,94,0.1)' : 'rgba(37,99,235,0.08)',
        borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7,
        fontSize: '0.75rem', fontWeight: 600, color: done ? 'var(--green)' : 'var(--primary)',
      }}>
        {isOpp ? <Briefcase size={13} /> : <CheckSquare size={13} />}
        {isOpp ? 'New Opportunity' : 'New Task'}
        {done && <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="ai-success-pop" style={{ color: 'var(--green)' }}><Check size={14} /></span>
          <span style={{ fontSize: '0.72rem' }}>Saved</span>
        </span>}
      </div>
      <div style={{ padding: '10px 12px', fontSize: '0.775rem', lineHeight: 1.7, color: 'var(--light)' }}>
        {isOpp && <>
          <div><strong>Company:</strong> {String(data.company ?? '')}</div>
          <div><strong>Role:</strong> {String(data.role ?? '')}</div>
          {data.salaryMin && <div><strong>Salary:</strong> ${Number(data.salaryMin).toLocaleString()}{data.salaryMax ? `–$${Number(data.salaryMax).toLocaleString()}` : '+'}</div>}
          {data.applyUrl && <div><strong>Apply:</strong> {String(data.applyUrl)}</div>}
        </>}
        {!isOpp && <>
          <div><strong>Task:</strong> {String(data.title ?? '')}</div>
          <div><strong>Priority:</strong> {String(data.priority ?? 'MEDIUM')}</div>
          {data.dueDate && <div><strong>Due:</strong> {String(data.dueDate)}</div>}
        </>}
        {result && <div style={{ marginTop: 6, fontSize: '0.7rem', color: done ? 'var(--green)' : 'var(--red)' }}>{result}</div>}
      </div>
      {!done && !cancelled && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
          <button onClick={onApprove} disabled={saving} style={{ flex: 1, background: 'var(--primary)', border: 'none', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            {saving ? <><Loader2 size={11} className="spin" /> Saving...</> : <><Check size={11} /> Save</>}
          </button>
          <button onClick={onCancel} disabled={saving} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--gray)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={11} /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Confirm card ───────────────────────────────────────────────────────────────

function ConfirmCard({ action, status, result, onConfirm, onCancel }: {
  action: ConfirmAction; status: ActionStatus; result?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  const done = status === 'done', saving = status === 'saving', cancelled = status === 'cancelled';
  return (
    <div style={{ marginTop: 8, background: 'var(--card2)', border: `1px solid ${done ? 'var(--green)' : cancelled ? 'var(--border)' : 'rgba(217,109,59,0.4)'}`, borderRadius: 10, overflow: 'hidden', opacity: cancelled ? 0.5 : 1 }}>
      <div style={{ padding: '8px 12px', background: done ? 'rgba(34,197,94,0.1)' : 'rgba(217,109,59,0.08)', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 600, color: done ? 'var(--green)' : 'var(--orange)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {done ? <Check size={13} /> : null}{done ? 'Done' : 'Confirm Action'}
      </div>
      <div style={{ padding: '10px 12px', fontSize: '0.775rem', color: 'var(--light)' }}>
        {action.description}
        {result && <div style={{ marginTop: 5, fontSize: '0.7rem', color: done ? 'var(--green)' : 'var(--red)' }}>{result}</div>}
      </div>
      {!done && !cancelled && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
          <button onClick={onConfirm} disabled={saving} style={{ flex: 1, background: 'var(--orange)', border: 'none', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            {saving ? <><Loader2 size={11} className="spin" /> Working...</> : 'Confirm'}
          </button>
          <button onClick={onCancel} disabled={saving} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--gray)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={11} /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export default function AIChatPanel() {
  const [isOpen, setIsOpen]         = useState(false);
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [navigating, setNavigating] = useState<string | null>(null);
  const [recording, setRecording]   = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const animatedIds    = useRef<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const stableInputRef = useRef('');
  const router   = useRouter();
  const pathname = usePathname();
  const { setHighlights } = useAIHighlight();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Navigation ───────────────────────────────────────────────────────────────

  function deriveHighlights(action: NavigateAction | FilterAction): HighlightTarget[] {
    const targets: HighlightTarget[] = [];
    const path   = action.path;
    const params = action.type === 'filter' ? action.params : {};
    targets.push({ type: 'nav-path', value: path, effect: 'glow' });
    if (path.includes('/pipeline') && params?.stage)    targets.push({ type: 'lead-stage',    value: String(params.stage).toLowerCase(),    effect: 'glow' });
    if (path.includes('/tasks')    && params?.status)   targets.push({ type: 'task-status',    value: String(params.status).toUpperCase(),   effect: 'glow' });
    return targets;
  }

  function executeNavigation(action: NavigateAction | FilterAction) {
    const path = action.type === 'filter'
      ? action.path + '?' + new URLSearchParams(action.params).toString()
      : action.path;
    setNavigating(action.description);
    const highlights = deriveHighlights(action);
    setTimeout(() => {
      router.push(path);
      setTimeout(() => { setHighlights(highlights, 7000); setNavigating(null); }, 600);
    }, 400);
  }

  // ── Draft approval ───────────────────────────────────────────────────────────

  async function approveDraft(msgId: string, action: DraftOppAction | DraftTaskAction) {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionStatus: 'saving' } : m));
    try {
      let result = '';
      if (action.docType === 'opportunity') {
        const res = await fetch('/api/opportunities', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...action.data, stage: 'inbox', source: 'ai-assistant' }),
        });
        if (!res.ok) throw new Error('Failed to save opportunity');
        result = `${String(action.data.company)} — ${String(action.data.role)} added to inbox.`;
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionStatus: 'done', actionResult: result } : m));
        setTimeout(() => router.push('/inbox'), 800);
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data),
        });
        if (!res.ok) throw new Error('Failed to save task');
        result = `Task created: "${String(action.data.title)}"`;
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionStatus: 'done', actionResult: result } : m));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionStatus: 'error', actionResult: msg } : m));
    }
  }

  // ── Confirm action ───────────────────────────────────────────────────────────

  async function executeConfirm(msgId: string, action: ConfirmAction) {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionStatus: 'saving' } : m));
    try {
      let result = '';
      const { operation, payload } = action;
      if (operation === 'move_stage') {
        await fetch(`/api/opportunities/${payload.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: payload.stage }) });
        result = `Moved to ${String(payload.stage)}.`;
      } else if (operation === 'update_task_status') {
        await fetch(`/api/tasks/${payload.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: payload.status }) });
        result = `Task marked ${String(payload.status)}.`;
      } else if (operation === 'mark_followup_done') {
        await fetch(`/api/opportunities/${payload.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ followUpDue: null }) });
        result = 'Follow-up cleared.';
      }
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionStatus: 'done', actionResult: result } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionStatus: 'error', actionResult: 'Action failed.' } : m));
    }
  }

  function cancelAction(msgId: string) {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionStatus: 'cancelled' } : m));
  }

  // ── Voice ─────────────────────────────────────────────────────────────────────

  function toggleRecording() {
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
    rec.onstart = () => { stableInputRef.current = input.trim(); setRecording(true); };
    rec.onresult = (e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => {
      let finalChunk = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalChunk += e.results[i][0].transcript;
        else                       interim    += e.results[i][0].transcript;
      }
      if (finalChunk) { stableInputRef.current = (stableInputRef.current + ' ' + finalChunk).trim(); setInput(stableInputRef.current); }
      else { setInput((stableInputRef.current + ' ' + interim).trim()); }
    };
    rec.onend   = () => { setInput(stableInputRef.current); setRecording(false); setTimeout(() => inputRef.current?.focus(), 50); };
    rec.onerror = (e: { error: string }) => { if (e.error !== 'no-speech') setRecording(false); };
    recognitionRef.current = rec; rec.start();
  }

  function speakMessage(id: string, text: string) {
    if (!window.speechSynthesis) return;
    if (speakingId === id) { window.speechSynthesis.cancel(); setSpeakingId(null); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US'; utt.rate = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const pick = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google US English') || v.name.includes('Samantha') || v.default)) ?? voices[0];
    if (pick) utt.voice = pick;
    utt.onend = () => setSpeakingId(null); utt.onerror = () => setSpeakingId(null);
    setSpeakingId(id); window.speechSynthesis.speak(utt);
  }

  // ── Send ──────────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })), currentPath: pathname }),
      });
      const data = await res.json();
      const action = data.action as ChatAction | null;
      const aiMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: data.message, action: action ?? undefined, actionStatus: (action?.type === 'draft' || action?.type === 'confirm') ? 'pending' : undefined, model: data.model };
      setMessages(prev => [...prev, aiMsg]);
      if (action?.type === 'navigate' || action?.type === 'filter') executeNavigation(action as NavigateAction | FilterAction);
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading, messages, pathname]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {navigating && <div className="ai-nav-bar" />}

      {/* Toggle tab */}
      <button
        onClick={() => setIsOpen(o => !o)}
        title={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
        style={{
          position: 'fixed', right: isOpen ? 400 : 0, top: '50%', transform: 'translateY(-50%)',
          zIndex: 60, background: 'var(--primary)', border: 'none', borderRadius: '8px 0 0 8px',
          padding: '12px 7px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 6, color: '#fff', transition: 'right 0.25s ease',
          boxShadow: '-3px 0 16px rgba(0,0,0,0.35)',
        }}
      >
        {isOpen ? <ChevronRight size={15} /> : <MessageSquare size={15} />}
        {!isOpen && <span style={{ writingMode: 'vertical-rl', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.85 }}>AI</span>}
      </button>

      {/* Panel */}
      <div style={{
        width: isOpen ? 400 : 0, minWidth: 0, flexShrink: 0,
        background: 'var(--dark)', borderLeft: isOpen ? '1px solid var(--border)' : 'none',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: 'width 0.25s ease', height: '100vh',
      }}>
        {isOpen && (
          <>
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={16} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--white)' }}>AI Assistant</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--gray)' }}>Powered by Claude</div>
              </div>
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} title="Clear chat" style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10, scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
              {messages.length === 0 && (
                <div style={{ padding: '16px 4px' }}>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <Bot size={28} style={{ opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                    <div style={{ fontSize: '0.825rem', color: 'var(--white)', marginBottom: 4 }}>Your career ops assistant</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray)', lineHeight: 1.5 }}>
                      Ask anything. Navigate pages, review your pipeline, check follow-ups, add opportunities, create tasks.
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => sendMessage(s)} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--light)', fontSize: '0.775rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      >{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '94%', padding: '9px 13px',
                    borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                    background: msg.role === 'user' ? 'var(--primary)' : 'var(--card)',
                    color: 'var(--white)', fontSize: '0.8125rem', lineHeight: 1.55,
                    border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    width: (msg.action?.type === 'draft' || msg.action?.type === 'confirm') ? '94%' : undefined,
                  }}>
                    {msg.role === 'assistant'
                      ? <TypewriterText text={msg.content} animate={!animatedIds.current.has(msg.id + '_msg') && (() => { animatedIds.current.add(msg.id + '_msg'); return true; })()}  />
                      : msg.content
                    }

                    {msg.action?.type === 'draft' && (
                      <DraftCard
                        action={msg.action as DraftOppAction | DraftTaskAction}
                        status={msg.actionStatus ?? 'pending'}
                        result={msg.actionResult}
                        onApprove={() => approveDraft(msg.id, msg.action as DraftOppAction | DraftTaskAction)}
                        onCancel={() => cancelAction(msg.id)}
                        animate={!animatedIds.current.has(msg.id) && (() => { animatedIds.current.add(msg.id); return true; })()}
                      />
                    )}
                    {msg.action?.type === 'confirm' && (
                      <ConfirmCard
                        action={msg.action as ConfirmAction}
                        status={msg.actionStatus ?? 'pending'}
                        result={msg.actionResult}
                        onConfirm={() => executeConfirm(msg.id, msg.action as ConfirmAction)}
                        onCancel={() => cancelAction(msg.id)}
                      />
                    )}
                    {(msg.action?.type === 'navigate' || msg.action?.type === 'filter') && (
                      <div style={{ marginTop: 7, paddingTop: 7, borderTop: '1px solid rgba(255,255,255,0.12)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>&#8594;</span><span>{msg.action.description}</span>
                      </div>
                    )}
                  </div>

                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, paddingLeft: 3 }}>
                      {msg.model && <span style={{ fontSize: '0.63rem', color: 'var(--gray)', opacity: 0.7 }}>{msg.model === 'haiku' ? 'Claude Haiku' : 'Claude Sonnet'}</span>}
                      <button onClick={() => speakMessage(msg.id, msg.content)} title={speakingId === msg.id ? 'Stop' : 'Read aloud'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: speakingId === msg.id ? 'var(--primary)' : 'var(--gray)', padding: '2px 4px', display: 'flex', alignItems: 'center', borderRadius: 4, opacity: speakingId === msg.id ? 1 : 0.5, transition: 'opacity 0.15s, color 0.15s', animation: speakingId === msg.id ? 'chatDotPulse 1.2s ease-in-out infinite' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => { if (speakingId !== msg.id) e.currentTarget.style.opacity = '0.5'; }}
                      >
                        {speakingId === msg.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div style={{ padding: '10px 14px', background: 'var(--card)', borderRadius: '12px 12px 12px 3px', border: '1px solid var(--border)', display: 'flex', gap: 5, alignItems: 'center' }}>
                    <span className="chat-dot" /><span className="chat-dot" style={{ animationDelay: '0.18s' }} /><span className="chat-dot" style={{ animationDelay: '0.36s' }} />
                  </div>
                </div>
              )}
              {navigating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', background: 'rgba(37,99,235,0.1)', borderRadius: 7, border: '1px solid rgba(37,99,235,0.3)', fontSize: '0.73rem', color: 'var(--primary)' }}>
                  <Loader2 size={12} className="spin" />{navigating}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'flex-end', background: 'rgba(255,255,255,0.01)' }}>
              <textarea
                ref={inputRef} value={input} onChange={handleInput} onKeyDown={handleKeyDown}
                placeholder="Ask anything... navigate, score, draft, analyze"
                disabled={loading} rows={1}
                style={{ flex: 1, background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 11px', color: 'var(--white)', fontSize: '0.8125rem', resize: 'none', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit', overflow: 'hidden', transition: 'border-color 0.15s' }}
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
              <button onClick={toggleRecording} title={recording ? 'Stop recording' : 'Speak'} style={{ background: recording ? 'rgba(239,68,68,0.15)' : 'var(--card2)', border: '1px solid ' + (recording ? 'rgba(239,68,68,0.5)' : 'var(--border)'), borderRadius: 8, padding: '8px 10px', color: recording ? '#ef4444' : 'var(--gray)', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', height: 38, width: 38, animation: recording ? 'chatDotPulse 1s ease-in-out infinite' : 'none', transition: 'background 0.15s, border-color 0.15s' }}>
                {recording ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
              <button onClick={() => sendMessage()} disabled={!input.trim() || loading} style={{ background: input.trim() && !loading ? 'var(--primary)' : 'var(--card2)', border: '1px solid ' + (input.trim() && !loading ? 'var(--primary)' : 'var(--border)'), borderRadius: 8, padding: '8px 10px', color: input.trim() && !loading ? '#fff' : 'var(--gray)', cursor: input.trim() && !loading ? 'pointer' : 'default', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, border-color 0.15s', alignSelf: 'flex-end', height: 38, width: 38 }}>
                <Send size={15} />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
