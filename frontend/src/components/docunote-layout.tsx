"use client";

import { useState, useCallback, useRef, ChangeEvent, KeyboardEvent, useEffect } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
} from "@/components/ui/sidebar";

import { PdfViewer } from "../components/pdf-viewer";
import {
  generateSummaryAction,
  generateSelectionSummaryAction,
} from "../app/action";
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
  Sparkles,
  PenSquare,
  FileText,
  MessageCircleQuestion,
  Book,
  Copy,
  Trash2,
  Loader2,
  Download,
  BookOpen,
  Brain,
  Zap,
  Plus,
} from "lucide-react";
import { useSidebar } from "./ui/sidebar";
import QnAChat from "@/components/qna-chat";
import NotesTab from "@/components/notes-tab";
import { Note } from "@/components/type";
import { MCPClient } from "mcp-client";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [gsUri, setGsUri] = useState<string | null>(null);
  const [pdfStats, setPdfStats] = useState<PdfStats | null>(null);

  // Navigation State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [totalPages, setTotalPages] = useState(0);

  // Enhanced Notes State
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteFilter, setNoteFilter] = useState<'all' | 'starred' | 'recent'>('all');
  const [noteSearchTerm, setNoteSearchTerm] = useState("");

  // Enhanced Q&A State
  const [questions, setQuestions] = useState<QnAItem[]>([]);
  
  // AI Analysis State
  const [summary, setSummary] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [selectionText, setSelectionText] = useState("");
  const [selectionSummary, setSelectionSummary] = useState("");
  const [isSelectionSummaryLoading, setIsSelectionSummaryLoading] = useState(false);

  // UI State
  const [activeTab, setActiveTab] = useState("pdf-viewer");
  const [showUploadArea, setShowUploadArea] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');

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

  // Check backend connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('http://localhost:8080/health', { method: 'GET' });
        setConnectionStatus(response.ok ? 'connected' : 'error');
        console.log(response);
      } catch {  
        setConnectionStatus('error');
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);



  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setIsLoadingPdf(true);
      setShowUploadArea(false);
      
      // Reset all states
      setPdfFile(file);
      setSummary("");
      setSelectionSummary("");
      setSelectionText("");
      setNotes([]);
      setQuestions([]);
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

      // Preview PDF
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPdfDataUrl(dataUrl);
        
        setTimeout(() => {
          setIsLoadingPdf(false);
          toast({
            title: "✅ PDF Loaded Successfully",
            description: `${file.name} is ready for analysis.`,
          });
        }, 100);
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

      // Upload PDF to backend
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const client = new MCPClient({ name: "Test", version: "1.0.0" });

        await client.connect({
          type: "httpStream",
          url: "http://localhost:8080/mcp"
        });

        // Call the tool
        const response = await client.callTool({
          name: "upload_pdf_to_gcs",
          arguments: {
            file_path: `/uploads/${file.name}`, // or the actual path if you save it
            filename: file.name
          }
        });
        console.log(response);

        // console.log(result);
        // const response = await fetch('http://localhost:8080/upload_pdf_to_gcs', {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'Accept': 'text/event-stream'
        //   },
        //   body: JSON.stringify({
        //     file_path: `/uploads/${file.name}`, // or the actual path if you save it
        //     filename: file.name
        //   })
        // });
      
        const data = await response.json();
        
        if (response.ok && data.gcs_uri) {
          setGsUri(data.gcs_uri);
          setConnectionStatus('connected');
          toast({
            title: "🚀 Upload Successful",
            description: "PDF uploaded and ready for AI analysis!",
          });
        } else {
          setConnectionStatus('error');
          toast({
            title: "Upload Failed",
            description: data.error || "Unknown error occurred",
            variant: "destructive",
          });
        }
      } catch (error) {
        setConnectionStatus('error');
        toast({
          title: "Connection Error",
          description: "Failed to connect to the backend server.",
          variant: "destructive",
        });
      }
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


  const handleDeletePdf = () => {
    // Save current session notes before deleting
    if (pdfFile && notes.length > 0) {
      localStorage.setItem(`docunote-notes-${pdfFile.name}`, JSON.stringify(notes));
    }

    setPdfFile(null);
    setPdfDataUrl(null);
    setSummary("");
    setSelectionSummary("");
    setSelectionText("");
    setNotes([]);
    setQuestions([]);
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

  // update stats (if present)
  if (pdfStats) {
    setPdfStats({
      ...pdfStats,
      notesCount: (pdfStats.notesCount || 0) + 1,
    });
  }

  setSelectionText("");

  toast({
    title: "📝 Note saved",
    description: `Saved note from page ${page}`,
  });
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

  const { open: sidebarOpen } = useSidebar();

  return (
    <>
      <Sidebar collapsible="offcanvas" className="border-r">
        <SidebarHeader className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex h-8 items-center justify-between">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  DocuNote
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  AI-Powered Analysis
                </p>
              </div>
            </div>
            <SidebarTrigger className="h-8 w-8 hover:bg-accent" />
          </div>
        </SidebarHeader>

        {/* Connection Status */}
        <div className="px-4 py-2 border-b">
          <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full ${
            connectionStatus === 'connected' 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : connectionStatus === 'error'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            {connectionStatus === 'connected' ? 'Backend Connected' : 
             connectionStatus === 'error' ? 'Backend Offline' : 'Checking Connection...'}
          </div>
        </div>

        {/* Upload Section */}
        <div className="p-4 space-y-3 border-b">
          {showUploadArea ? (
            <div className="space-y-3">
              <Button 
                onClick={handleUploadClick} 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={isLoadingPdf}
              >
                {isLoadingPdf ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing PDF...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Upload PDF Document
                  </>
                )}
              </Button>
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Drag & drop or click to upload your PDF
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum file size: 50MB
                </p>
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
                  <div className="flex gap-2 mt-3">
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
            {/* Help Section */}
            <div className="mt-6 p-4 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Quick Guide
              </h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-medium">1.</span>
                  <span>Upload your PDF document</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-medium">2.</span>
                  <span>Navigate with arrow keys ← →</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-medium">3.</span>
                  <span>Right-click text for instant AI analysis</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-medium">4.</span>
                  <span>Save important insights as notes</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-medium">5.</span>
                  <span>Ask questions in the Q&A tab</span>
                </div>
              </div>
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
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="h-10 bg-muted/50">
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
                
                <TabsTrigger value="summary" disabled={!pdfFile} className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Summary</span>
                  <span className="sm:hidden">AI</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab-specific actions */}
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
            
            {/* PDF Viewer Tab */}
            <TabsContent value="pdf-viewer" className="flex-1 mt-0">
              <Card className="h-full border-0 shadow-lg rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                <PdfViewer 
                  fileUrl={pdfDataUrl} 
                  fileName={pdfFile?.name}
                  onTextSelect={setSelectionText}
                  onSaveNote={handleSaveNote}
                  isAnalyzing={isSelectionSummaryLoading}
                />
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="flex-1 mt-0">
              <NotesTab 
                notes={notes}
                setNotes={setNotes}
              />
            </TabsContent>

            {/* Q&A Tab */}
            <TabsContent value="q-and-a" className="flex-1 mt-0">
              <Card className="h-full border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-0 h-[calc(100vh-16rem)]">
                  <QnAChat gsUri={gsUri} pdfName={pdfFile?.name} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* New Summary Tab */}
            <TabsContent value="summary" className="flex-1 mt-0">
              <Card className="h-full border-0 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-green-600" />
                    Document Summary
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      AI Generated
                    </Badge>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="p-6 space-y-6">
                  <div className="text-center">
                    <Button
                      onClick={async () => {
                        if (!pdfDataUrl) return;
                        setIsSummaryLoading(true);
                        setSummary("");
                        try {
                          const result = await generateSummaryAction({ pdfDataUri: pdfDataUrl });
                          setSummary(result);
                          toast({
                            title: "📄 Summary Generated",
                            description: "Document summary is ready!",
                          });
                        } catch (error) {
                          toast({
                            variant: "destructive",
                            title: "Error",
                            description: "Failed to generate summary. Please try again.",
                          });
                        } finally {
                          setIsSummaryLoading(false);
                        }
                      }}
                      disabled={isSummaryLoading || !pdfDataUrl}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      size="lg"
                    >
                      {isSummaryLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Generating Summary...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          Generate AI Summary
                        </>
                      )}
                    </Button>
                  </div>

                  {(isSummaryLoading || summary) && (
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Brain className="h-5 w-5 text-green-600" />
                            Document Summary
                          </span>
                          {summary && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyText(summary)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isSummaryLoading ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                              <Brain className="h-5 w-5 animate-pulse" />
                              <span>AI is reading and summarizing your document...</span>
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-4 w-3/5" />
                            <Skeleton className="h-4 w-5/6" />
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <p className="whitespace-pre-wrap leading-relaxed text-green-800 dark:text-green-200">
                              {summary}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
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