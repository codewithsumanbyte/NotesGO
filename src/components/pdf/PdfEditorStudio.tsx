'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileItem } from '@/types/database';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  MousePointer,
  Pen, 
  Highlighter, 
  Type, 
  StickyNote, 
  Eraser, 
  Undo2, 
  Redo2, 
  Save, 
  Download, 
  CheckCircle2, 
  Loader2, 
  Trash2, 
  Hand, 
  FileText,
  FileCheck,
  Palette,
  Sliders,
  Sparkles,
  Layers,
  Edit3,
  X,
  Move,
  CornerDownRight,
  ArrowRight,
  Check
} from 'lucide-react';

interface PdfAnnotationStroke {
  id: string;
  tool: 'pen' | 'highlighter';
  color: string;
  width: number;
  opacity: number;
  // Normalized coordinates (0.0 to 1.0) relative to page width and height
  points: { x: number; y: number }[];
}

interface PdfTextNote {
  id: string;
  x: number; // 0.0 to 1.0
  y: number; // 0.0 to 1.0
  text: string;
  color: string;
  fontSize: number;
}

interface PdfStickyNote {
  id: string;
  x: number; // 0.0 to 1.0
  y: number; // 0.0 to 1.0
  text: string;
  color: string;
  isOpen: boolean;
}

interface PageAnnotationData {
  strokes: PdfAnnotationStroke[];
  textNotes: PdfTextNote[];
  stickyNotes: PdfStickyNote[];
}

type AnnotationTool = 'hand' | 'select' | 'pen' | 'highlighter' | 'text' | 'sticky' | 'eraser';

interface SelectedAnnotation {
  type: 'stroke' | 'text' | 'sticky';
  id: string;
}

interface PdfEditorStudioProps {
  file: FileItem;
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onFileUpdated?: (updatedFile: FileItem) => void;
}

const PALETTE = [
  '#2DD4BF', // Mint Primary
  '#4ADE80', // Emerald Accent
  '#FDE047', // Yellow Highlighter
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#38BDF8', // Sky Blue
  '#A855F7', // Purple
  '#FFFFFF', // White
  '#000000', // Black
];

