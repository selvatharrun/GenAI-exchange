"use client";

import { useEffect, useRef, useState, MouseEvent } from "react";
import dynamic from "next/dynamic";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Document = dynamic(() => import("react-pdf").then(m => m.Document), { ssr: false });
const Page = dynamic(() => import("react-pdf").then(m => m.Page), { ssr: false });

interface PdfViewerProps {
  fileUrl: string | null;
  onTextSelect?: (text: string) => void;
}

export function PdfViewer({ fileUrl, onTextSelect }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotate, setRotate] = useState(0);
  const [menu, setMenu] = useState<{ left: number; top: number; text: string } | null>(null);

  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { pdfjs } = await import("react-pdf");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    })();
  }, []);

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const handleContextMenu = (e: MouseEvent) => {
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

    const container = viewerRef.current;
    const containerBox = container.getBoundingClientRect();

    let left = endRect.right - containerBox.left + container.scrollLeft + 8;
    let top = endRect.bottom - containerBox.top + container.scrollTop + 8;

    const BUTTON_W = 110;
    const BUTTON_H = 34;
    left = Math.min(left, container.scrollLeft + container.clientWidth - BUTTON_W - 8);
    top = Math.min(top, container.scrollTop + container.clientHeight - BUTTON_H - 8);

    setMenu({ left, top, text: selectedText });
  };

  const handleAnalyzeClick = () => {
    if (menu?.text && onTextSelect) onTextSelect(menu.text);
    setMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  useEffect(() => {
    const onDocMouseDown = (ev: MouseEvent | globalThis.MouseEvent) => {
      const target = ev.target as HTMLElement;
      if (!viewerRef.current) return;
      if (!target.closest("#pdf-analyze-button")) {
        setMenu(null);
      }
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (fileUrl?.startsWith("blob:")) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  if (!fileUrl) {
    return <div className="flex items-center justify-center h-full text-gray-500">No PDF selected</div>;
  }

  return (
    <div className="relative h-full w-full bg-gray-50 dark:bg-gray-900">
      {/* ✅ Centered Toolbar */}
      <div className="flex items-center justify-center gap-6 px-4 py-3 border-b bg-white dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
        {/* Zoom & Rotate group */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-xl">
          <button
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            onClick={() => setScale(s => s + 0.2)}
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            onClick={() => setRotate(r => (r + 90) % 360)}
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        {/* Page Navigation group */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-4 py-1.5 rounded-xl">
          <button
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-40"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <input
            type="number"
            min={1}
            max={numPages || 1}
            value={currentPage}
            onChange={e =>
              setCurrentPage(Math.min(numPages || 1, Math.max(1, Number(e.target.value))))
            }
            className="w-16 px-2 py-1 text-sm text-center border rounded-lg bg-white dark:bg-gray-800"
          />
          <span className="text-xs opacity-70">/ {numPages || "?"}</span>
          <button
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-40"
            onClick={() => setCurrentPage(p => Math.min(numPages || 1, p + 1))}
            disabled={currentPage >= (numPages || 1)}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div
        ref={viewerRef}
        className="relative flex justify-center h-full overflow-auto"
        onContextMenu={handleContextMenu}
      >
        <Document file={fileUrl} onLoadSuccess={handleLoadSuccess}>
          <Page
            pageNumber={currentPage}
            scale={scale}
            rotate={rotate}
            renderTextLayer
            renderAnnotationLayer={false}
          />
        </Document>

        {/* Floating Analyze button */}
        {menu && (
          <div
            id="pdf-analyze-button"
            style={{ left: menu.left, top: menu.top }}
            className="absolute z-50"
          >
            <Button
              onClick={handleAnalyzeClick}
              size="sm"
              variant="default"
              className="shadow"
            >
              {false ? ( // replace with loading state if needed
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              Analyze
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
