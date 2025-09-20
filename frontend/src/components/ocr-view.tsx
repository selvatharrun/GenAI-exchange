"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Copy, ScanText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OcrPage {
  page_number: number;
  text: string;
}

interface OcrViewProps {
  ocrPages: OcrPage[] | null;
  fullText: string | null;
}

export default function OcrView({ ocrPages, fullText }: OcrViewProps) {
  const { toast } = useToast();

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
    <Card className="h-full border-0 glass rounded-xl overflow-hidden glow-teal">
      <CardHeader className="border-b glass">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ScanText className="h-5 w-5 text-teal-600" />
            OCR Results
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => handleCopyText(fullText)}>
            <Copy className="mr-2 h-4 w-4" />
            Copy All Text
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100vh-16rem)]">
        <ScrollArea className="h-full custom-scrollbar">
          <div className="p-6 space-y-6 font-serif">
            {ocrPages.map((page) => (
              <div
                key={page.page_number}
                className="glass rounded-lg p-4"
              >
                <h4 className="font-sans font-bold text-sm mb-3 pb-2 border-b border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <span>Page {page.page_number}</span>
                  <span className="ml-auto text-xs bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded-full">
                    {page.text.length} chars
                  </span>
                </h4>
                <p className="text-base leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-gray-200 selection:bg-purple-200 dark:selection:bg-purple-800">
                  {page.text}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}