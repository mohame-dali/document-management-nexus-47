import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Search,
  Inbox,
  Send,
  UserCheck,
  Users,
  Loader2,
  X,
  FileText,
  CornerDownLeft,
  Compass,
  LayoutDashboard,
  FolderOpen,
  CalendarCheck,
  GraduationCap,
  MessageCircle,
  Network,
  Trash2,
  ClipboardList,
  Plus,
  Zap,
  Info,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useAuth } from '@/contexts/AuthContext';
import { getOrganizationSettings } from '@/services/hr/personnelApi';
import { isExecutiveDashboardUser } from '@/utils/roleUtils';

interface IncomingSearchResult {
  _id: string;
  serialNumber: number;
  year: number;
  subject: string;
  correspondenceNumber?: string;
  arrivalDate?: string;
  typeDocument?: string;
}

interface OutgoingSearchResult {
  _id: string;
  serialNumber: number;
  year: number;
  subject: string;
  issueDate?: string;
  typeDocument?: string;
}

interface PersonnelSearchResult {
  _id: string;
  nom: string;
  prenom: string;
  cin?: string;
  poste?: string;
  activeDepartment?: {
    _id?: string;
    name?: string;
  };
  statut?: string;
}

interface UserSearchResult {
  _id: string;
  username: string;
  role: string;
  activeDepartment?: {
    _id?: string;
    name?: string;
  };
}

interface SearchResultsData {
  incoming: IncomingSearchResult[];
  outgoing: OutgoingSearchResult[];
  personnel: PersonnelSearchResult[];
  users: UserSearchResult[];
}

