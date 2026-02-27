import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Phone, Mail, Chrome } from 'lucide-react';
import { useAuth } from './AuthProvider';

type Tab = 'google' | 'email' | 'phone';

export function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { isConfigured, isLoading, error, signInWithGoogle, signInWithEmailPassword, signUpWithEmailPassword, verifyEmailCode } =
    useAuth();

  const [tab, setTab] = useState<Tab>('google');
  const [mode, setMode] = useState<'signin' | 'signup' | 'verify'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const canSubmit = useMemo(() => email.trim() && password.trim(), [email, password]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!isConfigured) {
      setLocalError('Backend is not configured. Set VITE_INSFORGE_BASE_URL.');
      return;
    }

    if (mode === 'signin') {
      const res = await signInWithEmailPassword(email.trim(), password);
      if (res.ok) onClose();
      return;
    }

    if (mode === 'signup') {
      const res = await signUpWithEmailPassword(email.trim(), password, name.trim() || undefined);
      if (!res.ok) {
        setLocalError(res.error ?? 'Sign up failed');
        return;
      }
      if (res.requiresEmailVerification) {
        setMode('verify');
        return;
      }
      onClose();
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    const res = await verifyEmailCode(email.trim(), otp.trim());
    if (res.ok) onClose();
    else setLocalError(res.error ?? 'Verification failed');
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md glass-card p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand/10 text-brand border border-brand/10">
                  <Shield className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Sign in to YatriLounge</p>
                  <p className="text-xs text-slate-500">Unlock personalized insights & saved airports.</p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-white/60 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <TabButton active={tab === 'google'} onClick={() => setTab('google')} icon={<Chrome className="h-3.5 w-3.5" />}>
              Google
            </TabButton>
            <TabButton active={tab === 'email'} onClick={() => setTab('email')} icon={<Mail className="h-3.5 w-3.5" />}>
              Email
            </TabButton>
            <TabButton active={tab === 'phone'} onClick={() => setTab('phone')} icon={<Phone className="h-3.5 w-3.5" />}>
              Phone
            </TabButton>
          </div>

          {(localError || error) && (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs text-rose-800">
              {localError ?? error}
            </div>
          )}

          {!isConfigured && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
              Configure <code className="font-mono">VITE_INSFORGE_BASE_URL</code> in <code className="font-mono">.env.local</code> to enable login.
            </div>
          )}

          <div className="mt-4">
            {tab === 'google' && (
              <button
                disabled={!isConfigured || isLoading}
                onClick={() => void signInWithGoogle()}
                className="w-full rounded-2xl bg-brand px-4 py-3 text-sm font-medium text-white shadow-soft hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Continue with Google
              </button>
            )}

            {tab === 'email' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="inline-flex rounded-full border border-slate-200 bg-white/60 p-1">
                    <button
                      className={`px-3 py-1 rounded-full transition-colors ${mode !== 'signup' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                      onClick={() => setMode('signin')}
                      type="button"
                    >
                      Sign in
                    </button>
                    <button
                      className={`px-3 py-1 rounded-full transition-colors ${mode === 'signup' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                      onClick={() => setMode('signup')}
                      type="button"
                    >
                      Sign up
                    </button>
                  </div>
                  {mode === 'verify' && (
                    <span className="text-slate-500">Verify code</span>
                  )}
                </div>

                {mode === 'verify' ? (
                  <form onSubmit={handleVerify} className="space-y-3">
                    <Field label="Email" value={email} onChange={setEmail} type="email" />
                    <Field label="6-digit code" value={otp} onChange={setOtp} inputMode="numeric" placeholder="123456" />
                    <button
                      className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
                      type="submit"
                    >
                      Verify & continue
                    </button>
                    <p className="text-[11px] text-slate-500">
                      Your InsForge backend is configured to verify emails via code.
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleEmailSubmit} className="space-y-3">
                    {mode === 'signup' && <Field label="Name (optional)" value={name} onChange={setName} />}
                    <Field label="Email" value={email} onChange={setEmail} type="email" />
                    <Field label="Password" value={password} onChange={setPassword} type="password" />
                    <button
                      disabled={!isConfigured || isLoading || !canSubmit}
                      className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      type="submit"
                    >
                      {mode === 'signup' ? 'Create account' : 'Sign in'}
                    </button>
                    {mode === 'signup' && (
                      <p className="text-[11px] text-slate-500">
                        If email verification is enabled, you’ll be asked for a 6-digit code.
                      </p>
                    )}
                  </form>
                )}
              </div>
            )}

            {tab === 'phone' && (
              <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-4">
                <p className="text-sm font-medium text-slate-900">Phone login</p>
                <p className="mt-1 text-xs text-slate-600">
                  InsForge’s TypeScript Auth SDK currently supports OAuth (Google) and email/password flows, but does not expose native SMS/phone OTP APIs.
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  If you want true phone OTP, we can integrate an SMS provider (e.g. Twilio Verify) via an InsForge Function and then link it to an InsForge user identity.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 transition-colors ${
        active
          ? 'border-brand/30 bg-brand/10 text-brand'
          : 'border-slate-200 bg-white/60 text-slate-600 hover:text-slate-900'
      }`}
    >
      {icon}
      <span className="font-medium">{children}</span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40"
      />
    </label>
  );
}

