// lib/mcp-client.ts - Next.js optimized version

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
      serverUrl: config.serverUrl || process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:8080/mcp',
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

      this.transport = new StreamableHTTPClientTransport(new URL(this.config.serverUrl!));

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

  async callTool(toolName: string, parameters: any): Promise<any> {
    if (!this.client || !this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error('MCP client is not connected and failed to reconnect');
      }
    }

    try {
      const result = await this.client!.callTool({
        name: toolName,
        arguments: parameters,
      });
      return result;
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
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

      return result.answer || result.content || result.response || 'No response received';
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

      return result.gcs_uri || result.uri || result.url;
    } catch (error) {
      console.error('Error uploading PDF:', error);
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        const connected = await this.connect();
        if (!connected) {
          return false;
        }
      }

      // Try to list available tools as a health check
      const tools = await this.client!.listTools();
      return Array.isArray(tools) && tools.length > 0;
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

  // Get connection status
  getStatus(): 'connected' | 'disconnected' | 'error' {
    if (typeof window === 'undefined') return 'disconnected';
    const client = getMCPClient();
    return client.getConnectionStatus();
  },

  // Disconnect
  async disconnect(): Promise<void> {
    if (typeof window === 'undefined') return;
    const client = getMCPClient();
    await client.disconnect();
  },
};