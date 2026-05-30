'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail, RefreshCw, Send, Star, Inbox, ArrowLeft, Reply, Loader2, Plus,
  Trash2, Archive, Search, X, ChevronDown, MailOpen, Forward,
  PaperclipIcon, Check, AlertCircle, Settings,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import RichTextEditor from '@/components/RichTextEditor';

type Account = { id: string; email: string; label: string; fromName: string; isActive: boolean; };
type Attachment = { filename: string; contentType: string; size: number; content: string; };
type Message = {
  id: string; uid: number; accountId: string; folder: string;
  subject: string | null; fromEmail: string; fromName: string | null;
  toRaw: string; ccRaw: string | null; bodyHtml: string | null; bodyText: string | null;
  snippet: string | null; isRead: boolean; isStarred: boolean; isSent: boolean; isDraft: boolean;
  hasAttachment: boolean; attachments: Attachment[] | null; inReplyTo: string | null;
  receivedAt: string;
  account?: { email: string; label: string; fromName: string };
};

type Folder = 'INBOX' | 'SENT' | 'DRAFT' | 'ARCHIVE' | 'TRASH';

const FOLDERS: { id: Folder; label: string; icon: React.ReactNode }[] = [
  { id: 'INBOX',   label: 'Inbox',   icon: <Inbox   size={13} /> },
  { id: 'SENT',    label: 'Sent',    icon: <Send    size={13} /> },
  { id: 'DRAFT',   label: 'Drafts',  icon: <Mail    size={13} /> },
  { id: 'ARCHIVE', label: 'Archive', icon: <Archive size={13} /> },
  { id: 'TRASH',   label: 'Trash',   icon: <Trash2  size={13} /> },
];

const text   = 'var(--text)';
const gray   = 'var(--gray)';
const border = 'var(--border)';
const card   = 'var(--card)';
const hover  = 'var(--hover, rgba(0,0,0,0.04))';

