"use client";

import { useEffect, useRef, useState, MouseEvent, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  Download,
  FileText,
  Eye,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Document = dynamic(() => import("react-pdf").then((m) => m.Document), { ssr: false });
const Page = dynamic(() => import("react-pdf").then((m) => m.Page), { ssr: false });

interface PdfViewerProps {
  fileUrl: string | null;
  fileName?: string;
  onTextSelect?: (text: string) => void;
  onSaveNote?: (text: string, page?: number) => void; // <-- new
  isAnalyzing?: boolean;
}

export function PdfViewer({
  fileUrl,
  fileName,
  onTextSelect,
  onSaveNote,
  isAnalyzing = false,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [rotate, setRotate] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [renderTextLayer, setRenderTextLayer] = useState(true);
  const [pageInput, setPageInput] = useState("1");

  // Context menu state
  const [menu, setMenu] = useState<{
    left: number;
    top: number;
    text: string;
  actions: Array<{ label: string; icon: React.ElementType; action: () => void }>;
  } | null>(null);

  const viewerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { pdfjs } = await import("react-pdf");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      } catch (error) {
        console.error("Failed to setup PDF.js:", error);
      }
    })();
  }, []);

  useEffect(() => {
    if (fileUrl) {
      setIsLoading(true);
      setLoadError(null);
      setCurrentPage(1);
      setPageInput("1");
    }
  }, [fileUrl]);

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setPageInput("1");
    setIsLoading(false);
    setLoadError(null);
  };

  const handleLoadError = (error: Error) => {
    console.error("PDF Load Error:", error);
    setLoadError(error.message || "Failed to load PDF");
    setIsLoading(false);
  };

  // context menu with multiple actions (now calls parent handler to save a note)
  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (!viewerRef.current || !selectedText || !selection || selection.rangeCount === 0) {
        setMenu(null);
        return;
      }

      e.preventDefault();

      const range = selection.getRangeAt(0);
      const rects = range.getClientRects();
      const endRect = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect();

      const container = viewerRef.current!;
      const containerBox = container.getBoundingClientRect();

      let left = endRect.right - containerBox.left + container.scrollLeft + 8;
      let top = endRect.bottom - containerBox.top + container.scrollTop + 8;

      // Ensure menu stays within bounds
      const menuWidth = 200;
      const menuHeight = 120;
      left = Math.min(left, container.scrollLeft + container.clientWidth - menuWidth - 8);
      top = Math.min(top, container.scrollTop + container.clientHeight - menuHeight - 8);

      const actions = [
        {
          label: "Copy",
          icon: Copy,
          action: () => {
            navigator.clipboard.writeText(selectedText);
            setMenu(null);
            window.getSelection()?.removeAllRanges();
          },
        },
        {
          label: "Save Note",
          icon: FileText,
          action: () => {
            // call parent handler that will construct the proper Note object
            if (onSaveNote) onSaveNote(selectedText, currentPage);
            setMenu(null);
            window.getSelection()?.removeAllRanges();
          },
        },
      ];

      setMenu({ left, top, text: selectedText, actions });
    },
    [onTextSelect, onSaveNote, currentPage]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(null);
        setShowSearch(false);
        setShowSettings(false);
      }
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "f":
            e.preventDefault();
            setShowSearch(true);
            setTimeout(() => searchInputRef.current?.focus(), 100);
            break;
          case "=":
          case "+":
            e.preventDefault();
            setScale(s => Math.min(3, s + 0.2));
            break;
          case "-":
            e.preventDefault();
            setScale(s => Math.max(0.5, s - 0.2));
            break;
        }
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key) {
          case "ArrowLeft":
            setCurrentPage(p => Math.max(1, p - 1));
            setPageInput(String(Math.max(1, currentPage - 1)));
            break;
          case "ArrowRight":
            setCurrentPage(p => Math.min(numPages || 1, p + 1));
            setPageInput(String(Math.min(numPages || 1, currentPage + 1)));
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, numPages]);

  // Click outside handler
  useEffect(() => {
    const onDocMouseDown = (ev: MouseEvent | globalThis.MouseEvent) => {
      const target = ev.target as HTMLElement;
      if (!viewerRef.current) return;
      if (!target.closest("#pdf-context-menu") && 
          !target.closest("#pdf-search") && 
          !target.closest("#pdf-settings")) {
        setMenu(null);
        if (!target.closest("#search-button")) setShowSearch(false);
        if (!target.closest("#settings-button")) setShowSettings(false);
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Page navigation handlers
  const goToPage = (page: number) => {
    const validPage = Math.min(numPages || 1, Math.max(1, page));
    setCurrentPage(validPage);
    setPageInput(String(validPage));
  };

  const handlePageInputChange = (value: string) => {
    setPageInput(value);
    const pageNum = parseInt(value);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= (numPages || 1)) {
      setCurrentPage(pageNum);
    }
  };

  // Zoom presets
  const zoomPresets = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const currentZoomIndex = zoomPresets.findIndex(z => Math.abs(z - scale) < 0.1);

  // Clean up blob URLs
  useEffect(() => {
    return () => {
      if (fileUrl?.startsWith("blob:")) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
        <FileText className="h-16 w-16 mb-4 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-medium mb-2">No PDF loaded</h3>
        <p className="text-sm">Upload a PDF document to start viewing</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Simplified Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white dark:bg-gray-800 shadow-sm">
        {/* Left section - File info */}
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {fileName || "PDF Document"}
            </h3>
            {numPages && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {numPages} pages • {Math.round(scale * 100)}% zoom
              </p>
            )}
          </div>
        </div>

        {/* Center section - Main controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
              disabled={scale <= 0.5}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <span className="text-xs min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScale(s => Math.min(3, s + 0.2))}
              disabled={scale >= 3}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <input
              type="text"
              value={pageInput}
              onChange={(e) => handlePageInputChange(e.target.value)}
              onBlur={() => handlePageInputChange(pageInput)}
              className="w-12 px-1 py-1 text-xs text-center border-0 bg-white dark:bg-gray-800 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            
            <span className="text-xs text-gray-500 px-1">of {numPages || "?"}</span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= (numPages || 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRotate(r => (r + 90) % 360)}
            className="h-8 w-8 p-0"
            title="Rotate (90°)"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Right section - Action buttons */}
        <div className="flex items-center gap-2">
          {fileUrl && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 w-8 p-0"
              title="Download PDF"
            >
              <a href={fileUrl} download={fileName || "document.pdf"}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <div
        ref={viewerRef}
        className="relative flex-1 flex justify-center overflow-auto bg-gray-100 dark:bg-gray-800"
        onContextMenu={handleContextMenu}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 z-10">
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Loading PDF...</span>
            </div>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
            <div className="text-center text-red-500">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Failed to load PDF</p>
              <p className="text-sm opacity-75">{loadError}</p>
            </div>
          </div>
        )}

        {!loadError && (
          <div className="py-4">
            <Document 
              file={fileUrl} 
              onLoadSuccess={handleLoadSuccess}
              onLoadError={handleLoadError}
              loading=""
            >
              <div className="shadow-lg">
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  rotate={rotate}
                  renderTextLayer={renderTextLayer}
                  renderAnnotationLayer={false}
                  className="border border-gray-300 dark:border-gray-600"
                  loading={
                    <div className="flex items-center justify-center p-8 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  }
                />
              </div>
            </Document>
          </div>
        )}

        {/* Context Menu */}
        {menu && (
          <div
            id="pdf-context-menu"
            style={{ left: menu.left, top: menu.top }}
            className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-[160px]"
          >
            {menu.actions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                disabled={action.label === "Analyze Text" && isAnalyzing}
                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {action.label === "Analyze Text" && isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <action.icon className="h-4 w-4" />
                )}
                {action.label}
              </button>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
            <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
              &quot;{menu.text}&quot;
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="border-t bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>Page {currentPage} of {numPages || "?"}</span>
          <span>{Math.round(scale * 100)}% zoom</span>
          {rotate > 0 && <span>Rotated {rotate}°</span>}
        </div>
        <div className="flex items-center gap-4">
          <span>Right-click on text to analyze or copy</span>
          {renderTextLayer ? (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Text selection enabled
            </span>
          ) : (
            <span className="opacity-50">Text selection disabled</span>
          )}
        </div>
      </div>
    </div>
  );
}