const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

type Button     = { text: string; callback_data: string };
type KeyboardRow = Button[];

// ─── Send ─────────────────────────────────────────────────────────────────────

export async function sendTelegram(text: string, silent = false): Promise<number | null> {
  if (!TOKEN || !CHAT_ID) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID, text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        disable_notification: silent,
      }),
    });
    const data = await res.json() as { ok: boolean; result?: { message_id: number } };
    return data.ok ? (data.result?.message_id ?? null) : null;
  } catch { return null; }
}

export async function sendTelegramButtons(
  text: string,
  buttons: KeyboardRow[],
  silent = false
): Promise<number | null> {
  if (!TOKEN || !CHAT_ID) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID, text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        disable_notification: silent,
        reply_markup: { inline_keyboard: buttons },
      }),
    });
    const data = await res.json() as { ok: boolean; result?: { message_id: number } };
    return data.ok ? (data.result?.message_id ?? null) : null;
  } catch { return null; }
}

// Edit an existing message in-place after a button tap
export async function editTelegramMessage(
  messageId: number,
  text: string,
  buttons?: KeyboardRow[]
): Promise<boolean> {
  if (!TOKEN || !CHAT_ID) return false;
  try {
    const body: Record<string, unknown> = {
      chat_id: CHAT_ID, message_id: messageId, text,
      parse_mode: 'HTML', disable_web_page_preview: true,
    };
    if (buttons !== undefined) body.reply_markup = { inline_keyboard: buttons };
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return (await res.json() as { ok: boolean }).ok;
  } catch { return false; }
}

// Must answer within 10s of receiving a callback_query — removes the spinner
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert = false
): Promise<boolean> {
  if (!TOKEN) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: showAlert }),
    });
    return (await res.json() as { ok: boolean }).ok;
  } catch { return false; }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function tgBold(s: string)   { return `<b>${s}</b>`; }
export function tgCode(s: string)   { return `<code>${s}</code>`; }
export function tgItalic(s: string) { return `<i>${s}</i>`; }
export function tgLink(text: string, url: string) { return `<a href="${url}">${text}</a>`; }

// ─── Standard button sets ─────────────────────────────────────────────────────

export function applyButtons(oppId: string): KeyboardRow[] {
  return [[
    { text: '✅ Apply',  callback_data: `apply:${oppId}`  },
    { text: '⏭ Skip',   callback_data: `skip:${oppId}`   },
    { text: '🕐 Later', callback_data: `later:${oppId}`  },
  ]];
}

export function confirmApplyButtons(oppId: string): KeyboardRow[] {
  return [[
    { text: '✅ Mark Applied', callback_data: `confirm_apply:${oppId}` },
    { text: '❌ Cancel',       callback_data: `cancel:${oppId}`        },
  ]];
}
