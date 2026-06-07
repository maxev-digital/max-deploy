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
import { parseInboundEmails } from './email-parser';
import { generateHealthReport } from './health-report';
import { deduplicateOpportunities } from './dedup';
import { discoverAtsFromPipeline } from './ats-discovery';

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

// Email parser — classify inbound recruiter emails every 30 min
cron.schedule('*/30 * * * *', async () => {
  try { await parseInboundEmails(); }
  catch (e) { console.error('[email-parser] Error:', e); }
});

// Daily health report — 8 AM Central (14:00 UTC)
cron.schedule('0 14 * * *', async () => {
  console.log('[health] Generating daily report...');
  try { await generateHealthReport(); }
  catch (e) { console.error('[health] Error:', e); }
});

// Dedup + stale cleanup — 9 AM Central (15:00 UTC)
cron.schedule('0 15 * * *', async () => {
  console.log('[dedup] Running pipeline cleanup...');
  try { await deduplicateOpportunities(); }
  catch (e) { console.error('[dedup] Error:', e); }
});

// Start IMAP IDLE monitors — persistent push, no polling
setTimeout(async () => {
  try { await startEmailIdleMonitors(); }
  catch (e) { console.error('[idle] Startup error:', e); }
}, 8000);

// Run dedup on startup to clear existing backlog
setTimeout(async () => {
  console.log('[dedup] Startup cleanup...');
  try { await deduplicateOpportunities(); }
  catch (e) { console.error('[dedup] Startup error:', e); }
}, 12000);

// ATS auto-discovery — 4 AM Central (10:00 UTC)
cron.schedule('0 10 * * *', async () => {
  console.log('[discovery] Probing pipeline companies for ATS boards...');
  try { await discoverAtsFromPipeline(); }
  catch (e) { console.error('[discovery] Error:', e); }
});

// Run discovery on startup (probes recent pipeline companies immediately)
setTimeout(async () => {
  console.log('[discovery] Startup ATS probe...');
  try { await discoverAtsFromPipeline(); }
  catch (e) { console.error('[discovery] Startup error:', e); }
}, 20000);

console.log('[workers] All jobs scheduled. Running...');
