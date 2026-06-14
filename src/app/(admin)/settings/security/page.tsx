'use client';

import { useState, useEffect } from 'react';
import { Shield, KeyRound, CheckCircle2, AlertTriangle, Copy, Download, Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface TotpSetupData {
  secret: string;
  uri: string;
  formattedSecret: string;
  backupCodes: string[];
  account: string;
  issuer: string;
}

export default function SecuritySettingsPage() {
  const toast = useToast();

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<TotpSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const res = await fetch('/api/auth/totp/status', { credentials: 'include' });
      const data = await res.json();
      setTwoFAEnabled(!!data.twoFactorEnabled);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function startSetup() {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/totp/setup', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setSetupData(data);
        setShowBackupCodes(false);
      } else {
        toast.error(data.error || 'خطا در ایجاد کد');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup() {
    if (verificationCode.length !== 6) {
      toast.warning('کد ۶ رقمی وارد کنید');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/auth/totp/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        toast.success('۲FA با موفقیت فعال شد');
        setTwoFAEnabled(true);
        setSetupData(null);
        setVerificationCode('');
      } else {
        toast.error(data.error || 'کد اشتباه است');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setBusy(false);
    }
  }

  async function disable2FA() {
    if (disableCode.length !== 6) {
      toast.warning('کد تأیید فعلی را وارد کنید');
      return;
    }

    const confirmed = confirm(
      'آیا مطمئن هستید که می‌خواهید تأیید دو مرحله‌ای را غیرفعال کنید؟'
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const res = await fetch('/api/auth/totp/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        toast.success('۲FA غیرفعال شد');
        setTwoFAEnabled(false);
        setDisableCode('');
      } else {
        toast.error(data.error || 'خطا در غیرفعال‌سازی');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setBusy(false);
    }
  }

  function copySecret() {
    if (setupData) {
      navigator.clipboard.writeText(setupData.secret);
      toast.success('کد کپی شد');
    }
  }

  function downloadBackupCodes() {
    if (!setupData) return;
    const content = `کدهای پشتیبان CMS Admin\n\n${setupData.backupCodes.join('\n')}\n\nاین کدها را در جای امن نگهداری کنید.\nهر کد فقط یک‌بار قابل استفاده است.`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cms-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function cancelSetup() {
    setSetupData(null);
    setVerificationCode('');
    setShowBackupCodes(false);
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          تنظیمات امنیتی
        </h1>
        <p className="text-gray-600 mt-1 text-sm lg:text-base">
          مدیریت احراز هویت و امنیت حساب
        </p>
      </div>

      {/* ====== 2FA Setup ====== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${twoFAEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              <KeyRound className={`w-5 h-5 ${twoFAEnabled ? 'text-green-600' : 'text-gray-500'}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">تأیید دو مرحله‌ای (2FA)</h2>
              <p className="text-sm text-gray-500">
                {twoFAEnabled
                  ? '✅ فعال - حساب شما با Google Authenticator محافظت می‌شود'
                  : 'با فعال‌سازی، هر ورود نیاز به کد تأیید دارد'}
              </p>
            </div>
          </div>
          {twoFAEnabled && (
            <span className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
              فعال
            </span>
          )}
        </div>

        {!setupData && !twoFAEnabled && (
          <div className="space-y-4 pt-4 border-t">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <AlertTriangle className="w-5 h-5 inline ml-1" />
              <strong>توصیه اکید:</strong> برای حداکثر امنیت، حتماً تأیید دو مرحله‌ای را فعال کنید.
              حتی اگر رمز عبور شما فاش شود، بدون کد تأیید امکان ورود وجود ندارد.
            </div>
            <button
              type="button"
              onClick={startSetup}
              disabled={busy}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              فعال‌سازی ۲FA
            </button>
          </div>
        )}

        {!setupData && twoFAEnabled && (
          <div className="space-y-4 pt-4 border-t">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <CheckCircle2 className="w-5 h-5 inline ml-1 text-green-600" />
              <span className="text-sm text-green-800">
                ۲FA فعال است. هر ورود به سیستم نیاز به کد تأیید دارد.
              </span>
            </div>

            <details className="border rounded-lg">
              <summary className="cursor-pointer p-3 hover:bg-gray-50 font-medium text-red-600">
                غیرفعال‌سازی ۲FA (با احتیاط)
              </summary>
              <div className="p-4 space-y-3 border-t">
                <p className="text-sm text-gray-600">
                  برای غیرفعال‌سازی، کد ۶ رقمی فعلی Google Authenticator را وارد کنید:
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="------"
                  className="w-full px-4 py-3 border rounded-lg text-center text-xl font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={disable2FA}
                  disabled={busy || disableCode.length !== 6}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  غیرفعال‌سازی ۲FA
                </button>
              </div>
            </details>
          </div>
        )}

        {setupData && (
          <div className="space-y-6 pt-4 border-t">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📱 مراحل فعال‌سازی</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>برنامه <strong>Google Authenticator</strong> را نصب کنید (یا مشابه آن)</li>
                <li>کد QR زیر را اسکن کنید، یا کد را دستی وارد کنید</li>
                <li>کد ۶ رقمی نمایش داده شده در برنامه را وارد کنید</li>
              </ol>
            </div>

            {/* QR Code */}
            <div className="bg-gray-50 rounded-lg p-6 text-center space-y-3">
              <div className="inline-block bg-white p-4 rounded-lg shadow-sm">
                {/* Simple QR Code display - for production use a real QR library */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.uri)}`}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>
              <p className="text-xs text-gray-500">کد QR توسط google.com QR API تولید شده</p>
            </div>

            {/* Manual Entry */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                یا این کد را دستی وارد کنید:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-3 bg-white border rounded-lg font-mono text-sm tracking-wider" dir="ltr">
                  {setupData.formattedSecret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="px-3 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg flex items-center gap-1"
                  title="کپی"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Verification */}
            <div>
              <label className="block text-sm font-medium mb-2">
                کد تأیید ۶ رقمی از Google Authenticator:
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="------"
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={confirmSetup}
                disabled={busy || verificationCode.length !== 6}
                className="w-full mt-3 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    در حال تأیید...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    فعال‌سازی نهایی
                  </>
                )}
              </button>
            </div>

            {/* Backup Codes */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-yellow-900">🔑 کدهای پشتیبان</h3>
                <button
                  type="button"
                  onClick={() => setShowBackupCodes(!showBackupCodes)}
                  className="text-sm text-yellow-700 hover:text-yellow-800 flex items-center gap-1"
                >
                  {showBackupCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showBackupCodes ? 'مخفی کردن' : 'نمایش'}
                </button>
              </div>
              <p className="text-sm text-yellow-800 mb-3">
                اگر دسترسی به Google Authenticator را از دست دادید، از این کدها یک‌بار
                استفاده کنید. حتماً آنها را در جای امن نگهداری کنید!
              </p>
              {showBackupCodes && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {setupData.backupCodes.map((code, i) => (
                    <code
                      key={i}
                      className="px-3 py-2 bg-white rounded border text-center font-mono text-sm"
                      dir="ltr"
                    >
                      {code}
                    </code>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={downloadBackupCodes}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-all text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                دانلود کدهای پشتیبان
              </button>
            </div>

            <button
              type="button"
              onClick={cancelSetup}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm"
            >
              انصراف
            </button>
          </div>
        )}
      </div>

      {/* ====== Security Info ====== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          لایه‌های امنیتی فعال
        </h2>
        <div className="space-y-2 text-sm">
          <SecurityRow
            enabled={true}
            label="HttpOnly Cookie"
            description="توکن احراز هویت در کوکی HttpOnly ذخیره می‌شود (غیرقابل دسترسی از JavaScript)"
          />
          <SecurityRow
            enabled={true}
            label="رمزنگاری AES-256-GCM"
            description="تمام اطلاعات حساس با الگوریتم استاندارد رمزنگاری می‌شوند"
          />
          <SecurityRow
            enabled={true}
            label="محدودیت نرخ"
            description="پس از ۵ تلاش ناموفق، دسترسی به مدت ۳۰ دقیقه مسدود می‌شود"
          />
          <SecurityRow
            enabled={true}
            label="نوتیفیکیشن تلگرام"
            description="هر ورود موفق/ناموفق از طریق ربات تلگرام اطلاع‌رسانی می‌شود"
          />
          <SecurityRow
            enabled={twoFAEnabled}
            label="تأیید دو مرحله‌ای (TOTP)"
            description="هر ورود نیاز به کد Google Authenticator دارد"
          />
          <SecurityRow
            enabled={!!process.env.NEXT_PUBLIC_HAS_IP_RESTRICTION}
            label="محدودیت IP"
            description="فقط IP های مجاز اجازه دسترسی دارند"
          />
        </div>
      </div>

      {/* ====== Session ====== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
        <h2 className="text-lg font-semibold mb-3">مدیریت Session</h2>
        <p className="text-sm text-gray-600 mb-3">
          برای امنیت بیشتر، session شما بعد از ۴ ساعت منقضی می‌شود.
        </p>
        <button
          type="button"
          onClick={() => {
            fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).then(() => {
              window.location.href = '/login';
            });
          }}
          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all text-sm flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          خروج و پاک کردن session
        </button>
      </div>
    </div>
  );
}

function SecurityRow({
  enabled,
  label,
  description,
}: {
  enabled: boolean;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          enabled ? 'bg-green-100' : 'bg-gray-200'
        }`}
      >
        {enabled ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : (
          <span className="text-xs text-gray-500">○</span>
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900 text-sm">{label}</p>
        <p className="text-xs text-gray-600 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
