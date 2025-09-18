"use server";

import { summarizePdf, type SummarizePdfInput } from "@/ai/flows/summarize-pdf";
import {
  summarizeSelection,
  type SummarizeSelectionInput,
} from "@/ai/flows/summarize-selection";
import { MCPClient } from 'mcp-client';

export async function generateSummaryAction(
  input: SummarizePdfInput
): Promise<string> {
  if (!input.pdfDataUri) {
    throw new Error("PDF data URI is required.");
  }
  try {
    const { summary } = await summarizePdf(input);
    return summary;
  } catch (error) {
    console.error("Error in generateSummaryAction:", error);
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

// Helper to get a single, persistent instance of the MCPClient
let mcpClient: MCPClient | null = null;
async function getMcpClient() {
  if (!mcpClient) {
    mcpClient = new MCPClient({ name: "DocuNoteBackendClient", version: "1.0.0" });
    try {
      // ensure the url is reachable from your server, not just your browser
      await mcpClient.connect({
        type: "httpStream",
        url: "http://localhost:8080/mcp", 
      });
      console.log("MCP Client connected successfully on the server.");
    } catch (error) {
      console.error("Failed to connect MCP Client on the server:", error);
      mcpClient = null; // reset on failure so it can try again
      throw new Error("Could not connect to the backend service.");
    }
  }
  return mcpClient;
}

// Action to process the PDF after it's been uploaded
export async function processUploadedPdf(filePath: string, filename: string) {
  try {
    const client = await getMcpClient();
    const toolResponse = await client.callTool({
      name: "upload_pdf_to_gcs",
      arguments: {
        file_path: filePath,
        filename: filename,
      },
    });

    if (toolResponse && toolResponse.gcs_uri) {
      return { success: true, gcs_uri: toolResponse.gcs_uri };
    } else {
      return { success: false, error: toolResponse.error || "Failed to get GCS URI from tool." };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return { success: false, error: errorMessage };
  }
}

// Action to ask a question about the PDF
export async function queryPdf(question: string, gsUri: string | null) {
  if (!gsUri) {
    return { success: false, error: "Document is not available for querying." };
  }

  try {
    const client = await getMcpClient();
    const toolResponse = await client.callTool({
      name: "query_pdf",
      arguments: { question, gsUri },
    });

    if (toolResponse && toolResponse.answer) {
      return { success: true, answer: toolResponse.answer };
    } else {
      return { success: false, error: toolResponse.error || "Failed to get an answer from the tool." };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return { success: false, error: errorMessage };
  }
}