export function PdfEditorStudio({
  file,
  isOpen,
  onClose,
  userId,
  onFileUpdated,
}: PdfEditorStudioProps) {
  const [pdfLibLoaded, setPdfLibLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [renderingPage, setRenderingPage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PDF Document State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [naturalPageDimensions, setNaturalPageDimensions] = useState<{ width: number; height: number }>({ width: 595, height: 842 });

  // Tool State (Includes new 'select' tool for re-editing previous changes)
  const [activeTool, setActiveTool] = useState<AnnotationTool>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#2DD4BF');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [fontSize, setFontSize] = useState<number>(16);

  // Selection & Re-Editing State
  const [selectedItem, setSelectedItem] = useState<SelectedAnnotation | null>(null);
  const [editingTextNote, setEditingTextNote] = useState<PdfTextNote | null>(null);
  const [editingStickyNote, setEditingStickyNote] = useState<PdfStickyNote | null>(null);
  const [isAnnotationsDrawerOpen, setIsAnnotationsDrawerOpen] = useState(false);

  // Mobile drawer / subtool menus
  const [showColorPickerMobile, setShowColorPickerMobile] = useState(false);
  const [showStrokeSliderMobile, setShowStrokeSliderMobile] = useState(false);

  // Swipe page flip indicator
  const [swipeHint, setSwipeHint] = useState<'next' | 'prev' | null>(null);

  // Annotations Ground Truth (PageNumber -> Data)
  const [annotations, setAnnotations] = useState<Record<number, PageAnnotationData>>({});
  const annotationsRef = useRef<Record<number, PageAnnotationData>>({});

  // History for Undo/Redo per page
  const [history, setHistory] = useState<Record<number, PageAnnotationData[]>>({});
  const [historyStep, setHistoryStep] = useState<Record<number, number>>({});

  // Saving states & Auto-Save
  const [isSavingToFile, setIsSavingToFile] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [savedSuccessToast, setSavedSuccessToast] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Jump page input
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');

  // DOM & Canvas Refs
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageWrapperRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  // PDF Bytes Refs: Pristine base bytes prevents duplicate baked layers on multiple saves!
  const cleanBasePdfBytesRef = useRef<ArrayBuffer | null>(null);
  const activePdfBytesRef = useRef<ArrayBuffer | null>(null);

  // Touch, Gesture & Drag Interaction Refs
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<PdfAnnotationStroke | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number; time: number } | null>(null);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1.2);
  const isDraggingSelectedItemRef = useRef(false);
  const dragStartNormCoordsRef = useRef<{ x: number; y: number } | null>(null);

  const supabase = createClient();

  // 1. Dynamically Load PDF.js from CDN
  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
      setPdfLibLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      if (pdfjs) {
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        setPdfLibLoaded(true);
      }
    };
    script.onerror = () => {
      setError('Could not load PDF rendering engine. Please check internet connection.');
      setLoading(false);
    };
    document.body.appendChild(script);
  }, [isOpen]);

  // 2. Fetch and Load PDF Document Binary and Annotations
  useEffect(() => {
    if (!isOpen || !pdfLibLoaded || !file) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadPdfAndAnnotations() {
      try {
        // Download current PDF binary
        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from('vault')
          .download(file.storage_path);

        if (downloadError) throw downloadError;
        if (!isMounted) return;

        const arrayBuffer = await fileBlob.arrayBuffer();
        cleanBasePdfBytesRef.current = arrayBuffer.slice(0);
        activePdfBytesRef.current = arrayBuffer.slice(0);
        const uint8Array = new Uint8Array(arrayBuffer);

        const pdfjs = (window as any).pdfjsLib;
        const loadingTask = pdfjs.getDocument({
          data: uint8Array,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
        });

        const loadedDoc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(loadedDoc);
        setNumPages(loadedDoc.numPages);
        setCurrentPage(1);
        setJumpPageInput('1');

        // Initial scale calculation (Fit width on mobile screens)
        try {
          const firstPage = await loadedDoc.getPage(1);
          const naturalViewport = firstPage.getViewport({ scale: 1.0 });
          setNaturalPageDimensions({ width: naturalViewport.width, height: naturalViewport.height });

          const viewportWidth = window.innerWidth || 400;
          const isMobile = viewportWidth < 768;
          const targetWidth = isMobile ? viewportWidth - 24 : Math.min(viewportWidth - 120, 850);
          const initialScale = Math.max(0.6, Math.min(2.0, targetWidth / naturalViewport.width));
          setScale(Number(initialScale.toFixed(2)));
        } catch {}

        // Load Saved Annotations from LocalStorage AND Supabase Cloud Storage
        const localKey = `notesgo_annotations_${file.id}`;
        const cached = localStorage.getItem(localKey);
        let loadedAnnots: Record<number, PageAnnotationData> = cached ? JSON.parse(cached) : {};

        try {
          const cloudPath = `${userId}/annotations/${file.id}.json`;
          const { data: cloudBlob } = await supabase.storage.from('vault').download(cloudPath);
          if (cloudBlob) {
            const cloudText = await cloudBlob.text();
            const cloudAnnots = JSON.parse(cloudText);
            loadedAnnots = { ...loadedAnnots, ...cloudAnnots };
          }
        } catch {}

        if (isMounted) {
          annotationsRef.current = loadedAnnots;
          setAnnotations(loadedAnnots);
          setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          setHasUnsavedChanges(false);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('PDF document load error:', err);
        if (isMounted) {
          setError(err.message || 'Failed to download or parse PDF document.');
          setLoading(false);
        }
      }
    }

    loadPdfAndAnnotations();

    return () => {
      isMounted = false;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isOpen, pdfLibLoaded, file, userId, supabase]);

  // 3. Render Current Page
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !pdfCanvasRef.current || !annotationCanvasRef.current) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    setRenderingPage(true);

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });

      const pdfCanvas = pdfCanvasRef.current;
      const annotCanvas = annotationCanvasRef.current;
      if (!pdfCanvas || !annotCanvas) return;

      const pdfCtx = pdfCanvas.getContext('2d');
      if (!pdfCtx) return;

      pdfCanvas.width = viewport.width;
      pdfCanvas.height = viewport.height;
      annotCanvas.width = viewport.width;
      annotCanvas.height = viewport.height;

      setNaturalPageDimensions({ width: viewport.width / scale, height: viewport.height / scale });

      const renderTask = page.render({
        canvasContext: pdfCtx,
        viewport,
      });

      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;

      redrawAnnotations();
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Render page error:', err);
      }
    } finally {
      setRenderingPage(false);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    if (!loading && pdfDoc) {
      renderCurrentPage();
    }
  }, [loading, pdfDoc, currentPage, scale, renderCurrentPage]);

  // Helper to get stroke bounding box in normalized coordinates
  const getStrokeBounds = (stroke: PdfAnnotationStroke) => {
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    stroke.points.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    return { minX, minY, maxX, maxY };
  };

  // 4. Redraw Annotation Canvas from Normalized Points + Selection Highlighting
  const redrawAnnotations = useCallback(() => {
    const annotCanvas = annotationCanvasRef.current;
    if (!annotCanvas) return;
    const ctx = annotCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, annotCanvas.width, annotCanvas.height);

    const pageData = annotationsRef.current[currentPage];
    if (!pageData) return;

    const width = annotCanvas.width;
    const height = annotCanvas.height;

    pageData.strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      const isSelected = selectedItem?.type === 'stroke' && selectedItem.id === stroke.id;

      ctx.save();
      ctx.beginPath();

      const getPtX = (p: { x: number; y: number }) => (p.x <= 1.0 ? p.x * width : p.x * (scale / 1.2));
      const getPtY = (p: { x: number; y: number }) => (p.y <= 1.0 ? p.y * height : p.y * (scale / 1.2));

      ctx.moveTo(getPtX(stroke.points[0]), getPtY(stroke.points[0]));

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(getPtX(stroke.points[i]), getPtY(stroke.points[i]));
      }

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width * (scale / 1.0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = 0.4;
        ctx.globalCompositeOperation = 'multiply';
      } else {
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.stroke();
      ctx.restore();

      // If stroke is currently selected, draw sleek glowing selection bounding box!
      if (isSelected) {
        const bounds = getStrokeBounds(stroke);
        const padding = 10;
        const boxX = bounds.minX * width - padding;
        const boxY = bounds.minY * height - padding;
        const boxW = (bounds.maxX - bounds.minX) * width + padding * 2;
        const boxH = (bounds.maxY - bounds.minY) * height + padding * 2;

        ctx.save();
        ctx.strokeStyle = '#2DD4BF';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Selection handle corners
        ctx.fillStyle = '#2DD4BF';
        const hSize = 8;
        ctx.fillRect(boxX - hSize / 2, boxY - hSize / 2, hSize, hSize);
        ctx.fillRect(boxX + boxW - hSize / 2, boxY - hSize / 2, hSize, hSize);
        ctx.fillRect(boxX - hSize / 2, boxY + boxH - hSize / 2, hSize, hSize);
        ctx.fillRect(boxX + boxW - hSize / 2, boxY + boxH - hSize / 2, hSize, hSize);
        ctx.restore();
      }
    });
  }, [currentPage, scale, selectedItem]);

  useEffect(() => {
    redrawAnnotations();
  }, [redrawAnnotations, annotations, selectedItem]);

  // Undo / Redo helpers
  const pushToHistory = (newData: PageAnnotationData) => {
    const pageHistory = history[currentPage] || [];
    const currentStep = historyStep[currentPage] ?? (pageHistory.length - 1);
    const newHistory = [...pageHistory.slice(0, currentStep + 1), newData];

    setHistory((prev) => ({ ...prev, [currentPage]: newHistory }));
    setHistoryStep((prev) => ({ ...prev, [currentPage]: newHistory.length - 1 }));
  };

  const markChangesMade = () => {
    setHasUnsavedChanges(true);

    const localKey = `notesgo_annotations_${file.id}`;
    localStorage.setItem(localKey, JSON.stringify(annotationsRef.current));

    if (autoSaveEnabled) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        savePermanentlyIntoPdfFile(false);
      }, 2500);
    }
  };

  const handleUndo = () => {
    const pageHistory = history[currentPage];
    const currentStep = historyStep[currentPage];
    if (!pageHistory || currentStep === undefined || currentStep <= 0) return;

    const prevStep = currentStep - 1;
    const restored = pageHistory[prevStep];
    setHistoryStep((prev) => ({ ...prev, [currentPage]: prevStep }));

    annotationsRef.current[currentPage] = restored;
    setAnnotations({ ...annotationsRef.current });
    setSelectedItem(null);
    markChangesMade();
  };

  const handleRedo = () => {
    const pageHistory = history[currentPage];
    const currentStep = historyStep[currentPage];
    if (!pageHistory || currentStep === undefined || currentStep >= pageHistory.length - 1) return;

    const nextStep = currentStep + 1;
    const restored = pageHistory[nextStep];
    setHistoryStep((prev) => ({ ...prev, [currentPage]: nextStep }));

    annotationsRef.current[currentPage] = restored;
    setAnnotations({ ...annotationsRef.current });
    setSelectedItem(null);
    markChangesMade();
  };

  // Convert client touch/mouse coordinates to Normalized (0.0 to 1.0) page coordinates
  const getNormalizedCoords = (clientX: number, clientY: number) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return { x: 0, y: 0, rawX: 0, rawY: 0 };
    const rect = canvas.getBoundingClientRect();

    const canvasX = (clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (clientY - rect.top) * (canvas.height / rect.height);

    return {
      x: Math.max(0, Math.min(1, canvasX / canvas.width)),
      y: Math.max(0, Math.min(1, canvasY / canvas.height)),
      rawX: canvasX,
      rawY: canvasY,
    };
  };

  // Hit-testing helpers: find items at given normalized position
  const findStrokeAt = (normX: number, normY: number): PdfAnnotationStroke | null => {
    const pageData = annotationsRef.current[currentPage];
    if (!pageData) return null;
    const tolerance = 0.025; // 2.5% of page dimension

    for (let i = pageData.strokes.length - 1; i >= 0; i--) {
      const stroke = pageData.strokes[i];
      const hits = stroke.points.some((p) => Math.hypot(p.x - normX, p.y - normY) < tolerance);
      if (hits) return stroke;
    }
    return null;
  };

  const findTextAt = (normX: number, normY: number): PdfTextNote | null => {
    const pageData = annotationsRef.current[currentPage];
    if (!pageData) return null;

    for (let i = pageData.textNotes.length - 1; i >= 0; i--) {
      const t = pageData.textNotes[i];
      if (Math.hypot(t.x - normX, t.y - normY) < 0.04) return t;
    }
    return null;
  };

  // Deletion helper for selected item
  const handleDeleteSelected = () => {
    if (!selectedItem) return;
    const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };

    let updated = current;
    if (selectedItem.type === 'stroke') {
      updated = { ...current, strokes: current.strokes.filter((s) => s.id !== selectedItem.id) };
    } else if (selectedItem.type === 'text') {
      updated = { ...current, textNotes: current.textNotes.filter((t) => t.id !== selectedItem.id) };
    } else if (selectedItem.type === 'sticky') {
      updated = { ...current, stickyNotes: current.stickyNotes.filter((s) => s.id !== selectedItem.id) };
    }

    annotationsRef.current[currentPage] = updated;
    setAnnotations({ ...annotationsRef.current });
    pushToHistory(updated);
    setSelectedItem(null);
    markChangesMade();
  };

  // Change color of selected stroke
  const handleChangeSelectedColor = (newColor: string) => {
    if (!selectedItem || selectedItem.type !== 'stroke') return;
    const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };

    const updated = {
      ...current,
      strokes: current.strokes.map((s) => (s.id === selectedItem.id ? { ...s, color: newColor } : s)),
    };

    annotationsRef.current[currentPage] = updated;
    setAnnotations({ ...annotationsRef.current });
    pushToHistory(updated);
    markChangesMade();
  };

  // Change width of selected stroke
  const handleChangeSelectedWidth = (newWidth: number) => {
    if (!selectedItem || selectedItem.type !== 'stroke') return;
    const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };

    const updated = {
      ...current,
      strokes: current.strokes.map((s) => (s.id === selectedItem.id ? { ...s, width: newWidth } : s)),
    };

    annotationsRef.current[currentPage] = updated;
    setAnnotations({ ...annotationsRef.current });
    pushToHistory(updated);
    markChangesMade();
  };

  // ---------------------------------------------------------------------------
  // INTERACTION ENGINE: 60FPS GPU TOUCH ENGINE WITH SLIDE & PINCH-ZOOM
  // ---------------------------------------------------------------------------

  // A. Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getNormalizedCoords(e.clientX, e.clientY);

    // Hand tool: Pan
    if (activeTool === 'hand') {
      touchStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: containerRef.current?.scrollLeft || 0,
        scrollTop: containerRef.current?.scrollTop || 0,
        time: Date.now(),
      };
      return;
    }

    // Select / Re-Edit tool: Select strokes or texts, or prepare to drag
    if (activeTool === 'select') {
      const clickedText = findTextAt(x, y);
      if (clickedText) {
        setSelectedItem({ type: 'text', id: clickedText.id });
        setEditingTextNote(clickedText);
        return;
      }

      const clickedStroke = findStrokeAt(x, y);
      if (clickedStroke) {
        setSelectedItem({ type: 'stroke', id: clickedStroke.id });
        isDraggingSelectedItemRef.current = true;
        dragStartNormCoordsRef.current = { x, y };
        return;
      }

      setSelectedItem(null);
      return;
    }

    // Pen / Highlighter: Draw
    if (activeTool === 'pen' || activeTool === 'highlighter') {
      isDrawingRef.current = true;
      currentStrokeRef.current = {
        id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        tool: activeTool,
        color: currentColor,
        width: activeTool === 'highlighter' ? strokeWidth * 3.5 : strokeWidth,
        opacity: activeTool === 'highlighter' ? 0.4 : 1.0,
        points: [{ x, y }],
      };
    } else if (activeTool === 'text') {
      const text = prompt('Enter text note on this PDF:');
      if (text && text.trim()) {
        const newNote: PdfTextNote = {
          id: `text_${Date.now()}`,
          x,
          y,
          text: text.trim(),
          color: currentColor,
          fontSize,
        };
        const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };
        const updated = { ...current, textNotes: [...current.textNotes, newNote] };
        annotationsRef.current[currentPage] = updated;
        setAnnotations({ ...annotationsRef.current });
        pushToHistory(updated);
        markChangesMade();
      }
    } else if (activeTool === 'sticky') {
      const text = prompt('Enter sticky note thoughts:');
      if (text && text.trim()) {
        const newSticky: PdfStickyNote = {
          id: `sticky_${Date.now()}`,
          x,
          y,
          text: text.trim(),
          color: currentColor,
          isOpen: true,
        };
        const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };
        const updated = { ...current, stickyNotes: [...current.stickyNotes, newSticky] };
        annotationsRef.current[currentPage] = updated;
        setAnnotations({ ...annotationsRef.current });
        pushToHistory(updated);
        markChangesMade();
      }
    } else if (activeTool === 'eraser') {
      eraseNear(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 1. Pan in Hand mode
    if (activeTool === 'hand' && touchStartRef.current && containerRef.current) {
      const dx = e.clientX - touchStartRef.current.x;
      const dy = e.clientY - touchStartRef.current.y;
      containerRef.current.scrollLeft = touchStartRef.current.scrollLeft - dx;
      containerRef.current.scrollTop = touchStartRef.current.scrollTop - dy;
      return;
    }

    // 2. Drag to move selected stroke
    if (activeTool === 'select' && isDraggingSelectedItemRef.current && selectedItem?.type === 'stroke' && dragStartNormCoordsRef.current) {
      const { x, y } = getNormalizedCoords(e.clientX, e.clientY);
      const deltaX = x - dragStartNormCoordsRef.current.x;
      const deltaY = y - dragStartNormCoordsRef.current.y;
      dragStartNormCoordsRef.current = { x, y };

      const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };
      const updated = {
        ...current,
        strokes: current.strokes.map((s) => {
          if (s.id !== selectedItem.id) return s;
          return {
            ...s,
            points: s.points.map((p) => ({
              x: Math.max(0, Math.min(1, p.x + deltaX)),
              y: Math.max(0, Math.min(1, p.y + deltaY)),
            })),
          };
        }),
      };
      annotationsRef.current[currentPage] = updated;
      setAnnotations({ ...annotationsRef.current });
      return;
    }

    // 3. Erase while dragging
    if (activeTool === 'eraser' && e.buttons === 1) {
      const { x, y } = getNormalizedCoords(e.clientX, e.clientY);
      eraseNear(x, y);
      return;
    }

    // 4. Draw with Pen/Highlighter
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const { x, y, rawX, rawY } = getNormalizedCoords(e.clientX, e.clientY);
    const stroke = currentStrokeRef.current;
    stroke.points.push({ x, y });

    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pts = stroke.points;
    if (pts.length >= 2) {
      const pPrev = pts[pts.length - 2];
      if (!pPrev) return;
      const prevX = pPrev.x * canvas.width;
      const prevY = pPrev.y * canvas.height;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(rawX, rawY);
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width * (scale / 1.0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = 0.4;
        ctx.globalCompositeOperation = 'multiply';
      } else {
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.stroke();
      ctx.restore();
    }
  };

  const handleMouseUp = () => {
    touchStartRef.current = null;
    if (isDraggingSelectedItemRef.current) {
      isDraggingSelectedItemRef.current = false;
      dragStartNormCoordsRef.current = null;
      markChangesMade();
      return;
    }

    if (!isDrawingRef.current || !currentStrokeRef.current) return;

    isDrawingRef.current = false;
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };
    const updated = { ...current, strokes: [...current.strokes, stroke] };

    annotationsRef.current[currentPage] = updated;
    setAnnotations({ ...annotationsRef.current });
    pushToHistory(updated);
    markChangesMade();
  };

  // B. Touch Handlers with 60FPS CSS Transform Pinch-Zoom & Slide
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Two fingers: Pinch-to-zoom & two-finger pan
    if (e.touches.length === 2) {
      isDrawingRef.current = false;
      currentStrokeRef.current = null;
      isDraggingSelectedItemRef.current = false;

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchStartDistanceRef.current = dist;
      pinchStartScaleRef.current = scale;

      touchStartRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
        scrollLeft: containerRef.current?.scrollLeft || 0,
        scrollTop: containerRef.current?.scrollTop || 0,
        time: Date.now(),
      };
      return;
    }

    // Single finger touch
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const { x, y } = getNormalizedCoords(touch.clientX, touch.clientY);

      // Hand tool: Pan & slide page left/right
      if (activeTool === 'hand') {
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          scrollLeft: containerRef.current?.scrollLeft || 0,
          scrollTop: containerRef.current?.scrollTop || 0,
          time: Date.now(),
        };
        setSwipeHint(null);
        return;
      }

      // Select tool: Re-edit previous annotations
      if (activeTool === 'select') {
        const clickedText = findTextAt(x, y);
        if (clickedText) {
          setSelectedItem({ type: 'text', id: clickedText.id });
          setEditingTextNote(clickedText);
          return;
        }

        const clickedStroke = findStrokeAt(x, y);
        if (clickedStroke) {
          setSelectedItem({ type: 'stroke', id: clickedStroke.id });
          isDraggingSelectedItemRef.current = true;
          dragStartNormCoordsRef.current = { x, y };
          return;
        }

        setSelectedItem(null);
        return;
      }

      // Drawing
      if (activeTool === 'pen' || activeTool === 'highlighter') {
        isDrawingRef.current = true;
        currentStrokeRef.current = {
          id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          tool: activeTool,
          color: currentColor,
          width: activeTool === 'highlighter' ? strokeWidth * 3.5 : strokeWidth,
          opacity: activeTool === 'highlighter' ? 0.4 : 1.0,
          points: [{ x, y }],
        };
      } else if (activeTool === 'eraser') {
        eraseNear(x, y);
      } else if (activeTool === 'text') {
        const text = prompt('Enter text note on this PDF:');
        if (text && text.trim()) {
          const newNote: PdfTextNote = {
            id: `text_${Date.now()}`,
            x,
            y,
            text: text.trim(),
            color: currentColor,
            fontSize,
          };
          const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };
          const updated = { ...current, textNotes: [...current.textNotes, newNote] };
          annotationsRef.current[currentPage] = updated;
          setAnnotations({ ...annotationsRef.current });
          pushToHistory(updated);
          markChangesMade();
        }
      } else if (activeTool === 'sticky') {
        const text = prompt('Enter sticky note thoughts:');
        if (text && text.trim()) {
          const newSticky: PdfStickyNote = {
            id: `sticky_${Date.now()}`,
            x,
            y,
            text: text.trim(),
            color: currentColor,
            isOpen: true,
          };
          const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };
          const updated = { ...current, stickyNotes: [...current.stickyNotes, newSticky] };
          annotationsRef.current[currentPage] = updated;
          setAnnotations({ ...annotationsRef.current });
          pushToHistory(updated);
          markChangesMade();
        }
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Two fingers: 60fps GPU-accelerated pinch-to-zoom & two-finger pan
    if (e.touches.length === 2 && pinchStartDistanceRef.current !== null && touchStartRef.current && stageWrapperRef.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      const ratio = dist / pinchStartDistanceRef.current;
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const dx = midX - touchStartRef.current.x;
      const dy = midY - touchStartRef.current.y;

      // Butter-smooth hardware accelerated transform during pinch!
      stageWrapperRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${ratio})`;
      stageWrapperRef.current.style.transition = 'none';
      return;
    }

    // Single finger touch
    if (e.touches.length === 1) {
      const touch = e.touches[0];

      // Hand tool: Pan & slide page left/right
      if (activeTool === 'hand' && touchStartRef.current && containerRef.current) {
        e.preventDefault();
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;

        containerRef.current.scrollLeft = touchStartRef.current.scrollLeft - dx;
        containerRef.current.scrollTop = touchStartRef.current.scrollTop - dy;

        // Detect horizontal swipe page flip when sliding near edges
        if (dx < -110 && currentPage < numPages) {
          setSwipeHint('next');
        } else if (dx > 110 && currentPage > 1) {
          setSwipeHint('prev');
        } else {
          setSwipeHint(null);
        }
        return;
      }

      // Drag to move selected item in select mode
      if (activeTool === 'select' && isDraggingSelectedItemRef.current && selectedItem?.type === 'stroke' && dragStartNormCoordsRef.current) {
        e.preventDefault();
        const { x, y } = getNormalizedCoords(touch.clientX, touch.clientY);
        const deltaX = x - dragStartNormCoordsRef.current.x;
        const deltaY = y - dragStartNormCoordsRef.current.y;
        dragStartNormCoordsRef.current = { x, y };

        const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };
        const updated = {
          ...current,
          strokes: current.strokes.map((s) => {
            if (s.id !== selectedItem.id) return s;
            return {
              ...s,
              points: s.points.map((p) => ({
                x: Math.max(0, Math.min(1, p.x + deltaX)),
                y: Math.max(0, Math.min(1, p.y + deltaY)),
              })),
            };
          }),
        };
        annotationsRef.current[currentPage] = updated;
        setAnnotations({ ...annotationsRef.current });
        return;
      }

      // Eraser
      if (activeTool === 'eraser') {
        e.preventDefault();
        const { x, y } = getNormalizedCoords(touch.clientX, touch.clientY);
        eraseNear(x, y);
        return;
      }

      // Drawing
      if (!isDrawingRef.current || !currentStrokeRef.current) return;
      e.preventDefault();

      const { x, y, rawX, rawY } = getNormalizedCoords(touch.clientX, touch.clientY);
      const stroke = currentStrokeRef.current;
      stroke.points.push({ x, y });

      const canvas = annotationCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const pts = stroke.points;
      if (pts.length >= 2) {
        const pPrev = pts[pts.length - 2];
        if (!pPrev) return;
        const prevX = pPrev.x * canvas.width;
        const prevY = pPrev.y * canvas.height;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(rawX, rawY);
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width * (scale / 1.0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.tool === 'highlighter') {
          ctx.globalAlpha = 0.4;
          ctx.globalCompositeOperation = 'multiply';
        } else {
          ctx.globalAlpha = 1.0;
          ctx.globalCompositeOperation = 'source-over';
        }

        ctx.stroke();
        ctx.restore();
      }
    }
  };

  const handleTouchEnd = () => {
    // 1. Commit pinch zoom on release
    if (pinchStartDistanceRef.current !== null && stageWrapperRef.current) {
      const currentTransform = stageWrapperRef.current.style.transform;
      stageWrapperRef.current.style.transform = 'none';

      // Parse scale from transform
      const match = currentTransform.match(/scale\(([^)]+)\)/);
      if (match && match[1]) {
        const ratio = parseFloat(match[1]);
        if (!isNaN(ratio) && ratio !== 1) {
          const finalScale = Math.max(0.6, Math.min(3.0, Number((pinchStartScaleRef.current * ratio).toFixed(2))));
          setScale(finalScale);
        }
      }
    }
    pinchStartDistanceRef.current = null;

    // 2. Commit swipe page flip if user slid far enough
    if (swipeHint === 'next' && currentPage < numPages) {
      setCurrentPage((p) => p + 1);
      setJumpPageInput(String(currentPage + 1));
    } else if (swipeHint === 'prev' && currentPage > 1) {
      setCurrentPage((p) => p - 1);
      setJumpPageInput(String(currentPage - 1));
    }
    setSwipeHint(null);
    touchStartRef.current = null;

    if (isDraggingSelectedItemRef.current) {
      isDraggingSelectedItemRef.current = false;
      dragStartNormCoordsRef.current = null;
      markChangesMade();
      return;
    }

    if (!isDrawingRef.current || !currentStrokeRef.current) return;

    isDrawingRef.current = false;
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };
    const updated = { ...current, strokes: [...current.strokes, stroke] };

    annotationsRef.current[currentPage] = updated;
    setAnnotations({ ...annotationsRef.current });
    pushToHistory(updated);
    markChangesMade();
  };

  // Erase strokes / notes within normalized proximity
  const eraseNear = (normX: number, normY: number) => {
    const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };
    const radius = 0.035;

    const filteredStrokes = current.strokes.filter((s) => {
      return !s.points.some((p) => Math.hypot(p.x - normX, p.y - normY) < radius);
    });

    const filteredText = current.textNotes.filter(
      (t) => Math.hypot(t.x - normX, t.y - normY) > radius
    );

    const filteredSticky = current.stickyNotes.filter(
      (st) => Math.hypot(st.x - normX, st.y - normY) > radius
    );

    if (
      filteredStrokes.length !== current.strokes.length ||
      filteredText.length !== current.textNotes.length ||
      filteredSticky.length !== current.stickyNotes.length
    ) {
      const updated = {
        strokes: filteredStrokes,
        textNotes: filteredText,
        stickyNotes: filteredSticky,
      };
      annotationsRef.current[currentPage] = updated;
      setAnnotations({ ...annotationsRef.current });
      pushToHistory(updated);
      setSelectedItem(null);
      markChangesMade();
    }
  };

  // ---------------------------------------------------------------------------
  // PERMANENT PDF BAKING & SAVING WITH FILE IN SUPABASE STORAGE & DATABASE
  // ---------------------------------------------------------------------------
  const savePermanentlyIntoPdfFile = async (showToast: boolean = true) => {
    if (!cleanBasePdfBytesRef.current) return;

    setIsSavingToFile(true);
    try {
      // 1. Sync vector annotations JSON
      const localKey = `notesgo_annotations_${file.id}`;
      localStorage.setItem(localKey, JSON.stringify(annotationsRef.current));

      try {
        const cloudPath = `${userId}/annotations/${file.id}.json`;
        const blobJson = new Blob([JSON.stringify(annotationsRef.current)], { type: 'application/json' });
        await supabase.storage.from('vault').upload(cloudPath, blobJson, { upsert: true });
      } catch {}

      // 2. Load pristine clean base PDF with pdf-lib
      const { PDFDocument } = await import('pdf-lib');
      const loadedPdf = await PDFDocument.load(cleanBasePdfBytesRef.current);
      const pdfPages = loadedPdf.getPages();

      let modificationsCount = 0;

      // 3. Bake annotations page by page
      for (const pageNumStr in annotationsRef.current) {
        const pageNum = parseInt(pageNumStr, 10);
        if (pageNum < 1 || pageNum > pdfPages.length) continue;

        const pageData = annotationsRef.current[pageNum];
        if (!pageData || (pageData.strokes.length === 0 && pageData.textNotes.length === 0)) continue;

        const targetPage = pdfPages[pageNum - 1];
        const pWidth = targetPage.getWidth();
        const pHeight = targetPage.getHeight();

        const offCanvas = document.createElement('canvas');
        const dpr = 2.0;
        offCanvas.width = pWidth * dpr;
        offCanvas.height = pHeight * dpr;
        const offCtx = offCanvas.getContext('2d');
        if (!offCtx) continue;

        offCtx.scale(dpr, dpr);

        // A. Render strokes using normalized points
        pageData.strokes.forEach((stroke) => {
          if (stroke.points.length < 2) return;
          offCtx.save();
          offCtx.beginPath();

          const getX = (p: { x: number; y: number }) => (p.x <= 1.0 ? p.x * pWidth : p.x);
          const getY = (p: { x: number; y: number }) => (p.y <= 1.0 ? p.y * pHeight : p.y);

          offCtx.moveTo(getX(stroke.points[0]), getY(stroke.points[0]));
          for (let i = 1; i < stroke.points.length; i++) {
            offCtx.lineTo(getX(stroke.points[i]), getY(stroke.points[i]));
          }

          offCtx.strokeStyle = stroke.color;
          offCtx.lineWidth = stroke.width;
          offCtx.lineCap = 'round';
          offCtx.lineJoin = 'round';

          if (stroke.tool === 'highlighter') {
            offCtx.globalAlpha = 0.4;
            offCtx.globalCompositeOperation = 'source-over';
          } else {
            offCtx.globalAlpha = 1.0;
            offCtx.globalCompositeOperation = 'source-over';
          }

          offCtx.stroke();
          offCtx.restore();
        });

        // B. Render typed text notes
        pageData.textNotes.forEach((t) => {
          offCtx.save();
          const fontPt = Math.max(12, Math.round(t.fontSize * (pWidth / 600)));
          offCtx.font = `bold ${fontPt}px sans-serif`;
          offCtx.textBaseline = 'top';

          const noteX = t.x <= 1.0 ? t.x * pWidth : t.x;
          const noteY = t.y <= 1.0 ? t.y * pHeight : t.y;

          offCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          const textMetrics = offCtx.measureText(t.text);
          offCtx.fillRect(noteX - 4, noteY - 2, textMetrics.width + 8, fontPt + 6);

          offCtx.fillStyle = t.color;
          offCtx.fillText(t.text, noteX, noteY);
          offCtx.restore();
        });

        // C. Embed PNG overlay into target PDF page
        const pngDataUrl = offCanvas.toDataURL('image/png');
        const embeddedImage = await loadedPdf.embedPng(pngDataUrl);
        targetPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: pWidth,
          height: pHeight,
        });

        modificationsCount++;
      }

      // 4. Generate modified PDF bytes
      const modifiedPdfBytes = await loadedPdf.save();
      const updatedBlob = new Blob([modifiedPdfBytes as unknown as BlobPart], { type: 'application/pdf' });

      // 5. Overwrite file in Supabase Storage with cacheControl: 0
      const { error: uploadErr } = await supabase.storage.from('vault').upload(file.storage_path, updatedBlob, {
        cacheControl: '0',
        upsert: true,
      });

      if (uploadErr) {
        console.warn('Storage upload note:', uploadErr.message);
      }

      // 6. Update database record in public.files
      try {
        await supabase
          .from('files')
          .update({
            size: updatedBlob.size,
            updated_at: new Date().toISOString(),
          })
          .eq('id', file.id);
      } catch {}

      // 7. Inform parent Vault dashboard of file update
      onFileUpdated?.({
        ...file,
        size: updatedBlob.size,
        updated_at: new Date().toISOString(),
      });

      activePdfBytesRef.current = modifiedPdfBytes.slice().buffer;
      setHasUnsavedChanges(false);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      if (showToast) {
        setSavedSuccessToast(true);
        setTimeout(() => setSavedSuccessToast(false), 3000);
      }
    } catch (err: any) {
      console.error('Failed to save changes permanently to PDF:', err);
      alert(`Could not save changes to PDF file: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSavingToFile(false);
    }
  };

  // Direct In-Studio PDF Download with Baked Changes
  const handleDownloadBakedPdf = async () => {
    try {
      if (hasUnsavedChanges) {
        await savePermanentlyIntoPdfFile(false);
      }

      const bytesToDownload = activePdfBytesRef.current || cleanBasePdfBytesRef.current;
      if (!bytesToDownload) return;

      const blob = new Blob([bytesToDownload as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to download PDF:', err);
    }
  };

  // Safe Close Handler
  const handleSafeClose = async () => {
    if (hasUnsavedChanges) {
      await savePermanentlyIntoPdfFile(false);
    }
    onClose();
  };

  // Jump page
  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
      setCurrentPage(pageNum);
      setSelectedItem(null);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  // Fit to screen width helper
  const handleFitToWidth = () => {
    const availableWidth = containerRef.current?.clientWidth || window.innerWidth || 400;
    const padding = window.innerWidth < 768 ? 20 : 64;
    const targetScale = Math.max(0.6, Math.min(2.5, (availableWidth - padding) / naturalPageDimensions.width));
    setScale(Number(targetScale.toFixed(2)));
  };

  if (!isOpen) return null;

  const currentPageNotes = annotations[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };
  const totalPageAnnotations = currentPageNotes.strokes.length + currentPageNotes.textNotes.length + currentPageNotes.stickyNotes.length;

  // Selected stroke details
  const selectedStroke = selectedItem?.type === 'stroke' 
    ? currentPageNotes.strokes.find((s) => s.id === selectedItem.id) 
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-vault-bg text-vault-text select-none animate-in fade-in duration-200 overflow-hidden">
      {/* Toast Notification */}
      {savedSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-vault-card border border-vault-accent text-vault-accent rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-vault-accent shrink-0" />
          <span>Permanently Saved to File in Vault!</span>
        </div>
      )}

      {/* Swipe Page Flip Indicator */}
      {swipeHint && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 bg-vault-surface/95 border border-vault-primary text-vault-primary rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-pulse backdrop-blur-md">
          {swipeHint === 'next' ? (
            <>
              <span>Release to go to Page {currentPage + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              <ArrowLeft className="w-4 h-4" />
              <span>Release to go to Page {currentPage - 1}</span>
            </>
          )}
        </div>
      )}

      {/* Top Header Bar */}
      <header className="h-14 sm:h-16 px-2.5 sm:px-6 bg-vault-surface border-b border-vault-border flex items-center justify-between shrink-0 z-20">
        {/* Left: Back & Document Title */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 pr-1">
          <button
            onClick={handleSafeClose}
            className="flex items-center gap-1 p-2 sm:px-3 sm:py-1.5 bg-vault-card hover:bg-vault-card/80 text-vault-text text-xs font-semibold rounded-xl border border-vault-border transition shrink-0 active:scale-95"
            title="Save & Return to Vault"
          >
            <ArrowLeft className="w-4 h-4 text-vault-primary" />
            <span className="hidden md:inline">Back to Vault</span>
          </button>

          <div className="min-w-0">
            <h2 className="font-heading font-semibold text-xs sm:text-sm text-vault-text truncate max-w-[100px] sm:max-w-xs md:max-w-md">
              {file.name}
            </h2>
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-muted-foreground font-mono">
              {isSavingToFile ? (
                <span className="text-vault-primary flex items-center gap-1 font-bold">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving...
                </span>
              ) : hasUnsavedChanges ? (
                <span className="text-amber-400 flex items-center gap-1">
                  ● Unsaved changes
                </span>
              ) : (
                <span className="text-vault-accent flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Saved {lastSavedTime ? `at ${lastSavedTime}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Page Stepper */}
        <div className="flex items-center bg-vault-card border border-vault-border rounded-xl p-0.5 text-xs shrink-0">
          <button
            onClick={() => {
              const nextP = Math.max(1, currentPage - 1);
              setCurrentPage(nextP);
              setJumpPageInput(String(nextP));
              setSelectedItem(null);
            }}
            disabled={currentPage <= 1 || renderingPage}
            className="p-1 sm:p-1.5 text-muted-foreground hover:text-vault-text disabled:opacity-30 rounded-lg transition"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <form onSubmit={handleJumpPage} className="flex items-center px-0.5 sm:px-1">
            <input
              type="text"
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              onBlur={handleJumpPage}
              className="w-6 sm:w-8 text-center bg-transparent border-none outline-none font-mono text-[11px] font-bold text-vault-text"
            />
            <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground">/ {numPages}</span>
          </form>

          <button
            onClick={() => {
              const nextP = Math.min(numPages, currentPage + 1);
              setCurrentPage(nextP);
              setJumpPageInput(String(nextP));
              setSelectedItem(null);
            }}
            disabled={currentPage >= numPages || renderingPage}
            className="p-1 sm:p-1.5 text-muted-foreground hover:text-vault-text disabled:opacity-30 rounded-lg transition"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Right: Actions Bar */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Annotations List Drawer Toggle */}
          <button
            onClick={() => setIsAnnotationsDrawerOpen(true)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
              totalPageAnnotations > 0
                ? 'bg-vault-card border-vault-primary/40 text-vault-primary'
                : 'bg-vault-card/60 border-vault-border text-muted-foreground hover:text-vault-text'
            }`}
            title="Manage Page Annotations (Edit & Delete)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Page Items</span>
            <span className="px-1.5 py-0.2 bg-vault-primary/20 text-vault-primary rounded-full text-[10px] font-mono font-bold">
              {totalPageAnnotations}
            </span>
          </button>

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            title="Undo"
            className="p-1.5 sm:p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card border border-vault-border rounded-xl transition"
          >
            <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={handleRedo}
            title="Redo"
            className="p-1.5 sm:p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card border border-vault-border rounded-xl transition"
          >
            <Redo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Direct Download Button */}
          <button
            onClick={handleDownloadBakedPdf}
            title="Download PDF with All Changes Baked In"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-vault-card hover:bg-vault-card/80 text-vault-text text-xs font-semibold rounded-xl border border-vault-border transition"
          >
            <Download className="w-3.5 h-3.5 text-vault-primary" />
            <span>Download</span>
          </button>

          {/* PROMINENT SAVE CHANGES BUTTON */}
          <button
            onClick={() => savePermanentlyIntoPdfFile(true)}
            disabled={isSavingToFile}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-xl shadow-lg transition active:scale-95 disabled:opacity-60 ${
              hasUnsavedChanges
                ? 'bg-vault-primary hover:bg-vault-primary/90 text-vault-bg shadow-vault-primary/25 animate-pulse'
                : 'bg-vault-card hover:bg-vault-card/90 text-vault-text border border-vault-border'
            }`}
            title="Permanently Save Edits into PDF File in Vault"
          >
            {isSavingToFile ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : hasUnsavedChanges ? (
              <Save className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <FileCheck className="w-3.5 h-3.5 text-vault-accent stroke-[2.5]" />
            )}
            <span className="hidden xs:inline">
              {isSavingToFile ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
            </span>
          </button>
        </div>
      </header>

      {/* Desktop/Tablet Horizontal Toolbar */}
      <div className="hidden md:flex h-11 px-6 bg-vault-surface/95 backdrop-blur-xl border-b border-vault-border items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-1.5">
          {/* Hand Pan Tool */}
          <button
            onClick={() => {
              setActiveTool('hand');
              setSelectedItem(null);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTool === 'hand'
                ? 'bg-vault-primary text-vault-bg font-bold shadow-md'
                : 'text-muted-foreground hover:text-vault-text hover:bg-vault-card'
            }`}
            title="Pan / Slide Page (1 Finger or Mouse Drag)"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Slide Page</span>
          </button>

          {/* Select & Re-Edit Tool */}
          <button
            onClick={() => setActiveTool('select')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTool === 'select'
                ? 'bg-vault-primary text-vault-bg font-bold shadow-md'
                : 'text-muted-foreground hover:text-vault-text hover:bg-vault-card'
            }`}
            title="Select & Edit Previous Annotations (Tap stroke/text to edit or delete)"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Select & Edit</span>
          </button>

          {/* Pen Tool */}
          <button
            onClick={() => {
              setActiveTool('pen');
              setSelectedItem(null);
              if (currentColor === '#FDE047') setCurrentColor('#2DD4BF');
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTool === 'pen'
                ? 'bg-vault-primary text-vault-bg font-bold shadow-md'
                : 'text-muted-foreground hover:text-vault-text hover:bg-vault-card'
            }`}
            title="Freehand Ink Pen"
          >
            <Pen className="w-3.5 h-3.5" />
            <span>Pen</span>
          </button>

          {/* Highlighter Tool */}
          <button
            onClick={() => {
              setActiveTool('highlighter');
              setSelectedItem(null);
              setCurrentColor('#FDE047');
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTool === 'highlighter'
                ? 'bg-vault-primary text-vault-bg font-bold shadow-md'
                : 'text-muted-foreground hover:text-vault-text hover:bg-vault-card'
            }`}
            title="Text Highlighter"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>Highlighter</span>
          </button>

          {/* Text Tool */}
          <button
            onClick={() => {
              setActiveTool('text');
              setSelectedItem(null);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTool === 'text'
                ? 'bg-vault-primary text-vault-bg font-bold shadow-md'
                : 'text-muted-foreground hover:text-vault-text hover:bg-vault-card'
            }`}
            title="Add Text Note"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text</span>
          </button>

          {/* Sticky Note */}
          <button
            onClick={() => {
              setActiveTool('sticky');
              setSelectedItem(null);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTool === 'sticky'
                ? 'bg-vault-primary text-vault-bg font-bold shadow-md'
                : 'text-muted-foreground hover:text-vault-text hover:bg-vault-card'
            }`}
            title="Add Sticky Note Pin"
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>Sticky</span>
          </button>

          {/* Eraser */}
          <button
            onClick={() => {
              setActiveTool('eraser');
              setSelectedItem(null);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTool === 'eraser'
                ? 'bg-vault-primary text-vault-bg font-bold shadow-md'
                : 'text-muted-foreground hover:text-vault-text hover:bg-vault-card'
            }`}
            title="Eraser Tool"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Eraser</span>
          </button>

          <div className="h-4 w-[1px] bg-vault-border mx-1" />

          {/* Desktop Palette */}
          <div className="flex items-center gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCurrentColor(c);
                  if (selectedItem?.type === 'stroke') {
                    handleChangeSelectedColor(c);
                  }
                }}
                className={`w-4 h-4 rounded-full border-2 transition-transform ${
                  currentColor === c ? 'scale-125 border-vault-text shadow-md' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {/* Stroke Width Slider */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px]">Size:</span>
            <input
              type="range"
              min="1"
              max="12"
              value={strokeWidth}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStrokeWidth(val);
                if (selectedItem?.type === 'stroke') {
                  handleChangeSelectedWidth(val);
                }
              }}
              className="w-16 accent-vault-primary cursor-pointer"
            />
          </div>

          {/* Auto-Save Toggle */}
          <button
            onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
            className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg border transition ${
              autoSaveEnabled
                ? 'bg-vault-primary/10 border-vault-primary/30 text-vault-primary'
                : 'bg-vault-card border-vault-border text-muted-foreground'
            }`}
            title="Toggle automatic saving to file"
          >
            <Sparkles className="w-3 h-3" />
            <span>Auto-Save: {autoSaveEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Main Document Viewport Stage */}
      <div 
        ref={containerRef}
        className="flex-1 bg-vault-bg overflow-auto p-2 sm:p-6 pb-24 md:pb-6 flex items-start relative touch-pan-x touch-pan-y overscroll-contain"
        style={{
          cursor: activeTool === 'hand' ? 'grab' : activeTool === 'select' ? 'default' : activeTool === 'eraser' ? 'cell' : 'crosshair',
        }}
      >
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-vault-bg/95 z-40 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 animate-spin text-vault-primary" />
            <p className="font-heading font-semibold text-sm text-vault-text mt-3">Loading PDF...</p>
            <p className="text-xs font-mono text-muted-foreground">Preparing high-resolution pages</p>
          </div>
        )}

        {/* Rendering Indicator */}
        {renderingPage && !loading && (
          <div className="fixed top-16 right-4 sm:right-6 bg-vault-surface/90 border border-vault-border px-3 py-1.5 rounded-xl shadow-lg z-30 flex items-center gap-2 text-xs text-vault-primary backdrop-blur-sm">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="font-mono text-[10px]">Rendering page {currentPage}...</span>
          </div>
        )}

        {/* Error Notice */}
        {error ? (
          <div className="p-8 text-center max-w-md bg-vault-surface border border-vault-border rounded-3xl z-30 m-auto">
            <FileText className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h3 className="font-heading font-semibold text-sm text-vault-text mb-1">Failed to Open PDF</h3>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <button
              onClick={handleSafeClose}
              className="px-4 py-2 bg-vault-card hover:bg-vault-card/80 text-vault-text text-xs font-semibold rounded-xl border border-vault-border"
            >
              Return to Vault
            </button>
          </div>
        ) : (
          /* GPU-Accelerated Hardware Transform Stage Wrapper (Centers with margin: auto so horizontal pan has 0 clipping!) */
          <div 
            ref={stageWrapperRef}
            className="relative shadow-2xl rounded-lg overflow-hidden border border-vault-border bg-white m-auto will-change-transform"
            style={{
              width: naturalPageDimensions.width * scale,
              height: naturalPageDimensions.height * scale,
            }}
          >
            {/* 1. Base Layer: High-Resolution Native PDF Canvas */}
            <canvas 
              ref={pdfCanvasRef} 
              className="block bg-white"
            />

            {/* 2. Top Live Inking & Annotation Canvas */}
            <canvas
              ref={annotationCanvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="absolute inset-0 block z-10"
              style={{
                touchAction: activeTool === 'hand' ? 'pan-x pan-y' : 'none',
              }}
            />

            {/* 3. Floating Contextual Toolbar for Selected Stroke */}
            {selectedStroke && (
              (() => {
                const bounds = getStrokeBounds(selectedStroke);
                const canvasW = naturalPageDimensions.width * scale;
                const canvasH = naturalPageDimensions.height * scale;
                const topPos = Math.max(10, bounds.minY * canvasH - 45);
                const leftPos = Math.max(10, Math.min(canvasW - 200, bounds.minX * canvasW));

                return (
                  <div
                    style={{ left: leftPos, top: topPos }}
                    className="absolute z-30 flex items-center gap-1.5 p-1.5 bg-vault-surface/95 border border-vault-primary/60 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in duration-150"
                  >
                    <span className="text-[10px] font-mono text-vault-primary px-1 font-bold">Stroke:</span>
                    
                    {/* Palette Dots */}
                    <div className="flex items-center gap-1">
                      {['#2DD4BF', '#FDE047', '#EF4444', '#38BDF8', '#FFFFFF', '#000000'].map((c) => (
                        <button
                          key={c}
                          onClick={() => handleChangeSelectedColor(c)}
                          className={`w-4 h-4 rounded-full border ${selectedStroke.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    <div className="w-[1px] h-3.5 bg-vault-border mx-0.5" />

                    {/* Width Buttons */}
                    <button
                      onClick={() => handleChangeSelectedWidth(Math.max(1, selectedStroke.width - 2))}
                      className="px-1.5 py-0.5 text-[10px] bg-vault-card hover:bg-vault-card/80 rounded text-vault-text font-mono"
                      title="Thinner"
                    >
                      -
                    </button>
                    <span className="text-[10px] font-mono">{selectedStroke.width}px</span>
                    <button
                      onClick={() => handleChangeSelectedWidth(Math.min(16, selectedStroke.width + 2))}
                      className="px-1.5 py-0.5 text-[10px] bg-vault-card hover:bg-vault-card/80 rounded text-vault-text font-mono"
                      title="Thicker"
                    >
                      +
                    </button>

                    <div className="w-[1px] h-3.5 bg-vault-border mx-0.5" />

                    {/* Delete Stroke Button */}
                    <button
                      onClick={handleDeleteSelected}
                      className="p-1 hover:bg-destructive/20 text-destructive rounded transition"
                      title="Delete This Stroke"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })()
            )}

            {/* 4. HTML Layer: Typed Text Notes (Click to re-edit, drag to reposition) */}
            {currentPageNotes.textNotes.map((note) => {
              const canvasWidth = naturalPageDimensions.width * scale;
              const canvasHeight = naturalPageDimensions.height * scale;
              const posX = note.x <= 1.0 ? note.x * canvasWidth : note.x;
              const posY = note.y <= 1.0 ? note.y * canvasHeight : note.y;
              const isSelected = selectedItem?.type === 'text' && selectedItem.id === note.id;

              return (
                <div
                  key={note.id}
                  style={{
                    left: posX,
                    top: posY,
                    color: note.color,
                    fontSize: `${Math.max(11, Math.round(note.fontSize * (scale / 1.0)))}px`,
                  }}
                  className={`absolute z-20 font-sans font-semibold bg-black/80 px-2 py-0.5 rounded shadow pointer-events-auto cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-vault-primary ring-offset-1 ring-offset-black scale-105' : 'hover:scale-105'
                  }`}
                  onClick={() => {
                    setSelectedItem({ type: 'text', id: note.id });
                    setEditingTextNote(note);
                  }}
                >
                  <span>{note.text}</span>
                  <span className="ml-1.5 opacity-60 hover:opacity-100 font-mono text-[9px] text-vault-primary">✎</span>
                </div>
              );
            })}

            {/* 5. HTML Layer: Sticky Notes Pins (Click to open, edit, delete) */}
            {currentPageNotes.stickyNotes.map((sticky) => {
              const canvasWidth = naturalPageDimensions.width * scale;
              const canvasHeight = naturalPageDimensions.height * scale;
              const posX = sticky.x <= 1.0 ? sticky.x * canvasWidth : sticky.x;
              const posY = sticky.y <= 1.0 ? sticky.y * canvasHeight : sticky.y;

              return (
                <div
                  key={sticky.id}
                  style={{ left: posX, top: posY }}
                  className="absolute z-20 pointer-events-auto"
                >
                  <div
                    onClick={() => {
                      const current = annotationsRef.current[currentPage];
                      const updated = {
                        ...current,
                        stickyNotes: current.stickyNotes.map((s) =>
                          s.id === sticky.id ? { ...s, isOpen: !s.isOpen } : s
                        ),
                      };
                      annotationsRef.current[currentPage] = updated;
                      setAnnotations({ ...annotationsRef.current });
                    }}
                    className="w-7 h-7 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold text-xs shadow-lg cursor-pointer hover:scale-110 transition-transform border border-amber-300"
                  >
                    <StickyNote className="w-4 h-4 fill-black" />
                  </div>

                  {sticky.isOpen && (
                    <div className="absolute left-8 top-0 w-64 p-3 bg-amber-100 text-slate-900 border border-amber-300 rounded-xl shadow-2xl z-30 font-sans text-xs">
                      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-amber-200 font-bold text-[10px] text-amber-800 uppercase font-mono">
                        <span>Note on Page {currentPage}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingStickyNote(sticky)}
                            className="text-amber-800 hover:text-amber-950 p-0.5"
                            title="Edit Note"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const current = annotationsRef.current[currentPage];
                              const updated = {
                                ...current,
                                stickyNotes: current.stickyNotes.filter((s) => s.id !== sticky.id),
                              };
                              annotationsRef.current[currentPage] = updated;
                              setAnnotations({ ...annotationsRef.current });
                              pushToHistory(updated);
                              markChangesMade();
                            }}
                            className="text-amber-700 hover:text-destructive p-0.5"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{sticky.text}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* FLOATING MOBILE ZOOM CONTROLS (ALWAYS VISIBLE) */}
        <div className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-30 flex items-center bg-vault-surface/95 backdrop-blur-xl border border-vault-border rounded-2xl shadow-2xl p-1 gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.2).toFixed(2))))}
            className="p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl transition active:scale-95"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={handleFitToWidth}
            className="px-2 py-1 text-[11px] font-mono font-bold text-vault-primary hover:bg-vault-card rounded-xl transition"
            title="Fit to Screen Width"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={() => setScale((s) => Math.min(3.0, Number((s + 0.2).toFixed(2))))}
            className="p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl transition active:scale-95"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-vault-border mx-0.5" />

          <button
            onClick={handleFitToWidth}
            className="p-2 text-muted-foreground hover:text-vault-text hover:bg-vault-card rounded-xl transition active:scale-95"
            title="Fit Page Width"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MOBILE THUMB-FRIENDLY BOTTOM DOCK */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-vault-surface/95 backdrop-blur-2xl border-t border-vault-border px-2 py-2 flex flex-col gap-2">
        {/* Expandable Color Picker Drawer */}
        {showColorPickerMobile && (
          <div className="flex items-center justify-between bg-vault-card/90 border border-vault-border rounded-xl p-2 animate-in slide-in-from-bottom-2 duration-150">
            <span className="text-[10px] font-mono text-muted-foreground">Color:</span>
            <div className="flex items-center gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCurrentColor(c);
                    if (selectedItem?.type === 'stroke') handleChangeSelectedColor(c);
                    setShowColorPickerMobile(false);
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    currentColor === c ? 'scale-125 border-vault-text shadow-md' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Expandable Stroke Slider Drawer */}
        {showStrokeSliderMobile && (
          <div className="flex items-center justify-between bg-vault-card/90 border border-vault-border rounded-xl px-3 py-2 animate-in slide-in-from-bottom-2 duration-150">
            <span className="text-[10px] font-mono text-muted-foreground">Size: {strokeWidth}px</span>
            <input
              type="range"
              min="1"
              max="12"
              value={strokeWidth}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStrokeWidth(val);
                if (selectedItem?.type === 'stroke') handleChangeSelectedWidth(val);
              }}
              className="w-36 accent-vault-primary cursor-pointer"
            />
          </div>
        )}

        {/* Main Mobile Tool Tray */}
        <div className="flex items-center justify-between gap-1">
          {/* Hand Pan Tool */}
          <button
            onClick={() => {
              setActiveTool('hand');
              setSelectedItem(null);
            }}
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center transition active:scale-95 ${
              activeTool === 'hand'
                ? 'bg-vault-primary text-vault-bg font-bold shadow-md'
                : 'text-muted-foreground hover:bg-vault-card'
            }`}
          >
            <Hand className="w-4 h-4" />
            <span className="text-[8px] mt-0.5 font-medium">Slide</span>
          </button>

          {/* Select / Edit Tool */}
          <button
            onClick={() => setActiveTool('select')}
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center transition active:scale-95 ${
              activeTool === 'select'
                ? 'bg-vault-primary text-vault-bg font-bold shadow-md'
                : 'text-muted-foreground hover:bg-vault-card'
            }`}
          >
            <MousePointer className="w-4 h-4" />
            <span className="text-[8px] mt-0.5 font-medium">Select</span>
          </button>

          {/* Pen Tool */}
          <button
            onClick={() => {
              setActiveTool('pen');
              setSelectedItem(null);
              if (currentColor === '#FDE047') setCurrentColor('#2DD4BF');
            }}
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center transition active:scale-95 ${
              activeTool === 'pen'
                ? 'bg-vault-primary text-vault-bg font-bold shadow-md'
                : 'text-muted-foreground hover:bg-vault-card'
            }`}
          >
            <Pen className="w-4 h-4" />
            <span className="text-[8px] mt-0.5 font-medium">Pen</span>
          </button>

          {/* Highlighter Tool */}
          <button
            onClick={() => {
              setActiveTool('highlighter');
              setSelectedItem(null);
              setCurrentColor('#FDE047');
            }}
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center transition active:scale-95 ${
              activeTool === 'highlighter'
                ? 'bg-vault-primary text-vault-bg font-bold shadow-md'
                : 'text-muted-foreground hover:bg-vault-card'
            }`}
          >
            <Highlighter className="w-4 h-4" />
            <span className="text-[8px] mt-0.5 font-medium">Highlight</span>
          </button>

          {/* Eraser */}
          <button
            onClick={() => {
              setActiveTool('eraser');
              setSelectedItem(null);
            }}
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center transition active:scale-95 ${
              activeTool === 'eraser'
                ? 'bg-vault-primary text-vault-bg font-bold shadow-md'
                : 'text-muted-foreground hover:bg-vault-card'
            }`}
          >
            <Eraser className="w-4 h-4" />
            <span className="text-[8px] mt-0.5 font-medium">Eraser</span>
          </button>

          {/* Text */}
          <button
            onClick={() => {
              setActiveTool('text');
              setSelectedItem(null);
            }}
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center transition active:scale-95 ${
              activeTool === 'text'
                ? 'bg-vault-primary text-vault-bg font-bold shadow-md'
                : 'text-muted-foreground hover:bg-vault-card'
            }`}
          >
            <Type className="w-4 h-4" />
            <span className="text-[8px] mt-0.5 font-medium">Text</span>
          </button>

          {/* Color Selector Toggle */}
          <button
            onClick={() => {
              setShowColorPickerMobile(!showColorPickerMobile);
              setShowStrokeSliderMobile(false);
            }}
            className="p-2 rounded-xl border border-vault-border flex items-center justify-center transition active:scale-95 shrink-0"
            style={{ backgroundColor: currentColor }}
          >
            <div className="w-3 h-3 rounded-full border border-black/30" />
          </button>

          {/* Stroke Size Toggle */}
          <button
            onClick={() => {
              setShowStrokeSliderMobile(!showStrokeSliderMobile);
              setShowColorPickerMobile(false);
            }}
            className="p-1.5 rounded-xl border border-vault-border text-muted-foreground hover:text-vault-text hover:bg-vault-card flex items-center justify-center transition active:scale-95 shrink-0"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MODAL: EDIT TEXT NOTE DIALOG */}
      {editingTextNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-vault-surface border border-vault-border rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-vault-border">
              <h3 className="font-heading font-semibold text-sm text-vault-text flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-vault-primary" />
                <span>Edit Text Note</span>
              </h3>
              <button
                onClick={() => setEditingTextNote(null)}
                className="p-1 text-muted-foreground hover:text-vault-text rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground block mb-1">Text Content:</label>
                <textarea
                  value={editingTextNote.text}
                  onChange={(e) => setEditingTextNote({ ...editingTextNote, text: e.target.value })}
                  rows={3}
                  className="w-full p-2.5 bg-vault-card border border-vault-border rounded-xl text-xs text-vault-text focus:outline-none focus:border-vault-primary font-sans"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-muted-foreground block mb-1">Color:</label>
                <div className="flex items-center gap-2">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditingTextNote({ ...editingTextNote, color: c })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        editingTextNote.color === c ? 'scale-125 border-white shadow-md' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-muted-foreground block mb-1">
                  Font Size: {editingTextNote.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="36"
                  value={editingTextNote.fontSize}
                  onChange={(e) => setEditingTextNote({ ...editingTextNote, fontSize: Number(e.target.value) })}
                  className="w-full accent-vault-primary"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };
                    const updated = {
                      ...current,
                      textNotes: current.textNotes.filter((t) => t.id !== editingTextNote.id),
                    };
                    annotationsRef.current[currentPage] = updated;
                    setAnnotations({ ...annotationsRef.current });
                    pushToHistory(updated);
                    setEditingTextNote(null);
                    setSelectedItem(null);
                    markChangesMade();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-xl transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingTextNote(null)}
                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-vault-text rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };
                      const updated = {
                        ...current,
                        textNotes: current.textNotes.map((t) => (t.id === editingTextNote.id ? editingTextNote : t)),
                      };
                      annotationsRef.current[currentPage] = updated;
                      setAnnotations({ ...annotationsRef.current });
                      pushToHistory(updated);
                      setEditingTextNote(null);
                      markChangesMade();
                    }}
                    className="px-4 py-1.5 bg-vault-primary hover:bg-vault-primary/90 text-vault-bg font-bold text-xs rounded-xl shadow-md transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STICKY NOTE DIALOG */}
      {editingStickyNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-vault-surface border border-vault-border rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-vault-border">
              <h3 className="font-heading font-semibold text-sm text-vault-text flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-amber-400" />
                <span>Edit Sticky Note</span>
              </h3>
              <button
                onClick={() => setEditingStickyNote(null)}
                className="p-1 text-muted-foreground hover:text-vault-text rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground block mb-1">Thoughts / Content:</label>
                <textarea
                  value={editingStickyNote.text}
                  onChange={(e) => setEditingStickyNote({ ...editingStickyNote, text: e.target.value })}
                  rows={4}
                  className="w-full p-2.5 bg-vault-card border border-vault-border rounded-xl text-xs text-vault-text focus:outline-none focus:border-amber-400 font-sans"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };
                    const updated = {
                      ...current,
                      stickyNotes: current.stickyNotes.filter((s) => s.id !== editingStickyNote.id),
                    };
                    annotationsRef.current[currentPage] = updated;
                    setAnnotations({ ...annotationsRef.current });
                    pushToHistory(updated);
                    setEditingStickyNote(null);
                    setSelectedItem(null);
                    markChangesMade();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-xl transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingStickyNote(null)}
                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-vault-text rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const current = annotationsRef.current[currentPage] || { strokes: [], textNotes: [], stickyNotes: [] };
                      const updated = {
                        ...current,
                        stickyNotes: current.stickyNotes.map((s) => (s.id === editingStickyNote.id ? editingStickyNote : s)),
                      };
                      annotationsRef.current[currentPage] = updated;
                      setAnnotations({ ...annotationsRef.current });
                      pushToHistory(updated);
                      setEditingStickyNote(null);
                      markChangesMade();
                    }}
                    className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-xl shadow-md transition"
                  >
                    Update Note
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: MANAGE ALL PAGE ANNOTATIONS (Edit, Select, Delete) */}
      {isAnnotationsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xs sm:max-w-sm h-full bg-vault-surface border-l border-vault-border p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-vault-border">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-vault-primary" />
                  <h3 className="font-heading font-semibold text-sm text-vault-text">
                    Page {currentPage} Annotations
                  </h3>
                </div>
                <button
                  onClick={() => setIsAnnotationsDrawerOpen(false)}
                  className="p-1.5 text-muted-foreground hover:text-vault-text rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2 overflow-y-auto max-h-[70vh] pr-1">
                {totalPageAnnotations === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs">
                    <p>No annotations on Page {currentPage}.</p>
                    <p className="text-[10px] mt-1 font-mono">Use the pen, highlighter, or text tool to add notes.</p>
                  </div>
                ) : (
                  <>
                    {/* Text Notes */}
                    {currentPageNotes.textNotes.map((t, idx) => (
                      <div
                        key={t.id}
                        className="p-2.5 bg-vault-card border border-vault-border rounded-xl flex items-center justify-between text-xs group hover:border-vault-primary/40 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <Type className="w-3.5 h-3.5 text-vault-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate text-vault-text font-medium">{t.text}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">Text Note #{idx + 1}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setIsAnnotationsDrawerOpen(false);
                              setEditingTextNote(t);
                            }}
                            className="p-1 hover:text-vault-primary rounded"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const current = annotationsRef.current[currentPage];
                              const updated = {
                                ...current,
                                textNotes: current.textNotes.filter((item) => item.id !== t.id),
                              };
                              annotationsRef.current[currentPage] = updated;
                              setAnnotations({ ...annotationsRef.current });
                              pushToHistory(updated);
                              markChangesMade();
                            }}
                            className="p-1 hover:text-destructive rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Sticky Notes */}
                    {currentPageNotes.stickyNotes.map((s, idx) => (
                      <div
                        key={s.id}
                        className="p-2.5 bg-vault-card border border-vault-border rounded-xl flex items-center justify-between text-xs group hover:border-amber-400/40 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate text-vault-text font-medium">{s.text}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">Sticky Note #{idx + 1}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setIsAnnotationsDrawerOpen(false);
                              setEditingStickyNote(s);
                            }}
                            className="p-1 hover:text-amber-400 rounded"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const current = annotationsRef.current[currentPage];
                              const updated = {
                                ...current,
                                stickyNotes: current.stickyNotes.filter((item) => item.id !== s.id),
                              };
                              annotationsRef.current[currentPage] = updated;
                              setAnnotations({ ...annotationsRef.current });
                              pushToHistory(updated);
                              markChangesMade();
                            }}
                            className="p-1 hover:text-destructive rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Strokes */}
                    {currentPageNotes.strokes.map((stroke, idx) => (
                      <div
                        key={stroke.id}
                        className="p-2.5 bg-vault-card border border-vault-border rounded-xl flex items-center justify-between text-xs group hover:border-vault-primary/40 transition"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20"
                            style={{ backgroundColor: stroke.color }}
                          />
                          <span className="capitalize text-vault-text font-medium">
                            {stroke.tool} #{idx + 1}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">({stroke.width}px)</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedItem({ type: 'stroke', id: stroke.id });
                              setIsAnnotationsDrawerOpen(false);
                            }}
                            className="p-1 text-muted-foreground hover:text-vault-primary rounded text-[10px] font-mono"
                            title="Select on canvas"
                          >
                            Select
                          </button>
                          <button
                            onClick={() => {
                              const current = annotationsRef.current[currentPage];
                              const updated = {
                                ...current,
                                strokes: current.strokes.filter((item) => item.id !== stroke.id),
                              };
                              annotationsRef.current[currentPage] = updated;
                              setAnnotations({ ...annotationsRef.current });
                              pushToHistory(updated);
                              markChangesMade();
                            }}
                            className="p-1 hover:text-destructive rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Clear All Button */}
            {totalPageAnnotations > 0 && (
              <div className="pt-3 border-t border-vault-border">
                <button
                  onClick={() => {
                    if (confirm('Clear all annotations on this page?')) {
                      annotationsRef.current[currentPage] = { strokes: [], textNotes: [], stickyNotes: [] };
                      setAnnotations({ ...annotationsRef.current });
                      pushToHistory({ strokes: [], textNotes: [], stickyNotes: [] });
                      setSelectedItem(null);
                      markChangesMade();
                    }
                  }}
                  className="w-full py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Annotations on Page</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
