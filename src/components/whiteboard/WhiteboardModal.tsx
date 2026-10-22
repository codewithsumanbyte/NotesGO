'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  X, 
  Save, 
  Download, 
  Pen, 
  Highlighter,
  Eraser, 
  Square, 
  Circle, 
  ArrowRight, 
  Minus, 
  Type, 
  StickyNote, 
  Undo2, 
  Redo2, 
  RotateCcw, 
  Trash2, 
  CheckCircle2, 
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  AlertTriangle,
  Move,
  Hand,
  Crosshair,
  Compass
} from 'lucide-react';
import { WhiteboardItem } from '@/types/database';

export interface StickyNoteItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
}

export interface DrawElement {
  id: string;
  type: 'pen' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'arrow' | 'line' | 'text';
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  toX?: number;
  toY?: number;
  color: string;
  strokeWidth: number;
  text?: string;
}

interface WhiteboardModalProps {
  whiteboard: WhiteboardItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveComplete: () => void;
  userId: string;
  currentFolderId: string | null;
}

type ToolType = 'pen' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'arrow' | 'line' | 'text' | 'pan';
type GridType = 'blank' | 'dots' | 'ruled' | 'math' | 'cornell';

const PALETTE_COLORS = [
  { name: 'Mint', value: '#2DD4BF' },
  { name: 'Emerald', value: '#4ADE80' },
  { name: 'Yellow', value: '#FACC15' },
  { name: 'Sky', value: '#38BDF8' },
  { name: 'Rose', value: '#FB7185' },
  { name: 'Lavender', value: '#C084FC' },
  { name: 'White', value: '#F8FAFC' },
];

const STICKY_COLORS = [
  { name: 'Yellow', bg: '#FEF08A', text: '#713F12', border: '#FDE047' },
  { name: 'Mint', bg: '#A7F3D0', text: '#064E3B', border: '#6EE7B7' },
  { name: 'Lavender', bg: '#DDD6FE', text: '#4C1D95', border: '#C4B5FD' },
  { name: 'Coral', bg: '#FECDD3', text: '#881337', border: '#FDA4AF' },
];

