'use client';

import { useRef, useCallback, useEffect } from 'react';
import { Bold, Italic, Underline, Link, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Paperclip } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onAttach?: (files: FileList) => void;
  placeholder?: string;
  minHeight?: number;
}

const FONTS = ['Default', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS'];
const SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

export default function RichTextEditor({ value, onChange, onAttach, placeholder = 'Write your message...', minHeight = 200 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  // Sync value → DOM only on initial mount
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  function insertLink() {
    const url = window.prompt('URL:', 'https://');
    if (url) exec('createLink', url);
  }

  function handleInput() {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  const btnStyle = (active = false): React.CSSProperties => ({
    padding: '4px 7px',
    background: active ? 'rgba(37,99,235,0.15)' : 'none',
    border: active ? '1px solid rgba(37,99,235,0.4)' : '1px solid transparent',
    borderRadius: 5,
    cursor: 'pointer',
    color: active ? '#2563EB' : 'var(--text)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.1s',
  });

  const sepStyle: React.CSSProperties = {
    width: 1, height: 18, background: 'var(--border)', margin: '0 4px', flexShrink: 0,
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center',
        padding: '6px 8px', borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
      }}>
        {/* Font family */}
        <select
          onChange={e => exec('fontName', e.target.value)}
          defaultValue="Default"
          style={{ fontSize: 12, padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', marginRight: 4 }}
        >
          {FONTS.map(f => <option key={f} value={f === 'Default' ? '' : f}>{f}</option>)}
        </select>

        {/* Font size */}
        <select
          onChange={e => exec('fontSize', e.target.value)}
          defaultValue="14px"
          style={{ fontSize: 12, padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', marginRight: 4 }}
        >
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div style={sepStyle} />

        {/* Text color */}
        <label title="Text color" style={{ ...btnStyle(), padding: '2px 5px', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
          A
          <input type="color" defaultValue="#000000" onChange={e => exec('foreColor', e.target.value)}
            style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} />
        </label>

        <div style={sepStyle} />

        <button type="button" title="Bold (Ctrl+B)"       onClick={() => exec('bold')}          style={btnStyle()}><Bold size={13} /></button>
        <button type="button" title="Italic (Ctrl+I)"     onClick={() => exec('italic')}        style={btnStyle()}><Italic size={13} /></button>
        <button type="button" title="Underline (Ctrl+U)"  onClick={() => exec('underline')}     style={btnStyle()}><Underline size={13} /></button>

        <div style={sepStyle} />

        <button type="button" title="Bullet list"         onClick={() => exec('insertUnorderedList')} style={btnStyle()}><List size={13} /></button>
        <button type="button" title="Numbered list"       onClick={() => exec('insertOrderedList')}   style={btnStyle()}><ListOrdered size={13} /></button>

        <div style={sepStyle} />

        <button type="button" title="Align left"    onClick={() => exec('justifyLeft')}   style={btnStyle()}><AlignLeft size={13} /></button>
        <button type="button" title="Align center"  onClick={() => exec('justifyCenter')} style={btnStyle()}><AlignCenter size={13} /></button>
        <button type="button" title="Align right"   onClick={() => exec('justifyRight')}  style={btnStyle()}><AlignRight size={13} /></button>

        <div style={sepStyle} />

        <button type="button" title="Insert link" onClick={insertLink} style={btnStyle()}><Link size={13} /></button>
        <button type="button" title="Remove link" onClick={() => exec('unlink')} style={{ ...btnStyle(), fontSize: 10, fontWeight: 700 }}>—</button>

        {onAttach && (
          <>
            <div style={sepStyle} />
            <button type="button" title="Attach file" onClick={() => fileRef.current?.click()} style={btnStyle()}>
              <Paperclip size={13} />
            </button>
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
              onChange={e => e.target.files && onAttach(e.target.files)} />
          </>
        )}
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={e => {
          // Ctrl+B/I/U handled natively by execCommand
          if (e.key === 'Enter' && !e.shiftKey) {
            // Use div instead of br for cleaner paragraph spacing
            document.execCommand('insertParagraph', false);
            e.preventDefault();
            handleInput();
          }
        }}
        data-placeholder={placeholder}
        style={{
          minHeight,
          padding: '12px 14px',
          outline: 'none',
          fontSize: 14,
          lineHeight: 1.7,
          color: 'var(--text)',
          background: 'var(--card)',
        }}
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: var(--gray);
          pointer-events: none;
        }
        [contenteditable] a { color: #2563EB; }
        [contenteditable] ul, [contenteditable] ol { padding-left: 20px; }
      `}</style>
    </div>
  );
}
