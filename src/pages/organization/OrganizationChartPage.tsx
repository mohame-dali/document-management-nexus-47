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
import { ArrowRight, RotateCcw, AlertCircle, Loader2, Building2, Info, ChevronDown, ChevronUp, Briefcase, Mail, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { ChartPersonnel, Director, getOrganizationChart } from '@/services/organizationChartService';
import AdministrationNode from '@/components/organization/AdministrationNode';
import DirectorNode from '@/components/organization/DirectorNode';
import DepartmentNode from '@/components/organization/DepartmentNode';
import PersonnelAvatar from '@/components/hr/PersonnelAvatar';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 110;
const HORIZONTAL_GAP = 50;
const LEVEL_Y_STEP = 190;

const OrganizationChartPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const isFr = language === 'fr';
  const [showLegend, setShowLegend] = useState(true);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedContact, setSelectedContact] = useState<{
    person: ChartPersonnel | Director;
    departmentName?: string;
  } | null>(null);

  const canViewPersonnelProfile = ['Admin', 'Director', 'AdminDepartment'].includes(
    currentUser?.role || ''
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['organization-chart'],
    queryFn: getOrganizationChart,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
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
          departmentName: 'الإدارة العامة',
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
    [canViewPersonnelProfile, data, navigate]
  );

  const nodeTypes = useMemo(
    () => ({
      administration: AdministrationNode,
      director: DirectorNode,
      department: DepartmentNode,
    }),
    []
  );

  const { nodes, edges } = useMemo(() => {
    if (!data?.administration) {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }

    const rawNodes: Node[] = [];
    const rawEdges: Edge[] = [];

    // Level 0: Administration
    let currentY = 0;
    rawNodes.push({
      id: 'admin-root',
      type: 'administration',
      data: { name: data.administration.name || 'الإدارة' },
      position: { x: -NODE_WIDTH / 2, y: currentY },
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
    });

    let previousNodeId = 'admin-root';

    // Level 1: Director
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

    // Level 2: Regalien Departments
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

    // Level 3: Operational Departments
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
  }, [data, handlePersonnelClick]);

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-5" dir="rtl">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#2c5282]/10 dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-400 rounded-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1a202c] dark:text-slate-100">الهيكل التنظيمي للإدارة</h1>
            <p className="text-sm text-[#4a5568] dark:text-slate-400 mt-0.5">
              هيكل تراتبي هرمي تفاعلي (الإدارة العامة ← المصالح السيادية ← المصالح والدوائر العملياتية)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="h-9 px-3.5 border-slate-300 dark:border-slate-700 text-[#4a5568] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title="تحديث البيانات"
          >
            <RotateCcw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="h-9 px-3.5 border-slate-300 dark:border-slate-700 text-[#4a5568] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة
          </Button>
        </div>
      </div>

      {/* État de chargement */}
      {isLoading && (
        <div className="min-h-[600px] flex flex-col items-center justify-center bg-[#f7fafc] border border-[#e2e8f0] rounded shadow-sm">
          <Loader2 className="w-10 h-10 text-[#2c5282] animate-spin mb-3" />
          <p className="text-sm font-medium text-[#4a5568]">جاري تحميل الهيكل التنظيمي...</p>
        </div>
      )}

      {/* État d'erreur */}
      {isError && (
        <div className="min-h-[600px] flex flex-col items-center justify-center bg-[#f7fafc] border border-[#feb2b2] rounded shadow-sm p-6 text-center">
          <div className="p-3 bg-[#feeeee] text-[#e53e3e] rounded-full mb-3">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#1a202c] mb-1">تعذر تحميل الهيكل التنظيمي</h3>
          <p className="text-sm text-[#4a5568] max-w-md mb-4">
            {error instanceof Error ? error.message : 'حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.'}
          </p>
          <Button onClick={() => refetch()} className="h-10 px-4 bg-[#2c5282] hover:bg-[#2a4365] text-white rounded">
            <RotateCcw className="w-4 h-4 ml-2" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* État vide */}
      {!isLoading && !isError && nodes.length <= 1 && (
        <div className="min-h-[600px] flex flex-col items-center justify-center bg-[#f7fafc] border border-[#e2e8f0] rounded shadow-sm p-6 text-center">
          <div className="p-3 bg-[#2c5282]/10 text-[#2c5282] rounded-full mb-3">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#1a202c] mb-1">لا توجد أقسام مسجلة</h3>
          <p className="text-sm text-[#4a5568] max-w-md">
            لم يتم العثور على أقسام نشطة في النظام لعرضها ضمن الهيكل التنظيمي.
          </p>
        </div>
      )}

      {/* Zone ReactFlow */}
      {!isLoading && !isError && nodes.length > 1 && (
        <div className="bg-slate-50/80 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden min-h-[650px] h-[720px] relative">
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

          {/* Floating Zoom & Fit Controls Pill */}
          <div
            className="absolute bottom-4 left-4 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 shadow-md px-2 py-1.5"
            dir="ltr"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => rfInstance?.zoomOut({ duration: 200 })}
              aria-label={isFr ? 'Zoom arrière' : 'تصغير'}
              title={isFr ? 'Zoom arrière' : 'تصغير'}
              className="h-7 w-7 p-0 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#2c5282] dark:hover:text-blue-300"
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
              className="h-7 w-7 p-0 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#2c5282] dark:hover:text-blue-300"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => rfInstance?.fitView({ padding: 0.25, duration: 250 })}
              aria-label={isFr ? 'Réinitialiser la vue' : 'إعادة ضبط العرض'}
              title={isFr ? 'Réinitialiser la vue' : 'إعادة ضبط العرض'}
              className="h-7 px-2.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#2c5282] dark:hover:text-blue-300 whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>{isFr ? 'Ajuster' : 'ضبط العرض'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Légende repliable */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm text-xs transition-all overflow-hidden">
        <div 
          onClick={() => setShowLegend(!showLegend)}
          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 select-none transition-colors border-b border-transparent"
        >
          <div className="flex items-center gap-2 text-[#1a202c] dark:text-slate-100 font-bold">
            <Info className="w-4 h-4 text-[#2c5282] dark:text-blue-400" />
            <span>دليل المستويات والوحدات الإدارية</span>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-[#5f6b7d] dark:text-slate-400 hover:text-[#2c5282] dark:hover:text-blue-300 text-xs font-medium"
          >
            <span>{showLegend ? 'إخفاء' : 'عرض الدليل'}</span>
            {showLegend ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showLegend && (
          <div className="p-4 pt-2 border-t border-[#edf2f7] flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-[#FFD758] border border-[#e2be40]"></span>
                <span className="text-[#4a5568]">المستوى 1 : المدير (مدير الإدارة)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300"></span>
                <span className="text-[#4a5568]">مكتب الضبط (Bureau d'Ordre)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-400"></span>
                <span className="text-[#4a5568]">الموارد البشرية (RH)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-blue-100 border border-blue-300"></span>
                <span className="text-[#4a5568]">المستوى 3 : الأقسام والمصالح العملياتية</span>
              </div>
            </div>
            <div className="text-[#5f6b7d] text-[11px]">
              * انقر على زر "عرض" لتوسيع قائمة موظفي أي قسم، أو انقر على موظف/مدير لفتح ملفه
            </div>
          </div>
        )}
      </div>

      {/* بطاقة تواصل مبسطة للمستخدمين غير المخولين بفتح الملف الإداري الكامل */}
      <Dialog
        open={Boolean(selectedContact)}
        onOpenChange={(open) => {
          if (!open) setSelectedContact(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px] text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a202c]">
              بطاقة التواصل المهنية
            </DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 pb-3 border-b border-[#edf2f7]">
                <PersonnelAvatar
                  photo={selectedContact.person.photo}
                  nom={selectedContact.person.nom}
                  prenom={selectedContact.person.prenom}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-bold text-[#1a202c] truncate">
                      {selectedContact.person.prenom} {selectedContact.person.nom}
                    </p>
                    {selectedContact.person.username && (
                      <span
                        dir="ltr"
                        className="inline-block text-[11px] font-mono text-[#2c5282] bg-[#ebf4ff] border border-[#bee3f8] rounded px-1.5 py-0.5"
                      >
                        @{selectedContact.person.username}
                      </span>
                    )}
                  </div>
                  {selectedContact.departmentName && (
                    <p className="text-xs text-[#5f6b7d] flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-[#2c5282]" />
                      <span>{selectedContact.departmentName}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-[#4a5568]">
                  <Briefcase className="w-4 h-4 text-[#2c5282] shrink-0" />
                  <span className="font-medium text-[#1a202c]">الخطة:</span>
                  <span>{selectedContact.person.poste || 'غير محددة'}</span>
                </div>
                <div className="flex items-center gap-2 text-[#4a5568]">
                  <Mail className="w-4 h-4 text-[#2c5282] shrink-0" />
                  <span className="font-medium text-[#1a202c]">البريد الإلكتروني:</span>
                  <span dir="ltr">{selectedContact.person.emailPersonnel || 'غير متوفر'}</span>
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
