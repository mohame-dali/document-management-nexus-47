import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bell,
  Building2,
  Database,
  LogOut,
  MessageCircle,
  Save,
  Scan,
  Shield,
  Sliders,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { useSetupStatus } from '@/hooks/useSetupStatus';
import { updateOrganizationSettings } from '@/services/organizationSettingsService';
import ScannerWorkstationSettings from '@/components/scanner/ScannerWorkstationSettings';
import OrganizationIdentityPanel from '@/components/settings/OrganizationIdentityPanel';
import BackupManagementPanel from '@/components/settings/BackupManagementPanel';
import MessageRetentionPanel from '@/components/settings/MessageRetentionPanel';

type SettingsSectionId =
  | 'organization'
  | 'scanner'
  | 'preferences'
  | 'backup'
  | 'retention'
  | 'notifications';

const VALID_SECTIONS = new Set<SettingsSectionId>([
  'organization',
  'scanner',
  'preferences',
  'backup',
  'retention',
  'notifications',
]);

function normalizeTabParam(rawTab: string | null): SettingsSectionId {
  if (!rawTab) return 'organization';
  if (rawTab === 'security') return 'preferences';
  if (VALID_SECTIONS.has(rawTab as SettingsSectionId)) {
    return rawTab as SettingsSectionId;
  }
  return 'organization';
}

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { settings: orgSettings } = useSetupStatus();
  const { language } = useLanguage();
  const { dir } = useDirection();
  const isRTL = language !== 'fr';

  const rawTabParam = searchParams.get('tab');

  // Legacy ?tab=profile redirects cleanly to My Profile personal account card
  useEffect(() => {
    if (rawTabParam === 'profile') {
      navigate('/dashboard/profile/my-profile', { replace: true });
    }
  }, [rawTabParam, navigate]);

  const [activeSection, setActiveSection] = useState<SettingsSectionId>(() =>
    normalizeTabParam(rawTabParam)
  );

  useEffect(() => {
    if (rawTabParam === 'profile') return;
    const normalized = normalizeTabParam(rawTabParam);
    if (normalized !== activeSection) {
      setActiveSection(normalized);
    }
  }, [rawTabParam, activeSection]);

  const handleSectionChange = (nextSection: SettingsSectionId) => {
    setActiveSection(nextSection);
    const nextParams = new URLSearchParams(searchParams);
    if (nextSection === 'organization') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextSection);
    }
    setSearchParams(nextParams, { replace: true });
  };

  // System & Display preferences
  const [tableDensity, setTableDensity] = useState(
    () => localStorage.getItem('pref_table_density') || 'comfortable'
  );
  const [itemsPerPage, setItemsPerPage] = useState(
    () => localStorage.getItem('pref_items_per_page') || '25'
  );
  const [defaultSortOrder, setDefaultSortOrder] = useState(
    () => localStorage.getItem('pref_sort_order') || 'desc'
  );
  const [autoOpenPdf, setAutoOpenPdf] = useState(
    () => localStorage.getItem('pref_auto_open_pdf') !== 'false'
  );

  // Security & Session Policy states
  const [sessionTimeout, setSessionTimeout] = useState(
    () => localStorage.getItem('app_session_timeout') || '30'
  );
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(
    () => localStorage.getItem('app_max_login_attempts') || '5'
  );
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  useEffect(() => {
    if (orgSettings?.maxLoginAttempts !== undefined && orgSettings.maxLoginAttempts !== null) {
      const valueStr = String(orgSettings.maxLoginAttempts);
      setMaxLoginAttempts(valueStr);
      localStorage.setItem('app_max_login_attempts', valueStr);
    }
  }, [orgSettings?.maxLoginAttempts]);
  const [twoFactorAuth, setTwoFactorAuth] = useState(
    () => localStorage.getItem('app_2fa_enabled') === 'true'
  );
  const [auditLogging, setAuditLogging] = useState(
    () => localStorage.getItem('app_audit_logging') !== 'false'
  );
  const [requireStrongPassword, setRequireStrongPassword] = useState(
    () => localStorage.getItem('app_strong_pwd') !== 'false'
  );
  const [isTerminateSessionsOpen, setIsTerminateSessionsOpen] = useState(false);

  // Notification states
  const [emailNotifications, setEmailNotifications] = useState(
    () => localStorage.getItem('pref_email_notif') !== 'false'
  );
  const [instantAlerts, setInstantAlerts] = useState(
    () => localStorage.getItem('pref_instant_alerts') !== 'false'
  );
  const [deadlineReminders, setDeadlineReminders] = useState(
    () => localStorage.getItem('pref_deadline_alerts') !== 'false'
  );
  const [soundAlerts, setSoundAlerts] = useState(
    () => localStorage.getItem('pref_sound_alerts') === 'true'
  );
  const [dailyDigest, setDailyDigest] = useState(
    () => localStorage.getItem('pref_daily_digest') === 'true'
  );

  const canManageOrg =
    currentUser?.role === 'Admin' || currentUser?.role === 'Director';

  const handleSavePreferencesAndSecurity = async () => {
    localStorage.setItem('pref_table_density', tableDensity);
    localStorage.setItem('pref_items_per_page', itemsPerPage);
    localStorage.setItem('pref_sort_order', defaultSortOrder);
    localStorage.setItem('pref_auto_open_pdf', String(autoOpenPdf));

    localStorage.setItem('app_session_timeout', sessionTimeout);
    localStorage.setItem('app_max_login_attempts', maxLoginAttempts);
    localStorage.setItem('app_2fa_enabled', String(twoFactorAuth));
    localStorage.setItem('app_audit_logging', String(auditLogging));
    localStorage.setItem('app_strong_pwd', String(requireStrongPassword));

    if (canManageOrg) {
      try {
        setIsSavingPreferences(true);
        const parsedAttempts = Number(maxLoginAttempts);
        if (Number.isInteger(parsedAttempts) && parsedAttempts >= 1 && parsedAttempts <= 50) {
          await updateOrganizationSettings({ maxLoginAttempts: parsedAttempts });
          await queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
        }
      } catch (_err) {
        toast.error(
          isRTL
            ? 'تعذر حفظ سياسة محاولات الدخول على الخادم'
            : "Impossible d'enregistrer la politique de tentatives sur le serveur"
        );
        setIsSavingPreferences(false);
        return;
      } finally {
        setIsSavingPreferences(false);
      }
    }

    toast.success(
      isRTL
        ? 'تم حفظ تفضيلات النظام وسياسات الأمان بنجاح'
        : 'Préférences système et politiques de sécurité enregistrées'
    );
  };

  const handleSaveNotificationPreferences = () => {
    localStorage.setItem('pref_email_notif', String(emailNotifications));
    localStorage.setItem('pref_instant_alerts', String(instantAlerts));
    localStorage.setItem('pref_deadline_alerts', String(deadlineReminders));
    localStorage.setItem('pref_sound_alerts', String(soundAlerts));
    localStorage.setItem('pref_daily_digest', String(dailyDigest));
    toast.success(
      isRTL
        ? 'تم حفظ تفضيلات الإشعارات والتنبيهات بنجاح'
        : 'Préférences de notifications enregistrées'
    );
  };

  const handleTerminateAllOtherSessions = () => {
    setIsTerminateSessionsOpen(false);
    toast.success(
      isRTL
        ? 'تم إنهاء جميع الجلسات النشطة الأخرى بنجاح'
        : 'Toutes les autres sessions actives ont été fermées'
    );
  };

  const navGroups: Array<{
    id: string;
    title: string;
    items: Array<{
      id: SettingsSectionId;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
    }>;
  }> = [
    {
      id: 'institution',
      title: isRTL ? 'إعدادات المؤسسة' : "Paramètres de l'institution",
      items: [
        ...(canManageOrg
          ? [
              {
                id: 'organization' as SettingsSectionId,
                label: isRTL ? 'هوية المؤسسة' : "Identité de l'institution",
                icon: Building2,
              },
            ]
          : []),
        {
          id: 'scanner',
          label: isRTL ? 'إعدادات الماسح الضوئي' : 'Scanner & OCR',
          icon: Scan,
        },
        {
          id: 'preferences',
          label: isRTL ? 'تفضيلات النظام' : 'Préférences & Sécurité',
          icon: Sliders,
        },
      ],
    },
    {
      id: 'data',
      title: isRTL ? 'البيانات والأرشفة' : 'Données & Archivage',
      items: [
        {
          id: 'backup',
          label: isRTL ? 'النسخ الاحتياطي' : 'Sauvegardes',
          icon: Database,
        },
        {
          id: 'retention',
          label: isRTL ? 'حفظ الرسائل' : 'Rétention des messages',
          icon: MessageCircle,
        },
        {
          id: 'notifications',
          label: isRTL ? 'الإشعارات' : 'Notifications',
          icon: Bell,
        },
      ],
    },
  ];

  return (
    <div dir={dir} className="w-full max-w-[1400px] mx-auto">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left / Right Vertical Navigation Rail (RTL = Right, LTR = Left) */}
        <aside className="w-full lg:w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-5 lg:sticky lg:top-20">
          {navGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              <p className="px-3 py-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                {group.title}
              </p>
              <nav className="space-y-0.5" aria-label={group.title}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSectionChange(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-start relative',
                        isActive
                          ? 'bg-[#2c5282]/10 dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 font-medium'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0',
                          isActive
                            ? 'text-[#2c5282] dark:text-blue-400'
                            : 'text-slate-500 dark:text-slate-400'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate('/dashboard/profile/my-profile')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-start transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="truncate">
                {isRTL ? 'حسابي وكلمة المرور' : 'Mon compte & mot de passe'}
              </span>
            </button>
          </div>
        </aside>

        {/* Main Content Panel (renders ONLY the active section) */}
        <main className="flex-1 min-w-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-7 shadow-xs">
          {activeSection === 'organization' && canManageOrg && (
            <OrganizationIdentityPanel />
          )}

          {activeSection === 'scanner' && (
            <div className="space-y-6">
              <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {isRTL
                    ? 'إعدادات الماسح الضوئي والتعرف الضوئي (OCR)'
                    : 'Station de numérisation & OCR'}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {isRTL
                    ? 'ضبط الدقة الافتراضية، وضع الألوان، وحدة التغذية التلقائية (ADF)، ولغات OCR الخاصة بهذا الجهاز.'
                    : 'Configurez la résolution, le mode couleur, le chargeur ADF et les langues OCR pour ce poste.'}
                </p>
              </div>
              <ScannerWorkstationSettings compact />
            </div>
          )}

          {activeSection === 'preferences' && (
            <div className="space-y-8">
              <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {isRTL ? 'تفضيلات النظام وسياسات الأمان' : 'Préférences système et sécurité'}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {isRTL
                    ? 'ضبط طريقة عرض الجداول والمستندات، ومهلة الجلسات وضوابط الأمان العامة.'
                    : "Réglez l'affichage des tableaux, l'ouverture PDF et les politiques de session."}
                </p>
              </div>

              {/* Display Preferences */}
              <div className="space-y-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#2c5282] dark:text-blue-400" />
                  <span>{isRTL ? 'تفضيلات العرض' : "Préférences d'affichage"}</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pref-density" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {isRTL ? 'كثافة جداول الوثائق' : 'Densité des tableaux'}
                    </Label>
                    <Select value={tableDensity} onValueChange={setTableDensity}>
                      <SelectTrigger id="pref-density" className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comfortable">{isRTL ? 'مريح (مسافات واسعة)' : 'Confortable'}</SelectItem>
                        <SelectItem value="standard">{isRTL ? 'قياسي (متوازن)' : 'Standard'}</SelectItem>
                        <SelectItem value="compact">{isRTL ? 'مدمج (كثافة عالية)' : 'Compact'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pref-items-per-page" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {isRTL ? 'عدد العناصر في الصفحة' : 'Éléments par page'}
                    </Label>
                    <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                      <SelectTrigger id="pref-items-per-page" className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">{isRTL ? '10 عناصر' : '10 éléments'}</SelectItem>
                        <SelectItem value="25">{isRTL ? '25 عنصراً (موصى به)' : '25 éléments (recommandé)'}</SelectItem>
                        <SelectItem value="50">{isRTL ? '50 عنصراً' : '50 éléments'}</SelectItem>
                        <SelectItem value="100">{isRTL ? '100 عنصر' : '100 éléments'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pref-sort-order" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {isRTL ? 'الترتيب الافتراضي للمراسلات' : 'Tri par défaut'}
                    </Label>
                    <Select value={defaultSortOrder} onValueChange={setDefaultSortOrder}>
                      <SelectTrigger id="pref-sort-order" className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">{isRTL ? 'الأحدث تسجيلاً أولاً' : 'Plus récents en premier'}</SelectItem>
                        <SelectItem value="asc">{isRTL ? 'الأقدم تسجيلاً أولاً' : 'Plus anciens en premier'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div>
                    <Label htmlFor="pref-auto-open" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                      {isRTL ? 'معاينة الـ PDF تلقائياً' : 'Aperçu PDF automatique'}
                    </Label>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {isRTL
                        ? 'فتح ملف الوثيقة الممسوحة مباشرة عند النقر على السجل'
                        : "Ouvrir automatiquement le PDF numérisé à l'ouverture d'un dossier"}
                    </p>
                  </div>
                  <Switch
                    id="pref-auto-open"
                    checked={autoOpenPdf}
                    onCheckedChange={setAutoOpenPdf}
                  />
                </div>
              </div>

              {/* System Security Policies */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#2c5282] dark:text-blue-400" />
                  <span>{isRTL ? 'سياسات الأمان والجلسات' : 'Politiques de sécurité et sessions'}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="session-timeout" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {isRTL ? 'مهلة انتهاء الجلسة عند عدم النشاط' : "Expiration de session d'inactivité"}
                    </Label>
                    <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                      <SelectTrigger id="session-timeout" className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">{isRTL ? '15 دقيقة' : '15 minutes'}</SelectItem>
                        <SelectItem value="30">{isRTL ? '30 دقيقة (موصى به)' : '30 minutes (recommandé)'}</SelectItem>
                        <SelectItem value="60">{isRTL ? 'ساعة واحدة' : '1 heure'}</SelectItem>
                        <SelectItem value="120">{isRTL ? 'ساعتان' : '2 heures'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="max-login-attempts" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {isRTL ? 'الحد الأقصى لمحاولات الدخول الخاطئة' : 'Tentatives de connexion maximales'}
                    </Label>
                    <Select value={maxLoginAttempts} onValueChange={setMaxLoginAttempts}>
                      <SelectTrigger id="max-login-attempts" className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">{isRTL ? '3 محاولات' : '3 tentatives'}</SelectItem>
                        <SelectItem value="5">{isRTL ? '5 محاولات (قياسي)' : '5 tentatives (standard)'}</SelectItem>
                        <SelectItem value="10">{isRTL ? '10 محاولات' : '10 tentatives'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                    <div>
                      <Label htmlFor="require-strong-pwd" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                        {isRTL ? 'فرض كلمات مرور قوية ومعقدة' : 'Exiger des mots de passe robustes'}
                      </Label>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {isRTL
                          ? 'إلزام المستخدمين بكلمات مرور تحتوي على حروف وأرقام ورموز'
                          : 'Imposer majuscules, minuscules, chiffres et caractères spéciaux'}
                      </p>
                    </div>
                    <Switch
                      id="require-strong-pwd"
                      checked={requireStrongPassword}
                      onCheckedChange={setRequireStrongPassword}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                    <div>
                      <Label htmlFor="audit-logging" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                        {isRTL ? 'سجل المراقبة والتدقيق الأمني' : "Journalisation d'audit"}
                      </Label>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {isRTL
                          ? 'تسجيل كافة عمليات الدخول وتعديلات الوثائق في سجل التدقيق'
                          : 'Enregistrer les connexions et modifications de documents'}
                      </p>
                    </div>
                    <Switch
                      id="audit-logging"
                      checked={auditLogging}
                      onCheckedChange={setAuditLogging}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                    <div>
                      <Label htmlFor="2fa-toggle" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                        {isRTL ? 'التحقق بخطوتين (2FA)' : 'Authentification à deux facteurs (2FA)'}
                      </Label>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {isRTL
                          ? 'طلب رمز تحقق إضافي عند الدخول من جهاز غير معروف'
                          : "Exiger un code supplémentaire depuis un nouvel appareil"}
                      </p>
                    </div>
                    <Switch
                      id="2fa-toggle"
                      checked={twoFactorAuth}
                      onCheckedChange={setTwoFactorAuth}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsTerminateSessionsOpen(true)}
                    className="h-10 px-4 text-sm font-semibold border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg gap-2 whitespace-nowrap"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{isRTL ? 'إنهاء جميع الجلسات الأخرى' : 'Fermer les autres sessions'}</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleSavePreferencesAndSecurity}
                    disabled={isSavingPreferences}
                    className="h-10 px-6 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg gap-2 whitespace-nowrap"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isRTL ? 'حفظ التفضيلات والأمان' : 'Enregistrer'}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'backup' && <BackupManagementPanel />}

          {activeSection === 'retention' && (
            <MessageRetentionPanel onOpenBackup={() => handleSectionChange('backup')} />
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {isRTL ? 'قنوات وتفضيلات الإشعارات' : 'Canaux et préférences de notifications'}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {isRTL
                    ? 'تخصيص التنبيهات الفورية وتنبيهات المواعيد وإشعارات البريد الإلكتروني.'
                    : 'Personnalisez les alertes en temps réel, rappels de délais et notifications.'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div>
                    <Label htmlFor="instant-alerts" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                      {isRTL ? 'إشعارات فورية على الشاشة' : "Notifications instantanées à l'écran"}
                    </Label>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {isRTL
                        ? 'إظهار تنبيهات منبثقة عند استلام معاملات أو توجيهات جديدة'
                        : 'Afficher une notification à la réception de nouveaux courriers'}
                    </p>
                  </div>
                  <Switch
                    id="instant-alerts"
                    checked={instantAlerts}
                    onCheckedChange={setInstantAlerts}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div>
                    <Label htmlFor="deadline-reminders" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                      {isRTL ? 'تنبيهات مواعيد المعالجة والتأخيرات' : 'Rappels de délais et retards'}
                    </Label>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {isRTL
                        ? 'تنبيه عند اقتراب المهلة المحددة للرد على المعاملات الواردة'
                        : "Alerter à l'approche des échéances de traitement"}
                    </p>
                  </div>
                  <Switch
                    id="deadline-reminders"
                    checked={deadlineReminders}
                    onCheckedChange={setDeadlineReminders}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div>
                    <Label htmlFor="email-notifications" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                      {isRTL ? 'إشعارات البريد الإلكتروني' : 'Notifications par e-mail'}
                    </Label>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {isRTL
                        ? 'إرسال إشعار بريدي عند إسناد وثيقة أو إحالتها إلى قسمك'
                        : "Envoyer un e-mail lors de l'attribution d'un document"}
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div>
                    <Label htmlFor="sound-alerts" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                      {isRTL ? 'التنبيه الصوتي' : 'Alerte sonore'}
                    </Label>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {isRTL
                        ? 'تشغيل نغمة تنبيه هادئة عند ورود رسالة داخلية جديدة'
                        : "Jouer un son discret à la réception d'un message"}
                    </p>
                  </div>
                  <Switch
                    id="sound-alerts"
                    checked={soundAlerts}
                    onCheckedChange={setSoundAlerts}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div>
                    <Label htmlFor="daily-digest" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                      {isRTL ? 'التقرير الصباحي اليومي' : 'Résumé quotidien du matin'}
                    </Label>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {isRTL
                        ? 'تلقي ملخص يومي في بداية الدوام بجميع المعاملات المعلقة'
                        : 'Recevoir un récapitulatif matinal des dossiers en attente'}
                    </p>
                  </div>
                  <Switch
                    id="daily-digest"
                    checked={dailyDigest}
                    onCheckedChange={setDailyDigest}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <Button
                  type="button"
                  onClick={handleSaveNotificationPreferences}
                  className="h-10 px-6 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg gap-2 whitespace-nowrap"
                >
                  <Save className="h-4 w-4" />
                  <span>{isRTL ? 'حفظ تفضيلات الإشعارات' : 'Enregistrer'}</span>
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Terminate Other Sessions Modal */}
      <AlertDialog open={isTerminateSessionsOpen} onOpenChange={setIsTerminateSessionsOpen}>
        <AlertDialogContent
          dir={dir}
          className="w-[95vw] sm:max-w-[520px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <AlertDialogHeader className="text-start">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center justify-center mb-2">
              <LogOut className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isRTL ? 'تأكيد إنهاء الجلسات النشطة الأخرى' : 'Fermer les autres sessions'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
              {isRTL
                ? 'سيتم تسجيل الخروج من كافة الأجهزة والمتصفحات الأخرى المسجل الدخول إليها بحسابك، مع الإبقاء على الجلسة الحالية فقط.'
                : 'Toutes les autres sessions actives sur vos autres appareils seront fermées.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <AlertDialogCancel className="h-10 px-5 rounded-lg border-slate-300 dark:border-slate-700 text-sm">
              {isRTL ? 'إلغاء' : 'Annuler'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTerminateAllOtherSessions}
              className="h-10 px-6 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
            >
              {isRTL ? 'تأكيد إنهاء الجلسات' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
