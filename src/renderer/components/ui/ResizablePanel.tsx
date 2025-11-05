import React, { useState, useRef, useEffect } from 'react';

interface ResizablePanelProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  className?: string;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 0.7, // 默认70%给左侧
  minLeftWidth = 0.3, // 最小30%
  maxLeftWidth = 0.9, // 最大90%
  className = ''
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, width: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = {
      x: e.clientX,
      width: leftWidth
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const deltaX = e.clientX - startPosRef.current.x;
    const deltaPercent = deltaX / containerWidth;

    let newWidth = startPosRef.current.width + deltaPercent;
    newWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newWidth));

    setLeftWidth(newWidth);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  return (
    <div ref={containerRef} className={`resizable-panel ${className}`}>
      <div
        className="resizable-panel-left"
        style={{ width: `${leftWidth * 100}%` }}
      >
        {leftPanel}
      </div>

      <div
        className={`resizable-divider ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="resizable-handle">
          <div className="resize-arrow">⋮</div>
        </div>
      </div>

      <div
        className="resizable-panel-right"
        style={{ width: `${(1 - leftWidth) * 100}%` }}
      >
        {rightPanel}
      </div>
    </div>
  );
};
