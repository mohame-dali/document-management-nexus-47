
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
import { LogIn, ArrowLeft, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

const getFormSchema = (t: (key: string) => string) => z.object({
  username: z.string().min(1, t('login.usernameRequired')),
  password: z.string().min(1, t('login.passwordRequired')),
});

type FormValues = {
  username: string;
  password: string;
};

const LoginPage = () => {
  const { login, loading, currentUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const savedUsername = typeof window !== 'undefined' ? localStorage.getItem('dms-remembered-username') || '' : '';
  
  const form = useForm<FormValues>({
    resolver: zodResolver(getFormSchema(t)),
    defaultValues: {
      username: savedUsername,
      password: '',
    },
  });

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
    
    // Check if user came from explicit logout
    const hasExplicitLogout = sessionStorage.getItem('explicit_logout');
    
    // If user is already logged in and didn't explicitly logout, redirect them
    if (currentUser && !hasExplicitLogout) {
      console.log('User already logged in without explicit logout, redirecting...');
      if (currentUser.role === 'AdminDepartment' && currentUser.departments.length > 0) {
        navigate('/dashboard/admin-department');
      } else {
        navigate('/dashboard');
      }
    }
    
    // Clear the explicit logout flag once we've handled it
    if (hasExplicitLogout) {
      sessionStorage.removeItem('explicit_logout');
    }
  }, [currentUser, navigate, form]);

  // Additional cleanup on component unmount
  useEffect(() => {
    return () => {
      setLoginError(null);
    };
  }, []);

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
    } catch (error) {
      console.error('Login error:', error);
      const err = error as { message?: string; code?: string; response?: { data?: { error?: string } } };
      
      if (err.message === 'Network Error') {
        setLoginError(t('login.networkError'));
      } else if (err.code === 'ERR_NETWORK') {
        setLoginError(`${t('login.connectionError')}: http://localhost:5000`);
      } else if (err.response) {
        const errorMessage = err.response.data?.error || t('login.authFailed');
        setLoginError(errorMessage);
      } else {
        setLoginError(`${err.message || t('login.loginFailed')}`);
      }
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#f7fafc] font-cairo">
      <div className="absolute top-4 end-4 z-50">
        <LanguageSwitcher />
      </div>
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="inline-flex items-center text-xs font-medium text-[#2c5282] hover:text-[#234269] transition-colors duration-200">
          <ArrowLeft className="h-4 w-4 me-1.5 ltr:rotate-180" />
          {t('login.backToHome')}
        </Link>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-sm border border-[#e2e8f0] bg-white rounded">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-[#ebf4ff] rounded border border-[#bee3f8] flex items-center justify-center text-[#2c5282]">
                <LogIn className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold text-center text-[#1a202c]">{t('login.welcome')}</CardTitle>
            <CardDescription className="text-center text-xs text-[#718096]">
              {t('login.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loginError && (
              <Alert variant="destructive" className="mb-4 bg-[#fff5f5] border-[#fed7d7] text-[#742a2a] rounded">
                <AlertCircle className="h-4 w-4 me-2 text-[#e53e3e]" />
                <AlertDescription className="text-xs">
                  {loginError}
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-[#4a5568]">{t('login.username')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t('login.enterUsername')}
                          {...field} 
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
                      <FormLabel className="text-xs font-medium text-[#4a5568]">{t('login.password')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder={t('login.enterPassword')}
                          {...field} 
                          className="text-start"
                          autoComplete="current-password"
                        />
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
                    className="text-[#4a5568] cursor-pointer select-none"
                  >
                    {t('login.rememberMe')}
                  </label>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-[#2c5282] hover:bg-[#234269] text-white rounded shadow-xs transition-colors duration-200" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span className="me-2 text-xs">{t('login.loggingIn')}</span>
                    </div>
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
          <CardFooter className="flex flex-col text-center text-xs text-[#718096] border-t border-[#f7fafc] pt-3">
            <p className="w-full mb-1">
              {t('login.credentials')}: <strong className="text-[#2d3748]" dir="ltr">admin / admin123</strong>
            </p>
            <p className="text-xs text-[#a0aec0]">
              {t('login.appDescription')}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
