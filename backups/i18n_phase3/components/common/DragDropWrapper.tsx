
import React from 'react';
import { useDrag, useDrop, DropTargetMonitor } from 'react-dnd';

export interface DragItem {
  type: string;
  id: string;
  data: any;
}

interface DragDropWrapperProps {
  children: React.ReactNode;
  dragType?: string;
  dragData?: any;
  dropTypes?: string[];
  onDrop?: (item: DragItem) => void;
  className?: string;
  style?: React.CSSProperties;
  isDragDisabled?: boolean;
  isDropDisabled?: boolean;
}

const DragDropWrapper: React.FC<DragDropWrapperProps> = ({
  children,
  dragType,
  dragData,
  dropTypes = [],
  onDrop,
  className = '',
  style,
  isDragDisabled = false,
  isDropDisabled = false
}) => {
  // Add safety check for drag and drop context
  let isDragging = false;
  let isOver = false;
  let canDrop = false;
  let drag: any = null;
  let drop: any = null;

  try {
    const [dragState, dragRef] = useDrag({
      type: dragType || 'default',
      item: () => ({
        type: dragType || 'default',
        id: dragData?.id || 'unknown',
        data: dragData
      }),
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      canDrag: !isDragDisabled && !!dragType
    });

    const [dropState, dropRef] = useDrop({
      accept: dropTypes,
      drop: (item: DragItem) => {
        if (onDrop) {
          onDrop(item);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
      canDrop: (item: DragItem, monitor: DropTargetMonitor<DragItem, void>) => {
        return !isDropDisabled && dropTypes.length > 0;
      }
    });

    isDragging = dragState.isDragging;
    isOver = dropState.isOver || false;
    canDrop = dropState.canDrop || false;
    drag = dragRef;
    drop = dropRef;
  } catch (error) {
    // If drag-drop context is not available, continue without drag-drop functionality
    console.warn('Drag-drop context not available:', error);
  }

  const ref = React.useRef<HTMLDivElement>(null);
  
  // Connect both drag and drop refs safely
  React.useEffect(() => {
    if (ref.current && drag && drop) {
      if (!isDragDisabled && dragType) {
        drag(ref.current);
      }
      if (!isDropDisabled && dropTypes.length > 0) {
        drop(ref.current);
      }
    }
  }, [drag, drop, isDragDisabled, isDropDisabled, dragType, dropTypes.length]);

  const getClassName = () => {
    let classes = className;
    
    if (isDragging) {
      classes += ' opacity-50 transform scale-95';
    }
    
    if (isOver && canDrop) {
      classes += ' ring-2 ring-blue-400 ring-opacity-50 bg-blue-50';
    } else if (isOver && !canDrop) {
      classes += ' ring-2 ring-red-400 ring-opacity-50 bg-red-50';
    }
    
    if (canDrop && !isOver) {
      classes += ' ring-1 ring-gray-300 ring-opacity-30';
    }
    
    return classes;
  };

  return (
    <div ref={ref} className={getClassName()} style={style}>
      {children}
    </div>
  );
};

export default DragDropWrapper;
