"use server";

import { summarizePdf, type SummarizePdfInput } from "@/ai/flows/summarize-pdf";
import {
  summarizeSelection,
  type SummarizeSelectionInput,
} from "@/ai/flows/summarize-selection";

export async function generateSummaryAction(
  input: SummarizePdfInput
): Promise<string> {
  // Basic validation, can be expanded
  if (!input.pdfDataUri) {
    throw new Error("PDF data URI is required.");
  }

  try {
    const { summary } = await summarizePdf(input);
    return summary;
  } catch (error) {
    console.error("Error in generateSummaryAction:", error);
    // Return a user-friendly error message
    return "Failed to generate summary due to a server error. Please try again later.";
  }
}

export async function generateSelectionSummaryAction(
  input: SummarizeSelectionInput
): Promise<string> {
  if (!input.selectedText) {
    throw new Error("Selected text is required.");
  }
  
  try {
    const { summary } = await summarizeSelection(input);
    return summary;
  } catch (error) {
    console.error("Error in generateSelectionSummaryAction:", error);
    return "Failed to generate summary for the selection due to a server error.";
  }
}
