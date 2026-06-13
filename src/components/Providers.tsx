'use client';

import { ToastProvider } from '@/hooks/useToast';
import { ConfirmProvider } from '@/hooks/useConfirm';
import { ToastContainer } from '@/components/ui/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        {children}
        <ToastContainer />
      </ConfirmProvider>
    </ToastProvider>
  );
}
