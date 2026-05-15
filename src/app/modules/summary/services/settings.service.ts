import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { UserSettings } from '../models/settings.model';

const STORAGE_KEY = 'userSettings';

@Injectable({
    providedIn: 'root'
})
export class SettingsService {

    loadSettings(): Observable<UserSettings | null> {
        const savedSettings = localStorage.getItem(STORAGE_KEY);
        return of(savedSettings ? JSON.parse(savedSettings) as UserSettings : null);
    }

    saveSettings(settings: UserSettings): Observable<void> {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        return of(void 0);
    }
}

