interface NotifyOptions {
  type: 'login_success' | 'login_failed' | '2fa_enabled' | 'suspicious_activity';
  user?: string;
  ip?: string;
  userAgent?: string;
  details?: string;
}

const ICONS: Record<NotifyOptions['type'], string> = {
  login_success: '[OK]',
  login_failed: '[FAIL]',
  '2fa_enabled': '[2FA]',
  suspicious_activity: '[!]',
};

const TITLES: Record<NotifyOptions['type'], string> = {
  login_success: 'ورود موفق',
  login_failed: 'ورود ناموفق',
  '2fa_enabled': '2FA Enabled',
  suspicious_activity: 'فعالیت مشکوک',
};

function format(options: NotifyOptions): string {
  const icon = ICONS[options.type];
  const title = TITLES[options.type];
  const time = new Date().toISOString();
  let msg = `${icon} *${title}*\n${time}\n`;
  if (options.user) msg += `User: ${options.user}\n`;
  if (options.ip) msg += `IP: ${options.ip}\n`;
  if (options.userAgent) msg += `Device: ${options.userAgent.slice(0, 60)}\n`;
  if (options.details) msg += `${options.details}\n`;
  return msg;
}

export async function notify(options: NotifyOptions): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  try {
    const message = format(options);
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    });
    return true;
  } catch {
    return false;
  }
}
