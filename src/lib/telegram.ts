const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegram(text: string, silent = false): Promise<boolean> {
  if (!TOKEN || !CHAT_ID) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        disable_notification: silent,
      }),
    });
    return res.ok;
  } catch { return false; }
}

// Convenience builders
export function tgBold(s: string)   { return `<b>${s}</b>`; }
export function tgCode(s: string)   { return `<code>${s}</code>`; }
export function tgItalic(s: string) { return `<i>${s}</i>`; }
export function tgLink(text: string, url: string) { return `<a href="${url}">${text}</a>`; }
