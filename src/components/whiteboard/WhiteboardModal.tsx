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
  Grid,
  FileText,
  AlignLeft,
  Sparkles,
  AlertTriangle,
  Move
} from 'lucide-react';
import { WhiteboardItem } from '@/types/database';

interface StickyNoteItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
}

interface WhiteboardModalProps {
  whiteboard: WhiteboardItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveComplete: () => void;
  userId: string;
  currentFolderId: string | null;
}

type ToolType = 'pen' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'arrow' | 'line' | 'text';
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
  // Canvases
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Core state
  const [title, setTitle] = useState(whiteboard?.title || 'Untitled Study Canvas');
  const [tool, setTool] = useState<ToolType>('pen');
  const [color, setColor] = useState('#2DD4BF');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [gridType, setGridType] = useState<GridType>('dots');
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);

  // History for Undo / Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Sticky notes
  const [stickies, setStickies] = useState<StickyNoteItem[]>([]);
  const [draggingStickyId, setDraggingStickyId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Floating text tool
  const [activeTextInput, setActiveTextInput] = useState<{ x: number; y: number; text: string } | null>(null);

  const supabase = createClient();

  // Draw background study grid
  const renderGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, type: GridType) => {
    ctx.clearRect(0, 0, width, height);

    // Dark forest base background
    ctx.fillStyle = '#07130E';
    ctx.fillRect(0, 0, width, height);

    if (type === 'blank') return;

    if (type === 'dots') {
      // Dot Grid Matrix (standard bullet journal style)
      ctx.fillStyle = 'rgba(45, 212, 191, 0.22)';
      const spacing = 28;
      for (let x = spacing; x < width; x += spacing) {
        for (let y = spacing; y < height; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (type === 'ruled') {
      // Ruled Notebook Paper with left margin line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      const lineSpacing = 30;
      for (let y = lineSpacing * 2; y < height; y += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Vertical pink margin line
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(70, 0);
      ctx.lineTo(70, height);
      ctx.stroke();
    } else if (type === 'math') {
      // Math & Engineering Grid Paper
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.12)';
      ctx.lineWidth = 0.8;
      const cellSize = 24;
      for (let x = cellSize; x < width; x += cellSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = cellSize; y < height; y += cellSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (type === 'cornell') {
      // Cornell Study Notes Layout
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;

      // Header line
      ctx.beginPath();
      ctx.moveTo(0, 65);
      ctx.lineTo(width, 65);
      ctx.stroke();

      // Cue / Questions column line (left 28%)
      const cueX = Math.max(160, Math.floor(width * 0.28));
      ctx.beginPath();
      ctx.moveTo(cueX, 65);
      ctx.lineTo(cueX, height - 90);
      ctx.stroke();

      // Summary box line at bottom
      ctx.beginPath();
      ctx.moveTo(0, height - 90);
      ctx.lineTo(width, height - 90);
      ctx.stroke();

      // Notes area ruled lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      const lineSpacing = 28;
      for (let y = 65 + lineSpacing; y < height - 90; y += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(cueX, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Column labels
      ctx.fillStyle = 'rgba(45, 212, 191, 0.4)';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('HEADER / TITLE', 20, 40);
      ctx.fillText('CUES / QUESTIONS', 20, 85);
      ctx.fillText('NOTES / DERIVATIONS', cueX + 20, 85);
      ctx.fillText('SUMMARY', 20, height - 70);
    }
  }, []);

  // Save current drawing canvas state to history stack
  const pushToHistory = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(snap);
        if (next.length > 25) next.shift(); // keep max 25 states
        return next;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 24));
    } catch (e) {
      console.warn('Could not record history frame:', e);
    }
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newIndex = historyIndex - 1;
    const previousState = history[newIndex];
    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newIndex = historyIndex + 1;
    const nextState = history[newIndex];
    if (nextState) {
      ctx.putImageData(nextState, 0, 0);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  // Keyboard shortcut listener (Ctrl+Z, Ctrl+Y, Ctrl+S)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          saveCanvas();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleUndo, handleRedo]);

  // Initialize and resize canvases
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

    const gridCtx = gridCanvas.getContext('2d');
    const drawCtx = drawCanvas.getContext('2d');
    if (!gridCtx || !drawCtx) return;

    renderGrid(gridCtx, width, height, gridType);

    // Load existing drawing and stickies if available
    if (whiteboard?.canvas_data) {
      if (whiteboard.canvas_data.image) {
        const img = new Image();
        img.onload = () => {
          drawCtx.clearRect(0, 0, width, height);
          drawCtx.drawImage(img, 0, 0);
          pushToHistory();
        };
        img.src = whiteboard.canvas_data.image;
      } else {
        pushToHistory();
      }

      if (whiteboard.canvas_data.stickies) {
        setStickies(whiteboard.canvas_data.stickies);
      }
      if (whiteboard.canvas_data.gridType) {
        setGridType(whiteboard.canvas_data.gridType);
      }
    } else {
      drawCtx.clearRect(0, 0, width, height);
      pushToHistory();
    }
  }, [isOpen, whiteboard]);

  // Re-render grid whenever gridType changes
  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    if (!gridCanvas) return;
    const ctx = gridCanvas.getContext('2d');
    if (!ctx) return;
    renderGrid(ctx, gridCanvas.width, gridCanvas.height, gridType);
  }, [gridType, renderGrid]);

  // Extract mouse/touch coordinates scaled by zoom
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  };

  // Draw arrow helper
  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headLen = Math.max(12, strokeWidth * 3.5);
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

  // Start interaction
  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    // Text tool handles click-to-type
    if (tool === 'text') {
      setActiveTextInput({ x, y, text: '' });
      return;
    }

    setIsDrawing(true);
    startPosRef.current = { x, y };

    // Capture snapshot for shape previews
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  // Move / Draw
  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    if (tool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth * 4.5;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'bevel';
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      // Destination-out cleanly erases ink while leaving the study paper grid completely intact!
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = strokeWidth * 5;
      ctx.lineCap = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (snapshotRef.current && startPosRef.current) {
      // Shape previews (Rect, Circle, Arrow, Line)
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const sx = startPosRef.current.x;
      const sy = startPosRef.current.y;

      if (tool === 'rect') {
        ctx.strokeRect(sx, sy, x - sx, y - sy);
      } else if (tool === 'circle') {
        const radiusX = Math.abs(x - sx) / 2;
        const radiusY = Math.abs(y - sy) / 2;
        const centerX = sx + (x - sx) / 2;
        const centerY = sy + (y - sy) / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tool === 'arrow') {
        drawArrow(ctx, sx, sy, x, y);
      } else if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  // Finish interaction
  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    startPosRef.current = null;
    snapshotRef.current = null;
    pushToHistory();
  };

  // Stamp floating text onto canvas
  const handleCommitText = () => {
    if (!activeTextInput || !activeTextInput.text.trim()) {
      setActiveTextInput(null);
      return;
    }
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = color;
    ctx.font = `${Math.max(16, strokeWidth * 5)}px Sora, Inter, sans-serif`;
    ctx.fillText(activeTextInput.text, activeTextInput.x, activeTextInput.y + 16);

    setActiveTextInput(null);
    pushToHistory();
  };

  // Add new sticky flashcard
  const handleAddSticky = () => {
    const newSticky: StickyNoteItem = {
      id: `sticky-${Date.now()}`,
      x: 60 + (stickies.length % 5) * 40,
      y: 80 + (stickies.length % 5) * 40,
      width: 190,
      height: 160,
      text: '',
      color: STICKY_COLORS[stickies.length % STICKY_COLORS.length].bg,
    };
    setStickies((prev) => [...prev, newSticky]);
  };

  // Sticky note dragging
  const handleStickyPointerDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingStickyId(id);
    const sticky = stickies.find((s) => s.id === id);
    if (sticky) {
      dragOffsetRef.current = {
        x: e.clientX - sticky.x,
        y: e.clientY - sticky.y,
      };
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!draggingStickyId) return;
    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;
    setStickies((prev) =>
      prev.map((s) => (s.id === draggingStickyId ? { ...s, x: Math.max(10, newX), y: Math.max(10, newY) } : s))
    );
  };

  const handleContainerMouseUp = () => {
    if (draggingStickyId) {
      setDraggingStickyId(null);
    }
  };

  // Clear Canvas with confirmation
  const handleClearCanvas = () => {
    if (!window.confirm('Clear all drawings and sticky notes on this canvas?')) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStickies([]);
    pushToHistory();
  };

  // Save Whiteboard Canvas
  const saveCanvas = async () => {
    const gridCanvas = gridCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!gridCanvas || !drawCanvas || !userId) return;

    setIsSaving(true);

    try {
      // Merge grid + drawings + stickies onto a single high-res export canvas
      const mergedCanvas = document.createElement('canvas');
      mergedCanvas.width = drawCanvas.width;
      mergedCanvas.height = drawCanvas.height;
      const mCtx = mergedCanvas.getContext('2d');

      if (mCtx) {
        // 1. Grid
        mCtx.drawImage(gridCanvas, 0, 0);
        // 2. Drawing strokes
        mCtx.drawImage(drawCanvas, 0, 0);
        // 3. Render stickies onto canvas image
        stickies.forEach((st) => {
          mCtx.fillStyle = st.color;
          mCtx.shadowColor = 'rgba(0,0,0,0.2)';
          mCtx.shadowBlur = 8;
          mCtx.fillRect(st.x, st.y, st.width, st.height);
          mCtx.shadowBlur = 0;

          mCtx.fillStyle = '#10231A';
          mCtx.font = '12px Inter, sans-serif';
          const lines = st.text.split('\n');
          lines.forEach((l, idx) => {
            mCtx.fillText(l, st.x + 12, st.y + 24 + idx * 16);
          });
        });
      }

      const dataUrl = mergedCanvas.toDataURL('image/png');

      const canvasPayload = {
        image: dataUrl,
        gridType,
        stickies,
      };

      if (whiteboard?.id) {
        const { error } = await supabase
          .from('whiteboards')
          .update({
            title: title.trim() || 'Untitled Study Canvas',
            canvas_data: canvasPayload,
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
    const gridCanvas = gridCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!gridCanvas || !drawCanvas) return;

    const merged = document.createElement('canvas');
    merged.width = drawCanvas.width;
    merged.height = drawCanvas.height;
    const ctx = merged.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(gridCanvas, 0, 0);
    ctx.drawImage(drawCanvas, 0, 0);

    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '_') || 'study_canvas'}.png`;
    link.href = merged.toDataURL('image/png');
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
                Study Whiteboard
              </span>
              <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">&bull; Full Screen</span>
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
            title="Eraser (Erases ink without erasing grid paper)"
          >
            <Eraser className="w-4 h-4" />
          </button>

          <div className="h-5 w-[1px] bg-vault-border mx-1" />

          {/* Arrow (Critical for study diagrams) */}
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

          {/* Rectangle / Concept Box */}
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

          {/* Circle / Venn */}
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
                  if (tool === 'eraser') setTool('pen');
                }}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  color === c.value && tool !== 'eraser' ? 'scale-125 border-vault-text shadow-sm' : 'border-transparent hover:scale-110'
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

        {/* Right: Zoom & Clear */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-vault-surface rounded-xl border border-vault-border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
              className="p-1 hover:text-vault-text text-muted-foreground rounded transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] text-muted-foreground select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              className="p-1 hover:text-vault-text text-muted-foreground rounded transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-vault-primary transition font-mono border-l border-vault-border/50"
              title="Reset Zoom"
            >
              100%
            </button>
          </div>

          {/* Clear Canvas */}
          <button
            type="button"
            onClick={handleClearCanvas}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
            title="Clear all drawings"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* 3. Infinite Full-Screen Canvas Work Area */}
      <div 
        ref={containerRef}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        className="flex-1 w-full h-full relative overflow-hidden bg-vault-bg cursor-crosshair touch-none select-none"
      >
        <div 
          className="absolute inset-0 origin-top-left transition-transform duration-75"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Layer 1: Background Grid Canvas */}
          <canvas
            ref={gridCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Layer 2: Main Active Drawing Canvas */}
          <canvas
            ref={drawCanvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className="absolute inset-0 w-full h-full block"
          />

          {/* Floating Text Tool Input */}
          {activeTextInput && (
            <div 
              className="absolute z-30"
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
                className="bg-vault-card/90 border border-vault-primary text-vault-text text-sm rounded-lg px-2.5 py-1.5 shadow-2xl outline-none min-w-[200px]"
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
              className="absolute z-20 rounded-2xl p-3 shadow-xl border border-black/10 flex flex-col cursor-move select-none animate-in zoom-in-95 duration-150"
            >
              {/* Sticky Note Top Bar with Drag Handle & Delete */}
              <div 
                onMouseDown={(e) => handleStickyPointerDown(sticky.id, e)}
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
      </div>

      {/* 4. Bottom Footer Status Bar */}
      <footer className="h-7 px-4 sm:px-6 bg-vault-surface/90 border-t border-vault-border flex items-center justify-between text-[10px] text-muted-foreground font-mono shrink-0 z-20">
        <div className="flex items-center gap-4">
          <span className="text-vault-primary font-bold">NotesGO Study Studio</span>
          <span className="hidden sm:inline">&bull; Active Tool: <strong className="text-vault-text capitalize">{tool}</strong></span>
          <span className="hidden sm:inline">&bull; Paper: <strong className="text-vault-text capitalize">{gridType}</strong></span>
        </div>
        <div className="flex items-center gap-3">
          <span>{stickies.length} flashcards</span>
          <span>Ctrl+Z Undo &bull; Ctrl+S Save</span>
        </div>
      </footer>
    </div>
  );
}