interface QuickAccessItem {
  id: string;
  url: string;
  labelAr: string;
  labelFr: string;
  badgeAr: string;
  badgeFr: string;
  keywords: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavigableItem {
  id: string;
  url: string;
}

interface QuickActionShortcut {
  id: string;
  url: string;
  labelAr: string;
  labelFr: string;
  badgeAr: string;
  badgeFr: string;
  tone: 'primary' | 'emerald' | 'slate';
  icon: React.ComponentType<{ className?: string }>;
}

const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const isRtl = language !== 'fr';

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Check HR access matching Sidebar rules
  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(currentUser),
  });

  const rhDepartmentId =
    typeof orgSettings?.rhDepartmentId === 'object' && orgSettings?.rhDepartmentId !== null
      ? (orgSettings.rhDepartmentId as { _id?: string })._id
      : orgSettings?.rhDepartmentId;

  const userActiveDeptId =
    typeof currentUser?.activeDepartment === 'object'
      ? currentUser?.activeDepartment?._id
      : currentUser?.activeDepartment;

  const canAccessHR =
    currentUser?.role === 'Director' ||
    currentUser?.role === 'Admin' ||
    (currentUser?.role === 'AdminDepartment' &&
      Boolean(rhDepartmentId) &&
      Boolean(userActiveDeptId) &&
      String(userActiveDeptId) === String(rhDepartmentId));

  // Listen for Ctrl+K / Cmd+K open event
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-global-search', handleOpen);
    return () => window.removeEventListener('open-global-search', handleOpen);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  // Debounce 250ms
  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedQuery(searchTerm.trim());
    }, 250);
    return () => window.clearTimeout(handler);
  }, [searchTerm]);

  // Query search endpoint
  const { data, isLoading, isFetching } = useQuery<SearchResultsData>({
    queryKey: ['globalSearch', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) {
        return { incoming: [], outgoing: [], personnel: [], users: [] };
      }
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/search', {
        params: { q: debouncedQuery },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = res.data?.data || res.data || {};
      return {
        incoming: Array.isArray(payload.incoming) ? payload.incoming : [],
        outgoing: Array.isArray(payload.outgoing) ? payload.outgoing : [],
        personnel: Array.isArray(payload.personnel) ? payload.personnel : [],
        users: Array.isArray(payload.users) ? payload.users : [],
      };
    },
    enabled: isOpen && debouncedQuery.length >= 2,
    staleTime: 1000 * 30,
  });

  // Role-filtered Quick Access destinations
  const quickAccessAll: QuickAccessItem[] = useMemo(() => {
    const role = currentUser?.role;
    const canAccessDashboard = isExecutiveDashboardUser(currentUser);
    const items: QuickAccessItem[] = [
      ...(canAccessDashboard
        ? [
            {
              id: 'qa-dashboard',
              url: '/dashboard',
              labelAr: 'لوحة التحكم الرئيسية',
              labelFr: 'Tableau de bord principal',
              badgeAr: 'الرئيسية',
              badgeFr: 'Accueil',
              keywords: 'dashboard home accueil لوحة التحكم الرئيسية',
              icon: LayoutDashboard,
            },
          ]
        : []),
      {
        id: 'qa-incoming',
        url: '/dashboard/mail/incoming',
        labelAr: 'المراسلات الواردة',
        labelFr: 'Courriers entrants',
        badgeAr: 'وارد',
        badgeFr: 'Entrants',
        keywords: 'incoming mail courrier entrant المراسلات الواردة البريد الوارد',
        icon: Inbox,
      },
      {
        id: 'qa-outgoing',
        url: '/dashboard/mail/outgoing',
        labelAr: 'المراسلات الصادرة',
        labelFr: 'Courriers sortants',
        badgeAr: 'صادر',
        badgeFr: 'Sortants',
        keywords: 'outgoing mail courrier sortant المراسلات الصادرة البريد الصادر',
        icon: Send,
      },
      {
        id: 'qa-folders',
        url: '/dashboard/folders',
        labelAr: 'المجلدات والأرشيف',
        labelFr: 'Dossiers et archives',
        badgeAr: 'مجلدات',
        badgeFr: 'Dossiers',
        keywords: 'folders dossiers archives المجلدات الأرشيف',
        icon: FolderOpen,
      },
      {
        id: 'qa-advanced-search',
        url: '/dashboard/mail/search',
        labelAr: 'البحث المتقدم في الوثائق',
        labelFr: 'Recherche avancée',
        badgeAr: 'بحث',
        badgeFr: 'Recherche',
        keywords: 'advanced search ocr بحث متقدم',
        icon: Search,
      },
      {
        id: 'qa-messages',
        url: '/dashboard/messages',
        labelAr: 'الرسائل الداخلية',
        labelFr: 'Messagerie interne',
        badgeAr: 'رسائل',
        badgeFr: 'Messages',
        keywords: 'messages chat inbox الرسائل المراسلات الداخلية',
        icon: MessageCircle,
      },
      {
        id: 'qa-my-attendance',
        url: '/dashboard/profile/my-attendance',
        labelAr: 'سجل حضوري ورصيدي',
        labelFr: 'Mon suivi de présence',
        badgeAr: 'حضور',
        badgeFr: 'Présence',
        keywords: 'my attendance leave balance حضوري رصيد إجازات',
        icon: CalendarCheck,
      },
      {
        id: 'qa-org-chart',
        url: '/dashboard/admin/organization-chart',
        labelAr: 'الهيكل التنظيمي',
        labelFr: 'Organigramme',
        badgeAr: 'الهيكل',
        badgeFr: 'Structure',
        keywords: 'organization chart organigramme الهيكل التنظيمي',
        icon: Network,
      },
    ];

    if (canAccessHR) {
      items.push(
        {
          id: 'qa-personnel',
          url: '/dashboard/hr/personnel',
          labelAr: 'إدارة الموظفين',
          labelFr: 'Gestion du personnel',
          badgeAr: 'الموظفون',
          badgeFr: 'RH',
          keywords: 'personnel employees hr الموظفون الموارد البشرية',
          icon: UserCheck,
        },
        {
          id: 'qa-attendance',
          url: '/dashboard/hr/attendance',
          labelAr: 'ورقة الحضور اليومي',
          labelFr: 'Registre de présence',
          badgeAr: 'الحضور',
          badgeFr: 'Présence',
          keywords: 'attendance daily presence الحضور اليومي',
          icon: ClipboardList,
        },
        {
          id: 'qa-stages',
          url: '/dashboard/hr/stages',
          labelAr: 'التربصات والتكوين',
          labelFr: 'Stages et formations',
          badgeAr: 'تربصات',
          badgeFr: 'Stages',
          keywords: 'stages internships formations التربصات التكوين',
          icon: GraduationCap,
        }
      );
    }

    if (role === 'Admin' || role === 'Director') {
      items.push({
        id: 'qa-users',
        url: '/dashboard/admin/users',
        labelAr: 'حسابات المستخدمين',
        labelFr: 'Comptes utilisateurs',
        badgeAr: 'إدارة',
        badgeFr: 'Admin',
        keywords: 'users accounts utilisateurs المستخدمون الحسابات',
        icon: Users,
      });
    }

    if (role && ['Admin', 'AdminTuningDesk', 'AdminDepartment'].includes(role)) {
      items.push({
        id: 'qa-trash',
        url: '/dashboard/trash',
        labelAr: 'سلة المحذوفات',
        labelFr: 'Corbeille',
        badgeAr: 'محذوفات',
        badgeFr: 'Corbeille',
        keywords: 'trash corbeille سلة المحذوفات المهملات',
        icon: Trash2,
      });
    }

    return items;
  }, [currentUser, canAccessHR]);

  const canCreateMail =
    currentUser?.role === 'Admin' || currentUser?.role === 'AdminTuningDesk';

  // Top 1-click Quick-Action Shortcuts shown when query is empty
  const quickActionShortcuts: QuickActionShortcut[] = useMemo(() => {
    const actions: QuickActionShortcut[] = [];
    if (canCreateMail) {
      actions.push(
        {
          id: 'act-create-incoming',
          url: '/dashboard/mail/incoming/create',
          labelAr: '+ تسجيل مراسلة واردة جديدة',
          labelFr: '+ Enregistrer un courrier entrant',
          badgeAr: 'جديد',
          badgeFr: 'Nouveau',
          tone: 'primary',
          icon: Plus,
        },
        {
          id: 'act-create-outgoing',
          url: '/dashboard/mail/outgoing/create',
          labelAr: '+ تسجيل مراسلة صادرة جديدة',
          labelFr: '+ Enregistrer un courrier sortant',
          badgeAr: 'جديد',
          badgeFr: 'Nouveau',
          tone: 'emerald',
          icon: Plus,
        }
      );
    }
    actions.push(
      {
        id: 'act-mail-incoming',
        url: '/dashboard/mail/incoming',
        labelAr: 'البريد الوارد',
        labelFr: 'Courriers entrants',
        badgeAr: 'الوارد',
        badgeFr: 'Entrants',
        tone: 'slate',
        icon: Inbox,
      },
      {
        id: 'act-mail-outgoing',
        url: '/dashboard/mail/outgoing',
        labelAr: 'البريد الصادر',
        labelFr: 'Courriers sortants',
        badgeAr: 'الصادر',
        badgeFr: 'Sortants',
        tone: 'slate',
        icon: Send,
      }
    );
    return actions;
  }, [canCreateMail]);

  const showQuickActions = searchTerm.trim().length === 0;

  const filteredQuickAccess = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return quickAccessAll
        .filter((item) => item.id !== 'qa-incoming' && item.id !== 'qa-outgoing')
        .slice(0, 5);
    }
    return quickAccessAll.filter(
      (item) =>
        item.labelAr.toLowerCase().includes(q) ||
        item.labelFr.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q)
    );
  }, [quickAccessAll, searchTerm]);

  const results = useMemo(
    () =>
      debouncedQuery.length >= 2 && data
        ? data
        : { incoming: [], outgoing: [], personnel: [], users: [] },
    [data, debouncedQuery]
  );

  const flatItems: NavigableItem[] = useMemo(() => {
    const list: NavigableItem[] = [];
    if (showQuickActions) {
      quickActionShortcuts.forEach((act) =>
        list.push({ id: act.id, url: act.url })
      );
    }
    results.incoming.forEach((doc) =>
      list.push({ id: `inc-${doc._id}`, url: `/dashboard/mail/incoming/${doc._id}` })
    );
    results.outgoing.forEach((doc) =>
      list.push({ id: `out-${doc._id}`, url: `/dashboard/mail/outgoing/${doc._id}` })
    );
    results.personnel.forEach((p) =>
      list.push({ id: `pers-${p._id}`, url: `/dashboard/hr/personnel/${p._id}` })
    );
    results.users.forEach((u) =>
      list.push({ id: `usr-${u._id}`, url: '/dashboard/admin/users' })
    );
    filteredQuickAccess.forEach((qa) =>
      list.push({ id: qa.id, url: qa.url })
    );
    return list;
  }, [showQuickActions, quickActionShortcuts, results, filteredQuickAccess]);

  const itemIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    flatItems.forEach((item, index) => map.set(item.id, index));
    return map;
  }, [flatItems]);

  // Clamp activeIndex whenever list length changes
  useEffect(() => {
    if (flatItems.length === 0) {
      setActiveIndex(0);
    } else if (activeIndex >= flatItems.length) {
      setActiveIndex(0);
    }
  }, [flatItems.length, activeIndex]);

  // Keep active row scrolled into view
  useEffect(() => {
    const activeItem = flatItems[activeIndex];
    if (!activeItem) return;
    const node = itemRefs.current[activeItem.id];
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, flatItems]);

  const handleSelect = useCallback(
    (url: string) => {
      setIsOpen(false);
      setSearchTerm('');
      navigate(url);
    },
    [navigate]
  );

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatItems.length > 0) {
        setActiveIndex((prev) => (prev + 1) % flatItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatItems.length > 0) {
        setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      }
    } else if (e.key === 'Enter') {
      const target = flatItems[activeIndex];
      if (target) {
        e.preventDefault();
        handleSelect(target.url);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const remoteCount =
    results.incoming.length +
    results.outgoing.length +
    results.personnel.length +
    results.users.length;
  const showLoading = debouncedQuery.length >= 2 && (isLoading || isFetching);

  return (
    <div className="relative w-full" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header Trigger Pill */}
      <button
        id="global-search-trigger"
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative flex items-center justify-between h-9 w-full ps-9 pe-2.5 text-xs bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors rounded-full text-slate-600 dark:text-slate-300 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]"
        aria-label={isRtl ? 'فتح البحث الشامل (Ctrl+K)' : 'Ouvrir la recherche globale (Ctrl+K)'}
      >
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-300 pointer-events-none select-none" />
        <span className="truncate font-medium">
          {isRtl ? 'بحث شامل في النظام...' : 'Recherche globale...'}
        </span>
        <kbd
          dir="ltr"
          className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[12px] leading-none font-mono font-semibold text-slate-600 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-full shadow-2xs pointer-events-none select-none tabular-nums shrink-0"
        >
          <span>Ctrl</span>K
        </kbd>
      </button>

      {/* Command Palette Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          dir={isRtl ? 'rtl' : 'ltr'}
          className="p-0 gap-0 w-[95vw] sm:max-w-[620px] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl [&>button]:hidden print:hidden"
        >
          <DialogTitle className="sr-only">
            {isRtl ? 'البحث الشامل والوصول السريع' : 'Recherche globale et accès rapide'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isRtl
              ? 'ابحث في المراسلات الواردة والصادرة والموظفين أو انتقل بسرعة بين الصفحات'
              : 'Recherchez dans les courriers entrants, sortants, personnel ou accédez rapidement aux modules'}
          </DialogDescription>

          {/* Search Input Header */}
          <div className="relative flex items-center border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-slate-50/70 dark:bg-slate-900">
            <Search className="h-4 w-4 text-[#2c5282] dark:text-blue-400 shrink-0 me-2.5" />
            <Input
              id="global-search-input"
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder={
                isRtl
                  ? 'ابحث برقم المراسلة، الموضوع، ب.ت.و، اسم الموظف أو صفحة...'
                  : 'Rechercher par n° courrier, objet, CIN, employé ou page...'
              }
              autoComplete="off"
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-8 px-0 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <div className="flex items-center gap-1.5 shrink-0 ms-2">
              {showLoading && <Loader2 className="w-4 h-4 animate-spin text-[#2c5282] dark:text-blue-400" />}
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveIndex(0);
                    inputRef.current?.focus();
                  }}
                  className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded transition-colors"
                  aria-label={isRtl ? 'مسح البحث' : 'Effacer'}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2 py-0.5 text-[13px] leading-tight font-mono font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                ESC
              </button>
            </div>
          </div>

          {/* Search Capabilities Helper Hint */}
          <div className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/70 px-3 py-1.5 flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300">
            <Info className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400 shrink-0" />
            <span className="leading-snug">
              {isRtl
                ? 'يمكنك البحث برقم المراسلة (#2/2026)، اسم المرسل أو المرسل إليه، أو النص المستخرج من ملفات PDF الممسوحة ضوئياً.'
                : 'Recherchez par référence (#2/2026), nom d’expéditeur/destinataire, ou texte extrait d’un PDF numérisé.'}
            </span>
          </div>

          {/* Categorized Results List */}
          <div className="max-h-[430px] overflow-y-auto custom-scrollbar p-2.5 space-y-3 text-start">
            {/* 0. إجراءات سريعة (تظهر عند فتح البحث بدون نص) */}
            {showQuickActions && quickActionShortcuts.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2.5 py-1.5 text-[13px] font-bold text-[#1e3a5f] dark:text-blue-300 bg-blue-50/75 dark:bg-blue-950/40 rounded-md">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#2c5282] dark:text-blue-400" />
                    {isRtl ? 'إجراءات سريعة' : 'Actions rapides'}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[12px] leading-tight px-1.5 py-0 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 text-[#2c5282] dark:text-blue-300 tabular-nums"
                  >
                    <bdi dir="ltr">{quickActionShortcuts.length}</bdi>
                  </Badge>
                </div>
                <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {quickActionShortcuts.map((act) => {
                    const idx = itemIndexMap.get(act.id) ?? -1;
                    const isActive = idx === activeIndex;
                    const Icon = act.icon;
                    const toneIconClass =
                      act.tone === 'primary'
                        ? 'text-[#2c5282] dark:text-blue-400 bg-blue-100/80 dark:bg-blue-900/50'
                        : act.tone === 'emerald'
                          ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/50'
                          : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800';
                    return (
                      <button
                        key={act.id}
                        ref={(el) => {
                          itemRefs.current[act.id] = el;
                        }}
                        type="button"
                        onMouseEnter={() => idx >= 0 && setActiveIndex(idx)}
                        onClick={() => handleSelect(act.url)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-start border transition-colors ${
                          isActive
                            ? 'bg-blue-50/85 dark:bg-blue-950/45 border-[#2c5282]/35 dark:border-blue-500/45'
                            : 'border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded shrink-0 ${toneIconClass}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {isRtl ? act.labelAr : act.labelFr}
                          </span>
                        </div>
                        <CornerDownLeft
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-[#2c5282] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {showLoading && remoteCount === 0 && (
              <div className="py-5 flex items-center justify-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin text-[#2c5282] dark:text-blue-400" />
                <span>{isRtl ? 'جاري البحث في النظام...' : 'Recherche en cours...'}</span>
              </div>
            )}

            {!showLoading && debouncedQuery.length >= 2 && flatItems.length === 0 && (
              <div className="py-8 text-center space-y-1.5">
                <FileText className="w-8 h-8 text-slate-500 dark:text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {isRtl ? 'لا توجد نتائج مطابقة' : 'Aucun résultat trouvé'}
                </p>
                <p className="text-[13px] text-slate-700 dark:text-slate-300">
                  {isRtl
                    ? `لم نتمكن من العثور على أي نتيجة تطابق "${debouncedQuery}"`
                    : `Aucune correspondance pour "${debouncedQuery}"`}
                </p>
              </div>
            )}

            {/* 1. المراسلات الواردة */}
            {results.incoming.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2.5 py-1.5 text-[13px] font-bold text-[#1e3a5f] dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 rounded-md">
                  <span className="flex items-center gap-1.5">
                    <Inbox className="w-3.5 h-3.5 text-[#2c5282] dark:text-blue-400" />
                    {isRtl ? 'المراسلات الواردة' : 'Courriers entrants'}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[13px] leading-tight px-1.5 py-0 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 text-[#2c5282] dark:text-blue-300 tabular-nums"
                  >
                    <bdi dir="ltr">{results.incoming.length}</bdi>
                  </Badge>
                </div>
                <div className="mt-1 space-y-0.5">
                  {results.incoming.map((doc) => {
                    const key = `inc-${doc._id}`;
                    const idx = itemIndexMap.get(key) ?? -1;
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={key}
                        ref={(el) => {
                          itemRefs.current[key] = el;
                        }}
                        type="button"
                        onMouseEnter={() => idx >= 0 && setActiveIndex(idx)}
                        onClick={() => handleSelect(`/dashboard/mail/incoming/${doc._id}`)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-start transition-colors ${
                          isActive
                            ? 'bg-blue-50/90 dark:bg-blue-950/50 ring-1 ring-[#2c5282]/30 dark:ring-blue-500/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[13px] leading-tight font-mono font-bold bg-blue-100/80 dark:bg-blue-900/50 text-[#2c5282] dark:text-blue-300 tabular-nums shrink-0">
                              <bdi dir="ltr">#{doc.serialNumber}/{doc.year}</bdi>
                            </span>
                            <span className="truncate">{doc.subject}</span>
                          </div>
                          {doc.correspondenceNumber && (
                            <p className="text-[13px] text-slate-700 dark:text-slate-300 truncate mt-0.5 tabular-nums">
                              {isRtl ? 'رقم الإرسالية: ' : 'Réf : '}
                              <bdi dir="ltr">{doc.correspondenceNumber}</bdi>
                            </p>
                          )}
                        </div>
                        <CornerDownLeft
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-[#2c5282] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. المراسلات الصادرة */}
            {results.outgoing.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2.5 py-1.5 text-[13px] font-bold text-emerald-900 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-md">
                  <span className="flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    {isRtl ? 'المراسلات الصادرة' : 'Courriers sortants'}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[13px] leading-tight px-1.5 py-0 bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 tabular-nums"
                  >
                    <bdi dir="ltr">{results.outgoing.length}</bdi>
                  </Badge>
                </div>
                <div className="mt-1 space-y-0.5">
                  {results.outgoing.map((doc) => {
                    const key = `out-${doc._id}`;
                    const idx = itemIndexMap.get(key) ?? -1;
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={key}
                        ref={(el) => {
                          itemRefs.current[key] = el;
                        }}
                        type="button"
                        onMouseEnter={() => idx >= 0 && setActiveIndex(idx)}
                        onClick={() => handleSelect(`/dashboard/mail/outgoing/${doc._id}`)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-start transition-colors ${
                          isActive
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/45 ring-1 ring-emerald-500/35'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[13px] leading-tight font-mono font-bold bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 tabular-nums shrink-0">
                              <bdi dir="ltr">#{doc.serialNumber}/{doc.year}</bdi>
                            </span>
                            <span className="truncate">{doc.subject}</span>
                          </div>
                          {doc.typeDocument && (
                            <p className="text-[13px] text-slate-700 dark:text-slate-300 truncate mt-0.5">
                              {doc.typeDocument}
                            </p>
                          )}
                        </div>
                        <CornerDownLeft
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. الموظفون */}
            {results.personnel.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2.5 py-1.5 text-[13px] font-bold text-purple-900 dark:text-purple-300 bg-purple-50/80 dark:bg-purple-950/40 rounded-md">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    {isRtl ? 'الموظفون' : 'Personnel RH'}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[13px] leading-tight px-1.5 py-0 bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 tabular-nums"
                  >
                    <bdi dir="ltr">{results.personnel.length}</bdi>
                  </Badge>
                </div>
                <div className="mt-1 space-y-0.5">
                  {results.personnel.map((p) => {
                    const key = `pers-${p._id}`;
                    const idx = itemIndexMap.get(key) ?? -1;
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={key}
                        ref={(el) => {
                          itemRefs.current[key] = el;
                        }}
                        type="button"
                        onMouseEnter={() => idx >= 0 && setActiveIndex(idx)}
                        onClick={() => handleSelect(`/dashboard/hr/personnel/${p._id}`)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-start transition-colors ${
                          isActive
                            ? 'bg-purple-50/90 dark:bg-purple-950/45 ring-1 ring-purple-500/35'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {p.nom} {p.prenom}
                            </span>
                            {p.cin && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[13px] leading-tight font-mono font-semibold bg-purple-100/80 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 tabular-nums shrink-0">
                                <bdi dir="ltr">{p.cin}</bdi>
                              </span>
                            )}
                          </div>
                          {(p.poste || p.activeDepartment?.name) && (
                            <p className="text-[13px] text-slate-700 dark:text-slate-300 truncate mt-0.5">
                              {[p.poste, p.activeDepartment?.name].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        <CornerDownLeft
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Optional: حسابات المستخدمين */}
            {results.users.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2.5 py-1.5 text-[13px] font-bold text-amber-900 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 rounded-md">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    {isRtl ? 'حسابات المستخدمين' : 'Comptes utilisateurs'}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[13px] leading-tight px-1.5 py-0 bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 tabular-nums"
                  >
                    <bdi dir="ltr">{results.users.length}</bdi>
                  </Badge>
                </div>
                <div className="mt-1 space-y-0.5">
                  {results.users.map((u) => {
                    const key = `usr-${u._id}`;
                    const idx = itemIndexMap.get(key) ?? -1;
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={key}
                        ref={(el) => {
                          itemRefs.current[key] = el;
                        }}
                        type="button"
                        onMouseEnter={() => idx >= 0 && setActiveIndex(idx)}
                        onClick={() => handleSelect('/dashboard/admin/users')}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-start transition-colors ${
                          isActive
                            ? 'bg-amber-50/90 dark:bg-amber-950/45 ring-1 ring-amber-500/35'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                              <bdi dir="ltr">@{u.username}</bdi>
                            </span>
                            <Badge variant="secondary" className="text-[13px] leading-tight py-0 px-1.5 font-medium">
                              {u.role}
                            </Badge>
                          </div>
                          {u.activeDepartment?.name && (
                            <p className="text-[13px] text-slate-700 dark:text-slate-300 truncate mt-0.5">
                              {u.activeDepartment.name}
                            </p>
                          )}
                        </div>
                        <CornerDownLeft
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. الوصول السريع */}
            {filteredQuickAccess.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2.5 py-1.5 text-[13px] font-bold text-slate-800 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-800/80 rounded-md">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-[#2c5282] dark:text-blue-400" />
                    {isRtl ? 'الوصول السريع' : 'Accès rapide'}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[13px] leading-tight px-1.5 py-0 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 tabular-nums"
                  >
                    <bdi dir="ltr">{filteredQuickAccess.length}</bdi>
                  </Badge>
                </div>
                <div className="mt-1 space-y-0.5">
                  {filteredQuickAccess.map((qa) => {
                    const idx = itemIndexMap.get(qa.id) ?? -1;
                    const isActive = idx === activeIndex;
                    const Icon = qa.icon;
                    return (
                      <button
                        key={qa.id}
                        ref={(el) => {
                          itemRefs.current[qa.id] = el;
                        }}
                        type="button"
                        onMouseEnter={() => idx >= 0 && setActiveIndex(idx)}
                        onClick={() => handleSelect(qa.url)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-start transition-colors ${
                          isActive
                            ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-[#2c5282]/30 dark:ring-blue-500/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive
                                ? 'text-[#2c5282] dark:text-blue-400'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {isRtl ? qa.labelAr : qa.labelFr}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[13px] leading-tight font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 tabular-nums">
                            {isRtl ? qa.badgeAr : qa.badgeFr}
                          </span>
                          <CornerDownLeft
                            className={`w-3.5 h-3.5 ${
                              isActive ? 'text-[#2c5282] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Keyboard Navigation Footer */}
          <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/95 px-3 py-2 flex items-center justify-between text-[13px] text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd dir="ltr" className="px-1.5 py-0.5 font-mono text-[13px] leading-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">
                  ↑↓
                </kbd>
                <span>{isRtl ? 'للتنقل' : 'Naviguer'}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd dir="ltr" className="px-1.5 py-0.5 font-mono text-[13px] leading-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">
                  Enter
                </kbd>
                <span>{isRtl ? 'للفتح' : 'Ouvrir'}</span>
              </span>
            </div>
            <span className="hidden sm:inline">
              {isRtl ? 'اكتب حرفين على الأقل للبحث في السجلات' : 'Tapez au moins 2 caractères pour rechercher'}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GlobalSearch;
