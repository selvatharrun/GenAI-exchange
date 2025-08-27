"use client";

import { useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';

interface PdfViewerProps {
  fileUrl: string | null;
  page: number;
}

export function PdfViewer({ fileUrl, page }: PdfViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (fileUrl && iframeRef.current) {
        const targetSrc = `${fileUrl}#page=${page}`;
        // To force reload if only the hash changes, which some browsers might ignore
        if (iframeRef.current.src.split('#')[0] === fileUrl) {
            iframeRef.current.contentWindow?.location.replace(targetSrc);
        } else {
            iframeRef.current.src = targetSrc;
        }
    }
  }, [fileUrl, page]);

  if (!fileUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/50 rounded-lg border-2 border-dashed border-border">
        <div className="text-center p-8">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground" data-ai-hint="document icon" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">No Document Selected</h3>
          <p className="mt-2 text-sm text-muted-foreground">Upload a PDF using the sidebar to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      title="PDF Viewer"
      className="h-full w-full rounded-lg bg-background"
    />
  );
}
