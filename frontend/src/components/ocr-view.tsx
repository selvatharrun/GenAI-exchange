"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Copy, ScanText, FileText } from "lucide-react";
import { PenSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useRef, useState, MouseEvent } from "react";

interface OcrPage {
  page_number: number;
  text: string;
}

interface OcrViewProps {
  ocrPages: OcrPage[] | null;
  fullText: string | null;
  onSaveNote?: (text: string, page?: number) => void;
}

export default function OcrView({ ocrPages, fullText, onSaveNote }: OcrViewProps) {
  const { toast } = useToast();
  const viewerRef = useRef<HTMLDivElement>(null);

  // Context menu state
  const [menu, setMenu] = useState<{
    left: number;
    top: number;
    text: string;
    page: number;
  actions: Array<{ label: string; icon: React.ElementType; action: () => void }>;
  } | null>(null);

  const handleCopyText = async (textToCopy: string | null) => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({ title: "✅ Copied to clipboard!" });
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
      });
    }
  };

  // Context menu handler
  const handleContextMenu = useCallback(
    (e: MouseEvent, pageNumber: number) => {
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
          label: "Add to Notes",
          icon: FileText,
          action: () => {
            if (onSaveNote) onSaveNote(selectedText, pageNumber);
            setMenu(null);
            window.getSelection()?.removeAllRanges();
            toast({ title: "✅ Added to notes!" });
          },
        },
      ];

      setMenu({ left, top, text: selectedText, page: pageNumber, actions });
    },
    [onSaveNote, toast]
  );

  if (!ocrPages || ocrPages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ScanText className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium mb-2">No OCR Data</h3>
        <p className="text-gray-500 max-w-md">
          Click &quot;Generate OCR&quot; in the sidebar to extract text from your document.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={viewerRef}
      className="h-full border-0 glass rounded-xl overflow-hidden glow-teal relative"
    >
      <div className="border-b glass">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanText className="h-18 w-5 text-green-600" />

            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 top-0"> OCR Results</h2>
          </div>
          <Button size="sm" variant="outline" onClick={() => handleCopyText(fullText)}>
            <Copy className="mr-2 h-4 w-4" />
            Copy All Text
          </Button>
        </div>
      </div>
      <div className="p-0 h-[calc(100vh-16rem)]">
        <ScrollArea className="h-full custom-scrollbar">
          <div className="p-6 space-y-6 font-serif">
            {ocrPages.map((page) => (
              <div
                key={page.page_number}
                className="glass rounded-lg p-4"
                onContextMenu={(e) => handleContextMenu(e, page.page_number)}
              >
                <h4 className="font-sans font-bold text-sm mb-3 pb-2 border-b border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <span>Page {page.page_number}</span>
                  <span className="ml-auto text-xs bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded-full">
                    {page.text.length} chars
                  </span>
                </h4>
                <p className="text-base leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-gray-200 selection:bg-purple-200 dark:selection:bg-purple-800 cursor-text">
                  {page.text}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Context Menu */}
      {menu && (
        <div
          id="ocr-context-menu"
          style={{ left: menu.left, top: menu.top }}
          className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-[160px]"
        >
          {menu.actions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </button>
          ))}
          <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
          <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
            Page {menu.page}: &quot;{menu.text}&quot;
          </div>
        </div>
      )}
    </div>
  );
}