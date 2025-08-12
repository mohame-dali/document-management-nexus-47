
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
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.message === 'Network Error') {
        setLoginError('خطأ في الشبكة. تأكد من تشغيل الخادم على المنفذ 5000');
      } else if (error.code === 'ERR_NETWORK') {
        setLoginError('غير قادر على الاتصال بالخادم: http://localhost:5000');
      } else if (error.response) {
        const errorMessage = error.response.data?.error || 'فشل في المصادقة';
        setLoginError(errorMessage);
      } else {
        setLoginError(`${error.message || 'فشل تسجيل الدخول'}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-cairo" dir="rtl">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="inline-flex items-center text-primary hover:text-primary/80 transition-colors">
          <ArrowLeft className="h-4 w-4 ml-2" />
          العودة للرئيسية
        </Link>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <LogIn className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">مرحباً</CardTitle>
            <CardDescription className="text-center">
              تسجيل الدخول
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loginError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4 ml-2" />
                <AlertDescription>
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
                      <FormLabel>اسم المستخدم</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="أدخل اسم المستخدم"
                          {...field} 
                          className="focus:border-primary text-right"
                          autoComplete="off"
                          autoFocus
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كلمة المرور</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="أدخل كلمة المرور"
                          {...field} 
                          className="focus:border-primary text-right"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                      <span className="mr-2">جاري تسجيل الدخول...</span>
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
          <CardFooter className="flex flex-col text-center text-sm text-muted-foreground">
            <p className="w-full mb-2">
              حساب المدير الافتراضي: <strong>admin / admin123</strong>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              تأكد من تشغيل الخادم على: <strong>http://localhost:5000</strong>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