export function WhiteboardModal({
  whiteboard,
  isOpen,
  onClose,
  onSaveComplete,
  userId,
  currentFolderId,
}: WhiteboardModalProps) {
  // Canvases & Container
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Core metadata
  const [title, setTitle] = useState(whiteboard?.title || 'Untitled Study Canvas');
  const [tool, setTool] = useState<ToolType>('pen');
  const [prevTool, setPrevTool] = useState<ToolType>('pen');
  const [color, setColor] = useState('#2DD4BF');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [gridType, setGridType] = useState<GridType>('dots');

  // Infinite Viewport State (Pan & Zoom)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  panRef.current = pan;
  const zoomRef = useRef(1);
  zoomRef.current = zoom;

  // Spacebar quick-pan
  const isSpacePressedRef = useRef(false);

  // Status
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Vector Elements & History
  const [elements, setElements] = useState<DrawElement[]>([]);
  const [history, setHistory] = useState<DrawElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [currentElement, setCurrentElement] = useState<DrawElement | null>(null);

  // Legacy bitmap image backwards compatibility
  const legacyImageRef = useRef<HTMLImageElement | null>(null);

  // Stickies
  const [stickies, setStickies] = useState<StickyNoteItem[]>([]);
  const [draggingStickyId, setDraggingStickyId] = useState<string | null>(null);
  const stickyDragStartRef = useRef<{ clientX: number; clientY: number; stickyX: number; stickyY: number }>({
    clientX: 0,
    clientY: 0,
    stickyX: 0,
    stickyY: 0,
  });

  // Floating text tool
  const [activeTextInput, setActiveTextInput] = useState<{ x: number; y: number; text: string } | null>(null);

  // Mouse & Touch interaction state
  const isInteractingRef = useRef(false);
  const interactionModeRef = useRef<'none' | 'draw' | 'pan'>('none');
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mobile multi-touch pinch & pan state
  const touchStateRef = useRef<{
    mode: 'none' | 'draw' | 'pan' | 'pinch';
    initialDist: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    initialCenter: { x: number; y: number };
  }>({
    mode: 'none',
    initialDist: 0,
    initialZoom: 1,
    initialPan: { x: 0, y: 0 },
    initialCenter: { x: 0, y: 0 },
  });

  const supabase = createClient();

  // Screen to World Coordinates Mapping
  const screenToWorld = useCallback((screenX: number, screenY: number, currentPan = panRef.current, currentZoom = zoomRef.current) => {
    const container = containerRef.current;
    if (!container) return { x: screenX, y: screenY };
    const rect = container.getBoundingClientRect();
    return {
      x: (screenX - rect.left - currentPan.x) / currentZoom,
      y: (screenY - rect.top - currentPan.y) / currentZoom,
    };
  }, []);

  // Infinite Study Grid Rendering
  const renderInfiniteGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, currentPan: { x: number; y: number }, currentZoom: number, type: GridType) => {
    ctx.clearRect(0, 0, width, height);

    // Dark forest base background
    ctx.fillStyle = '#07130E';
    ctx.fillRect(0, 0, width, height);

    if (type === 'blank') return;

    if (type === 'dots') {
      const spacing = 28 * currentZoom;
      if (spacing <= 4) return;
      const startX = ((currentPan.x % spacing) + spacing) % spacing;
      const startY = ((currentPan.y % spacing) + spacing) % spacing;

      ctx.fillStyle = 'rgba(45, 212, 191, 0.22)';
      const dotRadius = Math.max(0.7, Math.min(2.0, 1.2 * currentZoom));

      for (let x = startX; x < width; x += spacing) {
        for (let y = startY; y < height; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (type === 'ruled') {
      const lineSpacing = 30 * currentZoom;
      if (lineSpacing <= 4) return;
      const startY = ((currentPan.y % lineSpacing) + lineSpacing) % lineSpacing;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = startY; y < height; y += lineSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Vertical pink margin line in world coordinates at x = 70
      const marginScreenX = 70 * currentZoom + currentPan.x;
      if (marginScreenX >= 0 && marginScreenX <= width) {
        ctx.strokeStyle = 'rgba(251, 113, 133, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(marginScreenX, 0);
        ctx.lineTo(marginScreenX, height);
        ctx.stroke();
      }
    } else if (type === 'math') {
      const cellSize = 24 * currentZoom;
      if (cellSize <= 4) return;
      const startX = ((currentPan.x % cellSize) + cellSize) % cellSize;
      const startY = ((currentPan.y % cellSize) + cellSize) % cellSize;

      ctx.strokeStyle = 'rgba(45, 212, 191, 0.12)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let x = startX; x < width; x += cellSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = startY; y < height; y += cellSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    } else if (type === 'cornell') {
      // Background ruled lines
      const lineSpacing = 28 * currentZoom;
      if (lineSpacing > 4) {
        const startY = ((currentPan.y % lineSpacing) + lineSpacing) % lineSpacing;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = startY; y < height; y += lineSpacing) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
      }

      // Cornell structural boundaries in world coordinates
      const cueWorldX = 220;
      const cueScreenX = cueWorldX * currentZoom + currentPan.x;

      ctx.strokeStyle = 'rgba(45, 212, 191, 0.25)';
      ctx.lineWidth = 1.5;
      if (cueScreenX >= 0 && cueScreenX <= width) {
        ctx.beginPath();
        ctx.moveTo(cueScreenX, 0);
        ctx.lineTo(cueScreenX, height);
        ctx.stroke();
      }
    }
  }, []);

  // Draw arrow helper
  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, strokeW: number) => {
    const headLen = Math.max(10, strokeW * 3.5);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  };

  // Render a single vector element
  const renderElement = (ctx: CanvasRenderingContext2D, el: DrawElement) => {
    ctx.save();

    if (el.type === 'pen') {
      if (!el.points || el.points.length < 2) {
        ctx.restore();
        return;
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i].x, el.points[i].y);
      }
      ctx.stroke();
    } else if (el.type === 'highlighter') {
      if (!el.points || el.points.length < 2) {
        ctx.restore();
        return;
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.strokeWidth * 4.5;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'bevel';

      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i].x, el.points[i].y);
      }
      ctx.stroke();
    } else if (el.type === 'rect') {
      if (el.x === undefined || el.y === undefined || el.width === undefined || el.height === undefined) {
        ctx.restore();
        return;
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeRect(el.x, el.y, el.width, el.height);
    } else if (el.type === 'circle') {
      if (el.x === undefined || el.y === undefined || el.width === undefined || el.height === undefined) {
        ctx.restore();
        return;
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      const radiusX = Math.abs(el.width) / 2;
      const radiusY = Math.abs(el.height) / 2;
      const centerX = el.x + el.width / 2;
      const centerY = el.y + el.height / 2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (el.type === 'line') {
      if (el.x === undefined || el.y === undefined || el.toX === undefined || el.toY === undefined) {
        ctx.restore();
        return;
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(el.x, el.y);
      ctx.lineTo(el.toX, el.toY);
      ctx.stroke();
    } else if (el.type === 'arrow') {
      if (el.x === undefined || el.y === undefined || el.toX === undefined || el.toY === undefined) {
        ctx.restore();
        return;
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      drawArrow(ctx, el.x, el.y, el.toX, el.toY, el.strokeWidth);
    } else if (el.type === 'text') {
      if (el.x === undefined || el.y === undefined || !el.text) {
        ctx.restore();
        return;
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = el.color;
      ctx.font = `${Math.max(16, el.strokeWidth * 5)}px Sora, Inter, sans-serif`;
      ctx.fillText(el.text, el.x, el.y + 16);
    }

    ctx.restore();
  };

  // Main Drawing Canvas Render Loop
  const renderCanvas = useCallback(() => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    ctx.save();
    // Apply viewport transform (pan & zoom)
    ctx.translate(panRef.current.x, panRef.current.y);
    ctx.scale(zoomRef.current, zoomRef.current);

    // 1. Draw legacy background bitmap image if loaded
    if (legacyImageRef.current) {
      ctx.drawImage(legacyImageRef.current, 0, 0);
    }

    // 2. Draw all persistent vector elements
    for (const el of elements) {
      renderElement(ctx, el);
    }

    // 3. Draw active in-progress element
    if (currentElement) {
      renderElement(ctx, currentElement);
    }

    ctx.restore();
  }, [elements, currentElement]);

  // Trigger re-render whenever elements, pan, or zoom change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, pan, zoom]);

  // Re-render infinite grid whenever gridType, pan, or zoom change
  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    if (!gridCanvas) return;
    const ctx = gridCanvas.getContext('2d');
    if (!ctx) return;
    renderInfiniteGrid(ctx, gridCanvas.width, gridCanvas.height, pan, zoom, gridType);
  }, [gridType, pan, zoom, renderInfiniteGrid]);

  // Record history state
  const pushElementsToHistory = useCallback((newElements: DrawElement[]) => {
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push([...newElements]);
      if (next.length > 30) next.shift();
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const previousState = history[newIndex];
    if (previousState) {
      setElements([...previousState]);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const nextState = history[newIndex];
    if (nextState) {
      setElements([...nextState]);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Spacebar for quick-pan
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        isSpacePressedRef.current = true;
        setPrevTool((curr) => (curr !== 'pan' ? curr : prevTool));
        setTool('pan');
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) handleRedo();
          else handleUndo();
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          saveCanvas();
        } else if (e.key === '0') {
          e.preventDefault();
          recenterCanvas();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        setTool(prevTool);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isOpen, handleUndo, handleRedo, prevTool]);

  // Initialize whiteboard data and setup viewport sizes
  useEffect(() => {
    if (!isOpen) return;

    setTitle(whiteboard?.title || 'Untitled Study Canvas');
    setShowDeleteConfirm(false);

    const container = containerRef.current;
    const gridCanvas = gridCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!container || !gridCanvas || !drawCanvas) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || (window.innerHeight - 100);

    gridCanvas.width = width;
    gridCanvas.height = height;
    drawCanvas.width = width;
    drawCanvas.height = height;

    // Load existing canvas data
    if (whiteboard?.canvas_data) {
      if (whiteboard.canvas_data.elements && Array.isArray(whiteboard.canvas_data.elements)) {
        setElements(whiteboard.canvas_data.elements);
        setHistory([whiteboard.canvas_data.elements]);
        setHistoryIndex(0);
      } else if (whiteboard.canvas_data.image) {
        // Backwards compatibility for previous image-based boards
        const img = new Image();
        img.onload = () => {
          legacyImageRef.current = img;
          renderCanvas();
        };
        img.src = whiteboard.canvas_data.image;
        setElements([]);
        setHistory([[]]);
        setHistoryIndex(0);
      }

      if (whiteboard.canvas_data.stickies) {
        setStickies(whiteboard.canvas_data.stickies);
      }
      if (whiteboard.canvas_data.gridType) {
        setGridType(whiteboard.canvas_data.gridType);
      }
      if (whiteboard.canvas_data.pan) {
        setPan(whiteboard.canvas_data.pan);
      }
      if (whiteboard.canvas_data.zoom) {
        setZoom(whiteboard.canvas_data.zoom);
      }
    } else {
      setElements([]);
      setHistory([[]]);
      setHistoryIndex(0);
      setPan({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [isOpen, whiteboard]);

  // Window Resize listener to update canvas buffer dimensions
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      const container = containerRef.current;
      const gridCanvas = gridCanvasRef.current;
      const drawCanvas = drawCanvasRef.current;
      if (!container || !gridCanvas || !drawCanvas) return;

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || (window.innerHeight - 100);

      gridCanvas.width = width;
      gridCanvas.height = height;
      drawCanvas.width = width;
      drawCanvas.height = height;

      const gridCtx = gridCanvas.getContext('2d');
      if (gridCtx) renderInfiniteGrid(gridCtx, width, height, panRef.current, zoomRef.current, gridType);
      renderCanvas();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, gridType, renderInfiniteGrid, renderCanvas]);

  // Trackpad / Mouse Wheel Zoom & Pan Listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Trackpad pinch-to-zoom or Ctrl+Wheel zoom towards cursor position
        const zoomDelta = -e.deltaY * 0.005;
        const currentZoom = zoomRef.current;
        const newZoom = Math.min(5.0, Math.max(0.15, currentZoom * (1 + zoomDelta)));

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Keep point under cursor invariant
        const newPanX = mouseX - ((mouseX - panRef.current.x) / currentZoom) * newZoom;
        const newPanY = mouseY - ((mouseY - panRef.current.y) / currentZoom) * newZoom;

        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      } else {
        // Standard two-finger trackpad or wheel pan
        setPan((p) => ({
          x: p.x - e.deltaX,
          y: p.y - e.deltaY,
        }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  // Erase elements near point
  const eraseNearPoint = (worldX: number, worldY: number) => {
    const eraseRadius = (strokeWidth * 6) / zoomRef.current;
    setElements((prev) => {
      const filtered = prev.filter((el) => {
        if (el.points && el.points.length > 0) {
          // Check if any point is within erase radius
          return !el.points.some(
            (p) => Math.hypot(p.x - worldX, p.y - worldY) <= eraseRadius
          );
        }
        if (el.x !== undefined && el.y !== undefined) {
          const w = el.width || 20;
          const h = el.height || 20;
          return !(
            worldX >= el.x - eraseRadius &&
            worldX <= el.x + w + eraseRadius &&
            worldY >= el.y - eraseRadius &&
            worldY <= el.y + h + eraseRadius
          );
        }
        return true;
      });

      if (filtered.length !== prev.length) {
        pushElementsToHistory(filtered);
      }
      return filtered;
    });
  };

  // Mouse Down / Pointer Down handler
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingStickyId) return;

    // Middle-click or Hand tool triggers panning
    if (e.button === 1 || tool === 'pan' || isSpacePressedRef.current) {
      isInteractingRef.current = true;
      interactionModeRef.current = 'pan';
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button !== 0) return; // Only process left click

    const world = screenToWorld(e.clientX, e.clientY);

    // Text tool
    if (tool === 'text') {
      setActiveTextInput({ x: world.x, y: world.y, text: '' });
      return;
    }

    // Eraser tool
    if (tool === 'eraser') {
      isInteractingRef.current = true;
      interactionModeRef.current = 'draw';
      eraseNearPoint(world.x, world.y);
      return;
    }

    // Drawing / Shapes tools
    isInteractingRef.current = true;
    interactionModeRef.current = 'draw';

    const newId = `el_${Date.now()}_${Math.random()}`;

    if (tool === 'pen' || tool === 'highlighter') {
      setCurrentElement({
        id: newId,
        type: tool,
        points: [world],
        color,
        strokeWidth,
      });
    } else if (tool === 'rect' || tool === 'circle') {
      setCurrentElement({
        id: newId,
        type: tool,
        x: world.x,
        y: world.y,
        width: 0,
        height: 0,
        color,
        strokeWidth,
      });
    } else if (tool === 'arrow' || tool === 'line') {
      setCurrentElement({
        id: newId,
        type: tool,
        x: world.x,
        y: world.y,
        toX: world.x,
        toY: world.y,
        color,
        strokeWidth,
      });
    }
  };

  // Mouse Move handler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isInteractingRef.current) return;

    if (interactionModeRef.current === 'pan') {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      return;
    }

    const world = screenToWorld(e.clientX, e.clientY);

    if (tool === 'eraser') {
      eraseNearPoint(world.x, world.y);
      return;
    }

    if (!currentElement) return;

    if (currentElement.type === 'pen' || currentElement.type === 'highlighter') {
      setCurrentElement((prev) =>
        prev ? { ...prev, points: [...(prev.points || []), world] } : null
      );
    } else if (currentElement.type === 'rect' || currentElement.type === 'circle') {
      const startX = currentElement.x || 0;
      const startY = currentElement.y || 0;
      setCurrentElement((prev) =>
        prev
          ? {
              ...prev,
              width: world.x - startX,
              height: world.y - startY,
            }
          : null
      );
    } else if (currentElement.type === 'arrow' || currentElement.type === 'line') {
      setCurrentElement((prev) =>
        prev
          ? {
              ...prev,
              toX: world.x,
              toY: world.y,
            }
          : null
      );
    }
  };

  // Mouse Up handler
  const handleMouseUp = () => {
    if (!isInteractingRef.current) return;
    isInteractingRef.current = false;

    if (interactionModeRef.current === 'draw' && currentElement) {
      setElements((prev) => {
        const updated = [...prev, currentElement];
        pushElementsToHistory(updated);
        return updated;
      });
      setCurrentElement(null);
    }
    interactionModeRef.current = 'none';
  };

  // Mobile Multi-Touch Handlers (Smooth 2-finger pan & pinch-to-zoom)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (draggingStickyId) return;

    if (e.touches.length === 2) {
      // 2 Fingers -> Gesture Mode: Pan & Pinch-to-Zoom
      isInteractingRef.current = false;
      setCurrentElement(null);

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };

      touchStateRef.current = {
        mode: 'pinch',
        initialDist: dist,
        initialZoom: zoomRef.current,
        initialPan: { ...panRef.current },
        initialCenter: center,
      };
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStateRef.current.mode = tool === 'pan' ? 'pan' : 'draw';

      if (tool === 'pan') {
        isInteractingRef.current = true;
        interactionModeRef.current = 'pan';
        lastMousePosRef.current = { x: touch.clientX, y: touch.clientY };
        return;
      }

      const world = screenToWorld(touch.clientX, touch.clientY);

      if (tool === 'text') {
        setActiveTextInput({ x: world.x, y: world.y, text: '' });
        return;
      }

      if (tool === 'eraser') {
        isInteractingRef.current = true;
        interactionModeRef.current = 'draw';
        eraseNearPoint(world.x, world.y);
        return;
      }

      isInteractingRef.current = true;
      interactionModeRef.current = 'draw';
      const newId = `el_${Date.now()}_${Math.random()}`;

      if (tool === 'pen' || tool === 'highlighter') {
        setCurrentElement({
          id: newId,
          type: tool,
          points: [world],
          color,
          strokeWidth,
        });
      } else if (tool === 'rect' || tool === 'circle') {
        setCurrentElement({
          id: newId,
          type: tool,
          x: world.x,
          y: world.y,
          width: 0,
          height: 0,
          color,
          strokeWidth,
        });
      } else if (tool === 'arrow' || tool === 'line') {
        setCurrentElement({
          id: newId,
          type: tool,
          x: world.x,
          y: world.y,
          toX: world.x,
          toY: world.y,
          color,
          strokeWidth,
        });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && touchStateRef.current.mode === 'pinch') {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };

      const scale = dist / touchStateRef.current.initialDist;
      const newZoom = Math.min(5.0, Math.max(0.15, touchStateRef.current.initialZoom * scale));

      // Calculate pan delta from initial pinch center
      const centerOffsetX = center.x - touchStateRef.current.initialCenter.x;
      const centerOffsetY = center.y - touchStateRef.current.initialCenter.y;

      const mouseWorldX = (touchStateRef.current.initialCenter.x - rect.left - touchStateRef.current.initialPan.x) / touchStateRef.current.initialZoom;
      const mouseWorldY = (touchStateRef.current.initialCenter.y - rect.top - touchStateRef.current.initialPan.y) / touchStateRef.current.initialZoom;

      const newPanX = center.x - rect.left - mouseWorldX * newZoom + centerOffsetX;
      const newPanY = center.y - rect.top - mouseWorldY * newZoom + centerOffsetY;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
      return;
    }

    if (e.touches.length === 1 && isInteractingRef.current) {
      const touch = e.touches[0];

      if (interactionModeRef.current === 'pan') {
        const dx = touch.clientX - lastMousePosRef.current.x;
        const dy = touch.clientY - lastMousePosRef.current.y;
        lastMousePosRef.current = { x: touch.clientX, y: touch.clientY };
        setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
        return;
      }

      const world = screenToWorld(touch.clientX, touch.clientY);

      if (tool === 'eraser') {
        eraseNearPoint(world.x, world.y);
        return;
      }

      if (!currentElement) return;

      if (currentElement.type === 'pen' || currentElement.type === 'highlighter') {
        setCurrentElement((prev) =>
          prev ? { ...prev, points: [...(prev.points || []), world] } : null
        );
      } else if (currentElement.type === 'rect' || currentElement.type === 'circle') {
        const startX = currentElement.x || 0;
        const startY = currentElement.y || 0;
        setCurrentElement((prev) =>
          prev ? { ...prev, width: world.x - startX, height: world.y - startY } : null
        );
      } else if (currentElement.type === 'arrow' || currentElement.type === 'line') {
        setCurrentElement((prev) =>
          prev ? { ...prev, toX: world.x, toY: world.y } : null
        );
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchStateRef.current.mode === 'pinch') {
      touchStateRef.current.mode = 'none';
      return;
    }

    if (isInteractingRef.current) {
      isInteractingRef.current = false;
      if (interactionModeRef.current === 'draw' && currentElement) {
        setElements((prev) => {
          const updated = [...prev, currentElement];
          pushElementsToHistory(updated);
          return updated;
        });
        setCurrentElement(null);
      }
      interactionModeRef.current = 'none';
    }
  };

  // Recenter to (0, 0) and 100% zoom
  const recenterCanvas = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  // Fit all elements on screen
  const fitContent = () => {
    const container = containerRef.current;
    if (!container || (elements.length === 0 && stickies.length === 0)) {
      recenterCanvas();
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const el of elements) {
      if (el.points) {
        for (const p of el.points) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
      }
      if (el.x !== undefined && el.y !== undefined) {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + (el.width || 0));
        maxY = Math.max(maxY, el.y + (el.height || 0));
      }
    }

    for (const st of stickies) {
      minX = Math.min(minX, st.x);
      minY = Math.min(minY, st.y);
      maxX = Math.max(maxX, st.x + st.width);
      maxY = Math.max(maxY, st.y + st.height);
    }

    if (!isFinite(minX) || !isFinite(maxX)) {
      recenterCanvas();
      return;
    }

    const padding = 80;
    const contentW = Math.max(100, maxX - minX + padding * 2);
    const contentH = Math.max(100, maxY - minY + padding * 2);

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const fitZoom = Math.min(2.0, Math.max(0.2, Math.min(containerW / contentW, containerH / contentH)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const newPanX = containerW / 2 - centerX * fitZoom;
    const newPanY = containerH / 2 - centerY * fitZoom;

    setZoom(fitZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Commit text input to vector elements
  const handleCommitText = () => {
    if (!activeTextInput || !activeTextInput.text.trim()) {
      setActiveTextInput(null);
      return;
    }

    const newEl: DrawElement = {
      id: `el_text_${Date.now()}`,
      type: 'text',
      x: activeTextInput.x,
      y: activeTextInput.y,
      color,
      strokeWidth,
      text: activeTextInput.text.trim(),
    };

    setElements((prev) => {
      const updated = [...prev, newEl];
      pushElementsToHistory(updated);
      return updated;
    });
    setActiveTextInput(null);
  };

  // Add new sticky note
  const handleAddSticky = () => {
    // Place sticky in visible center of viewport
    const container = containerRef.current;
    const centerScreenX = container ? container.clientWidth / 2 : window.innerWidth / 2;
    const centerScreenY = container ? container.clientHeight / 2 : window.innerHeight / 2;
    const worldCenter = screenToWorld(centerScreenX, centerScreenY);

    const newSticky: StickyNoteItem = {
      id: `sticky-${Date.now()}`,
      x: worldCenter.x - 95,
      y: worldCenter.y - 80,
      width: 190,
      height: 160,
      text: '',
      color: STICKY_COLORS[stickies.length % STICKY_COLORS.length].bg,
    };
    setStickies((prev) => [...prev, newSticky]);
  };

  // Sticky Note Dragging (Mouse & Touch)
  const handleStickyPointerDown = (id: string, clientX: number, clientY: number) => {
    const sticky = stickies.find((s) => s.id === id);
    if (!sticky) return;
    setDraggingStickyId(id);
    stickyDragStartRef.current = {
      clientX,
      clientY,
      stickyX: sticky.x,
      stickyY: sticky.y,
    };
  };

  const handleContainerPointerMove = (clientX: number, clientY: number) => {
    if (!draggingStickyId) return;
    const dx = (clientX - stickyDragStartRef.current.clientX) / zoomRef.current;
    const dy = (clientY - stickyDragStartRef.current.clientY) / zoomRef.current;
    setStickies((prev) =>
      prev.map((s) =>
        s.id === draggingStickyId
          ? {
              ...s,
              x: stickyDragStartRef.current.stickyX + dx,
              y: stickyDragStartRef.current.stickyY + dy,
            }
          : s
      )
    );
  };

  const handleContainerPointerUp = () => {
    if (draggingStickyId) {
      setDraggingStickyId(null);
    }
  };

  // Clear Canvas with confirmation
  const handleClearCanvas = () => {
    if (!window.confirm('Clear all drawings and sticky notes on this canvas?')) return;
    setElements([]);
    setStickies([]);
    legacyImageRef.current = null;
    pushElementsToHistory([]);
  };

  // Generate thumbnail snapshot for Vault cards and previews
  const generateSnapshot = (): string => {
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 800;
    thumbCanvas.height = 500;
    const ctx = thumbCanvas.getContext('2d');
    if (!ctx) return '';

    // Render background
    ctx.fillStyle = '#07130E';
    ctx.fillRect(0, 0, 800, 500);

    // Compute bounding box or render current viewport
    ctx.save();
    ctx.translate(panRef.current.x * (800 / (drawCanvasRef.current?.width || 800)), panRef.current.y * (500 / (drawCanvasRef.current?.height || 500)));
    ctx.scale(zoomRef.current * (800 / (drawCanvasRef.current?.width || 800)), zoomRef.current * (500 / (drawCanvasRef.current?.height || 500)));

    if (legacyImageRef.current) {
      ctx.drawImage(legacyImageRef.current, 0, 0);
    }

    for (const el of elements) {
      renderElement(ctx, el);
    }
    ctx.restore();

    return thumbCanvas.toDataURL('image/png', 0.85);
  };

  // Save Canvas to Supabase
  const saveCanvas = async () => {
    setIsSaving(true);
    try {
      const thumbnailDataUrl = generateSnapshot();

      const canvasPayload = {
        elements,
        stickies,
        gridType,
        pan,
        zoom,
        image: thumbnailDataUrl,
      };

      if (whiteboard?.id) {
        const { error } = await supabase
          .from('whiteboards')
          .update({
            title: title.trim() || 'Untitled Study Canvas',
            canvas_data: canvasPayload,
            thumbnail: thumbnailDataUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', whiteboard.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('whiteboards').insert({
          user_id: userId,
          folder_id: currentFolderId,
          title: title.trim() || 'Untitled Study Canvas',
          canvas_data: canvasPayload,
          thumbnail: thumbnailDataUrl,
        });

        if (error) throw error;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaveComplete();
    } catch (err) {
      console.error('Failed to save study whiteboard:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Whiteboard
  const handleDelete = async () => {
    if (!whiteboard?.id) {
      onClose();
      return;
    }
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('whiteboards').delete().eq('id', whiteboard.id);
      if (error) throw error;
      onSaveComplete();
      onClose();
    } catch (err) {
      console.error('Failed to delete canvas:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Export to high-res PNG image
  const exportImage = () => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = drawCanvas.width;
    exportCanvas.height = drawCanvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Draw background grid
    renderInfiniteGrid(ctx, exportCanvas.width, exportCanvas.height, pan, zoom, gridType);

    // Draw elements
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    if (legacyImageRef.current) {
      ctx.drawImage(legacyImageRef.current, 0, 0);
    }

    for (const el of elements) {
      renderElement(ctx, el);
    }

    // Render stickies onto export canvas
    stickies.forEach((st) => {
      ctx.fillStyle = st.color;
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 8;
      ctx.fillRect(st.x, st.y, st.width, st.height);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#10231A';
      ctx.font = '12px Inter, sans-serif';
      const lines = st.text.split('\n');
      lines.forEach((l, idx) => {
        ctx.fillText(l, st.x + 12, st.y + 24 + idx * 16);
      });
    });

    ctx.restore();

    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '_') || 'infinite_study_canvas'}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-vault-bg w-screen h-screen overflow-hidden animate-in fade-in duration-200 select-none">
      {/* 1. Full-Screen Studio Top Navigation */}
      <header className="h-14 px-3 sm:px-6 flex items-center justify-between border-b border-vault-border bg-vault-surface shrink-0 gap-2 z-20">
        {/* Left: Study Badge & Editable Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-vault-accent/10 border border-vault-accent/30 flex items-center justify-center text-vault-accent shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-vault-accent font-mono">
                Infinite Canvas
              </span>
              <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">&bull; 2D Space</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Canvas Title..."
              className="bg-transparent border-none outline-none font-heading font-semibold text-xs sm:text-sm text-vault-text focus:ring-1 focus:ring-vault-primary rounded px-1 -ml-1 truncate max-w-[150px] sm:max-w-xs"
            />
          </div>
        </div>

        {/* Center: Paper Grid Selector */}
        <div className="hidden md:flex items-center bg-vault-card/80 p-0.5 rounded-xl border border-vault-border text-xs">
          <span className="px-2 text-[10px] uppercase font-mono text-muted-foreground/80 font-bold">Paper:</span>
          {(['dots', 'ruled', 'math', 'cornell', 'blank'] as GridType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setGridType(type)}
              className={`px-2 py-1 rounded-lg text-xs capitalize transition ${
                gridType === type
                  ? 'bg-vault-surface text-vault-primary font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-vault-text'
              }`}
            >
              {type === 'dots' ? 'Dot Grid' : type === 'ruled' ? 'Lined' : type === 'math' ? 'Math Grid' : type === 'cornell' ? 'Cornell' : 'Blank'}
            </button>
          ))}
        </div>

        {/* Right: Actions (Undo/Redo, Export, Save, Delete, Close) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Undo / Redo */}
          <div className="flex items-center bg-vault-card/50 rounded-xl border border-vault-border p-0.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo (Ctrl+Z)"
              className="p-1.5 text-muted-foreground hover:text-vault-text rounded-lg transition disabled:opacity-30"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Y)"
              className="p-1.5 text-muted-foreground hover:text-vault-text rounded-lg transition disabled:opacity-30"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export PNG */}
          <button
            type="button"
            onClick={exportImage}
            title="Export High-Res PNG"
            className="p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl transition"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Delete Button */}
          {whiteboard?.id && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete Canvas"
              className="p-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Save Button */}
          <button
            type="button"
            onClick={saveCanvas}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-vault-primary hover:bg-vault-primary/90 text-vault-bg text-xs font-bold rounded-xl shadow-md transition disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span className="hidden xs:inline">{saved ? 'Saved!' : 'Save'}</span>
          </button>

          {/* Exit Full Screen */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl transition"
            title="Close Canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Delete Confirmation Alert Bar */}
      {showDeleteConfirm && (
        <div className="px-4 py-2 bg-rose-950/70 border-b border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-200 z-20 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Delete this study whiteboard canvas? All drawings will be permanently removed.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2.5 py-1 bg-vault-card hover:bg-vault-surface rounded-lg text-vault-text transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg transition disabled:opacity-50 flex items-center gap-1"
            >
              {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Floating Study Toolbar (Drawing, Shapes, Text, Sticky Notes, Colors, Sizes) */}
      <div className="px-3 sm:px-6 py-2 border-b border-vault-border bg-vault-card/70 flex items-center justify-between flex-wrap gap-2 z-20">
        {/* Left: Study Tools & Shapes */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {/* Hand / Pan Tool */}
          <button
            type="button"
            onClick={() => setTool('pan')}
            className={`p-2 rounded-xl transition flex items-center gap-1 ${
              tool === 'pan'
                ? 'bg-vault-primary text-vault-bg shadow font-bold'
                : 'text-muted-foreground hover:text-vault-text hover:bg-vault-surface'
            }`}
            title="Hand / Pan Tool (Click & drag to explore infinite space)"
          >
            <Hand className="w-4 h-4" />
          </button>

          <div className="h-5 w-[1px] bg-vault-border mx-0.5" />

          {/* Pen */}
          <button
            type="button"
            onClick={() => setTool('pen')}
            className={`p-2 rounded-xl transition ${
              tool === 'pen' ? 'bg-vault-primary text-vault-bg shadow' : 'text-muted-foreground hover:text-vault-text hover:bg-vault-surface'
            }`}
            title="Pen (Freehand writing & notes)"
          >
            <Pen className="w-4 h-4" />
          </button>

          {/* Highlighter */}
          <button
            type="button"
            onClick={() => setTool('highlighter')}
            className={`p-2 rounded-xl transition ${
              tool === 'highlighter' ? 'bg-vault-primary text-vault-bg shadow' : 'text-muted-foreground hover:text-vault-text hover:bg-vault-surface'
            }`}
            title="Highlighter (Semi-transparent glow study marker)"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          {/* Eraser */}
          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-xl transition ${
              tool === 'eraser' ? 'bg-vault-primary text-vault-bg shadow' : 'text-muted-foreground hover:text-vault-text hover:bg-vault-surface'
            }`}
            title="Stroke Eraser (Cleanly erases strokes anywhere in infinite space)"
          >
            <Eraser className="w-4 h-4" />
          </button>

          <div className="h-5 w-[1px] bg-vault-border mx-1" />

          {/* Arrow */}
          <button
            type="button"
            onClick={() => setTool('arrow')}
            className={`p-2 rounded-xl transition ${
              tool === 'arrow' ? 'bg-vault-primary text-vault-bg shadow' : 'text-muted-foreground hover:text-vault-text hover:bg-vault-surface'
            }`}
            title="Arrow (Study diagrams, flowcharts, mind maps)"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Rectangle */}
          <button
            type="button"
            onClick={() => setTool('rect')}
            className={`p-2 rounded-xl transition ${
              tool === 'rect' ? 'bg-vault-primary text-vault-bg shadow' : 'text-muted-foreground hover:text-vault-text hover:bg-vault-surface'
            }`}
            title="Rectangle (Concept blocks & definitions)"
          >
            <Square className="w-4 h-4" />
          </button>

          {/* Circle */}
          <button
            type="button"
            onClick={() => setTool('circle')}
            className={`p-2 rounded-xl transition ${
              tool === 'circle' ? 'bg-vault-primary text-vault-bg shadow' : 'text-muted-foreground hover:text-vault-text hover:bg-vault-surface'
            }`}
            title="Circle (Venn diagrams, focus circles)"
          >
            <Circle className="w-4 h-4" />
          </button>

          {/* Line Divider */}
          <button
            type="button"
            onClick={() => setTool('line')}
            className={`p-2 rounded-xl transition ${
              tool === 'line' ? 'bg-vault-primary text-vault-bg shadow' : 'text-muted-foreground hover:text-vault-text hover:bg-vault-surface'
            }`}
            title="Straight Line"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="h-5 w-[1px] bg-vault-border mx-1" />

          {/* Text Tool */}
          <button
            type="button"
            onClick={() => setTool('text')}
            className={`p-2 rounded-xl transition ${
              tool === 'text' ? 'bg-vault-primary text-vault-bg shadow' : 'text-muted-foreground hover:text-vault-text hover:bg-vault-surface'
            }`}
            title="Type Text Label"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Sticky Flashcard */}
          <button
            type="button"
            onClick={handleAddSticky}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
            title="Add Study Flashcard Sticky Note"
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>+ Sticky</span>
          </button>

          <div className="h-5 w-[1px] bg-vault-border mx-1 hidden sm:block" />

          {/* Color Palette */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {PALETTE_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  setColor(c.value);
                  if (tool === 'eraser' || tool === 'pan') setTool('pen');
                }}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  color === c.value && tool !== 'eraser' && tool !== 'pan' ? 'scale-125 border-vault-text shadow-sm' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>

          <div className="h-5 w-[1px] bg-vault-border mx-1 hidden md:block" />

          {/* Stroke Width Selector */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Width:</span>
            {[2, 4, 8, 16].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setStrokeWidth(w)}
                className={`px-2 py-0.5 rounded-lg border transition ${
                  strokeWidth === w
                    ? 'bg-vault-surface border-vault-primary text-vault-primary font-bold'
                    : 'border-vault-border hover:bg-vault-surface text-muted-foreground'
                }`}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>

        {/* Right: Zoom & Navigation Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-vault-surface rounded-xl border border-vault-border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.15, z * 0.85))}
              className="p-1 hover:text-vault-text text-muted-foreground rounded transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={recenterCanvas}
              className="px-2 font-mono text-[11px] text-muted-foreground hover:text-vault-primary transition select-none"
              title="Click to reset to 100% and Center (0, 0)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(5.0, z * 1.15))}
              className="p-1 hover:text-vault-text text-muted-foreground rounded transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Recenter & Fit Content */}
          <button
            type="button"
            onClick={fitContent}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-vault-primary hover:bg-vault-surface rounded-xl transition border border-vault-border"
            title="Fit all drawings and stickies on screen"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fit All</span>
          </button>

          {/* Clear Canvas */}
          <button
            type="button"
            onClick={handleClearCanvas}
            className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
            title="Clear all drawings and stickies"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* 3. True Infinite Canvas Work Area (Laptop + Mobile) */}
      <div 
        ref={containerRef}
        onMouseMove={(e) => handleContainerPointerMove(e.clientX, e.clientY)}
        onMouseUp={handleContainerPointerUp}
        onTouchMove={(e) => {
          if (e.touches.length === 1) {
            handleContainerPointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={handleContainerPointerUp}
        className={`flex-1 w-full h-full relative overflow-hidden bg-vault-bg touch-none select-none ${
          tool === 'pan' || isSpacePressedRef.current
            ? isInteractingRef.current ? 'cursor-grabbing' : 'cursor-grab'
            : tool === 'text' ? 'cursor-text' : 'cursor-crosshair'
        }`}
      >
        {/* Layer 1: Background Infinite Grid Canvas */}
        <canvas
          ref={gridCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none block"
        />

        {/* Layer 2: Main Active Vector Drawing Canvas */}
        <canvas
          ref={drawCanvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="absolute inset-0 w-full h-full block z-10"
        />

        {/* Layer 3: Interactive Infinite World Objects (Stickies & Text Input) */}
        <div 
          className="absolute inset-0 pointer-events-none z-20 origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* Floating Text Tool Input */}
          {activeTextInput && (
            <div 
              className="absolute pointer-events-auto"
              style={{ left: activeTextInput.x, top: activeTextInput.y }}
            >
              <input
                type="text"
                autoFocus
                placeholder="Type text & press Enter..."
                value={activeTextInput.text}
                onChange={(e) => setActiveTextInput({ ...activeTextInput, text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommitText();
                  if (e.key === 'Escape') setActiveTextInput(null);
                }}
                onBlur={handleCommitText}
                className="bg-vault-card/95 border border-vault-primary text-vault-text text-sm rounded-lg px-2.5 py-1.5 shadow-2xl outline-none min-w-[200px]"
                style={{ color }}
              />
            </div>
          )}

          {/* Interactive Sticky Flashcards */}
          {stickies.map((sticky) => (
            <div
              key={sticky.id}
              style={{
                left: sticky.x,
                top: sticky.y,
                width: sticky.width,
                height: sticky.height,
                backgroundColor: sticky.color,
              }}
              className="absolute pointer-events-auto rounded-2xl p-3 shadow-xl border border-black/10 flex flex-col cursor-move select-none animate-in zoom-in-95 duration-150"
            >
              {/* Sticky Note Top Bar with Drag Handle & Delete */}
              <div 
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleStickyPointerDown(sticky.id, e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (e.touches.length === 1) {
                    handleStickyPointerDown(sticky.id, e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                className="flex items-center justify-between pb-1 mb-1 border-b border-black/10 cursor-grab active:cursor-grabbing text-neutral-800"
              >
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider font-mono opacity-60">
                  <Move className="w-3 h-3" />
                  <span>Flashcard</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStickies((prev) => prev.filter((s) => s.id !== sticky.id))}
                  className="p-1 text-black/50 hover:text-black rounded transition"
                  title="Remove Sticky Note"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sticky Text Area */}
              <textarea
                value={sticky.text}
                onChange={(e) => {
                  const val = e.target.value;
                  setStickies((prev) =>
                    prev.map((s) => (s.id === sticky.id ? { ...s, text: val } : s))
                  );
                }}
                placeholder="Formula, definition, or key study point..."
                className="flex-1 w-full bg-transparent border-none outline-none resize-none text-xs text-neutral-900 placeholder:text-neutral-500 font-medium leading-relaxed"
              />
            </div>
          ))}
        </div>

        {/* Floating Infinite Navigation Compass Overlay (Bottom-Right) */}
        <div className="absolute right-4 bottom-4 z-30 flex flex-col items-end gap-2 pointer-events-auto">
          {/* Navigation Quick Actions */}
          <div className="flex items-center gap-1.5 p-1 bg-vault-surface/90 border border-vault-border rounded-2xl shadow-xl backdrop-blur-md text-xs">
            <button
              type="button"
              onClick={recenterCanvas}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-vault-card hover:bg-vault-primary hover:text-vault-bg text-vault-text font-semibold text-[11px] transition"
              title="Reset Viewport to Origin (0, 0)"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Center</span>
            </button>
            <button
              type="button"
              onClick={fitContent}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-vault-card hover:bg-vault-primary hover:text-vault-bg text-vault-text font-semibold text-[11px] transition"
              title="Fit All Content on Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fit</span>
            </button>
          </div>

          {/* Quick Pan Gesture Hint for Mobile & Laptop */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-vault-surface/75 border border-vault-border/60 text-[10px] text-muted-foreground font-mono backdrop-blur-sm">
            <span>Spacebar + Drag or 2 Fingers to Pan</span>
          </div>
        </div>
      </div>

      {/* 4. Bottom Footer Status Bar */}
      <footer className="h-7 px-4 sm:px-6 bg-vault-surface/90 border-t border-vault-border flex items-center justify-between text-[10px] text-muted-foreground font-mono shrink-0 z-20">
        <div className="flex items-center gap-4">
          <span className="text-vault-primary font-bold">NotesGO Infinite Studio</span>
          <span className="hidden sm:inline">&bull; Tool: <strong className="text-vault-text capitalize">{tool}</strong></span>
          <span className="hidden sm:inline">&bull; Paper: <strong className="text-vault-text capitalize">{gridType}</strong></span>
          <span className="hidden md:inline">&bull; Pan: X: {Math.round(pan.x)}, Y: {Math.round(pan.y)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{elements.length} strokes &bull; {stickies.length} flashcards</span>
          <span className="text-vault-primary font-bold">{Math.round(zoom * 100)}%</span>
        </div>
      </footer>
    </div>
  );
}
