import { Client } from '@modelcontextprotocol/sdk/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export interface MCPClientConfig {
  serverUrl?: string;
  timeout?: number;
  retries?: number;
}

class MCPClientManager {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private config: MCPClientConfig;
  private isConnected: boolean = false;
  private isInitializing: boolean = false;

  constructor(config: MCPClientConfig = {}) {
    this.config = {
      serverUrl: config.serverUrl || process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'https://sodium-coil-470706-f4-38771871641.asia-south1.run.app/mcp/',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
    };
  }

  async connect(): Promise<boolean> {
    // Prevent multiple simultaneous connection attempts
    if (this.isInitializing) {
      return this.waitForConnection();
    }

    try {
      if (this.client && this.isConnected) {
        return true;
      }

      this.isInitializing = true;

      // Only run on client side
      if (typeof window === 'undefined') {
        console.warn('MCP client can only run on the client side');
        this.isInitializing = false;
        return false;
      }

      // Create MCP client instance
      this.client = new Client({
        name: 'genai-exchange-client',
        version: '1.0.0',
      });

      this.transport = new StreamableHTTPClientTransport(
        new URL(this.config.serverUrl!),
        {
          requestInit: { 
            credentials: 'include',
            headers: {
              'Accept': 'application/json, text/event-stream',
              'Content-Type': 'application/json'
            }
          }
        }
      );

      // Connect client to transport, which handles initialization
      await this.client.connect(this.transport);
      this.isConnected = true;
      this.isInitializing = false;
      
      console.log('✅ MCP Client connected successfully to:', this.config.serverUrl);
      return true;
    } catch (error) {
      console.error('❌ MCP Client connection failed:', error);
      this.isConnected = false;
      this.isInitializing = false;
      this.client = null;
      this.transport = null;
      return false;
    }
  }

  private async waitForConnection(): Promise<boolean> {
    while (this.isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.isConnected;
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close();
      } catch (error) {
        console.error('Error disconnecting MCP client:', error);
      }
    }
    this.client = null;
    this.transport = null;
    this.isConnected = false;
  }

  async callTool(toolName: string, parameters: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.client || !this.isConnected) {
      console.log(` Tool ${toolName}: Reconnecting...`);
      const connected = await this.connect();
      if (!connected) {
        throw new Error('MCP client is not connected and failed to reconnect');
      }
    }

    try {
      console.log(` Calling tool: ${toolName}`, parameters);
      const result = await this.client!.callTool({
        name: toolName,
        arguments: parameters,
      });
      console.log(` Tool ${toolName} result:`, result);
      return result;
    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }

  async askQuestion(question: string, gsUri?: string): Promise<string> {
    try {
      const result = await this.callTool('pdf_qa', {
        question,
        gsUri,
      });

      console.log('Q&A result:', result);

      // Try direct properties first
      let answer = result.answer || result.response;
      
      // If not found, check content array (MCP format)
      if (!answer && result.content && Array.isArray(result.content)) {
        console.log(' Checking content array:', result.content);
        for (const item of result.content) {
          if (typeof item === 'string') {
            answer = item;
            break;
          } else if (item && typeof item === 'object') {
            // Handle {type: "text", text: "..."} format
            answer = item.text || item.answer || item.content;
            if (answer) break;
          }
        }
      }
      
      // Check structuredContent as fallback
      if (!answer && result.structuredContent && typeof result.structuredContent === 'object') {
        const structured = result.structuredContent as Record<string, unknown>;
        answer = (structured.answer as string) || (structured.text as string);
      }

      return (answer as string) || 'No response received';
    } catch (error) {
      console.error('Error asking question:', error);
      throw error;
    }
  }

  async uploadPdfToGCS(filename: string, fileData: string | Blob): Promise<string> {
    try {
      
      const result = await this.callTool('upload_pdf', {
        filename,
        file_data: fileData, // Base64 string or blob
      });

      // MCP tool results have different structure - check content array
      let uri = (result.gcs_uri as string) || (result.uri as string) || (result.url as string);

      // If not found, check in content array or structuredContent
      if (!uri && Array.isArray(result.content) && result.content.length > 0) {
        const content = result.content[0] as Record<string, unknown>;
        uri = (content.gcs_uri as string) || (content.uri as string) || (content.url as string);
      }

      // Check structuredContent if still not found
      if (!uri && result.structuredContent && typeof result.structuredContent === 'object') {
        const structured = result.structuredContent as Record<string, unknown>;
        uri = (structured.gcs_uri as string) || (structured.uri as string) || (structured.url as string);
      }
      
      
      if (!uri) {
        throw new Error('No URI returned from upload_pdf tool');
      }
      
      return uri;
    } catch (error) {

      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        const connected = await this.connect();
        if (!connected) {
          console.log('Health check: Connection failed');
          return false;
        }
      }

      // Try to list available tools as a health check
      console.log('Health check: Listing tools...');
      const result = await this.client!.listTools({});
      console.log('Health check: Tools result:', result);
      
      const isHealthy = result && result.tools && Array.isArray(result.tools) && result.tools.length > 0;
      console.log('Health check: Is healthy?', isHealthy);
      return isHealthy;
    } catch (error) {
      console.error('Health check failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'error' {
    if (this.isConnected && this.client) return 'connected';
    if (!this.isConnected && this.client) return 'error';
    return 'disconnected';
  }
}

