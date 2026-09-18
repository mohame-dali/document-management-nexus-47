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
import dagre from 'dagre';
import { ArrowRight, RotateCcw, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOrganizationChart } from '@/services/organizationChartService';
import AdministrationNode from '@/components/organization/AdministrationNode';
import DepartmentNode from '@/components/organization/DepartmentNode';
import PersonnelNode from '@/components/organization/PersonnelNode';

const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  administration: { width: 240, height: 80 },
  department: { width: 200, height: 100 },
  personnel: { width: 180, height: 60 },
};

const OrganizationChartPage: React.FC = () => {
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['organization-chart'],
    queryFn: getOrganizationChart,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const nodeTypes = useMemo(
    () => ({
      administration: AdministrationNode,
      department: DepartmentNode,
      personnel: PersonnelNode,
    }),
    []
  );

  const { nodes, edges } = useMemo(() => {
    if (!data?.administration) {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }

    const rawNodes: Node[] = [];
    const rawEdges: Edge[] = [];

    // Node Administration (Racine)
    rawNodes.push({
      id: 'admin-root',
      type: 'administration',
      data: { name: data.administration.name || 'Administration' },
      position: { x: 0, y: 0 },
    });

    // Pour chaque département
    const departments = data.administration.departments || [];
    departments.forEach((dept) => {
      const deptNodeId = `dept-${dept._id}`;
      rawNodes.push({
        id: deptNodeId,
        type: 'department',
        data: {
          name: dept.name,
          description: dept.description,
          isFunctional: dept.isFunctional,
          unitType: dept.unitType,
          personnelCount: dept.personnel?.length || 0,
        },
        position: { x: 0, y: 0 },
      });

      rawEdges.push({
        id: `edge-admin-${dept._id}`,
        source: 'admin-root',
        target: deptNodeId,
        type: 'smoothstep',
        style: { stroke: '#cbd5e1', strokeWidth: 2 },
      });

      // Pour chaque personnel du département
      const deptPersonnel = dept.personnel || [];
      deptPersonnel.forEach((p) => {
        const pNodeId = `p-${p._id}`;
        rawNodes.push({
          id: pNodeId,
          type: 'personnel',
          data: p,
          position: { x: 0, y: 0 },
        });

        rawEdges.push({
          id: `edge-${dept._id}-${p._id}`,
          source: deptNodeId,
          target: pNodeId,
          type: 'smoothstep',
          style: { stroke: '#e2e8f0', strokeWidth: 1.5 },
        });
      });
    });

    // Disposition automatique avec Dagre
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 80 });

    rawNodes.forEach((node) => {
      const dim = NODE_DIMENSIONS[node.type || 'department'] || { width: 180, height: 60 };
      dagreGraph.setNode(node.id, { width: dim.width, height: dim.height });
    });

    rawEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = rawNodes.map((node) => {
      const pos = dagreGraph.node(node.id);
      const dim = NODE_DIMENSIONS[node.type || 'department'] || { width: 180, height: 60 };
      return {
        ...node,
        position: {
          x: pos ? pos.x - dim.width / 2 : 0,
          y: pos ? pos.y - dim.height / 2 : 0,
        },
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
      };
    });

    return { nodes: layoutedNodes, edges: rawEdges };
  }, [data]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === 'personnel' && node.data?._id) {
        navigate(`/dashboard/hr/personnel/${node.data._id}`);
      }
    },
    [navigate]
  );

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6" dir="rtl">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#ebf4ff] text-[#2c5282] rounded-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1a202c]">الهيكل التنظيمي للإدارة</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              عرض تراتبي وتفاعلي للوحدات الإدارية والموظفين التابعين لها
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="border-[#cbd5e1] text-gray-700 hover:bg-[#f7fafc] transition-colors"
            title="تحديث البيانات"
          >
            <RotateCcw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="border-[#cbd5e1] text-gray-700 hover:bg-[#f7fafc] transition-colors"
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة
          </Button>
        </div>
      </div>

      {/* État de chargement */}
      {isLoading && (
        <div className="min-h-[600px] flex flex-col items-center justify-center bg-[#f7fafc] border border-[#e2e8f0] rounded-lg shadow-sm">
          <Loader2 className="w-10 h-10 text-[#2c5282] animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-600">جاري تحميل الهيكل التنظيمي...</p>
        </div>
      )}

      {/* État d'erreur */}
      {isError && (
        <div className="min-h-[600px] flex flex-col items-center justify-center bg-[#f7fafc] border border-[#feb2b2] rounded-lg shadow-sm p-6 text-center">
          <div className="p-3 bg-[#feeeee] text-[#e53e3e] rounded-full mb-3">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#1a202c] mb-1">تعذر تحميل الهيكل التنظيمي</h3>
          <p className="text-sm text-gray-500 max-w-md mb-4">
            {error instanceof Error ? error.message : 'حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.'}
          </p>
          <Button onClick={() => refetch()} className="bg-[#2c5282] hover:bg-[#2a4365] text-white">
            <RotateCcw className="w-4 h-4 ml-2" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* État vide */}
      {!isLoading && !isError && nodes.length <= 1 && (
        <div className="min-h-[600px] flex flex-col items-center justify-center bg-[#f7fafc] border border-[#e2e8f0] rounded-lg shadow-sm p-6 text-center">
          <div className="p-3 bg-[#ebf4ff] text-[#2c5282] rounded-full mb-3">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#1a202c] mb-1">لا توجد أقسام مسجلة</h3>
          <p className="text-sm text-gray-500 max-w-md">
            لم يتم العثور على أقسام نشطة في النظام لعرضها ضمن الهيكل التنظيمي.
          </p>
        </div>
      )}

      {/* Zone ReactFlow */}
      {!isLoading && !isError && nodes.length > 1 && (
        <div className="bg-[#f7fafc] border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden min-h-[600px] h-[700px] relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
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
                if (node.type === 'department') return '#e2e8f0';
                return '#ffffff';
              }}
              maskColor="rgba(247, 250, 252, 0.7)"
              className="!border !border-[#e2e8f0] !rounded-lg !overflow-hidden"
            />
          </ReactFlow>
        </div>
      )}

      {/* Légende */}
      <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-gray-700 font-semibold">
          <span>دليل الرموز والوحدات الوظيفية :</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#2c5282]"></span>
            <span className="text-gray-600">مكتب المدير (Bureau Directeur)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FFCB56] border border-[#d69e2e]"></span>
            <span className="text-gray-600">مكتب الضبط (Bureau d'Ordre)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#38a169]"></span>
            <span className="text-gray-600">الموارد البشرية (RH)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-white border border-[#cbd5e1]"></span>
            <span className="text-gray-600">أقسام ومصالح أخرى</span>
          </div>
        </div>
        <div className="text-gray-400 text-[11px]">
          * انقر على أي موظف للانتقال إلى ملفه الشخصي
        </div>
      </div>
    </div>
  );
};

export default OrganizationChartPage;
