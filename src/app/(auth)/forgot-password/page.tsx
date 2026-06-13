'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, AlertTriangle, CheckCircle2, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { requestPasswordReset } from '@/lib/api/client';
import { useToast } from '@/hooks/useToast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await requestPasswordReset(email);
      if (res.ok) {
        setSent(true);
        toast.success('Reset link sent (if email exists)');
        if (res.devLink) {
          console.log('Dev reset link:', res.devLink);
        }
      } else {
        setError(res.error || 'Failed');
      }
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
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Forgot Password</h1>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <p className="text-green-700 font-medium">Reset link sent!</p>
              <p className="text-sm text-gray-600">Check your email for instructions.</p>
              <button onClick={() => router.push('/login')} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg">
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  <Mail className="w-4 h-4 inline ml-1" />Email
                </label>
                <input
                  id="email" type="email" required autoFocus
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@example.com"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
                  <AlertTriangle className="w-5 h-5 inline ml-1" />{error}
                </div>
              )}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="text-center pt-4 border-t">
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
