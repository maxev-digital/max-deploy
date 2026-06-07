'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, MapPin, Briefcase, Clock,
} from 'lucide-react';

type CalendarEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  location: string | null;
  description: string | null;
  type: string;
  source: string | null;
  opportunity?: { id: string; company: string; role: string; stage: string } | null;
};

const TYPE_COLOR: Record<string, { bg: string; border: string; text: string; pill: string }> = {
  interview:  { bg: '#0D2E2D', border: '#14B8AD', text: '#5EEAD4', pill: '#14B8AD' },
  screening:  { bg: '#1E1040', border: '#9333EA', text: '#C084FC', pill: '#9333EA' },
  deadline:   { bg: '#2D1010', border: '#E05252', text: '#FCA5A5', pill: '#E05252' },
  follow_up:  { bg: '#0D1F40', border: '#2563EB', text: '#93C5FD', pill: '#2563EB' },
  other:      { bg: '#1A1F2E', border: '#475569', text: '#94A3B8', pill: '#6B7280' },
};

const TYPE_LABEL: Record<string, string> = {
  interview: 'Interview', screening: 'Screening', deadline: 'Deadline',
  follow_up: 'Follow-up', other: 'Other',
};

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const HOUR_START = 7;   // 7 AM
const HOUR_END   = 22;  // 10 PM
const TOTAL_HRS  = HOUR_END - HOUR_START;
const PX_PER_HR  = 72;

