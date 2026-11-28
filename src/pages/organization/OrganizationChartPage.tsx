import React, { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactFlow, {
  Background,
  MiniMap,
  Node,
  Edge,
  Position,
  BackgroundVariant,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  RotateCcw,
  AlertCircle,
  Loader2,
  Building2,
  Info,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Mail,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  X,
  LayoutGrid,
  Network,
  Users,
  Crown,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import {
  ChartDepartment,
  ChartPersonnel,
  Director,
  getOrganizationChart,
} from '@/services/organizationChartService';
import AdministrationNode from '@/components/organization/AdministrationNode';
import DirectorNode from '@/components/organization/DirectorNode';
import DepartmentNode from '@/components/organization/DepartmentNode';
import PersonnelAvatar from '@/components/hr/PersonnelAvatar';
import {
  filterOrganizationDepartments,
  FilteredDepartmentResult,
  matchesPersonnelQuery,
  resolveDepartmentManager,
} from '@/utils/organizationTemplatesUtils';

const NODE_WIDTH = 280;
const HORIZONTAL_GAP = 50;
const LEVEL_Y_STEP = 190;

type OrgViewMode = 'directory' | 'tree';

const OrganizationChartPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { dir } = useDirection();
  const isFr = language === 'fr';

  const [viewMode, setViewMode] = useState<OrgViewMode>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDeptIds, setExpandedDeptIds] = useState<Record<string, boolean>>({});
  const [showLegend, setShowLegend] = useState(false);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedContact, setSelectedContact] = useState<{
    person: ChartPersonnel | Director;
    departmentName?: string;
  } | null>(null);

  const canViewPersonnelProfile = ['Admin', 'Director', 'AdminDepartment'].includes(
    currentUser?.role || ''
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['organization-chart'],
    queryFn: getOrganizationChart,
    staleTime: 1000 * 30,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    retry: 1,
  });

  const handlePersonnelClick = useCallback(
    (personnelId: string) => {
      if (canViewPersonnelProfile) {
        navigate(`/dashboard/hr/personnel/${personnelId}`);
        return;
      }

      if (!data) return;

      if (data.director && String(data.director._id) === String(personnelId)) {
        setSelectedContact({
          person: data.director,
          departmentName: isFr ? 'Direction générale' : 'الإدارة العامة',
        });
        return;
      }

      const allDepts = [
        ...(data.regalienDepartments || []),
        ...(data.operationalDepartments || []),
      ];
      for (const dept of allDepts) {
        const found = (dept.personnel || []).find(
          (p) => String(p._id) === String(personnelId)
        );
        if (found) {
          setSelectedContact({
            person: found,
            departmentName: dept.name,
          });
          return;
        }
      }
    },
    [canViewPersonnelProfile, data, isFr, navigate]
  );

  const toggleDepartment = useCallback((deptId: string) => {
    setExpandedDeptIds((prev) => ({
      ...prev,
      [deptId]: !prev[deptId],
    }));
  }, []);

  const filteredRegalien = useMemo(
    () => filterOrganizationDepartments(data?.regalienDepartments || [], searchQuery),
    [data?.regalienDepartments, searchQuery]
  );

  const filteredOperational = useMemo(
    () => filterOrganizationDepartments(data?.operationalDepartments || [], searchQuery),
    [data?.operationalDepartments, searchQuery]
  );

  const totalDepts =
    (data?.regalienDepartments?.length || 0) + (data?.operationalDepartments?.length || 0);
  const totalMembers = useMemo(() => {
    const allDepts = [
      ...(data?.regalienDepartments || []),
      ...(data?.operationalDepartments || []),
    ];
    return allDepts.reduce((sum, d) => sum + (d.totalPersonnel || 0), 0);
  }, [data]);

  const directorMatchesSearch = useMemo(() => {
    if (!data?.director || !searchQuery.trim()) return true;
    return matchesPersonnelQuery(data.director, searchQuery);
  }, [data?.director, searchQuery]);

  const nodeTypes = useMemo(
    () => ({
      administration: AdministrationNode,
      director: DirectorNode,
      department: DepartmentNode,
    }),
    []
  );

  const matchingDeptIdSet = useMemo(() => {
    const ids = new Set<string>();
    filteredRegalien.forEach((r) => ids.add(String(r.department._id)));
    filteredOperational.forEach((r) => ids.add(String(r.department._id)));
    return ids;
  }, [filteredRegalien, filteredOperational]);

  const { nodes, edges } = useMemo(() => {
    if (!data?.administration) {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }

    const rawNodes: Node[] = [];
    const rawEdges: Edge[] = [];
    const hasSearch = searchQuery.trim().length > 0;

    let currentY = 0;
    rawNodes.push({
      id: 'admin-root',
      type: 'administration',
      data: { name: data.administration.name || (isFr ? 'Administration' : 'الإدارة') },
      position: { x: -NODE_WIDTH / 2, y: currentY },
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
    });

    let previousNodeId = 'admin-root';

    if (data.director) {
      currentY += LEVEL_Y_STEP;
      rawNodes.push({
        id: 'director-node',
        type: 'director',
        data: {
          ...data.director,
          onDirectorClick: handlePersonnelClick,
        },
        position: { x: -NODE_WIDTH / 2, y: currentY },
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
      });

      rawEdges.push({
        id: 'edge-admin-director',
        source: 'admin-root',
        target: 'director-node',
        type: 'smoothstep',
        style: { stroke: '#2c5282', strokeWidth: 2.5 },
      });

      previousNodeId = 'director-node';
    }

    const regaliens = data.regalienDepartments || [];
    if (regaliens.length > 0) {
      currentY += LEVEL_Y_STEP;
      const count = regaliens.length;
      const totalWidth = count * NODE_WIDTH + (count - 1) * HORIZONTAL_GAP;
      const startX = -totalWidth / 2;

      regaliens.forEach((dept, index) => {
        const nodeId = `dept-regalien-${dept._id}`;
        const xPos = startX + index * (NODE_WIDTH + HORIZONTAL_GAP);

        rawNodes.push({
          id: nodeId,
          type: 'department',
          data: {
            ...dept,
            isDimmed: hasSearch && !matchingDeptIdSet.has(String(dept._id)),
            onPersonnelClick: handlePersonnelClick,
          },
          position: { x: xPos, y: currentY },
          targetPosition: Position.Top,
          sourcePosition: Position.Bottom,
        });

        rawEdges.push({
          id: `edge-${previousNodeId}-${nodeId}`,
          source: previousNodeId,
          target: nodeId,
          type: 'smoothstep',
          style: { stroke: '#4a5568', strokeWidth: 2 },
        });
      });
    }

    const operationals = data.operationalDepartments || [];
    if (operationals.length > 0) {
      currentY += LEVEL_Y_STEP;
      const count = operationals.length;
      const totalWidth = count * NODE_WIDTH + (count - 1) * HORIZONTAL_GAP;
      const startX = -totalWidth / 2;

      operationals.forEach((dept, index) => {
        const nodeId = `dept-op-${dept._id}`;
        const xPos = startX + index * (NODE_WIDTH + HORIZONTAL_GAP);

        rawNodes.push({
          id: nodeId,
          type: 'department',
          data: {
            ...dept,
            isDimmed: hasSearch && !matchingDeptIdSet.has(String(dept._id)),
            onPersonnelClick: handlePersonnelClick,
          },
          position: { x: xPos, y: currentY },
          targetPosition: Position.Top,
          sourcePosition: Position.Bottom,
        });

        rawEdges.push({
          id: `edge-${previousNodeId}-${nodeId}`,
          source: previousNodeId,
          target: nodeId,
          type: 'smoothstep',
          style: { stroke: '#a0aec0', strokeWidth: 1.5, strokeDasharray: '4 4' },
        });
      });
    }

    return { nodes: rawNodes, edges: rawEdges };
  }, [data, handlePersonnelClick, isFr, matchingDeptIdSet, searchQuery]);

  const getUnitTypeLabel = (unitType: ChartDepartment['unitType']) => {
    switch (unitType) {
      case 'bureau_ordre':
        return isFr ? "Bureau d'Ordre" : 'مكتب الضبط';
      case 'rh':
        return isFr ? 'Ressources Humaines' : 'الموارد البشرية';
      default:
        return isFr ? 'Service' : 'مصلحة';
    }
  };

  const renderDepartmentCard = ({
    department,
    matchingPersonnel,
  }: FilteredDepartmentResult) => {
    const deptId = String(department._id);
    const hasSearch = searchQuery.trim().length > 0;
    const isExpanded = hasSearch ? true : Boolean(expandedDeptIds[deptId]);
    const manager = resolveDepartmentManager(department.personnel);
    const membersToDisplay = hasSearch ? matchingPersonnel : department.personnel || [];

    return (
      <article
        key={deptId}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden transition-colors hover:border-[#2c5282]/50 dark:hover:border-blue-500/50"
      >
        <button
          type="button"
          onClick={() => toggleDepartment(deptId)}
          aria-expanded={isExpanded}
          className="w-full p-4 text-start hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span>{getUnitTypeLabel(department.unitType)}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums font-medium">
                  {department.totalPersonnel}{' '}
                  {isFr
                    ? department.totalPersonnel <= 1
                      ? 'membre'
                      : 'membres'
                    : 'موظف'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {department.name}
              </h3>
            </div>

            <span className="h-8 w-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0 text-slate-700 dark:text-slate-300">
              <UserCheck className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 shrink-0">
                {isFr ? 'Responsable :' : 'المسؤول:'}
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {manager
                  ? `${manager.prenom} ${manager.nom}`.trim()
                  : isFr
                    ? 'Non désigné'
                    : 'غير معيّن'}
              </span>
            </div>

            <span className="text-xs font-medium text-[#2c5282] dark:text-blue-400 shrink-0 whitespace-nowrap">
              {isExpanded
                ? isFr
                  ? 'Masquer'
                  : 'إخفاء الفريق'
                : isFr
                  ? 'Afficher'
                  : 'عرض الفريق'}
            </span>
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 divide-y divide-slate-200/70 dark:divide-slate-800/80 max-h-72 overflow-y-auto">
            {membersToDisplay.length > 0 ? (
              membersToDisplay.map((person) => (
                <button
                  key={person._id}
                  type="button"
                  onClick={() => handlePersonnelClick(person._id)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white dark:hover:bg-slate-800/70 transition-colors text-start"
                >
                  <PersonnelAvatar
                    photo={person.photo}
                    nom={person.nom}
                    prenom={person.prenom}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {person.prenom} {person.nom}
                      </span>
                      {person.username && (
                        <span
                          dir="ltr"
                          className="text-xs font-mono text-[#2c5282] dark:text-blue-300 shrink-0 truncate max-w-[120px]"
                        >
                          @{person.username}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                      {person.poste || (isFr ? 'Agent' : 'موظف')}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-5 text-center text-xs text-slate-600 dark:text-slate-300">
                {isFr ? 'Aucun membre enregistré dans ce service' : 'لا يوجد موظفون مسجلون في هذا القسم'}
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  if (isLoading) {
    return (
      <div
        className="min-h-[420px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg"
        dir={dir}
      >
        <Loader2 className="w-9 h-9 text-[#2c5282] dark:text-blue-400 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {isFr ? 'Chargement de l’organigramme...' : 'جاري تحميل الهيكل التنظيمي...'}
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="min-h-[420px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-lg p-6 text-center"
        dir={dir}
      >
        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
          {isFr ? 'Impossible de charger l’organigramme' : 'تعذر تحميل الهيكل التنظيمي'}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mb-4">
          {error instanceof Error
            ? error.message
            : isFr
              ? 'Erreur de connexion au serveur.'
              : 'حدث خطأ أثناء الاتصال بالخادم.'}
        </p>
        <Button
          type="button"
          onClick={() => refetch()}
          className="h-10 px-4 bg-[#2c5282] hover:bg-[#1e3a5f] text-white rounded-md gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{isFr ? 'Réessayer' : 'إعادة المحاولة'}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={dir}>
      {/* Action & View Mode Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md min-w-0">
          <Search className="h-4 w-4 text-slate-500 dark:text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isFr ? 'Rechercher un service ou un agent...' : 'بحث عن قسم أو موظف...'
            }
            aria-label={
              isFr ? 'Rechercher un service ou un agent' : 'بحث عن قسم أو موظف'
            }
            className="h-10 ps-9 pe-9 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={isFr ? 'Effacer la recherche' : 'مسح البحث'}
              className="absolute top-1/2 -translate-y-1/2 end-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 p-0.5 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">
          {/* Quiet summary counts */}
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
            <span>
              {totalDepts} {isFr ? 'services' : 'أقسام'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {totalMembers} {isFr ? 'agents' : 'موظف'}
            </span>
          </div>

          {/* Tree / Directory Segmented Toggle */}
          <div
            className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
            role="group"
            aria-label={isFr ? 'Mode d’affichage' : 'طريقة العرض'}
          >
            <button
              type="button"
              onClick={() => setViewMode('directory')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'directory'
                  ? 'bg-white dark:bg-slate-900 text-[#2c5282] dark:text-blue-300 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>{isFr ? 'Annuaire' : 'الدليل التنظيمي'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'tree'
                  ? 'bg-white dark:bg-slate-900 text-[#2c5282] dark:text-blue-300 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              <span>{isFr ? 'Arborescence' : 'المخطط الهرمي'}</span>
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md whitespace-nowrap shrink-0"
            title={isFr ? 'Actualiser' : 'تحديث'}
          >
            <RotateCcw className={`w-4 h-4 me-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFr ? 'Actualiser' : 'تحديث'}</span>
          </Button>
        </div>
      </div>

      {/* Empty state if no departments */}
      {totalDepts === 0 && !data?.director ? (
        <div className="min-h-[360px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-8 text-center space-y-2">
          <Building2 className="w-9 h-9 text-[#2c5282] dark:text-blue-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {isFr ? 'Aucun service enregistré' : 'لا توجد أقسام مسجلة'}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md">
            {isFr
              ? 'Aucun département actif n’a été trouvé pour composer l’organigramme.'
              : 'لم يتم العثور على أقسام نشطة في النظام لعرضها ضمن الهيكل التنظيمي.'}
          </p>
        </div>
      ) : viewMode === 'directory' ? (
        /* DIRECTORY VIEW: Executive Leadership + Connected Expandable Department Cards */
        <div className="space-y-6">
          {/* Executive Leadership Card */}
          {(data?.administration || data?.director) &&
            (!searchQuery.trim() || directorMatchesSearch || filteredRegalien.length > 0 || filteredOperational.length > 0) && (
              <div className="flex flex-col items-center">
                <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-[#2c5282]/35 dark:border-blue-600/50 rounded-lg p-5">
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-[#2c5282] dark:text-blue-400 shrink-0" />
                      <span className="text-xs font-semibold text-[#2c5282] dark:text-blue-300 truncate">
                        {data?.administration?.name || (isFr ? 'Administration' : 'الإدارة العامة')}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300 shrink-0">
                      <Crown className="h-3.5 w-3.5" />
                      <span>{isFr ? 'Direction' : 'الإدارة العليا'}</span>
                    </span>
                  </div>

                  {data?.director ? (
                    <button
                      type="button"
                      onClick={() => handlePersonnelClick(data.director!._id)}
                      className="w-full pt-3.5 flex items-center gap-3.5 text-start hover:opacity-90 transition-opacity"
                    >
                      <PersonnelAvatar
                        photo={data.director.photo}
                        nom={data.director.nom}
                        prenom={data.director.prenom}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                            {data.director.prenom} {data.director.nom}
                          </h2>
                          {data.director.username && (
                            <span
                              dir="ltr"
                              className="text-xs font-mono text-[#2c5282] dark:text-blue-300"
                            >
                              @{data.director.username}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                          {data.director.poste || (isFr ? 'Directeur' : 'مدير الإدارة')}
                        </p>
                      </div>
                    </button>
                  ) : (
                    <p className="pt-3 text-sm text-slate-600 dark:text-slate-300">
                      {isFr ? 'Direction générale' : 'الإدارة العامة'}
                    </p>
                  )}
                </div>

                {/* Clean Hierarchy Connector */}
                {(filteredRegalien.length > 0 || filteredOperational.length > 0) && (
                  <div className="flex flex-col items-center" aria-hidden="true">
                    <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
                    <div className="w-40 h-px bg-slate-300 dark:bg-slate-700" />
                  </div>
                )}
              </div>
            )}

          {/* No search matches in Directory */}
          {searchQuery.trim() &&
            filteredRegalien.length === 0 &&
            filteredOperational.length === 0 &&
            !directorMatchesSearch && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-10 text-center space-y-2">
                <Users className="h-8 w-8 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isFr ? 'Aucun résultat pour cette recherche' : 'لا توجد نتائج مطابقة'}
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 h-9 px-4"
                >
                  {isFr ? 'Réinitialiser' : 'إعادة ضبط البحث'}
                </Button>
              </div>
            )}

          {/* Regalien Departments (BO, RH) */}
          {filteredRegalien.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isFr ? 'Services centraux et régaliens' : 'المصالح السيادية والمركزية'}
                </h3>
                <span className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                  {filteredRegalien.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                {filteredRegalien.map(renderDepartmentCard)}
              </div>
            </section>
          )}

          {/* Operational Departments */}
          {filteredOperational.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isFr ? 'Départements et services opérationnels' : 'الأقسام والمصالح العملياتية'}
                </h3>
                <span className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                  {filteredOperational.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                {filteredOperational.map(renderDepartmentCard)}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* TREE VIEW: Interactive ReactFlow Hierarchy */
        <div className="space-y-3">
          <div className="bg-slate-50/80 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden min-h-[600px] h-[680px] relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onInit={(instance) => {
                setRfInstance(instance);
                setZoomLevel(instance.getZoom());
              }}
              onMoveEnd={(_event, viewport) => {
                setZoomLevel(viewport.zoom);
              }}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              minZoom={0.2}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
              <MiniMap
                position="bottom-right"
                nodeStrokeColor="#cbd5e1"
                nodeColor={(node) => {
                  if (node.type === 'administration') return '#2c5282';
                  if (node.type === 'director') return '#1a365d';
                  if (node.type === 'department') {
                    if (node.data?.unitType === 'bureau_ordre') return '#FFCB56';
                    if (node.data?.unitType === 'rh') return '#38a169';
                    return '#e2e8f0';
                  }
                  return '#ffffff';
                }}
                maskColor="rgba(247, 250, 252, 0.7)"
                className="!border !border-slate-200/80 dark:!border-slate-700 !rounded-lg !overflow-hidden"
              />
            </ReactFlow>

            {/* Floating Zoom & Fit Controls */}
            <div
              className="absolute bottom-4 left-4 z-10 inline-flex items-center gap-1 rounded-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 shadow-sm px-2 py-1.5"
              dir="ltr"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => rfInstance?.zoomOut({ duration: 200 })}
                aria-label={isFr ? 'Zoom arrière' : 'تصغير'}
                title={isFr ? 'Zoom arrière' : 'تصغير'}
                className="h-7 w-7 p-0 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#2c5282] dark:hover:text-blue-300"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>

              <span className="min-w-[42px] text-center text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums select-none">
                {Math.round(zoomLevel * 100)}%
              </span>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => rfInstance?.zoomIn({ duration: 200 })}
                aria-label={isFr ? 'Zoom avant' : 'تكبير'}
                title={isFr ? 'Zoom avant' : 'تكبير'}
                className="h-7 w-7 p-0 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#2c5282] dark:hover:text-blue-300"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => rfInstance?.fitView({ padding: 0.25, duration: 250 })}
                aria-label={isFr ? 'Ajuster la vue' : 'ضبط العرض'}
                title={isFr ? 'Ajuster la vue' : 'ضبط العرض'}
                className="h-7 px-2.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#2c5282] dark:hover:text-blue-300 whitespace-nowrap shrink-0 flex items-center gap-1"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>{isFr ? 'Ajuster' : 'ضبط العرض'}</span>
              </Button>
            </div>
          </div>

          {/* Collapsible Legend */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg text-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLegend(!showLegend)}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
                <Info className="w-4 h-4 text-[#2c5282] dark:text-blue-400" />
                <span>
                  {isFr
                    ? 'Légende des niveaux et unités administratives'
                    : 'دليل المستويات والوحدات الإدارية'}
                </span>
              </div>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                <span>
                  {showLegend
                    ? isFr
                      ? 'Masquer'
                      : 'إخفاء'
                    : isFr
                      ? 'Afficher'
                      : 'عرض الدليل'}
                </span>
                {showLegend ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </span>
            </button>

            {showLegend && (
              <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-[#FFD758] border border-[#e2be40]" />
                    <span className="text-slate-700 dark:text-slate-300">
                      {isFr ? 'Niveau 1 : Direction' : 'المستوى 1 : مدير الإدارة'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300" />
                    <span className="text-slate-700 dark:text-slate-300">
                      {isFr ? "Bureau d'Ordre" : 'مكتب الضبط'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-400" />
                    <span className="text-slate-700 dark:text-slate-300">
                      {isFr ? 'Ressources Humaines (RH)' : 'الموارد البشرية (RH)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-blue-100 border border-blue-300" />
                    <span className="text-slate-700 dark:text-slate-300">
                      {isFr
                        ? 'Niveau 3 : Services opérationnels'
                        : 'المستوى 3 : الأقسام والمصالح العملياتية'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Professional Contact Card Dialog (for non-HR users) */}
      <Dialog
        open={Boolean(selectedContact)}
        onOpenChange={(open) => {
          if (!open) setSelectedContact(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isFr ? 'Fiche de contact professionnel' : 'بطاقة التواصل المهنية'}
            </DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <PersonnelAvatar
                  photo={selectedContact.person.photo}
                  nom={selectedContact.person.nom}
                  prenom={selectedContact.person.prenom}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                      {selectedContact.person.prenom} {selectedContact.person.nom}
                    </p>
                    {selectedContact.person.username && (
                      <span
                        dir="ltr"
                        className="inline-block text-xs font-mono text-[#2c5282] dark:text-blue-300"
                      >
                        @{selectedContact.person.username}
                      </span>
                    )}
                  </div>
                  {selectedContact.departmentName && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-[#2c5282] dark:text-blue-400" />
                      <span>{selectedContact.departmentName}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Briefcase className="w-4 h-4 text-[#2c5282] dark:text-blue-400 shrink-0" />
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {isFr ? 'Poste :' : 'الخطة:'}
                  </span>
                  <span>
                    {selectedContact.person.poste ||
                      (isFr ? 'Non défini' : 'غير محددة')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-[#2c5282] dark:text-blue-400 shrink-0" />
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {isFr ? 'E-mail :' : 'البريد الإلكتروني:'}
                  </span>
                  <span dir="ltr">
                    {selectedContact.person.emailPersonnel ||
                      (isFr ? 'Non renseigné' : 'غير متوفر')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizationChartPage;
