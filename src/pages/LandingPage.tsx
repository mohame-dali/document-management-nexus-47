
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, Users, Inbox, LogIn, FileCheck } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f7fafc] font-cairo" dir="rtl">
      {/* Header/Navigation */}
      <header className="bg-white shadow-xs border-b border-[#e2e8f0]">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <FileText className="h-7 w-7 text-[#2c5282] ms-2" />
            <h1 className="text-xl font-bold text-gray-900">نظام إدارة الوثائق</h1>
          </div>
          <Button 
            variant="default" 
            className="flex items-center gap-2 h-9 text-sm"
            onClick={() => navigate('/login')}
          >
            <LogIn className="h-4 w-4" />
            تسجيل الدخول
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-16 px-4 bg-gradient-to-b from-[#f7fafc] to-white border-b border-[#e2e8f0]">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            حل فعال لإدارة الوثائق
          </h1>
          <p className="text-lg sm:text-xl font-semibold text-[#2c5282] mb-3">
            نظام متكامل لإدارة المراسلات الإدارية والموارد البشرية
          </p>
          <p className="text-sm sm:text-base text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            قم بتبسيط تدفق وثائق مؤسستك مع نظام الإدارة الشامل لدينا.
            تتبع ومعالجة وأرشفة الوثائق بسهولة.
          </p>
          <Button 
            size="lg"
            className="px-8 h-11 text-base font-medium shadow-xs hover:shadow"
            onClick={() => navigate('/login')}
          >
            ابدأ الآن
          </Button>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-[#e2e8f0] bg-white text-xs font-medium text-[#4a5568] shadow-xs">
              ✓ سريع
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-[#e2e8f0] bg-white text-xs font-medium text-[#4a5568] shadow-xs">
              ✓ آمن
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-[#e2e8f0] bg-white text-xs font-medium text-[#4a5568] shadow-xs">
              ✓ متكامل
            </span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-gray-900">الميزات الرئيسية</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Card 1 */}
            <div className="bg-[#f8fafc] border border-[#e2e8f0] p-6 rounded-lg text-center shadow-xs hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-full bg-[#ebf4ff] flex items-center justify-center mx-auto mb-4 text-[#2c5282]">
                <Inbox className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">تتبع الوثائق</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                تتبع الوثائق الواردة والصادرة خلال دورة حياتها داخل مؤسستك.
              </p>
              <p className="text-xs font-medium text-[#2c5282] text-center mt-3">
                تتبع فوري • إشعارات آلية • أرشيف مركزي
              </p>
            </div>
            
            {/* Card 2 */}
            <div className="bg-[#f8fafc] border border-[#e2e8f0] p-6 rounded-lg text-center shadow-xs hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-full bg-[#ebf4ff] flex items-center justify-center mx-auto mb-4 text-[#2c5282]">
                <Users className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">إدارة الأقسام</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                تعيين الوثائق لأقسام محددة ومراقبة حالة المعالجة.
              </p>
              <p className="text-xs font-medium text-[#2c5282] text-center mt-3">
                صلاحيات دقيقة • توزيع المهام • تقارير الأداء
              </p>
            </div>
            
            {/* Card 3 */}
            <div className="bg-[#f8fafc] border border-[#e2e8f0] p-6 rounded-lg text-center shadow-xs hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-full bg-[#ebf4ff] flex items-center justify-center mx-auto mb-4 text-[#2c5282]">
                <FileText className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">مسح الوثائق</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                مسح الوثائق الورقية مباشرة إلى النظام مع حل المسح المتكامل لدينا.
              </p>
              <p className="text-xs font-medium text-[#2c5282] text-center mt-3">
                OCR ذكي • ربط تلقائي • حفظ سحابي
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-[#2c5282] text-white text-center relative overflow-hidden">
        <FileCheck className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-48 opacity-10 pointer-events-none select-none" />
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">هل أنت مستعد لتبسيط إدارة وثائقك؟</h2>
          <p className="text-sm sm:text-base text-white/90 mb-6 max-w-2xl mx-auto leading-relaxed">
            يساعد نظامنا المؤسسات على تقليل الأعمال الورقية وتحسين الكفاءة.
          </p>
          <Button 
            size="lg"
            className="h-12 px-8 bg-white text-[#2c5282] hover:bg-gray-100 font-bold text-base shadow-md"
            onClick={() => navigate('/login')}
          >
            تسجيل الدخول للبدء
          </Button>
          <p className="text-xs text-white/70 mt-3">
            اتصل بمسؤول النظام للحصول على حساب
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-lg font-bold flex items-center">
                <FileText className="h-5 w-5 ms-2" />
                نظام إدارة الوثائق
              </h2>
            </div>
            <div>
              <p className="text-sm text-gray-400">© 2025 جميع الحقوق محفوظة</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
