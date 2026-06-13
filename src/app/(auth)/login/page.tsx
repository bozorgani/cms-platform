'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, KeyRound, AlertTriangle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { login, getCurrentUser, fetchCurrentUser } from '@/lib/api/client';
import { useToast } from '@/hooks/useToast';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');

  useEffect(() => {
    fetchCurrentUser().then((user) => {
      if (user) router.replace('/');
    });
  }, [router]);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      if (!res.ok) {
        setError(res.error || 'Login failed');
        return;
      }
      if (res.requires2fa) {
        setStep('totp');
        return;
      }
      toast.success('Welcome!');
      router.push('/');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTotp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password, totpCode);
      if (!res.ok) {
        setError(res.error || '2FA failed');
        setTotpCode('');
        return;
      }
      toast.success('Welcome!');
      router.push('/');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">
              {step === 'credentials' ? 'Admin Login' : '2FA Verification'}
            </h1>
          </div>

          {step === 'credentials' ? (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                <input
                  id="email" type="email" required autoFocus
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  <Lock className="w-4 h-4 inline ml-1" />Password
                </label>
                <input
                  id="password" type="password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2" role="alert">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue<ArrowRight className="w-4 h-4" /></>}
              </button>
              <div className="text-center text-sm">
                <Link href="/forgot-password" className="text-blue-600 hover:text-blue-700">
                  <KeyRound className="w-3 h-3 inline" /> Forgot password?
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleTotp} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <Shield className="w-5 h-5 inline ml-1" /> Enter 6-digit code from your authenticator app.
              </div>
              <input
                type="text" inputMode="numeric" maxLength={6} required autoFocus
                value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-4 rounded-lg border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 text-center text-2xl font-mono tracking-widest"
                placeholder="------"
              />
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading || totpCode.length !== 6} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg disabled:opacity-50">
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
