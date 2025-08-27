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
import { PdfViewer } from "./pdf-viewer";
import {
  generateSummaryAction,
  generateSelectionSummaryAction,
} from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";
import { useSidebar } from "./ui/sidebar";

function DocunoteContent() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  
  const [notes, setNotes] = useState<string[]>([]);
  const [questions, setQuestions] = useState<{q: string, a: string}[]>([]);
  
  const [summary, setSummary] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const [selectionText, setSelectionText] = useState("");
  const [selectionSummary, setSelectionSummary] = useState("");
  const [isSelectionSummaryLoading, setIsSelectionSummaryLoading] = useState(false);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setSummary("");
      setSelectionSummary("");
      setNotes([]);
      setQuestions([]);
      setCurrentPage(1);
      setPageInput("1");

      const reader = new FileReader();
      reader.onload = (e) => {
        setPdfDataUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please upload a valid PDF file.",
      });
    }
  }, [toast]);

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
    }
  };

  const handleGenerateSummary = async () => {
    if (!pdfDataUrl) return;
    setIsSummaryLoading(true);
    setSummary("");
    try {
      const result = await generateSummaryAction({ pdfDataUri: pdfDataUrl });
      setSummary(result);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate summary.",
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
      toast({ title: "Note added!" });
    }
  }

  const updateCurrentPage = (newPage: number) => {
    const page = Math.max(1, newPage);
    setCurrentPage(page);
    setPageInput(String(page));
  };
  
  const handlePageInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  }

  const handlePageInputSubmit = () => {
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum)) {
      updateCurrentPage(pageNum);
    }
  }
  
  const handlePageInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit();
    }
  }

  const { open: sidebarOpen } = useSidebar();

  return (
    <>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="p-2">
          <div className="flex h-10 items-center justify-between">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">DocuNote</h1>
            </div>
            {!sidebarOpen && (
              <div className="md:hidden">
                  <SidebarTrigger />
              </div>
            )}
             <div className="hidden md:block">
                  <SidebarTrigger />
              </div>
          </div>
        </SidebarHeader>

        <div className="p-2 flex flex-col gap-2">
          <Button onClick={handleUploadClick}>
            <Upload className="mr-2" /> Upload PDF
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button variant="secondary" onClick={handleDownload} disabled={!pdfFile}>
            <FileDown className="mr-2" /> Download PDF
          </Button>
        </div>

        {pdfFile && (
          <>
            <SidebarSeparator />
            <div className="p-2">
              <Label className="text-sm font-medium">Page Navigation</Label>
              <div className="flex items-center gap-2 mt-2">
                <Button variant="outline" size="icon" onClick={() => updateCurrentPage(currentPage - 1)} disabled={currentPage <= 1}>
                  <ChevronLeft />
                </Button>
                <Input
                  type="text"
                  className="w-16 text-center"
                  value={pageInput}
                  onChange={handlePageInputChange}
                  onKeyDown={handlePageInputKeyDown}
                  onBlur={handlePageInputSubmit}
                />
                <Button variant="outline" size="icon" onClick={() => updateCurrentPage(currentPage + 1)}>
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
        
        <SidebarSeparator />

        <ScrollArea className="flex-1">
          <SidebarContent className="p-2">
            <Accordion type="multiple" defaultValue={["summary"]} className="w-full">
              <AccordionItem value="summary">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> AI Actions
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <Button onClick={handleGenerateSummary} disabled={!pdfFile || isSummaryLoading} className="w-full">
                    Summarize Document
                  </Button>
                  {(isSummaryLoading || summary) && (
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base">Document Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 text-sm">
                        {isSummaryLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{summary}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="selection-text">Selected Text</Label>
                    <Textarea 
                      id="selection-text"
                      placeholder="Copy and paste text from the PDF here..."
                      value={selectionText}
                      onChange={(e) => setSelectionText(e.target.value)}
                      disabled={!pdfFile}
                      className="min-h-[120px]"
                    />
                     <div className="grid grid-cols-2 gap-2">
                        <Button onClick={handleGenerateSelectionSummary} disabled={!selectionText.trim() || isSelectionSummaryLoading}>
                          Summarize
                        </Button>
                        <Button onClick={handleAddNote} disabled={!selectionText.trim()} variant="secondary">
                          Add to Notes
                        </Button>
                     </div>
                  </div>

                  {(isSelectionSummaryLoading || selectionSummary) && (
                     <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base">Selection Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 text-sm">
                        {isSelectionSummaryLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{selectionSummary}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </SidebarContent>
        </ScrollArea>
      </Sidebar>
      <SidebarInset>
        <div className="p-4 relative h-full flex flex-col">
          {!sidebarOpen && (
              <div className="absolute top-2 left-2 z-20">
                  <SidebarTrigger />
              </div>
          )}
           <Tabs defaultValue="pdf-viewer" className="flex-1 flex flex-col">
              <TabsList className="mb-4">
                <TabsTrigger value="pdf-viewer">
                  <Book className="w-4 h-4 mr-2" />
                  PDF Viewer
                </TabsTrigger>
                <TabsTrigger value="notes" disabled={!pdfFile}>
                  <PenSquare className="w-4 h-4 mr-2" />
                  Notes
                </TabsTrigger>
                <TabsTrigger value="q-and-a" disabled={!pdfFile}>
                  <MessageCircleQuestion className="w-4 h-4 mr-2" />
                  Q&A
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pdf-viewer" className="flex-1">
                <PdfViewer fileUrl={pdfDataUrl} page={currentPage} />
              </TabsContent>
              <TabsContent value="notes" className="flex-1">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>My Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {notes.length > 0 ? (
                      <ul className="space-y-4">
                        {notes.map((note, index) => (
                          <li key={index} className="border-l-2 border-primary pl-4 text-sm italic">
                            {note}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No notes added yet. Copy text from the PDF and add it here.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="q-and-a" className="flex-1">
                 <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Question & Answers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Summarize selected text from the document to see Q&A here.</p>
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
