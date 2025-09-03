"use client";

import { useState, useCallback, useRef, ChangeEvent, KeyboardEvent } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { PdfViewer } from "../components/pdf-viewer";
import {
  generateSummaryAction,
  generateSelectionSummaryAction,
} from "../app/action";
import { useToast } from "../hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PenSquare,
  FileText,
  MessageCircleQuestion,
  Book,
  Copy,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useSidebar } from "./ui/sidebar";
import QnAChat from "@/components/qna-chat";


function DocunoteContent() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [totalPages, setTotalPages] = useState(0);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  
  const [notes, setNotes] = useState<string[]>([]);
  const [questions, setQuestions] = useState<{q: string, a: string}[]>([]);
  
  const [summary, setSummary] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const [selectionText, setSelectionText] = useState("");
  const [selectionSummary, setSelectionSummary] = useState("");
  const [isSelectionSummaryLoading, setIsSelectionSummaryLoading] = useState(false);

  const [gsUri, setGsUri] = useState<string | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setIsLoadingPdf(true);
      setPdfFile(file);
      setSummary("");
      setSelectionSummary("");
      setNotes([]);
      setQuestions([]);
      setCurrentPage(1);
      setPageInput("1");
      setTotalPages(0);

      // Preview PDFs
      const reader = new FileReader();
      reader.onload = (e) => {
        setPdfDataUrl(e.target?.result as string);
        setIsLoadingPdf(false);
        toast({
          title: "PDF Loaded",
          description: `${file.name} is ready for analysis.`,
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

      // Upload PDF to backend
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await fetch('http://localhost:5000/upload-pdf', {
          method: 'POST',
          body: formData,
        });    
        const data = await response.json();
        console.log(response);
        console.log(data);
        if (response.ok && data.gcs_uri) {
          setGsUri(data.gcs_uri);
          toast({
            title: "Upload Successful",
            description: `GS URI: ${data.gcs_uri}`,
          });
        } else {
          toast({
            title: "Upload Failed",
            description: data.error || "Unknown error",
            variant: "destructive",
          });
        }
      } 
      
      catch (error) {
        toast({
          title: "Upload Error",
          description: String(error),
          variant: "destructive",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please upload a valid PDF file.",
      });
    }
  };

const handleUploadClick = () => {
  fileInputRef.current?.click();
};

  const handleDownload = () => {
    if (pdfFile) {
      const url = URL.createObjectURL(pdfFile);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: `Downloading ${pdfFile.name}...`,
      });
    }
  };

  const handleDeletePdf = () => {
  setPdfFile(null);
  setPdfDataUrl(null);
  setSummary("");
  setSelectionSummary("");
  setNotes([]);
  setQuestions([]);
  setCurrentPage(1);
  setPageInput("1");
  setTotalPages(0);
  setSelectionText("");
  setGsUri(null);

  toast({
    title: "PDF Removed",
    description: "You can upload a new PDF now.",
  });
};


  const handleGenerateSummary = async () => {
    if (!pdfDataUrl) return;
    setIsSummaryLoading(true);
    setSummary("");
    try {
      const result = await generateSummaryAction({ pdfDataUri: pdfDataUrl });
      setSummary(result);
      toast({
        title: "Summary Generated",
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
  };

  const handleGenerateSelectionSummary = async () => {
    if (!selectionText.trim()) return;
    setIsSelectionSummaryLoading(true);
    setSelectionSummary("");
    try {
      const result = await generateSelectionSummaryAction({ selectedText: selectionText });
      setSelectionSummary(result);
      toast({
        title: "Selection Summarized",
        description: "Text analysis complete!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate selection summary.",
      });
    } finally {
      setIsSelectionSummaryLoading(false);
    }
  };

  const handleAddNote = () => {
    if (selectionText.trim()) {
      setNotes(prev => [...prev, selectionText]);
      setSelectionText("");
      toast({ 
        title: "Note Added!", 
        description: `Note saved from page ${currentPage}` 
      });
    }
  };

  const handleDeleteNote = (index: number) => {
    setNotes(prev => prev.filter((_, i) => i !== index));
    toast({ title: "Note deleted" });
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied to clipboard" });
    });
  };

  const updateCurrentPage = (newPage: number) => {
    const page = Math.max(1, totalPages > 0 ? Math.min(newPage, totalPages) : newPage);
    setCurrentPage(page);
    setPageInput(String(page));
  };
  
  const handlePageInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = () => {
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum) && pageNum > 0) {
      updateCurrentPage(pageNum);
    } else {
      setPageInput(String(currentPage));
    }
  };
  
  const handlePageInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit();
    } else if (e.key === 'Escape') {
      setPageInput(String(currentPage));
    }
  };

  const { open: sidebarOpen } = useSidebar();

  return (
    <>
      <Sidebar collapsible="offcanvas" className="border-r">
        <SidebarHeader className="p-4 border-b bg-muted/30">
          <div className="flex h-8 items-center justify-between">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">DocuNote</h1>
                <p className="text-xs text-muted-foreground">AI-Powered Analysis</p>
              </div>
            </div>
            <SidebarTrigger className="h-8 w-8 hover:bg-accent" />
          </div>
        </SidebarHeader>

        {/* Upload Section */}
        <div className="p-4 space-y-3 border-b">
          <div className="space-y-2">
            <Button 
              onClick={handleUploadClick} 
              className="w-full"
              disabled={isLoadingPdf}
            >
              {isLoadingPdf ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload PDF
                </>
              )}
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          
          {pdfFile && (
            <div className="space-y-2">
              <Button 
                variant="outline" 
                onClick={handleDownload} 
                className="w-full"
                size="sm"
              >
                <FileDown className="mr-2 h-4 w-4" /> 
                Download PDF
              </Button>

              <Button 
                variant="destructive" 
                onClick={handleDeletePdf} 
                className="w-full"
                size="sm"
              >
                <Trash2 className="mr-2 h-4 w-4" /> 
                Delete PDF
              </Button>
              
              {/* File Info */}
              <div className="p-2 bg-muted/50 rounded-md">
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File:</span>
                    <span className="font-medium truncate max-w-32" title={pdfFile.name}>
                      {pdfFile.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size:</span>
                    <span className="font-medium">
                      {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <SidebarContent className="p-4">
            <Accordion type="multiple" defaultValue={["ai-actions"]} className="w-full">
              <AccordionItem value="ai-actions" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> 
                    AI Analysis
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4">
                  

                  {/* Selection Analysis */}
                  <div className="space-y-3">
                    <Label htmlFor="selection-text" className="text-sm font-medium">
                      Selected Text Analysis
                    </Label>
                    <Textarea 
                      id="selection-text"
                      placeholder="Copy and paste text from the PDF here to analyze..."
                      value={selectionText}
                      onChange={(e) => setSelectionText(e.target.value)}
                      disabled={!pdfFile}
                      className="min-h-[100px] max-h-[200px] text-sm resize-none overflow-y-auto"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        onClick={handleGenerateSelectionSummary} 
                        disabled={!selectionText.trim() || isSelectionSummaryLoading}
                        size="sm"
                        variant="default"
                      >
                        {isSelectionSummaryLoading ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="mr-1 h-3 w-3" />
                        )}
                        Analyze
                      </Button>
                      <Button 
                        onClick={handleAddNote} 
                        disabled={!selectionText.trim()} 
                        variant="secondary"
                        size="sm"
                      >
                        <PenSquare className="mr-1 h-3 w-3" />
                        Add Note
                      </Button>
                    </div>
                  </div>

                  {/* Selection Summary */}
                  {(isSelectionSummaryLoading || selectionSummary) && (
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
                      <CardHeader className="p-3">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-green-600" />
                            Selection Analysis
                          </span>
                          {selectionSummary && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyText(selectionSummary)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        {isSelectionSummaryLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-5/6" />
                          </div>
                        ) : (
                          <div className="text-sm leading-relaxed max-h-32 overflow-y-auto">
                            <p className="whitespace-pre-wrap">{selectionSummary}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Quick Stats */}
              {(notes.length > 0 || questions.length > 0) && (
                <AccordionItem value="stats" className="border rounded-lg mt-3">
                  <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" /> 
                      Progress
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{notes.length}</div>
                          <div className="text-xs text-muted-foreground">Notes</div>
                        </div>
                      </Card>
                      <Card className="p-3 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{questions.length}</div>
                          <div className="text-xs text-muted-foreground">Q&As</div>
                        </div>
                      </Card>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            {/* Help Section */}
            <div className="mt-6 p-3 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-semibold mb-2 text-slate-700 dark:text-slate-300">
                Quick Tips
              </h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Upload a PDF to get started</li>
                <li>• Use arrow keys ← → to navigate pages</li>
                <li>• Copy text and paste it for AI analysis</li>
                <li>• Save important text as notes</li>
              </ul>
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
          
          <Tabs defaultValue="pdf-viewer" className="flex-1 flex flex-col">
            <TabsList className="mb-4 w-full sm:w-auto">
              <TabsTrigger value="pdf-viewer" className="flex-1 sm:flex-none">
                <Book className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">PDF Viewer</span>
                <span className="sm:hidden">PDF</span>
              </TabsTrigger>
              <TabsTrigger value="notes" disabled={!pdfFile} className="flex-1 sm:flex-none">
                <PenSquare className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Notes</span>
                <span className="sm:hidden">Notes</span>
                {notes.length > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground rounded-full text-xs px-1.5 py-0.5 min-w-[1.2rem] h-5 flex items-center justify-center">
                    {notes.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="q-and-a" disabled={!pdfFile} className="flex-1 sm:flex-none">
                <MessageCircleQuestion className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Q&A</span>
                <span className="sm:hidden">Q&A</span>
                {questions.length > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground rounded-full text-xs px-1.5 py-0.5 min-w-[1.2rem] h-5 flex items-center justify-center">
                    {questions.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pdf-viewer" className="flex-1">
              <div className="h-full rounded-lg border bg-card overflow-hidden">
                <PdfViewer 
                  fileUrl={pdfDataUrl} 
                  onTextSelect={setSelectionText}
                />
              </div>
            </TabsContent>

            <TabsContent value="notes" className="flex-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <PenSquare className="h-5 w-5" />
                      My Notes
                      {notes.length > 0 && (
                        <span className="bg-secondary text-secondary-foreground rounded-full text-xs px-2 py-1">
                          {notes.length}
                        </span>
                      )}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
                  {notes.length > 0 ? (
                    notes.map((note, index) => (
                      <Card key={index} className="relative group hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start gap-3">
                            <p className="text-sm leading-relaxed flex-1 whitespace-pre-wrap">
                              {note}
                            </p>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyText(note)}
                                className="h-8 w-8 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNote(index)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t">
                            <span className="text-xs text-muted-foreground">
                              Page {currentPage} • {new Date().toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <PenSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground mb-2">No notes added yet</p>
                      <p className="text-sm text-muted-foreground/70">
                        Copy text from the PDF and click 'Add Note' to get started
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="q-and-a" className="flex-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircleQuestion className="h-5 w-5" />
                    Question & Answers
                    {questions.length > 0 && (
                      <span className="bg-secondary text-secondary-foreground rounded-full text-xs px-2 py-1">
                        {questions.length}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-[calc(100vh-12rem)]">
                    <QnAChat gsUri={gsUri} />
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
