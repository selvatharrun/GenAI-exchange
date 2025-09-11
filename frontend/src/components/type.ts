// components/type.ts

// Note interface used across DocuNote, NotesTab, and PdfViewer
export interface Note {
  id: string;            // Unique ID for the note
  text: string;          // Extracted text or user-written note
  page: number;          // Page number from the PDF
  isStarred?: boolean;    // Mark important notes
  category?: string;     // Optional category/tag (e.g., "Important", "Clause", etc.)
  timestamp: Date | string;
}
