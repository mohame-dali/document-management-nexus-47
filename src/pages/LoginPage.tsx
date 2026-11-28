
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, ArrowLeft, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { getDefaultLandingRoute } from '@/utils/roleUtils';

const getFormSchema = (t: (key: string) => string) => z.object({
  username: z.string().min(1, t('login.usernameRequired')),
  password: z.string().min(1, t('login.passwordRequired')),
});

type FormValues = {
  username: string;
  password: string;
};

type LoginAttemptState = {
  attempts: number;
  maxAttempts: number;
  remainingAttempts: number;
  locked: boolean;
  lockUntil: string | null;
  lockedUsername: string;
};

type LoginApiErrorPayload = {
  error?: string;
  message?: string;
  locked?: boolean;
  attempts?: number;
  maxAttempts?: number;
  remainingAttempts?: number;
  lockUntil?: string;
};

const LoginPage = () => {
  const { login, loading, currentUser } = useAuth();
  const { t, language } = useLanguage();
  const isFr = language === 'fr';
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [attemptState, setAttemptState] = useState<LoginAttemptState | null>(null);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const savedUsername = typeof window !== 'undefined' ? localStorage.getItem('dms-remembered-username') || '' : '';
  
  const form = useForm<FormValues>({
    resolver: zodResolver(getFormSchema(t)),
    defaultValues: {
      username: savedUsername,
      password: '',
    },
  });

  const watchedUsername = form.watch('username');

  // Clear form and error state when component mounts (ensures clean state)
  useEffect(() => {
    console.log('LoginPage mounted, clearing form and error state');

    const storedUsername = localStorage.getItem('dms-remembered-username');
    if (storedUsername) {
      setRememberMe(true);
    }
    
    // Always reset form and clear errors on mount (preserving remembered username if present)
    form.reset({
      username: storedUsername || '',
      password: '',
    });
    setLoginError(null);
    setAttemptState(null);
    
    // Check if user came from explicit logout
    const hasExplicitLogout = sessionStorage.getItem('explicit_logout');
    
    // If user is already logged in and didn't explicitly logout, redirect them
    if (currentUser && !hasExplicitLogout) {
      console.log('User already logged in without explicit logout, redirecting...');
      navigate(getDefaultLandingRoute(currentUser), { replace: true });
    }
    
    // Clear the explicit logout flag once we've handled it
    if (hasExplicitLogout) {
      sessionStorage.removeItem('explicit_logout');
    }
  }, [currentUser, navigate, form]);

  // Countdown tick while account lockout is active
  useEffect(() => {
    if (!attemptState?.locked || !attemptState.lockUntil) return;
    const lockTarget = new Date(attemptState.lockUntil).getTime();
    if (!Number.isFinite(lockTarget)) return;

    setNowTs(Date.now());
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNowTs(current);
      if (current >= lockTarget) {
        setAttemptState((prev) => (prev ? { ...prev, locked: false } : null));
        setLoginError(null);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [attemptState?.locked, attemptState?.lockUntil]);

  // Additional cleanup on component unmount
  useEffect(() => {
    return () => {
      setLoginError(null);
      setAttemptState(null);
    };
  }, []);

  const isLockoutActiveForCurrentUser = Boolean(
    attemptState?.locked &&
      watchedUsername.trim().toLowerCase() === attemptState.lockedUsername &&
      (!attemptState.lockUntil || new Date(attemptState.lockUntil).getTime() > nowTs)
  );

  const remainingLockMinutes = (() => {
    if (!attemptState?.lockUntil) return 15;
    const diffMs = new Date(attemptState.lockUntil).getTime() - nowTs;
    return Math.max(1, Math.ceil(diffMs / 60000));
  })();

  const onSubmit = async (data: FormValues) => {
    try {
      console.log('Login attempt for user:', data.username);
      setLoginError(null);
      
      // Clear any existing form errors
      form.clearErrors();

      if (rememberMe) {
        localStorage.setItem('dms-remembered-username', data.username);
      } else {
        localStorage.removeItem('dms-remembered-username');
      }
      
      await login(data.username, data.password);
      setAttemptState(null);
    } catch (error) {
      console.error('Login error:', error);
      const err = error as {
        message?: string;
        code?: string;
        response?: { status?: number; data?: LoginApiErrorPayload };
      };
      
      if (err.message === 'Network Error') {
        setAttemptState(null);
        setLoginError(t('login.networkError'));
      } else if (err.code === 'ERR_NETWORK') {
        setAttemptState(null);
        setLoginError(t('login.connectionError'));
      } else if (err.response) {
        const resData = err.response.data || {};
        const isLocked = Boolean(resData.locked || err.response.status === 423);
        const hasAttemptCounters =
          typeof resData.attempts === 'number' && typeof resData.maxAttempts === 'number';

        if (hasAttemptCounters) {
          const attempts = resData.attempts as number;
          const maxAttempts = resData.maxAttempts as number;
          const remainingAttempts =
            typeof resData.remainingAttempts === 'number'
              ? resData.remainingAttempts
              : Math.max(0, maxAttempts - attempts);

          setAttemptState({
            attempts,
            maxAttempts,
            remainingAttempts,
            locked: isLocked,
            lockUntil: resData.lockUntil || null,
            lockedUsername: data.username.trim().toLowerCase(),
          });
          setNowTs(Date.now());
          setLoginError(null);
        } else {
          setAttemptState(null);
          const errorMessage = resData.error || resData.message || t('login.authFailed');
          setLoginError(errorMessage);
        }
      } else {
        setAttemptState(null);
        setLoginError(`${err.message || t('login.loginFailed')}`);
      }
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#f7fafc] dark:bg-slate-950 font-cairo">
      <div className="absolute top-4 end-4 z-50">
        <LanguageSwitcher />
      </div>
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="inline-flex items-center text-xs font-medium text-[#2c5282] dark:text-blue-400 hover:text-[#234269] transition-colors duration-200">
          <ArrowLeft className="h-4 w-4 me-1.5 rtl:rotate-180" />
          {t('login.backToHome')}
        </Link>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-sm border border-[#e2e8f0] dark:border-slate-800 bg-white dark:bg-slate-900 rounded">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-[#ebf4ff] dark:bg-blue-950/60 rounded border border-[#bee3f8] dark:border-blue-800 flex items-center justify-center text-[#2c5282] dark:text-blue-400">
                <LogIn className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold text-center text-[#1a202c] dark:text-slate-100">{t('login.welcome')}</CardTitle>
            <CardDescription className="text-center text-xs text-slate-700 dark:text-slate-300">
              {t('login.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attemptState?.locked ? (
              <Alert
                variant="destructive"
                className="mb-4 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 rounded"
              >
                <Lock className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                <AlertDescription className="text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold">
                      {isFr ? 'Compte temporairement verrouillé' : 'تم قفل الحساب مؤقتاً'}
                    </span>
                    <span
                      dir="ltr"
                      className="inline-flex items-center px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/70 text-amber-950 dark:text-amber-100 font-bold text-[11px] tabular-nums"
                    >
                      {attemptState.attempts}/{attemptState.maxAttempts}
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    {isFr
                      ? `Nombre maximal de tentatives atteint (${attemptState.attempts}/${attemptState.maxAttempts}). Veuillez réessayer dans ${remainingLockMinutes} minutes ou contacter l'administrateur.`
                      : `تم تجاوز الحد الأقصى لمحاولات الدخول (${attemptState.attempts}/${attemptState.maxAttempts}). يرجى المحاولة بعد ${remainingLockMinutes} دقيقة أو مراجعة مدير النظام`}
                  </p>
                </AlertDescription>
              </Alert>
            ) : attemptState ? (
              <Alert
                variant="destructive"
                className="mb-4 bg-[#fff5f5] dark:bg-red-950/40 border-[#fed7d7] dark:border-red-900/70 text-[#742a2a] dark:text-red-200 rounded"
              >
                <AlertCircle className="h-4 w-4 text-[#e53e3e] dark:text-red-400" />
                <AlertDescription className="text-xs flex items-center justify-between gap-2 flex-wrap">
                  <span>
                    {isFr
                      ? `Échec d'authentification — Tentative ${attemptState.attempts}/${attemptState.maxAttempts} (${attemptState.remainingAttempts} restantes)`
                      : `فشل في المصادقة — المحاولة ${attemptState.attempts}/${attemptState.maxAttempts} (تبقى ${attemptState.remainingAttempts} محاولات)`}
                  </span>
                  <span
                    dir="ltr"
                    className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-100 font-bold text-[11px] tabular-nums"
                  >
                    {attemptState.attempts}/{attemptState.maxAttempts}
                  </span>
                </AlertDescription>
              </Alert>
            ) : loginError ? (
              <Alert variant="destructive" className="mb-4 bg-[#fff5f5] dark:bg-red-950/40 border-[#fed7d7] dark:border-red-900/70 text-[#742a2a] dark:text-red-200 rounded">
                <AlertCircle className="h-4 w-4 me-2 text-[#e53e3e] dark:text-red-400" />
                <AlertDescription className="text-xs">
                  {loginError}
                </AlertDescription>
              </Alert>
            ) : null}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-800 dark:text-slate-200">{t('login.username')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t('login.enterUsername')}
                          {...field} 
                          name="username"
                          className="text-start"
                          autoComplete="username"
                          autoFocus
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-[#e53e3e]" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-800 dark:text-slate-200">{t('login.password')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder={t('login.enterPassword')}
                            {...field} 
                            name="password"
                            className="text-start pe-10"
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-700 dark:text-slate-300 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#2c5282] focus-visible:ring-offset-1 p-1 rounded"
                            aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-[#e53e3e]" />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-2 mb-3 text-xs">
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#cbd5e1] text-[#2c5282] focus:ring-[#2c5282] focus:ring-offset-0 cursor-pointer"
                  />
                  <label 
                    htmlFor="remember-me" 
                    className="text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                  >
                    {t('login.rememberMe')}
                  </label>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-[#2c5282] hover:bg-[#234269] text-white rounded shadow-xs transition-colors duration-200 disabled:opacity-60" 
                  disabled={loading || isLockoutActiveForCurrentUser}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span className="me-2 text-xs">{t('login.loggingIn')}</span>
                    </div>
                  ) : isLockoutActiveForCurrentUser ? (
                    <>
                      <Lock className="w-4 h-4 me-2" />
                      {isFr ? 'Connexion verrouillée' : 'تم تعليق الدخول مؤقتاً'}
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 me-2" />
                      {t('login.submit')}
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col text-center text-xs text-slate-700 dark:text-slate-300 border-t border-[#f7fafc] dark:border-slate-800 pt-3">
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {t('login.appDescription')}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
