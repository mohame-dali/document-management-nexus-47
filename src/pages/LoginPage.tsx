
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

const formSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

type FormValues = z.infer<typeof formSchema>;

const LoginPage = () => {
  const { login, loading, currentUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // Clear form and error state when component mounts (ensures clean state)
  useEffect(() => {
    console.log('LoginPage mounted, clearing form and error state');
    
    // Always reset form and clear errors on mount
    form.reset({
      username: '',
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
      
      await login(data.username, data.password);
    } catch (error) {
      console.error('Login error:', error);
      const err = error as { message?: string; code?: string; response?: { data?: { error?: string } } };
      
      if (err.message === 'Network Error') {
        setLoginError('خطأ في الشبكة. تأكد من تشغيل الخادم على المنفذ 5000');
      } else if (err.code === 'ERR_NETWORK') {
        setLoginError('غير قادر على الاتصال بالخادم: http://localhost:5000');
      } else if (err.response) {
        const errorMessage = err.response.data?.error || 'فشل في المصادقة';
        setLoginError(errorMessage);
      } else {
        setLoginError(`${err.message || 'فشل تسجيل الدخول'}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7fafc] font-cairo" dir="rtl">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="inline-flex items-center text-xs font-medium text-[#2c5282] hover:text-[#234269] transition-colors duration-200">
          <ArrowLeft className="h-4 w-4 ml-1.5" />
          العودة للرئيسية
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
            <CardTitle className="text-xl font-bold text-center text-[#1a202c]">مرحباً</CardTitle>
            <CardDescription className="text-center text-xs text-[#718096]">
              تسجيل الدخول إلى نظام إدارة المراسلات
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loginError && (
              <Alert variant="destructive" className="mb-4 bg-[#fff5f5] border-[#fed7d7] text-[#742a2a] rounded">
                <AlertCircle className="h-4 w-4 ml-2 text-[#e53e3e]" />
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
                      <FormLabel className="text-xs font-medium text-[#4a5568]">اسم المستخدم</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="أدخل اسم المستخدم"
                          {...field} 
                          className="text-right"
                          autoComplete="off"
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
                      <FormLabel className="text-xs font-medium text-[#4a5568]">كلمة المرور</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="أدخل كلمة المرور"
                          {...field} 
                          className="text-right"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-[#e53e3e]" />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full bg-[#2c5282] hover:bg-[#234269] text-white rounded shadow-xs transition-colors duration-200" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span className="mr-2 text-xs">جاري تسجيل الدخول...</span>
                    </div>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 ml-2" />
                      تسجيل الدخول
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col text-center text-xs text-[#718096] border-t border-[#f7fafc] pt-3">
            <p className="w-full mb-1">
              حساب المدير الافتراضي: <strong className="text-[#2d3748]">admin / admin123</strong>
            </p>
            <p className="text-[11px] text-[#a0aec0]">
              نظام إدارة المراسلات والوثائق
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
