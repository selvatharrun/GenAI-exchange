"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { FileText, Loader2, AlertTriangle, RefreshCw, Download, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfViewerProps {
  fileUrl: string | null;
  page: number;
  onPageChange?: (page: number) => void;
  onTotalPagesChange?: (totalPages: number) => void;
}

export function PdfViewer({ fileUrl, page, onPageChange, onTotalPagesChange }: PdfViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset states when file changes
  useEffect(() => {
    if (fileUrl) {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
    }
  }, [fileUrl]);

  // Handle page navigation
  useEffect(() => {
    if (fileUrl && iframeRef.current && !isLoading) {
      try {
        const targetSrc = `${fileUrl}#page=${page}`;
        
        // Check if only the page changed to avoid full reload
        if (iframeRef.current.src.split('#')[0] === fileUrl) {
          // Try to navigate within the same document
          if (iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.location.replace(targetSrc);
          } else {
            iframeRef.current.src = targetSrc;
          }
        } else {
          iframeRef.current.src = targetSrc;
        }
      } catch (error) {
        console.error('Error navigating PDF:', error);
        setHasError(true);
        setErrorMessage('Failed to navigate to the specified page');
      }
    }
  }, [fileUrl, page, isLoading]);

  // Handle iframe load events
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    setErrorMessage('');
  }, []);

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    setErrorMessage('Failed to load PDF. The file might be corrupted or incompatible.');
  }, []);

  // Retry loading
  const handleRetry = useCallback(() => {
    if (fileUrl && iframeRef.current) {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      // Force reload by changing src
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = `${fileUrl}#page=${page}`;
        }
      }, 100);
    }
  }, [fileUrl, page]);

  // Download PDF
  const handleDownload = useCallback(() => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [fileUrl]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!fileUrl) return;
      
      // Only handle shortcuts when not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'f':
        case 'F':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case 'd':
        case 'D':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleDownload();
          }
          break;
        case 'r':
        case 'R':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleRetry();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [fileUrl, toggleFullscreen, handleDownload, handleRetry]);

  // Empty state when no file is provided
  if (!fileUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/30 to-muted/50 rounded-lg border-2 border-dashed border-border/50">
        <div className="text-center p-8 max-w-md">
          <div className="mb-6">
            <FileText className="mx-auto h-20 w-20 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-3">
            No Document Selected
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Upload a PDF document using the sidebar to begin your analysis. 
            Drag and drop is supported for quick uploads.
          </p>
          <div className="space-y-2 text-xs text-muted-foreground/80">
            <p>✓ Supports standard PDF files</p>
            <p>✓ Page navigation with keyboard shortcuts</p>
            <p>✓ AI-powered document analysis</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-destructive/5 rounded-lg border border-destructive/20">
        <div className="text-center p-8 max-w-md">
          <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Failed to Load PDF
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {errorMessage || 'There was an error loading the PDF document. Please try again.'}
          </p>
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <p className="text-xs text-muted-foreground">
              If the problem persists, try uploading a different PDF file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative h-full w-full bg-background rounded-lg overflow-hidden border ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-sm text-muted-foreground">Loading PDF...</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Page {page}
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className={`absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border/50 p-2 z-10 transition-opacity duration-200 ${
        isLoading ? 'opacity-50' : 'opacity-100'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground px-2">
              PDF Viewer
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 px-2"
              title="Download PDF (Ctrl+D)"
            >
              <Download className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="h-8 px-2"
              title="Reload PDF (Ctrl+R)"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 px-2"
              title="Toggle Fullscreen (Ctrl+F)"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* PDF iframe */}
      <iframe
        ref={iframeRef}
        title="PDF Viewer"
        className="w-full h-full pt-12"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        style={{
          background: 'transparent',
        }}
      />

      {/* Keyboard shortcuts help */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-md p-2 text-xs text-muted-foreground border border-border/50 opacity-0 hover:opacity-100 transition-opacity duration-200">
        <div className="space-y-1">
          <div>Ctrl+F - Fullscreen</div>
          <div>Ctrl+D - Download</div>
          <div>Ctrl+R - Reload</div>
          <div>← → - Navigate pages</div>
        </div>
      </div>
    </div>
  );
}