'use client';

import { useState, useEffect } from 'react';
import { Save, Database, Bell, Globe, Shield } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { API_BASE, STORAGE_KEYS } from '@/lib/constants';
import { getCurrentUser } from '@/lib/api';
import { safeGetStorage, safeSetStorage } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface Settings {
  apiBase: string;
  pageSize: number;
  enableAutoSave: boolean;
  enableNotifications: boolean;
  language: 'fa' | 'en';
}

const DEFAULT_SETTINGS: Settings = {
  apiBase: API_BASE,
  pageSize: 10,
  enableAutoSave: true,
  enableNotifications: true,
  language: 'fa',
};

export default function SettingsPage() {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    const saved = safeGetStorage(`${STORAGE_KEYS.TOKEN}_settings`);
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch {
        /* ignore */
      }
    }
  }, []);

  function handleSave() {
    setSaving(true);
    try {
      safeSetStorage(`${STORAGE_KEYS.TOKEN}_settings`, JSON.stringify(settings));
      toast.success('تنظیمات با موفقیت ذخیره شد');
    } catch {
      toast.error('خطا در ذخیره تنظیمات');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSettings(DEFAULT_SETTINGS);
    safeSetStorage(`${STORAGE_KEYS.TOKEN}_settings`, JSON.stringify(DEFAULT_SETTINGS));
    toast.info('تنظیمات به حالت پیش‌فرض بازنشانی شد');
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">تنظیمات</h1>
        <p className="text-gray-600 mt-1 text-sm lg:text-base">تنظیمات پنل مدیریت</p>
      </div>

      {/* Quick link to security */}
      <Link
        href="/settings/security"
        className="block bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 hover:from-blue-100 hover:to-indigo-100 transition-all"
      >
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">تنظیمات امنیتی</h3>
            <p className="text-sm text-blue-700">
              مدیریت تأیید دو مرحله‌ای (2FA)، IP Allowlist و سایر تنظیمات امنیتی
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-blue-600" />
        </div>
      </Link>

      {/* User info */}
      {user && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{user.name || user.email}</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
              {user.role && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                  {user.role}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* API settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">تنظیمات API</h2>
        </div>

        <div>
          <label htmlFor="api-base" className="block text-sm font-medium mb-1">
            آدرس API
          </label>
          <input
            id="api-base"
            type="url"
            value={settings.apiBase}
            onChange={(e) => setSettings({ ...settings, apiBase: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            dir="ltr"
            placeholder="http://localhost:4000"
          />
          <p className="text-xs text-gray-500 mt-1">
            برای اعمال این تغییر، نیاز به بارگذاری مجدد صفحه است.
          </p>
        </div>
      </div>

      {/* Display settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Database className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">نمایش و عملکرد</h2>
        </div>

        <div>
          <label htmlFor="page-size" className="block text-sm font-medium mb-1">
            تعداد در هر صفحه
          </label>
          <select
            id="page-size"
            value={settings.pageSize}
            onChange={(e) => setSettings({ ...settings, pageSize: Number(e.target.value) })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value={5}>۵ مورد</option>
            <option value={10}>۱۰ مورد</option>
            <option value={20}>۲۰ مورد</option>
            <option value={50}>۵۰ مورد</option>
          </select>
        </div>

        <div>
          <label htmlFor="lang" className="block text-sm font-medium mb-1">
            زبان رابط
          </label>
          <select
            id="lang"
            value={settings.language}
            onChange={(e) =>
              setSettings({ ...settings, language: e.target.value as 'fa' | 'en' })
            }
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="fa">فارسی</option>
            <option value="en">انگلیسی</option>
          </select>
        </div>
      </div>

      {/* Behavior */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">رفتار</h2>
        </div>

        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
          <div>
            <span className="text-sm font-medium">ذخیره خودکار پیش‌نویس</span>
            <p className="text-xs text-gray-500 mt-1">
              پیش‌نویس‌ها به طور خودکار ذخیره می‌شوند.
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.enableAutoSave}
            onChange={(e) => setSettings({ ...settings, enableAutoSave: e.target.checked })}
            className="w-5 h-5"
          />
        </label>

        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
          <div>
            <span className="text-sm font-medium">نوتیفیکیشن‌ها</span>
            <p className="text-xs text-gray-500 mt-1">نمایش اعلان‌های موفقیت و خطا</p>
          </div>
          <input
            type="checkbox"
            checked={settings.enableNotifications}
            onChange={(e) =>
              setSettings({ ...settings, enableNotifications: e.target.checked })
            }
            className="w-5 h-5"
          />
        </label>
      </div>

      {/* Security info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold">امنیت</h2>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-900 mb-1">
              احراز هویت با HttpOnly Cookie فعال است
            </p>
            <p className="text-xs text-green-800">
              توکن شما در HttpOnly Cookie ذخیره می‌شود و از دسترسی JavaScript محافظت می‌شود.
              این کار از حملات XSS جلوگیری می‌کند. تمام درخواست‌ها از طریق پروکسی Next.js به بک‌اند
              ارسال می‌شوند.
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          <p>✅ توکن در localStorage نیست</p>
          <p>✅ HttpOnly + Secure + SameSite=Lax</p>
          <p>✅ Auto-redirect در صورت منقضی شدن</p>
          <p>✅ تمام API calls از طریق /api/proxy</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-gray-50 -mx-4 lg:-mx-6 px-4 lg:px-6 py-4 border-t">
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm"
        >
          بازنشانی به پیش‌فرض
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </button>
      </div>
    </div>
  );
}