export default function EmailPage() {
  const [accounts, setAccounts]   = useState<Account[]>([]);
  const [activeAcc, setActiveAcc] = useState<string>('all');
  const [messages, setMessages]   = useState<Message[]>([]);
  const [selected, setSelected]   = useState<Message | null>(null);
  const [folder, setFolder]       = useState<Folder>('INBOX');
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [unread, setUnread]       = useState(0);
  const [total, setTotal]         = useState(0);
  const [offset, setOffset]       = useState(0);
  const [q, setQ]                 = useState('');
  const [qInput, setQInput]       = useState('');
  const [composing, setComposing] = useState(false);
  const [draftId, setDraftId]     = useState<string | null>(null);
  const [sending, setSending]     = useState(false);
  const [sendError, setSendError] = useState('');
  const [markingRead, setMarkingRead] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [compose, setCompose] = useState({
    fromAccountId: '', to: '', cc: '', bcc: '',
    subject: '', body: '', showCc: false, showBcc: false,
  });
  const [composeAttachments, setComposeAttachments] = useState<Attachment[]>([]);
  const [replyContext, setReplyContext] = useState<Message | null>(null);

  // Load accounts
  useEffect(() => {
    fetch('/api/email/account').then(r => r.ok ? r.json() : { accounts: [] }).then(d => {
      setAccounts(d.accounts ?? []);
      if (d.accounts?.length) setCompose(c => ({ ...c, fromAccountId: d.accounts[0].id }));
    });
  }, []);

  const load = useCallback(async (f = folder, acc = activeAcc, search = q, off = 0) => {
    setLoading(true);
    const params = new URLSearchParams({ folder: f, limit: '50', offset: String(off) });
    if (acc !== 'all') params.set('accountId', acc);
    if (search) params.set('q', search);
    const res = await fetch(`/api/email/messages?${params}`);
    if (res.ok) {
      const data = await res.json();
      if (off === 0) setMessages(data.messages ?? []);
      else setMessages(prev => [...prev, ...(data.messages ?? [])]);
      setTotal(data.total ?? 0);
      setUnread(data.unreadCount ?? 0);
      setOffset(off);
    }
    setLoading(false);
  }, [folder, activeAcc, q]);

  useEffect(() => { load(folder, activeAcc, q, 0); }, [folder, activeAcc, q]);

  // Auto-sync every 5 minutes
  useEffect(() => {
    syncRef.current = setInterval(() => {
      fetch('/api/email/sync', { method: 'POST' })
        .then(() => load(folder, activeAcc, q, 0));
    }, 30 * 1000);
    return () => { if (syncRef.current) clearInterval(syncRef.current); };
  }, [folder, activeAcc, q, load]);

  async function sync() {
    setSyncing(true);
    const params = activeAcc !== 'all' ? JSON.stringify({ accountId: activeAcc }) : '{}';
    await fetch('/api/email/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: params });
    await load(folder, activeAcc, q, 0);
    setSyncing(false);
  }

  async function openMessage(msg: Message) {
    setSelected(msg);
    if (!msg.isRead && !msg.isDraft) {
      await fetch(`/api/email/messages/${msg.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
      setUnread(u => Math.max(0, u - 1));
    }
  }

  async function toggleStar(msg: Message, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/email/messages/${msg.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isStarred: !msg.isStarred }),
    });
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isStarred: !m.isStarred } : m));
    if (selected?.id === msg.id) setSelected({ ...msg, isStarred: !msg.isStarred });
  }

  async function moveMessage(msg: Message, dest: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    await fetch(`/api/email/messages/${msg.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moveTo: dest }),
    });
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    if (selected?.id === msg.id) setSelected(null);
  }

  async function deleteMessage(msg: Message, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (msg.folder === 'TRASH') {
      await fetch(`/api/email/messages/${msg.id}`, { method: 'DELETE' });
    } else {
      await moveMessage(msg, 'TRASH', e);
    }
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    if (selected?.id === msg.id) setSelected(null);
  }

  async function markAllRead() {
    setMarkingRead(true);
    await fetch('/api/email/messages/mark-read', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder, accountId: activeAcc !== 'all' ? activeAcc : undefined }),
    });
    setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
    setUnread(0);
    setMarkingRead(false);
  }

  function startCompose(type: 'new' | 'reply' | 'forward', msg?: Message) {
    setReplyContext(msg ?? null);
    setDraftId(null);
    setComposeAttachments([]);
    setSendError('');
    const acc = msg ? accounts.find(a => a.id === msg.accountId) : accounts[0];
    if (type === 'reply' && msg) {
      setCompose({
        fromAccountId: acc?.id ?? accounts[0]?.id ?? '',
        to: msg.fromEmail, cc: '', bcc: '',
        subject: msg.subject?.startsWith('Re:') ? (msg.subject ?? '') : `Re: ${msg.subject ?? ''}`,
        body: `<br><br><hr style="border:none;border-top:1px solid #ccc;margin:16px 0"><p style="color:#666;font-size:12px">On ${new Date(msg.receivedAt).toLocaleString()}, <strong>${msg.fromName ?? msg.fromEmail}</strong> wrote:</p><blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555">${msg.bodyHtml ?? msg.bodyText ?? ''}</blockquote>`,
        showCc: false, showBcc: false,
      });
    } else if (type === 'forward' && msg) {
      setCompose({
        fromAccountId: acc?.id ?? accounts[0]?.id ?? '',
        to: '', cc: '', bcc: '',
        subject: `Fwd: ${msg.subject ?? ''}`,
        body: `<br><br><hr style="border:none;border-top:1px solid #ccc;margin:16px 0"><p style="color:#666;font-size:12px">Forwarded message from <strong>${msg.fromName ?? msg.fromEmail}</strong> — ${new Date(msg.receivedAt).toLocaleString()}:</p>${msg.bodyHtml ?? msg.bodyText ?? ''}`,
        showCc: false, showBcc: false,
      });
      if (msg.attachments) setComposeAttachments(msg.attachments);
    } else {
      setCompose({ fromAccountId: accounts[0]?.id ?? '', to: '', cc: '', bcc: '', subject: '', body: '', showCc: false, showBcc: false });
    }
    setComposing(true);
  }

  // Auto-save draft every 30s while composing
  useEffect(() => {
    if (!composing) { if (autoSaveRef.current) clearInterval(autoSaveRef.current); return; }
    autoSaveRef.current = setInterval(async () => {
      if (!compose.subject && !compose.body) return;
      const res = await fetch(draftId ? `/api/email/messages/${draftId}` : '/api/email/messages', {
        method: draftId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: compose.fromAccountId,
          subject: compose.subject, bodyHtml: compose.body,
          to: compose.to, cc: compose.cc, attachments: composeAttachments,
        }),
      });
      if (res.ok && !draftId) {
        const data = await res.json();
        setDraftId(data.message?.id ?? null);
      }
    }, 30000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [composing, compose, draftId, composeAttachments]);

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!compose.to || !compose.subject || !compose.body) return;
    setSending(true); setSendError('');
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId:   compose.fromAccountId,
          to:          compose.to,
          cc:          compose.cc  || undefined,
          bcc:         compose.bcc || undefined,
          subject:     compose.subject,
          body:        compose.body,
          inReplyTo:   replyContext?.id,
          attachments: composeAttachments,
          draftId,
        }),
      });
      if (!res.ok) { const d = await res.json(); setSendError(d.error ?? 'Send failed'); setSending(false); return; }
      setSending(false); setComposing(false); setReplyContext(null); setDraftId(null);
      setCompose({ fromAccountId: accounts[0]?.id ?? '', to: '', cc: '', bcc: '', subject: '', body: '', showCc: false, showBcc: false });
      setComposeAttachments([]);
      if (folder === 'SENT') await load('SENT', activeAcc, q, 0);
    } catch { setSendError('Network error — check your connection'); setSending(false); }
  }

  async function handleAttach(files: FileList) {
    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      const buffer = await file.arrayBuffer();
      newAttachments.push({
        filename:    file.name,
        contentType: file.type,
        size:        file.size,
        content:     btoa(String.fromCharCode(...new Uint8Array(buffer))),
      });
    }
    setComposeAttachments(prev => [...prev, ...newAttachments]);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  function downloadAttachment(att: Attachment) {
    const blob = new Blob([Uint8Array.from(atob(att.content), c => c.charCodeAt(0))], { type: att.contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = att.filename; a.click();
    URL.revokeObjectURL(url);
  }

  const accLabel = activeAcc === 'all' ? 'All Accounts' : (accounts.find(a => a.id === activeAcc)?.label ?? activeAcc);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

      {/* Left sidebar */}
      <div style={{ width: 210, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Account selector */}
        <div style={{ padding: '12px 12px 0', position: 'relative' }}>
          <button
            onClick={() => setShowAccounts(!showAccounts)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: hover, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: text, marginBottom: 8 }}
          >
            <MailOpen size={13} />
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{accLabel}</span>
            <ChevronDown size={11} />
          </button>

          {showAccounts && (
            <div style={{ position: 'absolute', top: '100%', left: 12, right: 12, background: card, border: `1px solid ${border}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 50, overflow: 'hidden' }}>
              {[{ id: 'all', label: 'All Accounts', email: '' }, ...accounts].map(a => (
                <button key={a.id} onClick={() => { setActiveAcc(a.id); setShowAccounts(false); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: activeAcc === a.id ? hover : 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: text, textAlign: 'left' }}
                >
                  <Mail size={12} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{a.id === 'all' ? 'All Accounts' : (a as Account).label}</div>
                    {a.email && <div style={{ fontSize: 10, color: gray }}>{a.email}</div>}
                  </div>
                </button>
              ))}
              <div style={{ borderTop: `1px solid ${border}`, padding: 8 }}>
                <a href="/settings" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: gray, textDecoration: 'none', padding: '4px 4px' }}>
                  <Settings size={11} /> Manage accounts
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Compose */}
        <div style={{ padding: '0 12px 8px' }}>
          <button onClick={() => startCompose('new')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <Plus size={14} /> Compose
          </button>
        </div>

        {/* Folders */}
        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {FOLDERS.map(f => (
            <button key={f.id} onClick={() => { setFolder(f.id); setSelected(null); setQ(''); setQInput(''); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', background: folder === f.id ? hover : 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: folder === f.id ? '#2563EB' : gray, fontWeight: folder === f.id ? 600 : 400, borderLeft: folder === f.id ? '3px solid #2563EB' : '3px solid transparent' }}
            >
              {f.icon}
              <span style={{ flex: 1, textAlign: 'left' }}>{f.label}</span>
              {f.id === 'INBOX' && unread > 0 && (
                <span style={{ background: '#2563EB', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{unread}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Sync button */}
        <div style={{ padding: '8px 12px', borderTop: `1px solid ${border}` }}>
          <button onClick={sync} disabled={syncing}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'none', border: `1px solid ${border}`, borderRadius: 7, cursor: 'pointer', fontSize: 11, color: gray }}
          >
            <RefreshCw size={12} style={{ animation: syncing ? 'spin 1s linear infinite' : undefined }} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Message list */}
      <div style={{ width: selected ? 280 : 'auto', flex: selected ? undefined : 1, borderRight: selected ? `1px solid ${border}` : undefined, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: hover, borderRadius: 7, padding: '6px 10px', border: `1px solid ${border}` }}>
            <Search size={13} color={gray} />
            <input
              value={qInput}
              onChange={e => setQInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setQ(qInput); if (e.key === 'Escape') { setQInput(''); setQ(''); } }}
              placeholder="Search messages..."
              style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 12, color: text }}
            />
            {qInput && <button onClick={() => { setQInput(''); setQ(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: gray, display: 'flex' }}><X size={11} /></button>}
          </div>
          <span style={{ fontSize: 11, color: gray, whiteSpace: 'nowrap' }}>{total} msgs</span>
          {folder === 'INBOX' && unread > 0 && (
            <button onClick={markAllRead} disabled={markingRead}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'none', border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', fontSize: 11, color: gray, whiteSpace: 'nowrap' }}
            >
              {markingRead ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={11} />}
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && offset === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: gray }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block' }} />
              <div style={{ fontSize: 13 }}>Loading...</div>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: gray }}>
              <Inbox size={28} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
              <div style={{ fontSize: 13 }}>
                {q ? 'No results for your search.' : folder === 'INBOX' ? 'Empty inbox. Click Sync Now to fetch.' : `No messages in ${folder.toLowerCase()}.`}
              </div>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <div key={msg.id} onClick={() => openMessage(msg)}
                  style={{ padding: '11px 14px', borderBottom: `1px solid ${border}`, cursor: 'pointer', background: selected?.id === msg.id ? 'rgba(37,99,235,0.06)' : (!msg.isRead && folder === 'INBOX' ? 'rgba(37,99,235,0.03)' : 'transparent'), transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (selected?.id !== msg.id) (e.currentTarget as HTMLDivElement).style.background = hover; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = selected?.id === msg.id ? 'rgba(37,99,235,0.06)' : (!msg.isRead ? 'rgba(37,99,235,0.03)' : 'transparent'); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: (!msg.isRead && folder === 'INBOX') ? 700 : 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 6 }}>
                      {msg.isSent ? (() => { try { return `To: ${JSON.parse(msg.toRaw)[0]?.address ?? 'Unknown'}`; } catch { return 'Unknown'; } })() : (msg.fromName || msg.fromEmail)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {msg.hasAttachment && <PaperclipIcon size={10} color={gray} />}
                      <button onClick={(e) => toggleStar(msg, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: msg.isStarred ? '#F59E0B' : 'transparent', padding: 0, display: 'flex' }}>
                        <Star size={11} fill={msg.isStarred ? 'currentColor' : 'none'} stroke={msg.isStarred ? 'currentColor' : gray} />
                      </button>
                      <span style={{ fontSize: 10, color: gray }}>{formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: !msg.isRead && folder === 'INBOX' ? text : gray, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2, fontWeight: !msg.isRead ? 600 : 400 }}>
                    {msg.isDraft && <span style={{ color: '#EF4444', fontWeight: 700, marginRight: 4 }}>[Draft]</span>}
                    {msg.subject ?? '(no subject)'}
                  </div>
                  <div style={{ fontSize: 10, color: gray, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {msg.snippet ?? ''}
                  </div>
                </div>
              ))}
              {messages.length < total && (
                <button onClick={() => load(folder, activeAcc, q, offset + 50)}
                  style={{ width: '100%', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: gray, borderTop: `1px solid ${border}` }}
                >
                  Load more ({total - messages.length} remaining)
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Message detail */}
      {selected && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: gray, display: 'flex' }}><ArrowLeft size={15} /></button>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: text, margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.subject ?? '(no subject)'}</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              {!selected.isSent && !selected.isDraft && <>
                <button onClick={() => startCompose('reply', selected)} title="Reply"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: card, border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, color: text }}
                ><Reply size={12} /> Reply</button>
                <button onClick={() => startCompose('forward', selected)} title="Forward"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: card, border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, color: text }}
                ><Forward size={12} /> Forward</button>
              </>}
              {selected.isDraft && (
                <button onClick={() => { openMessage(selected); startCompose('new'); setCompose(c => ({ ...c, subject: selected.subject ?? '', body: selected.bodyHtml ?? '', to: (() => { try { return JSON.parse(selected.toRaw)[0]?.address ?? ''; } catch { return ''; } })() })); setDraftId(selected.id); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                ><Mail size={12} /> Edit Draft</button>
              )}
              {folder !== 'TRASH' && (
                <button onClick={() => moveMessage(selected, 'ARCHIVE')} title="Archive"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: card, border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, color: gray }}
                ><Archive size={12} /></button>
              )}
              <button onClick={() => deleteMessage(selected)} title={folder === 'TRASH' ? 'Delete permanently' : 'Move to trash'}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: card, border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#EF4444' }}
              ><Trash2 size={12} /></button>
            </div>
          </div>

          {/* Meta */}
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: text }}>{selected.fromName ?? selected.fromEmail}</div>
                <div style={{ fontSize: 11, color: gray }}>
                  {selected.isSent ? 'To: ' : 'From: '}{selected.fromEmail}
                </div>
                {selected.ccRaw && (() => { try { const cc = JSON.parse(selected.ccRaw); return cc.length ? <div style={{ fontSize: 11, color: gray }}>CC: {cc.map((c: {address: string}) => c.address).join(', ')}</div> : null; } catch { return null; } })()}
                <div style={{ fontSize: 11, color: gray }}>
                  {selected.account?.label && <span style={{ marginRight: 8, background: hover, padding: '1px 6px', borderRadius: 4 }}>{selected.account.label}</span>}
                  {new Date(selected.receivedAt).toLocaleString()}
                </div>
              </div>
              <button onClick={(e) => toggleStar(selected, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selected.isStarred ? '#F59E0B' : gray }}>
                <Star size={16} fill={selected.isStarred ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 18px', flex: 1 }}>
            {selected.bodyHtml ? (
              <div style={{ fontSize: 14, lineHeight: 1.7, color: text }} dangerouslySetInnerHTML={{ __html: selected.bodyHtml }} />
            ) : (
              <pre style={{ fontSize: 13, color: text, whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.7 }}>{selected.bodyText ?? '(empty)'}</pre>
            )}

            {/* Attachments */}
            {selected.hasAttachment && selected.attachments && selected.attachments.length > 0 && (
              <div style={{ marginTop: 24, borderTop: `1px solid ${border}`, paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: gray, marginBottom: 10 }}>ATTACHMENTS ({selected.attachments.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selected.attachments.map((att, i) => (
                    <button key={i} onClick={() => downloadAttachment(att)}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', background: hover, border: `1px solid ${border}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, color: text }}
                    >
                      <PaperclipIcon size={12} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 500 }}>{att.filename}</div>
                        <div style={{ fontSize: 10, color: gray }}>{formatSize(att.size)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose modal */}
      {composing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: card, borderRadius: 14, border: `1px solid ${border}`, width: '100%', maxWidth: 680, boxShadow: '0 24px 80px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>

            {/* Compose header */}
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: text }}>
                {replyContext ? `Reply to ${replyContext.fromName ?? replyContext.fromEmail}` : compose.subject ? compose.subject : 'New Message'}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {draftId && <span style={{ fontSize: 10, color: gray }}>Draft saved</span>}
                <button onClick={() => { setComposing(false); setReplyContext(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: gray, fontSize: 20, lineHeight: 1 }}>×</button>
              </div>
            </div>

            <form onSubmit={sendEmail} style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '0 18px', borderBottom: `1px solid ${border}` }}>

                {/* From account */}
                {accounts.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${border}` }}>
                    <span style={{ fontSize: 11, color: gray, width: 36, flexShrink: 0 }}>From</span>
                    <select value={compose.fromAccountId} onChange={e => setCompose(c => ({ ...c, fromAccountId: e.target.value }))}
                      style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 13, color: text, cursor: 'pointer' }}
                    >
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.fromName} &lt;{a.email}&gt;</option>)}
                    </select>
                  </div>
                )}

                {[
                  { label: 'To',      key: 'to',      required: true },
                  ...(compose.showCc  ? [{ label: 'CC',  key: 'cc',  required: false }] : []),
                  ...(compose.showBcc ? [{ label: 'BCC', key: 'bcc', required: false }] : []),
                  { label: 'Subject', key: 'subject', required: true },
                ].map(f => (
                  <div key={f.key} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${border}` }}>
                    <span style={{ fontSize: 11, color: gray, width: 36, flexShrink: 0 }}>{f.label}</span>
                    <input type="text" value={compose[f.key as keyof typeof compose] as string} required={f.required}
                      onChange={e => setCompose(c => ({ ...c, [f.key]: e.target.value }))}
                      style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 13, color: text }}
                    />
                    {f.key === 'to' && !compose.showCc && (
                      <button type="button" onClick={() => setCompose(c => ({ ...c, showCc: true }))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: gray }}>CC</button>
                    )}
                    {f.key === 'to' && !compose.showBcc && (
                      <button type="button" onClick={() => setCompose(c => ({ ...c, showBcc: true }))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: gray }}>BCC</button>
                    )}
                  </div>
                ))}
              </div>

              {/* Rich text body */}
              <div style={{ padding: '12px 18px', flex: 1 }}>
                <RichTextEditor
                  value={compose.body}
                  onChange={html => setCompose(c => ({ ...c, body: html }))}
                  onAttach={handleAttach}
                  minHeight={240}
                />
              </div>

              {/* Attachments preview */}
              {composeAttachments.length > 0 && (
                <div style={{ padding: '0 18px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {composeAttachments.map((att, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: hover, border: `1px solid ${border}`, borderRadius: 6, fontSize: 11, color: text }}>
                      <PaperclipIcon size={11} />
                      <span>{att.filename}</span>
                      <span style={{ color: gray }}>({formatSize(att.size)})</span>
                      <button type="button" onClick={() => setComposeAttachments(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: gray, padding: 0, display: 'flex' }}><X size={10} /></button>
                    </div>
                  ))}
                </div>
              )}

              {sendError && (
                <div style={{ margin: '0 18px 12px', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#DC2626' }}>
                  <AlertCircle size={13} /> {sendError}
                </div>
              )}

              <div style={{ padding: '12px 18px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: gray }}>Auto-saves draft every 30s</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => { setComposing(false); setReplyContext(null); }}
                    style={{ padding: '7px 16px', background: 'none', border: `1px solid ${border}`, borderRadius: 7, cursor: 'pointer', fontSize: 13, color: gray }}
                  >Cancel</button>
                  <button type="submit" disabled={sending}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 18px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >
                    {sending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
