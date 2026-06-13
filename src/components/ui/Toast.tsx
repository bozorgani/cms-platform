'use client';

import { useToast } from '@/hooks/useToast';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastType } from '@/types';

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const ICON_STYLES: Record<ToastType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="fixed top-4 left-4 z-[100] space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const Icon = ICONS[t.type];
        return (
          <div
            key={t.id}
            role="alert"
            aria-live="polite"
            className={`pointer-events-auto border rounded-lg shadow-lg p-4 flex items-start gap-3 ${STYLES[t.type]}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${ICON_STYLES[t.type]}`} />
            <div className="flex-1 min-w-0">
              {t.title && <p className="font-semibold text-sm mb-1">{t.title}</p>}
              <p className="text-sm">{t.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 opacity-70 hover:opacity-100"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
