import { NextResponse } from 'next/server';

// Serve the bookmarklet JS inline so user can drag it to bookmarks bar
export default function BookmarkletPage() {
  const host = 'https://max-ev-holdings.com';
  const bookmarkletCode = `javascript:(function(){
    var url=location.href;
    var el=document.createElement('div');
    el.style='position:fixed;top:16px;right:16px;z-index:99999;background:#1e40af;color:#fff;padding:12px 18px;border-radius:10px;font-family:system-ui;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.3)';
    el.innerText='Adding to MAX-DEPLOY...';
    document.body.appendChild(el);
    fetch('${host}/api/opportunities/scrape',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url})})
    .then(function(r){return r.json()})
    .then(function(d){
      el.style.background=d.id?'#15803d':'#dc2626';
      el.innerText=d.id?'Added: '+d.company+' — '+d.role:'Error: '+(d.error||'Failed');
      setTimeout(function(){el.remove()},3000);
    }).catch(function(){
      el.style.background='#dc2626';
      el.innerText='Network error — are you logged in?';
      setTimeout(function(){el.remove()},3000);
    });
  })();`.replace(/\s+/g, ' ').trim();

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '60px auto', padding: '0 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>MAX-DEPLOY Bookmarklet</h1>
      <p style={{ color: '#6b7280', marginBottom: 32 }}>
        One-click job add from any page. Click a job posting, hit the bookmarklet, and it auto-parses and adds to your inbox.
      </p>

      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 24, marginBottom: 32 }}>
        <p style={{ fontWeight: 600, marginBottom: 16 }}>Drag this button to your bookmarks bar:</p>
        <a
          href={bookmarkletCode}
          style={{ display: 'inline-block', padding: '10px 20px', background: '#1e40af', color: '#fff', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: 15 }}
        >
          + Add to MAX-DEPLOY
        </a>
        <p style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
          Drag the blue button above to your browser&apos;s bookmarks bar. Then on any job page, click it.
        </p>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>How it works</h2>
      <ol style={{ paddingLeft: 20, color: '#374151', lineHeight: 2 }}>
        <li>Navigate to any job posting (LinkedIn, Greenhouse, company page, anywhere)</li>
        <li>Click the bookmarklet in your bookmarks bar</li>
        <li>A blue notification appears — it&apos;s fetching and parsing the JD with Claude</li>
        <li>Confirmation shows the company and role name when done</li>
        <li>Open your <a href="/inbox" style={{ color: '#1e40af' }}>Inbox</a> — the opportunity is there with a fit score</li>
      </ol>

      <p style={{ marginTop: 24, fontSize: 13, color: '#9ca3af' }}>
        You must be logged into MAX-DEPLOY for the bookmarklet to work.
      </p>
    </main>
  );
}
