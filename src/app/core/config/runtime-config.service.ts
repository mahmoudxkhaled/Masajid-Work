import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface RuntimeConfig {
    apiBaseUrl: string;
}

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
    private config: RuntimeConfig = { apiBaseUrl: '' };
    private readonly http: HttpClient;

    constructor(handler: HttpBackend) {
        this.http = new HttpClient(handler);
    }

    async load(): Promise<void> {
        const url = `runtime-config.json?t=${Date.now()}`;

        const data = await firstValueFrom(
            this.http.get<RuntimeConfig>(url, {
                headers: {
                    'Cache-Control': 'no-cache',
                    Pragma: 'no-cache',
                },
            })
        );

        if (!data?.apiBaseUrl) {
            throw new Error(
                'Failed to load runtime-config.json. Please check deployment configuration.'
            );
        }

        this.config = {
            apiBaseUrl: data.apiBaseUrl.replace(/\/+$/, ''),
        };
    }

    get apiBaseUrl(): string {
        return this.config.apiBaseUrl;
    }
}
