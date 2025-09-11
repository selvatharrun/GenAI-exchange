"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenSquare, Search, Book, Clock, Star, Copy, Trash2 } from "lucide-react";
import { Note } from "@/components/type";

interface NotesTabProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
}

export default function NotesTab({ notes, setNotes }: NotesTabProps) {
  const [noteSearchTerm, setNoteSearchTerm] = useState("");
  const [noteFilter, setNoteFilter] = useState<"all" | "starred" | "recent">("all");

  const normalizeDate = (ts: string | Date) =>
    ts instanceof Date ? ts : new Date(ts);

  // Handlers
  const handleStarNote = (id: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, isStarred: !note.isStarred } : note
      )
    );
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    } catch {
      alert("Failed to copy text.");
    }
  };

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.text
      .toLowerCase()
      .includes(noteSearchTerm.toLowerCase());
    const ts = normalizeDate(note.timestamp);
    const matchesFilter =
      noteFilter === "all" ||
      (noteFilter === "starred" && note.isStarred) ||
      (noteFilter === "recent" &&
        new Date().getTime() - ts.getTime() < 24 * 60 * 60 * 1000);

    return matchesSearch && matchesFilter;
  });

  return (
    <Card className="h-full border-0 shadow-lg rounded-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PenSquare className="h-5 w-5 text-purple-600" />
            My Notes
            {notes.length > 0 && (
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              >
                {notes.length} notes
              </Badge>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={noteSearchTerm}
                onChange={(e) => setNoteSearchTerm(e.target.value)}
                className="pl-7 h-8 w-40 text-sm"
              />
            </div>

            {/* Filter */}
            <select
              value={noteFilter}
              onChange={(e) => setNoteFilter(e.target.value as any)}
              className="h-8 px-2 text-sm border border-input rounded-md bg-background"
            >
              <option value="all">All Notes</option>
              <option value="starred">Starred</option>
              <option value="recent">Recent</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 h-[calc(100vh-16rem)]">
        <ScrollArea className="h-full">
          <div className="p-4">
            {filteredNotes.length > 0 ? (
              <div className="space-y-3">
                {filteredNotes.map((note) => {
                  const ts = normalizeDate(note.timestamp);
                  return (
                    <Card
                      key={note.id}
                      className={`group hover:shadow-md transition-all duration-200 border-l-4 ${
                        note.isStarred
                          ? "border-l-yellow-400 bg-yellow-50/50 dark:bg-yellow-950/10"
                          : "border-l-purple-400 hover:border-l-purple-500"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {note.text}
                            </p>

                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Book className="h-3 w-3" />
                                Page {note.page}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {ts.toLocaleDateString()}
                              </div>
                              {note.category && (
                                <Badge variant="outline" className="text-xs h-5">
                                  {note.category}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStarNote(note.id)}
                              className={`h-7 w-7 p-0 ${
                                note.isStarred ? "text-yellow-500" : ""
                              }`}
                              title={note.isStarred ? "Unstar note" : "Star note"}
                            >
                              <Star
                                className={`h-3 w-3 ${
                                  note.isStarred ? "fill-current" : ""
                                }`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyText(note.text)}
                              className="h-7 w-7 p-0"
                              title="Copy note"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNote(note.id)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              title="Delete note"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                {noteSearchTerm ? (
                  <>
                    <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground mb-2">No notes found</p>
                    <p className="text-sm text-muted-foreground/70">
                      Try adjusting your search terms or filters
                    </p>
                  </>
                ) : (
                  <>
                    <PenSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground mb-2">
                      No notes added yet
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      Select text from the PDF and click 'Save Note' to get started
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
