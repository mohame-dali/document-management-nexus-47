
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, Users, Inbox, LogIn } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 font-cairo" dir="rtl">
      {/* Header/Navigation */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-primary ml-2" />
            <h1 className="text-2xl font-bold text-gray-900">نظام إدارة الوثائق</h1>
          </div>
          <Button 
            variant="default" 
            className="flex items-center gap-2"
            onClick={() => navigate('/login')}
          >
            <LogIn className="h-4 w-4" />
            تسجيل الدخول
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            حل فعال لإدارة الوثائق
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            قم بتبسيط تدفق وثائق مؤسستك مع نظام الإدارة الشامل لدينا.
            تتبع ومعالجة وأرشفة الوثائق بسهولة.
          </p>
          <Button 
            size="lg"
            className="px-8 py-6 text-lg"
            onClick={() => navigate('/login')}
          >
            ابدأ الآن
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">الميزات الرئيسية</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-blue-50 p-6 rounded-lg text-center">
              <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">تتبع الوثائق</h3>
              <p className="text-gray-600">
                تتبع الوثائق الواردة والصادرة خلال دورة حياتها داخل مؤسستك.
              </p>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-lg text-center">
              <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">إدارة الأقسام</h3>
              <p className="text-gray-600">
                تعيين الوثائق لأقسام محددة ومراقبة حالة المعالجة.
              </p>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-lg text-center">
              <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">مسح الوثائق</h3>
              <p className="text-gray-600">
                مسح الوثائق الورقية مباشرة إلى النظام مع حل المسح المتكامل لدينا.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-primary text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-6">هل أنت مستعد لتبسيط إدارة وثائقك؟</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            يساعد نظامنا المؤسسات على تقليل الأعمال الورقية وتحسين الكفاءة.
          </p>
          <Button 
            variant="outline" 
            size="lg"
            className="bg-white text-primary hover:bg-gray-100 border-white"
            onClick={() => navigate('/login')}
          >
            سجل الدخول للبدء
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h2 className="text-xl font-bold flex items-center">
                <FileText className="h-6 w-6 ml-2" />
                نظام إدارة الوثائق
              </h2>
            </div>
            <div>
              <p className="text-gray-400">© 2025 جميع الحقوق محفوظة</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
