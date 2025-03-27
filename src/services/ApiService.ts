// src/services/ApiService.ts
export interface IApiService {
    get<T>(url: string, options?: RequestInit): Promise<T>;
}

export class ApiService implements IApiService {
    constructor(private apiUrl: string, private token?: string) { }

    async get<T>(url: string, options?: RequestInit): Promise<T> {
        const headers = new Headers(options?.headers || {});
        if (this.token) {
            headers.append("Authorization", `Bearer ${this.token}`);
        }
        const response = await fetch(`${this.apiUrl}${url}`, { ...options, headers });
        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }
        return response.json();
    }
}