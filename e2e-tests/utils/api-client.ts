import { APIRequestContext } from '@playwright/test';

export interface ApiResponse<T = unknown> {
  status: number;
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class DmsApiClient {
  private request: APIRequestContext;
  private token: string | null = null;
  private apiBase: string;

  constructor(request: APIRequestContext, apiBase = process.env.API_URL || 'http://localhost:3000') {
    this.request = request;
    this.apiBase = apiBase;
  }

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async login(username: string, password: string): Promise<{ token: string; user: unknown }> {
    const response = await this.request.post(`${this.apiBase}/api/auth/login`, {
      data: { username, password },
    });

    if (!response.ok()) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Échec de connexion API [${response.status()}]: ${err.error || response.statusText()}`);
    }

    const body = await response.json();
    this.token = body.token;
    return body;
  }

  async postIncomingDocument(payload: Record<string, unknown>): Promise<ApiResponse> {
    const response = await this.request.post(`${this.apiBase}/api/incoming-documents`, {
      headers: this.getHeaders(),
      data: payload,
    });
    const data = await response.json().catch(() => null);
    return {
      status: response.status(),
      ok: response.ok(),
      data,
    };
  }

  async postOutgoingDocument(payload: Record<string, unknown>): Promise<ApiResponse> {
    const response = await this.request.post(`${this.apiBase}/api/outgoing-documents`, {
      headers: this.getHeaders(),
      data: payload,
    });
    const data = await response.json().catch(() => null);
    return {
      status: response.status(),
      ok: response.ok(),
      data,
    };
  }

  async getDirectFile(filePath: string): Promise<{ status: number; ok: boolean }> {
    const response = await this.request.get(`${this.apiBase}${filePath}`, {
      headers: this.getHeaders(),
    });
    return {
      status: response.status(),
      ok: response.ok(),
    };
  }

  async resetAdminDirect(): Promise<{ status: number; body: unknown }> {
    const response = await this.request.post(`${this.apiBase}/api/auth/reset-admin`, {
      data: {},
    });
    const body = await response.json().catch(() => null);
    return {
      status: response.status(),
      body,
    };
  }
}

