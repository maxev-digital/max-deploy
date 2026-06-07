'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Clock, AlertCircle, Plus, X, Trash2 } from 'lucide-react';

type Task = {
  id: string;
  title: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  dueDate: string | null;
  notes: string | null;
};

const PRIORITY_COLOR: Record<string, string> = {
  HIGH:   '#ef4444',
  MEDIUM: '#f97316',
  LOW:    '#6b7280',
};

const STATUS_ICON = {
  TODO:        <Circle size={16} style={{ color: '#6b7280' }} />,
  IN_PROGRESS: <Clock size={16} style={{ color: '#f97316' }} />,
  BLOCKED:     <AlertCircle size={16} style={{ color: '#ef4444' }} />,
  DONE:        <CheckCircle2 size={16} style={{ color: '#22c55e' }} />,
};

export default function TasksPage() {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');

  async function load() {
    const res = await fetch('/api/tasks');
    if (res.ok) {
      const d = await res.json();
      setTasks(d.tasks ?? []);
      setDoneCount(d.doneCount ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleDone(id: string, currentStatus: string) {
    const status = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    load();
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), priority: newPriority }),
    });
    setNewTitle('');
    setAdding(false);
    load();
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--fg)' }}>Tasks</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: 2 }}>
            {tasks.length} active · {doneCount} completed
          </div>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
        >
          {adding ? <X size={13} /> : <Plus size={13} />}
          {adding ? 'Cancel' : 'Add Task'}
        </button>
      </div>

      {adding && (
        <form onSubmit={addTask} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', marginBottom: '1rem', display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Task title..."
            style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--fg)', fontSize: '0.85rem' }}
          />
          <select
            value={newPriority}
            onChange={e => setNewPriority(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--fg)', fontSize: '0.8rem' }}
          >
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <button type="submit" style={{ padding: '7px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            Save
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>Loading...</div>
      ) : tasks.length === 0 ? (
        <div style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>No active tasks.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map(task => (
            <div
              key={task.id}
              style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <button
                onClick={() => toggleDone(task.id, task.status)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                title={task.status === 'DONE' ? 'Mark as To Do' : 'Mark as Done'}
              >
                {STATUS_ICON[task.status as keyof typeof STATUS_ICON] ?? STATUS_ICON.TODO}
              </button>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--fg)', textDecoration: task.status === 'DONE' ? 'line-through' : 'none', opacity: task.status === 'DONE' ? 0.5 : 1 }}>
                  {task.title}
                </div>
                {task.notes && (
                  <div style={{ fontSize: '0.73rem', color: 'var(--gray)', marginTop: 2 }}>{task.notes}</div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {task.dueDate && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: PRIORITY_COLOR[task.priority] ?? '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {task.priority}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--gray)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px' }}>
                  {task.status.replace('_', ' ')}
                </span>
                <button
                  onClick={() => deleteTask(task.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6b7280', flexShrink: 0, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                  title="Delete task"
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