// Create a singleton instance
let mcpClientInstance: MCPClientManager | null = null;

export const getMCPClient = (): MCPClientManager => {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClientManager();
  }
  return mcpClientInstance;
};

// React hook for Next.js
export function useMCPClient() {
  // Only create client on client side
  if (typeof window === 'undefined') {
    return null;
  }
  return getMCPClient();
}

// Helper functions for common operations
export const MCPService = {
  // Initialize connection
  async connect(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const client = getMCPClient();
    return await client.connect();
  },

  // Check if backend is healthy
  async checkHealth(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const client = getMCPClient();
    return await client.checkHealth();
  },

  // Upload PDF and get GCS URI
  async uploadPdf(file: File): Promise<{ success: boolean; gsUri?: string; error?: string }> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Client-side only operation' };
    }

    try {
      const client = getMCPClient();
      await client.connect();
      
      // Convert file to base64 for MCP transmission
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix to get just base64
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      
      const gsUri = await client.uploadPdfToGCS(file.name, base64Data);
      
      return {
        success: true,
        gsUri,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  },

  // Ask questions about the PDF
  async askQuestion(question: string, gsUri?: string): Promise<{ success: boolean; answer?: string; error?: string }> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Client-side only operation' };
    }

    try {
      const client = getMCPClient();
      await client.connect();
      
      const answer = await client.askQuestion(question, gsUri);
      
      return {
        success: true,
        answer,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Question failed',
      };
    }
  },

  // Extract text using OCR from PDF
  async extractTextFromPdf(gsUri: string): Promise<{ success: boolean; data?: {fullText: string, pages: {page_number: number, text: string}[], formFields: unknown[], confidenceScore: number, totalPages: number, totalCharacters: number}; error?: string }> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Client-side only operation' };
    }

    try {
      const client = getMCPClient();
      await client.connect();

      const result = await client.callTool('extract_text_from_pdf', {
        gcs_uri: gsUri,
      });

      console.log('OCR result:', result);

      // Extract the data from MCP tool result
      let ocrData = result;

      // Handle MCP content array format
      if (Array.isArray(result.content) && result.content.length > 0) {
        console.log('Checking content array:', result.content);
        for (const item of result.content) {
          if (typeof item === 'string') {
            try {
              ocrData = JSON.parse(item) as Record<string, unknown>;
              break;
            } catch {
              // If not JSON, treat as text
              ocrData = { success: true, full_text: item, pages: [] };
              break;
            }
          } else if (item && typeof item === 'object') {
            ocrData = item as Record<string, unknown>;
            break;
          }
        }
      }

      // Check structuredContent as fallback
      if (!ocrData.success && result.structuredContent && typeof result.structuredContent === 'object') {
        ocrData = result.structuredContent as Record<string, unknown>;
      }

      if (ocrData.success) {
        return {
          success: true,
          data: {
            fullText: ocrData.full_text as string,
            pages: ocrData.pages as {page_number: number, text: string}[],
            formFields: ocrData.form_fields as unknown[],
            confidenceScore: ocrData.confidence_score as number,
            totalPages: ocrData.total_pages as number,
            totalCharacters: ocrData.total_characters as number
          }
        };
      } else {
        return {
          success: false,
          error: (ocrData.error as string) || 'OCR processing failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OCR failed',
      };
    }
  },

  // Get connection status
  getStatus(): 'connected' | 'disconnected' | 'error' {
    if (typeof window === 'undefined') return 'disconnected';
    const client = getMCPClient();
    return client.getConnectionStatus();
  },

  // Find legal precedents for a clause
  async findPrecedents(clause: string, location: string = "US"): Promise<{ success: boolean; data?: {clause: string, location: string, precedents: string}; error?: string }> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Client-side only operation' };
    }

    try {
      const client = getMCPClient();
      await client.connect();

      const result = await client.callTool('find_legal_precedents', {
        clause,
        location,
      });

      console.log('Precedent search result:', result);

      // Extract the data from MCP tool result
      let precedentData = result;

      // Handle MCP content array format
      if (Array.isArray(result.content) && result.content.length > 0) {
        console.log('Checking content array:', result.content);
        for (const item of result.content) {
          if (typeof item === 'string') {
            try {
              precedentData = JSON.parse(item) as Record<string, unknown>;
              break;
            } catch {
              // If not JSON, treat as text - assume it's the precedents text
              precedentData = { success: true, clause, location, precedents: item };
              break;
            }
          } else if (item && typeof item === 'object') {
            precedentData = item as Record<string, unknown>;
            break;
          }
        }
      }

      // Check structuredContent as fallback
      if (!precedentData.success && result.structuredContent && typeof result.structuredContent === 'object') {
        precedentData = result.structuredContent as Record<string, unknown>;
      }

      if (precedentData.success) {
        return {
          success: true,
          data: {
            clause: precedentData.clause as string,
            location: precedentData.location as string,
            precedents: precedentData.precedents as string
          }
        };
      } else {
        return {
          success: false,
          error: (precedentData.error as string) || 'Precedent search failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Precedent search failed',
      };
    }
  },

  // Disconnect
  async disconnect(): Promise<void> {
    if (typeof window === 'undefined') return;
    const client = getMCPClient();
    await client.disconnect();
  },
};