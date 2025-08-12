
import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface TreeNode {
  id: string;
  label: string;
  icon?: LucideIcon;
  data?: any;
  children: TreeNode[];
}

interface TreeProps {
  data: TreeNode[];
  onNodeClick?: (node: TreeNode) => void;
  selectedNodeId?: string;
}

interface TreeNodeProps {
  node: TreeNode;
  level?: number;
  onNodeClick?: (node: TreeNode) => void;
  selectedNodeId?: string;
}

const TreeNodeComponent: React.FC<TreeNodeProps> = ({
  node,
  level = 0,
  onNodeClick,
  selectedNodeId
}) => {
  const Icon = node.icon;
  const isSelected = selectedNodeId === node.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer ${
          isSelected ? 'bg-accent' : ''
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => onNodeClick?.(node)}
      >
        {Icon && <Icon className="h-4 w-4" />}
        <span className="text-sm">{node.label}</span>
      </div>
      {node.children.map((child) => (
        <TreeNodeComponent
          key={child.id}
          node={child}
          level={level + 1}
          onNodeClick={onNodeClick}
          selectedNodeId={selectedNodeId}
        />
      ))}
    </div>
  );
};

export const Tree: React.FC<TreeProps> = ({ data, onNodeClick, selectedNodeId }) => {
  return (
    <div className="space-y-1">
      {data.map((node) => (
        <TreeNodeComponent
          key={node.id}
          node={node}
          onNodeClick={onNodeClick}
          selectedNodeId={selectedNodeId}
        />
      ))}
    </div>
  );
};
