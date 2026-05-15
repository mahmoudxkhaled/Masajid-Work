import { Injectable } from '@angular/core';

export interface TopbarHeaderDisplayCache {
    entityId: string;
    languageCode: string;
    title: string;
    logoDataUrl: string;
}

@Injectable({
    providedIn: 'root'
})
export class TopbarHeaderCacheService {
    private readonly storageKey = 'erp_topbar_header_display_v1';

    read(entityId: string | number | undefined | null, languageCode: string): TopbarHeaderDisplayCache | null {
        if (entityId == null || entityId === '') {
            return null;
        }
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw) as TopbarHeaderDisplayCache;
            if (String(parsed.entityId) !== String(entityId)) {
                return null;
            }
            if (parsed.languageCode !== languageCode) {
                return null;
            }
            return parsed;
        } catch {
            return null;
        }
    }

    write(entityId: string | number, languageCode: string, title: string, logoDataUrl: string): void {
        try {
            const payload: TopbarHeaderDisplayCache = {
                entityId: String(entityId),
                languageCode,
                title,
                logoDataUrl
            };
            localStorage.setItem(this.storageKey, JSON.stringify(payload));
        } catch {
        }
    }
}
