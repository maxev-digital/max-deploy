/**
 * MAX-DEPLOY background workers
 * Run standalone: node dist-workers/index.js
 * Or: ts-node src/workers/index.ts
 */

import cron from 'node-cron';
import { pollRssFeeds } from './rss-poller';
import { pollAtsWatchlist } from './ats-poller';
import { scorePendingOpportunities } from './opportunity-scorer';
import { generateDailyBriefing } from './briefing-job';
import { scheduleFollowUps } from './follow-up-scheduler';
import { startEmailIdleMonitors } from './email-idle';

console.log('[workers] Starting MAX-DEPLOY background workers...');

// RSS feeds — every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('[rss] Polling feeds...');
  try { await pollRssFeeds(); }
  catch (e) { console.error('[rss] Error:', e); }
});

// ATS watchlist — every 24 hours at 3 AM
cron.schedule('0 3 * * *', async () => {
  console.log('[ats] Polling company watchlist...');
  try { await pollAtsWatchlist(); }
  catch (e) { console.error('[ats] Error:', e); }
});

// Auto-score unscored opportunities — every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('[scorer] Scoring pending opportunities...');
  try { await scorePendingOpportunities(); }
  catch (e) { console.error('[scorer] Error:', e); }
});

// Daily briefing — 6 AM Central (12:00 UTC)
cron.schedule('0 12 * * *', async () => {
  console.log('[briefing] Generating daily briefing...');
  try { await generateDailyBriefing(); }
  catch (e) { console.error('[briefing] Error:', e); }
});

// Follow-up scheduler — 7 AM Central (13:00 UTC)
cron.schedule('0 13 * * *', async () => {
  console.log('[followup] Scheduling follow-ups...');
  try { await scheduleFollowUps(); }
  catch (e) { console.error('[followup] Error:', e); }
});

// Run scorer immediately on startup to catch any backlog
setTimeout(async () => {
  console.log('[scorer] Initial backlog scan...');
  try { await scorePendingOpportunities(); }
  catch (e) { console.error('[scorer] Startup error:', e); }
}, 5000);

// Start IMAP IDLE monitors — persistent push, no polling
setTimeout(async () => {
  try { await startEmailIdleMonitors(); }
  catch (e) { console.error('[idle] Startup error:', e); }
}, 8000);

console.log('[workers] All jobs scheduled. Running...');
