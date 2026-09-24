import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Position,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ArrowRight, RotateCcw, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOrganizationChart } from '@/services/organizationChartService';
import AdministrationNode from '@/components/organization/AdministrationNode';
import DirectorNode from '@/components/organization/DirectorNode';
import DepartmentNode from '@/components/organization/DepartmentNode';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 110;
const HORIZONTAL_GAP = 50;
const LEVEL_Y_STEP = 190;

const OrganizationChartPage: React.FC = () => {
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['organization-chart'],
    queryFn: getOrganizationChart,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const handlePersonnelClick = useCallback(
    (personnelId: string) => {
      navigate(`/dashboard/hr/personnel/${personnelId}`);
    },
    [navigate]
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
    <div className="max-w-[1600px] mx-auto p-6 space-y-6" dir="rtl">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e2e8f0] rounded p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#2c5282]/10 text-[#2c5282] rounded">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1a202c]">الهيكل التنظيمي للإدارة</h1>
            <p className="text-sm text-[#4a5568] mt-0.5">
              هيكل تراتبي هرمي تفاعلي (الإدارة العامة ← المصالح السيادية ← المصالح والدوائر العملياتية)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="h-10 px-4 border-[#cbd5e1] text-[#4a5568] hover:bg-[#f7fafc] rounded transition-colors"
            title="تحديث البيانات"
          >
            <RotateCcw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="h-10 px-4 border-[#cbd5e1] text-[#4a5568] hover:bg-[#f7fafc] rounded transition-colors"
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
        <div className="bg-[#f7fafc] border border-[#e2e8f0] rounded shadow-sm overflow-hidden min-h-[650px] h-[720px] relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
            <Controls position="bottom-left" showInteractive={false} />
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
              className="!border !border-[#e2e8f0] !rounded !overflow-hidden"
            />
          </ReactFlow>
        </div>
      )}

      {/* Légende */}
      <div className="bg-white border border-[#e2e8f0] rounded p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-[#1a202c] font-semibold">
          <span>دليل المستويات والوحدات الإدارية :</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#2c5282] border border-[#1a365d]"></span>
            <span className="text-[#4a5568]">المستوى 1 : إدارة المؤسسة / المدير</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#FFCB56] border border-[#d69e2e]"></span>
            <span className="text-[#4a5568]">مكتب الضبط (Bureau d'Ordre)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#38a169]"></span>
            <span className="text-[#4a5568]">الموارد البشرية (RH)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-white border border-[#cbd5e1]"></span>
            <span className="text-[#4a5568]">المستوى 3 : الأقسام والمصالح العملياتية</span>
          </div>
        </div>
        <div className="text-[#718096] text-xs">
          * انقر على زر "عرض الموظفين" لتوسيع القائمة المدمجة بكل قسم دون تشويش الهيكل
        </div>
      </div>
    </div>
  );
};

export default OrganizationChartPage;
