import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  ArrowLeft, 
  ExternalLink, 
  Key, 
  Users, 
  Sliders, 
  FileText, 
  Network, 
  ShieldCheck,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getOrganizationSettings } from '@/services/organizationSettingsService';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'dms_installation_guide_completed_steps';

interface Step {
  id: number;
  title: string;
  description: string;
  badgeLabel?: string;
  actions: {
    label: string;
    path: string;
    variant?: 'default' | 'outline' | 'secondary';
    icon?: React.ComponentType<{ className?: string }>;
  }[];
}

const STEPS: Step[] = [
  {
    id: 1,
    title: 'الخطوة 1 — معالج الإعداد الأولي',
    description: 'تشغيل معالج الإعداد لإنشاء الإدارة والأقسام وحسابات المدير ومدير الموارد البشرية.',
    actions: [
      {
        label: 'الذهاب إلى الإعداد',
        path: '/setup',
        variant: 'default',
        icon: Sliders
      }
    ]
  },
  {
    id: 2,
    title: 'الخطوة 2 — إكمال بطاقات الموظفين',
    description: 'تسجيل الدخول بحساب مدير الموارد البشرية لإكمال بيانات الموظفين (المدير، مكتب الضبط، RH، المختبر...).',
    actions: [
      {
        label: 'الذهاب إلى الموظفين',
        path: '/dashboard/hr/personnel',
        variant: 'default',
        icon: Users
      }
    ]
  },
  {
    id: 3,
    title: 'الخطوة 3 — إنشاء حسابات المستخدمين',
    description: 'بصفة مدير النظام، استخدم زر 🔑 في جدول الموظفين لإنشاء حساب لكل موظف مع توليد كلمة مرور تلقائياً وطبع بطاقة الاتصال (PDF).',
    actions: [
      {
        label: 'الذهاب إلى الموظفين',
        path: '/dashboard/hr/personnel',
        variant: 'default',
        icon: Key
      }
    ]
  },
  {
    id: 4,
    title: 'الخطوة 4 — إعداد الوثائق',
    description: 'إنشاء النماذج والقوالب، ضبط خيارات الوثائق، وتجربة إسناد وثيقة إلى قسم.',
    actions: [
      {
        label: 'الوثائق الواردة',
        path: '/dashboard/incoming-documents',
        variant: 'default',
        icon: FileText
      },
      {
        label: 'خيارات الوثائق',
        path: '/dashboard/document-options',
        variant: 'outline',
        icon: Sliders
      }
    ]
  },
  {
    id: 5,
    title: 'الخطوة 5 — التحقق النهائي',
    description: 'التحقق من عمل كل دور : المدير، مدير النظام، مكتب الضبط، RH، الموظف. معاينة المخطط التنظيمي.',
    actions: [
      {
        label: 'المخطط التنظيمي',
        path: '/dashboard/organization-chart',
        variant: 'default',
        icon: Network
      }
    ]
  }
];

const InstallationGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Load completed steps from localStorage
  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Query organization settings to automatically check if setup wizard is done
  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
    staleTime: 5 * 60 * 1000
  });

  const isSetupDone = Boolean(
    orgSettings?.nomAdministration &&
    orgSettings?.bureauDirecteurDepartmentId &&
    orgSettings?.rhDepartmentId &&
    orgSettings?.bureauOrdreDepartmentId
  );

  // Sync completed steps with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completedSteps));
    } catch (e) {
      console.error('Error saving guide progress to localStorage', e);
    }
  }, [completedSteps]);

  // If setup is verified done, ensure step 1 is marked or indicated
  useEffect(() => {
    if (isSetupDone && !completedSteps.includes(1)) {
      setCompletedSteps((prev) => (prev.includes(1) ? prev : [...prev, 1]));
    }
  }, [isSetupDone]);

  const toggleStep = (stepId: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
    );
  };

  const handleReset = () => {
    setCompletedSteps(isSetupDone ? [1] : []);
  };

  const totalSteps = STEPS.length;
  const completedCount = completedSteps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#2c5282]/10 text-[#2c5282] rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#1a202c]">دليل الإعداد والتثبيت</h1>
          </div>
          <p className="text-sm text-[#4a5568] mt-1 mr-10">
            دليل إرشادي تفصيلي خطوة بخطوة لتهيئة وتشغيل النظام بعد معالج الإعداد الأولي
          </p>
        </div>

        <div className="flex items-center gap-2">
          {completedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-[#718096] hover:text-[#2c5282] text-xs h-9 border-[#cbd5e1]"
              title="إعادة تعيين التقدم"
            >
              <RotateCcw className="w-3.5 h-3.5 ml-1.5" />
              إعادة تعيين
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-[#4a5568] hover:bg-[#f7fafc] text-xs h-9 border-[#cbd5e1]"
          >
            <ArrowLeft className="w-3.5 h-3.5 ml-1.5" />
            الرجوع
          </Button>
        </div>
      </div>

      {/* Progress Bar Card */}
      <Card className="border-[#cbd5e1] shadow-sm bg-white">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-[#1a202c] flex items-center gap-2">
              <span>نسبة الإنجاز :</span>
              <span className="text-[#2c5282]">{completedCount} من {totalSteps} خطوات مكتملة</span>
            </span>
            <Badge 
              variant="secondary"
              className={`font-mono text-xs px-2.5 py-0.5 ${
                progressPercent === 100 
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                  : 'bg-[#edf2f7] text-[#2c5282]'
              }`}
            >
              {progressPercent}%
            </Badge>
          </div>

          <div className="w-full bg-[#edf2f7] rounded-full h-3 overflow-hidden">
            <div 
              className="bg-[#2c5282] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {progressPercent === 100 && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg mt-2">
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>تهانينا! لقد اكتملت جميع خطوات تهيئة وتثبيت النظام بنجاح. النظام جاهز للعمل بشكل متكامل.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5 Steps Cards */}
      <div className="space-y-4">
        {STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isStep1 = step.id === 1;

          return (
            <Card
              key={step.id}
              className={`transition-all duration-200 border ${
                isCompleted
                  ? 'bg-[#f7fafc] border-[#cbd5e1]'
                  : 'bg-white border-[#e2e8f0] shadow-sm hover:border-[#2c5282]/40'
              }`}
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleStep(step.id)}
                      className="mt-0.5 sm:mt-0 transition-transform active:scale-95 text-[#2c5282] hover:text-[#1a365d]"
                      title={isCompleted ? 'إلغاء التحديد' : 'تحديد كـ مكتمل'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-6 h-6 text-[#a0aec0] hover:text-[#2c5282]" />
                      )}
                    </button>
                    <div>
                      <CardTitle className="text-base font-bold text-[#1a202c]">
                        {step.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-[#4a5568] mt-1 leading-relaxed">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {isStep1 && isSetupDone && (
                      <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs py-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 ml-1 text-emerald-700" />
                        معالج الإعداد مكتمل
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-xs px-2.5 py-0.5 font-medium ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {isCompleted ? '✅ مكتمل' : '⭕ قيد الإنجاز'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#edf2f7]">
                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {step.actions.map((act, idx) => {
                      const IconComp = act.icon;
                      return (
                        <Button
                          key={idx}
                          variant={act.variant || 'default'}
                          size="sm"
                          onClick={() => navigate(act.path)}
                          className={
                            act.variant === 'outline'
                              ? 'border-[#cbd5e1] text-[#2c5282] hover:bg-[#f7fafc] h-8 text-xs'
                              : 'bg-[#2c5282] hover:bg-[#2a4365] text-white h-8 text-xs'
                          }
                        >
                          {IconComp && <IconComp className="w-3.5 h-3.5 ml-1.5" />}
                          {act.label}
                          <ExternalLink className="w-3 h-3 mr-1.5 opacity-70" />
                        </Button>
                      );
                    })}
                  </div>

                  {/* Toggle completion button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleStep(step.id)}
                    className="text-xs text-[#718096] hover:text-[#2c5282] hover:bg-[#edf2f7] h-8"
                  >
                    {isCompleted ? 'إلغاء التحديد كـ مكتمل' : 'وضع علامة مكتمل'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default InstallationGuidePage;
