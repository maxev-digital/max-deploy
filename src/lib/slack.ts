const TOKEN   = process.env.SLACK_BOT_TOKEN;
const CHANNEL = process.env.SLACK_CHANNEL_ID;

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  fields?: { type: string; text: string }[];
  elements?: unknown[];
}

interface SlackPayload {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
  attachments?: { color: string; fallback: string }[];
}

export async function sendSlack(payload: Omit<SlackPayload, 'channel'>): Promise<boolean> {
  if (!TOKEN || !CHANNEL) return false;
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ channel: CHANNEL, ...payload }),
    });
    const data = await res.json() as { ok: boolean; error?: string };
    if (!data.ok) console.error('[slack] Error:', data.error);
    return data.ok;
  } catch { return false; }
}

// Pre-built message shapes
export function slackAlert(title: string, body: string, color = '#2563EB') {
  return sendSlack({
    text: title,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: title } },
      { type: 'section', text: { type: 'mrkdwn', text: body } },
    ],
    attachments: [{ color, fallback: title }],
  });
}

export function slackFields(title: string, fields: Record<string, string>, color = '#2563EB') {
  return sendSlack({
    text: title,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: title } },
      {
        type: 'section',
        fields: Object.entries(fields).map(([k, v]) => ({ type: 'mrkdwn', text: `*${k}:*\n${v}` })),
      },
    ],
    attachments: [{ color, fallback: title }],
  });
}