function getMondayOf(d: Date): Date {
  const copy = new Date(d);
  const day  = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d); c.setDate(c.getDate() + n); return c;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function fmtDate(d: Date) {
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function timeToY(iso: string): number {
  const d   = new Date(iso);
  const hrs = d.getHours() + d.getMinutes() / 60;
  return Math.max(0, (hrs - HOUR_START) * PX_PER_HR);
}
function durationPx(start: string, end: string | null): number {
  if (!end) return PX_PER_HR;
  const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  return Math.max(28, (mins / 60) * PX_PER_HR);
}
function nowY(): number {
  const now = new Date();
  return (now.getHours() + now.getMinutes() / 60 - HOUR_START) * PX_PER_HR;
}

const EMPTY_FORM = { title: '', date: '', startTime: '', endTime: '', location: '', type: 'other' };

export default function CalendarPage() {
  const [weekStart,     setWeekStart]     = useState<Date>(() => getMondayOf(new Date()));
  const [events,        setEvents]        = useState<CalendarEvent[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [showForm,      setShowForm]      = useState(false);
  const [selected,      setSelected]      = useState<CalendarEvent | null>(null);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [saving,        setSaving]        = useState(false);
  const [currentY,      setCurrentY]      = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const weekEnd = addDays(weekStart, 6);
  const today   = new Date();

  // Set initial time client-side only (avoids SSR hydration mismatch), then update every minute
  useEffect(() => {
    setCurrentY(nowY());
    const iv = setInterval(() => setCurrentY(nowY()), 60_000);
    return () => clearInterval(iv);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (gridRef.current) {
      const scrollTo = Math.max(0, currentY - 120);
      gridRef.current.scrollTop = scrollTo;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/calendar?start=${weekStart.toISOString()}&end=${addDays(weekEnd, 1).toISOString()}`);
      const data = await res.json();
      setEvents(data.events ?? []);
    } finally { setLoading(false); }
  }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!form.title || !form.date || !form.startTime) return;
    setSaving(true);
    try {
      const startAt = new Date(`${form.date}T${form.startTime}`).toISOString();
      const endAt   = form.endTime ? new Date(`${form.date}T${form.endTime}`).toISOString() : null;
      await fetch('/api/calendar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, startAt, endAt, location: form.location || null, type: form.type }),
      });
      setForm(EMPTY_FORM); setShowForm(false); await load();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' });
    setSelected(null); await load();
  }

  const rangeLabel = (() => {
    const s = fmtDate(weekStart), e = fmtDate(weekEnd);
    return weekStart.getFullYear() === weekEnd.getFullYear()
      ? `${s} – ${e}, ${weekStart.getFullYear()}`
      : `${s} ${weekStart.getFullYear()} – ${e} ${weekEnd.getFullYear()}`;
  })();

  const isThisWeek = isSameDay(getMondayOf(today), weekStart);
  const hours      = Array.from({ length: TOTAL_HRS }, (_, i) => HOUR_START + i);

  return (
    <div style={{ background: '#0B0E17', minHeight: '100vh', color: '#E2E8F0', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F8FAFC', lineHeight: 1 }}>Calendar</h1>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{rangeLabel}</div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
            {loading && <span style={{ fontSize: 12, color: '#475569' }}>Syncing…</span>}
            <button onClick={() => setWeekStart(addDays(weekStart, -7))} style={btn}><ChevronLeft size={15} /></button>
            <button
              onClick={() => setWeekStart(getMondayOf(new Date()))}
              style={{ ...btn, background: isThisWeek ? 'rgba(20,184,173,0.15)' : undefined, color: isThisWeek ? '#14B8AD' : undefined, border: isThisWeek ? '1px solid #14B8AD44' : undefined, padding: '5px 14px' }}
            >
              Today
            </button>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))}  style={btn}><ChevronRight size={15} /></button>
            <button
              onClick={() => { setShowForm(!showForm); setSelected(null); }}
              style={{ ...btn, background: '#14B8AD', color: '#0B0E17', fontWeight: 700, padding: '5px 14px', gap: 4 }}
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Add-event form */}
        {showForm && (
          <div style={{ background: '#141824', border: '1px solid #1E2A3B', borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontWeight: 600, color: '#F8FAFC', fontSize: 14 }}>New Event</span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={15} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {[
                { label: 'Title *',      key: 'title',     type: 'text',   ph: 'Event title' },
                { label: 'Date *',       key: 'date',      type: 'date',   ph: '' },
                { label: 'Start *',      key: 'startTime', type: 'time',   ph: '' },
                { label: 'End',          key: 'endTime',   type: 'time',   ph: '' },
                { label: 'Location',     key: 'location',  type: 'text',   ph: 'Zoom, address…' },
              ].map(f => (
                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={lbl}>{f.label}</label>
                  <input
                    style={inp}
                    type={f.type}
                    placeholder={f.ph}
                    value={(form as Record<string, string>)[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={lbl}>Type</label>
                <select style={inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                onClick={handleSave} disabled={saving || !form.title || !form.date || !form.startTime}
                style={{ ...btn, background: '#14B8AD', color: '#0B0E17', fontWeight: 700, opacity: (saving || !form.title || !form.date || !form.startTime) ? 0.45 : 1 }}
              >
                {saving ? 'Saving…' : 'Save Event'}
              </button>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} style={btn}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── Day header row ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderTop: '1px solid #1A2030' }}>
          <div /> {/* spacer for time column */}
          {Array.from({ length: 7 }, (_, i) => {
            const day     = addDays(weekStart, i);
            const isToday = isSameDay(day, today);
            return (
              <div key={i} style={{
                padding: '10px 0 10px',
                textAlign: 'center',
                borderLeft: '1px solid #1A2030',
                background: isToday ? 'rgba(20,184,173,0.06)' : 'transparent',
              }}>
                <div style={{ fontSize: 11, color: isToday ? '#14B8AD' : '#475569', fontWeight: 600, letterSpacing: '0.08em' }}>
                  {DAY_LABELS[i]}
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 700, lineHeight: 1.2, marginTop: 2,
                  color: isToday ? '#fff' : '#94A3B8',
                  ...(isToday ? {
                    background: '#14B8AD',
                    color: '#0B0E17',
                    width: 36, height: 36,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '4px auto 0',
                  } : {}),
                }}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable time grid ─────────────────────────────────────────── */}
      <div ref={gridRef} style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', position: 'relative' }}>

          {/* Hour labels */}
          <div style={{ position: 'relative' }}>
            {hours.map(h => (
              <div key={h} style={{ height: PX_PER_HR, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 10, paddingTop: 4 }}>
                <span style={{ fontSize: 11, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
                  {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {Array.from({ length: 7 }, (_, i) => {
            const day       = addDays(weekStart, i);
            const isToday   = isSameDay(day, today);
            const dayEvts   = events.filter(e => !e.allDay && isSameDay(new Date(e.startAt), day));
            const showNow   = isToday && currentY >= 0 && currentY <= TOTAL_HRS * PX_PER_HR;

            return (
              <div key={i} style={{
                position: 'relative',
                borderLeft: '1px solid #1A2030',
                background: isToday ? 'rgba(20,184,173,0.025)' : 'transparent',
                height: TOTAL_HRS * PX_PER_HR,
              }}>
                {/* Hour lines */}
                {hours.map(h => (
                  <div key={h} style={{
                    position: 'absolute', top: (h - HOUR_START) * PX_PER_HR,
                    left: 0, right: 0, borderTop: '1px solid #131825',
                  }} />
                ))}

                {/* 30-min half lines */}
                {hours.map(h => (
                  <div key={`h${h}`} style={{
                    position: 'absolute', top: (h - HOUR_START) * PX_PER_HR + PX_PER_HR / 2,
                    left: 8, right: 0, borderTop: '1px dashed #0F1520',
                  }} />
                ))}

                {/* Current-time indicator */}
                {showNow && (
                  <>
                    <div style={{ position: 'absolute', top: currentY - 1, left: -1, right: 0, height: 2, background: '#E05252', zIndex: 10 }} />
                    <div style={{ position: 'absolute', top: currentY - 5, left: -5, width: 10, height: 10, borderRadius: '50%', background: '#E05252', zIndex: 10 }} />
                  </>
                )}

                {/* Events */}
                {dayEvts.map(ev => {
                  const c    = TYPE_COLOR[ev.type] ?? TYPE_COLOR.other;
                  const top  = timeToY(ev.startAt);
                  const h    = durationPx(ev.startAt, ev.endAt);
                  const tall = h >= 50;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => { setSelected(ev); setShowForm(false); }}
                      style={{
                        position: 'absolute', top: top + 2, left: 3, right: 3, height: h - 4,
                        background: c.bg, border: `1px solid ${c.border}55`,
                        borderLeft: `3px solid ${c.border}`,
                        borderRadius: 5, padding: '4px 7px',
                        textAlign: 'left', cursor: 'pointer', overflow: 'hidden',
                        zIndex: 5, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
                        boxShadow: `0 2px 8px rgba(0,0,0,0.3)`,
                        transition: 'filter 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.2)')}
                      onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                    >
                      <div style={{ fontSize: 10, color: c.text, fontWeight: 700, letterSpacing: '0.03em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {fmtShort(ev.startAt)}{ev.endAt ? ` – ${fmtShort(ev.endAt)}` : ''}
                      </div>
                      {tall && (
                        <div style={{ fontSize: 12, color: '#E2E8F0', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                          {ev.title}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Event detail overlay ─────────────────────────────────────────── */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{ background: '#141824', border: `1px solid ${(TYPE_COLOR[selected.type] ?? TYPE_COLOR.other).border}44`, borderTop: `3px solid ${(TYPE_COLOR[selected.type] ?? TYPE_COLOR.other).border}`, borderRadius: 12, padding: 24, minWidth: 320, maxWidth: 460, width: '90%', position: 'relative', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={17} /></button>

            <div style={{ marginBottom: 10 }}>
              <span style={{ background: `${(TYPE_COLOR[selected.type] ?? TYPE_COLOR.other).pill}22`, color: (TYPE_COLOR[selected.type] ?? TYPE_COLOR.other).pill, borderRadius: 99, padding: '3px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {TYPE_LABEL[selected.type] ?? 'Other'}
              </span>
            </div>

            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#F8FAFC', paddingRight: 24, lineHeight: 1.3 }}>{selected.title}</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8', fontSize: 13 }}>
                <Clock size={14} style={{ flexShrink: 0 }} />
                {selected.allDay
                  ? `All day — ${fmtDate(new Date(selected.startAt))}`
                  : `${fmtDate(new Date(selected.startAt))}  ${fmtShort(selected.startAt)}${selected.endAt ? ` – ${fmtShort(selected.endAt)}` : ''}`}
              </div>

              {selected.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8', fontSize: 13 }}>
                  <MapPin size={14} style={{ flexShrink: 0 }} />
                  <span style={{ wordBreak: 'break-all' }}>{selected.location}</span>
                </div>
              )}

              {selected.opportunity && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <Briefcase size={14} style={{ color: '#475569', flexShrink: 0 }} />
                  <a href="/pipeline" style={{ color: '#14B8AD', textDecoration: 'none', fontWeight: 600 }}>
                    {selected.opportunity.company} — {selected.opportunity.role}
                  </a>
                  <span style={{ color: '#374151', fontSize: 11, background: '#1A2030', padding: '1px 7px', borderRadius: 99 }}>
                    {selected.opportunity.stage}
                  </span>
                </div>
              )}

              {selected.description && (
                <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 13, lineHeight: 1.6 }}>{selected.description}</p>
              )}
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => handleDelete(selected.id)} style={{ ...btn, color: '#E05252', borderColor: '#E0525244' }}>
                Delete
              </button>
              <button onClick={() => setSelected(null)} style={btn}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  background: '#1A2030', border: '1px solid #1E2A3B', color: '#CBD5E1',
  borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500,
};
const lbl: React.CSSProperties = {
  fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em',
};
const inp: React.CSSProperties = {
  background: '#0B0E17', border: '1px solid #1E2A3B', borderRadius: 6,
  padding: '7px 10px', color: '#E2E8F0', fontSize: 13, width: '100%', boxSizing: 'border-box',
};
