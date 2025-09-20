"use client";

import { useState, useCallback, useRef, ChangeEvent, KeyboardEvent, useEffect, DragEvent } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
} from "@/components/ui/sidebar";

import { PdfViewer } from "../components/pdf-viewer";
import { useToast } from "../hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  PenSquare,
  FileText,
  MessageCircleQuestion,
  Book,
  Copy,
  Trash2,
  Loader2,
  Download,
  BookOpen,
  Zap,
  Plus,
  ScanText,
} from "lucide-react";
import { useSidebar } from "./ui/sidebar";
import QnAChat from "@/components/qna-chat";
import NotesTab from "@/components/notes-tab";
import OcrView from "@/components/ocr-view";
import { Note } from "@/components/type";
import { MCPService, useMCPClient } from "@/lib/mcp-client";

interface QnAItem {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  page?: number;
}

interface PdfStats {
  totalPages: number;
  fileSize: string;
  uploadDate: Date;
  readingProgress: number;
  notesCount: number;
  questionsCount: number;
}

function DocunoteContent() {
  const { toast } = useToast();
  const { open: sidebarOpen } = useSidebar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mcpClient = useMCPClient();

  // PDF State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [gsUri, setGsUri] = useState<string | null>(null);
  const [pdfStats, setPdfStats] = useState<PdfStats | null>(null);
  const [showUploadArea, setShowUploadArea] = useState(true);

  // Navigation State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [totalPages, setTotalPages] = useState(0);

  // Enhanced Notes State
  const [notes, setNotes] = useState<Note[]>([]);

  // Enhanced Q&A State
  const [questions, setQuestions] = useState<QnAItem[]>([]);

  // OCR State
  const [ocrData, setOcrData] = useState<{fullText: string | null, pages: {page_number: number, text: string}[] | null}>({fullText: null, pages: null});
  const [isGeneratingOcr, setIsGeneratingOcr] = useState(false);

  // UI State
  const [activeTab, setActiveTab] = useState("pdf-viewer");
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [isDragOver, setIsDragOver] = useState(false);

  // Auto-save notes to localStorage
  useEffect(() => {
    if (pdfFile && notes.length > 0) {
      localStorage.setItem(`docunote-notes-${pdfFile.name}`, JSON.stringify(notes));
    }
  }, [notes, pdfFile]);

  // Load saved notes
  useEffect(() => {
    if (pdfFile) {
      const savedNotes = localStorage.getItem(`docunote-notes-${pdfFile.name}`);
      if (savedNotes) {
        try {
          setNotes(JSON.parse(savedNotes));
        } catch (error) {
          console.error("Failed to load saved notes:", error);
        }
      }
    }
  }, [pdfFile]);

  // Initialize MCP connection and monitor status
  useEffect(() => {
    const initializeAndMonitor = async () => {
      setConnectionStatus('checking');
      
      try {
        const connected = await MCPService.connect();
        if (connected) {
          const isHealthy = await MCPService.checkHealth();
          setConnectionStatus(isHealthy ? 'connected' : 'error');
        } else {
          setConnectionStatus('error');
        }
      } catch (error) {
        console.error('MCP connection failed:', error);
        setConnectionStatus('error');
      }
    };

    initializeAndMonitor();
    
    // Set up periodic health checks
    const interval = setInterval(async () => {
      try {
        const status = MCPService.getStatus();
        if (status === 'disconnected') {
          await MCPService.connect();
        }
        const isHealthy = await MCPService.checkHealth();
        setConnectionStatus(isHealthy ? 'connected' : 'error');
      } catch {
        setConnectionStatus('error');
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      await handleFileUpload(file);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload a valid PDF file only.",
      });
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf") {
        handleFileUpload(file);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a valid PDF file only.",
        });
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsLoadingPdf(true);
    setShowUploadArea(false);

    // Reset all states
    setPdfFile(file);
    setNotes([]);
    setQuestions([]);
    setOcrData({fullText: null, pages: null});
    setCurrentPage(1);
    setPageInput("1");
    setTotalPages(0);

    // Create PDF stats
    const stats: PdfStats = {
      totalPages: 0,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      uploadDate: new Date(),
      readingProgress: 0,
      notesCount: 0,
      questionsCount: 0
    };
    setPdfStats(stats);

    // Preview PDF locally first
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPdfDataUrl(dataUrl);
      toast({
        title: "✅ PDF Loaded Successfully",
        description: `${file.name} is ready for local viewing.`,
      });
    };

    reader.onerror = () => {
      setIsLoadingPdf(false);
      toast({
        variant: "destructive",
        title: "Loading Error",
        description: "Failed to load the PDF file. Please try again.",
      });
    };
    reader.readAsDataURL(file);

    // Upload PDF using MCP Service
    try {
      const uploadResult = await MCPService.uploadPdf(file);

      if (uploadResult.success && uploadResult.gsUri) {
        setGsUri(uploadResult.gsUri);
        setConnectionStatus('connected');
        toast({
          title: "🚀 Upload Successful",
          description: "PDF uploaded and ready for AI analysis via MCP!",
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: "Upload Failed",
          description: uploadResult.error || "Failed to upload PDF to MCP server",
          variant: "destructive",
        });
      }
    } catch (error) {
      setConnectionStatus('error');
      console.error('MCP upload error:', error);
      toast({
        title: "MCP Connection Error",
        description: "Failed to connect to MCP server for PDF upload.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const handleDeletePdf = () => {
    if (pdfFile && notes.length > 0) {
      localStorage.setItem(`docunote-notes-${pdfFile.name}`, JSON.stringify(notes));
    }

    setPdfFile(null);
    setPdfDataUrl(null);
    setNotes([]);
    setQuestions([]);
    setOcrData({fullText: null, pages: null});
    setCurrentPage(1);
    setPageInput("1");
    setTotalPages(0);
    setGsUri(null);
    setPdfStats(null);
    setShowUploadArea(true);
    setActiveTab("pdf-viewer");

    toast({
      title: "🗑️ PDF Removed",
      description: "You can upload a new PDF document now.",
    });
  };

  const handleSaveNote = (text: string, pageArg?: number) => {
    if (!text?.trim()) return;
    const page = pageArg ?? currentPage;
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      page,
      timestamp: new Date(),
      isStarred: false,
    };

    setNotes((prev) => [newNote, ...prev]);

    if (pdfFile) {
      localStorage.setItem(`docunote-notes-${pdfFile.name}`, JSON.stringify([newNote, ...notes]));
    }

    if (pdfStats) {
      setPdfStats({
        ...pdfStats,
        notesCount: (pdfStats.notesCount || 0) + 1,
      });
    }
  };

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "📋 Copied to clipboard!" });
    } catch (error) {
      toast({ 
        title: "Copy failed", 
        description: "Unable to copy text to clipboard",
        variant: "destructive" 
      });
    }
  };

  const handleExportNotes = () => {
    if (notes.length === 0) return;
    const normalizeDate = (ts: string | Date) => ts instanceof Date ? ts : new Date(ts);
    const notesText = notes.map((note, index) =>
      `Note ${index + 1} (Page ${note.page}) - ${normalizeDate(note.timestamp).toLocaleDateString()}\n${note.text}\n\n`
    ).join('');

    const blob = new Blob([notesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pdfFile?.name || 'document'}-notes.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "📄 Notes Exported",
      description: "Your notes have been saved to a text file.",
    });
  };

  const handleGenerateOcr = async () => {
    if (!gsUri) {
      toast({
        variant: "destructive",
        title: "No PDF uploaded",
        description: "Please upload a PDF first to generate OCR.",
      });
      return;
    }

    setIsGeneratingOcr(true);

    try {
      const result = await MCPService.extractTextFromPdf(gsUri);

      if (result.success && result.data) {
        setOcrData({
          fullText: result.data.fullText,
          pages: result.data.pages
        });

        toast({
          title: "✅ OCR Generated Successfully",
          description: `Extracted ${result.data.totalCharacters} characters from ${result.data.totalPages} pages.`,
        });

        // Switch to OCR tab to show results
        setActiveTab("ocr");
      } else {
        toast({
          variant: "destructive",
          title: "OCR Generation Failed",
          description: result.error || "Failed to extract text from PDF.",
        });
      }
    } catch (error) {
      console.error('OCR generation error:', error);
      toast({
        variant: "destructive",
        title: "OCR Error",
        description: "An error occurred while generating OCR.",
      });
    } finally {
      setIsGeneratingOcr(false);
    }
  };

  return (
    <>
      <Sidebar collapsible="offcanvas" className="border-r glass">
        <SidebarHeader className="p-4 border-b bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/40 backdrop-blur-sm">
          <div className="flex h-8 items-center justify-between">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  DocuNote
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-medium">
                    AI-Powered Analysis
                  </span>
                </p>
              </div>
            </div>
            <SidebarTrigger className="h-8 w-8 hover:bg-accent" />
          </div>
        </SidebarHeader>

        <div className="px-4 py-2 border-b">
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-full glass ${
            connectionStatus === 'connected'
              ? 'bg-green-100/80 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : connectionStatus === 'error'
              ? 'bg-red-100/80 text-red-700 dark:bg-red-900/40 dark:text-red-300'
              : 'bg-yellow-100/80 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            <span className="font-medium">
              {connectionStatus === 'connected' ? 'MCP Server Connected' :
                connectionStatus === 'error' ? 'MCP Offline' : 'Connecting to MCP...'}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-3 border-b">
          {showUploadArea ? (
            <div className="space-y-3">
              {/* Drag and Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer glass ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                } ${isLoadingPdf ? 'pointer-events-none opacity-50' : ''}`}
                onClick={handleUploadClick}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    {isLoadingPdf ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Upload className="h-6 w-6" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm">
                      {isLoadingPdf ? 'Processing PDF...' :
                       isDragOver ? 'Drop your PDF here!' : 'Upload PDF Document'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {isDragOver ? 'Release to upload' : 'Drag & drop or click to browse'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Max size: 50MB • PDF files only
                    </p>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <Button 
              onClick={handleUploadClick} 
              variant="outline"
              className="w-full"
              disabled={isLoadingPdf}
            >
              <Plus className="mr-2 h-4 w-4" />
              Upload New PDF
            </Button>
          )}
          
          <Input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {pdfFile && (
            <div className="space-y-3">
              <div className="p-3 glass rounded-lg border glow-blue/50">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                    {pdfFile.name}
                  </span>
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <div>Size: {pdfStats?.fileSize}</div>
                  <div className="flex items-center gap-1">
                    Status: 
                    {gsUri ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs px-1">
                        Ready for AI
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs px-1">
                        Local only
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  onClick={handleGenerateOcr}
                  size="sm"
                  className="flex-1"
                  disabled={isGeneratingOcr || !gsUri}
                >
                  {isGeneratingOcr ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      OCR...
                    </>
                  ) : (
                    <>
                      <ScanText className="mr-1 h-3 w-3" />
                      Generate OCR
                    </>
                  )}
                </Button>

                <Button
                  variant="destructive"
                  onClick={handleDeletePdf}
                  size="sm"
                  className="flex-1"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              </div>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <SidebarContent className="p-4">
            <div className="mt-6 p-4 glass rounded-lg border">
              {/* <h4 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Guide
              </h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-medium">1.</span>
                  <span>Upload your PDF document</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-medium">2.</span>
                  <span>PDF is processed via MCP server</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-medium">3.</span>
                  <span>Navigate with arrow keys ← →</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-medium">4.</span>
                  <span>Right-click text for instant AI analysis</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-medium">5.</span>
                  <span>Ask questions via MCP-powered Q&A</span>
                </div>
              </div> */}
              
              {connectionStatus === 'error' && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-300">
                    ⚠️ MCP server connection failed. Please ensure your MCP server is running.
                  </p>
                </div>
              )}
            </div>
          </SidebarContent>
        </ScrollArea>
      </Sidebar>

      <SidebarInset>
        <div className="p-4 relative h-full flex flex-col">
          {!sidebarOpen && (
            <div className="absolute top-4 left-4 z-20">
              <SidebarTrigger className="bg-background/95 backdrop-blur-sm border shadow-lg hover:shadow-xl transition-all duration-200" />
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="h-10 glass border">
                <TabsTrigger value="pdf-viewer" className="flex items-center gap-2">
                  <Book className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF Viewer</span>
                  <span className="sm:hidden">PDF</span>
                </TabsTrigger>

                <TabsTrigger value="notes" disabled={!pdfFile} className="flex items-center gap-2 relative">
                  <PenSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Notes</span>
                  <span className="sm:hidden">Notes</span>
                  {notes.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 text-xs px-1.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      {notes.length}
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger value="q-and-a" disabled={!pdfFile} className="flex items-center gap-2 relative">
                  <MessageCircleQuestion className="w-4 h-4" />
                  <span className="hidden sm:inline">Q&A Chat</span>
                  <span className="sm:hidden">Q&A</span>
                  {questions.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 text-xs px-1.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                      {questions.length}
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger value="ocr" disabled={!pdfFile} className="flex items-center gap-2 relative">
                  <ScanText className="w-4 h-4" />
                  <span className="hidden sm:inline">OCR Text</span>
                  <span className="sm:hidden">OCR</span>
                  {ocrData.fullText && (
                    <Badge variant="secondary" className="ml-1 h-5 text-xs px-1.5 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                      Ready
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {activeTab === "notes" && notes.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportNotes}
                    className="h-8"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </Button>
                </div>
              )}
            </div>
            
            <TabsContent value="pdf-viewer" className="flex-1 mt-0">
              <PdfViewer 
                fileUrl={pdfDataUrl} 
                fileName={pdfFile?.name}
                onSaveNote={handleSaveNote}
              />
            </TabsContent>

            <TabsContent value="notes" className="flex-1 mt-0">
              <NotesTab 
                notes={notes}
                setNotes={setNotes}
              />
            </TabsContent>

            <TabsContent value="q-and-a" className="flex-1 mt-0">
              <QnAChat gsUri={gsUri} pdfName={pdfFile?.name} />
            </TabsContent>

            <TabsContent value="ocr" className="flex-1 mt-0">
              <OcrView ocrPages={ocrData.pages} fullText={ocrData.fullText} />
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </>
  );
}

export function DocuNoteLayout() {
  return (
    <SidebarProvider>
      <DocunoteContent />
    </SidebarProvider>
  );
}