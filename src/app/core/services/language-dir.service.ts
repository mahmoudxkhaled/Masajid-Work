import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

@Injectable({
    providedIn: 'root',
})
export class LanguageDirService {

    private rtlSubject = new BehaviorSubject<boolean>(this.getRtlFromStorage());
    isRtl$ = this.rtlSubject.asObservable();

    private languageSubject = new BehaviorSubject<string>(this.getLanguageFromStorage());
    userLanguageCode$ = this.languageSubject.asObservable();

    constructor(private localStorage: LocalStorageService) { }

    setRtl(isRtl: boolean) {
        this.rtlSubject.next(isRtl);
        localStorage.setItem('isRtl', JSON.stringify(isRtl));
    }

    getRtlFromStorage(): boolean {
        const stored = localStorage.getItem('isRtl');
        return stored ? JSON.parse(stored) : false;
    }

    setUserLanguageCode(lang: string) {
        this.languageSubject.next(lang);
        this.localStorage.setPreferredLanguageCode(lang === 'ar' ? 'ar' : 'en');
    }

    getLanguageFromStorage(): string {
        return this.localStorage.getPreferredLanguageCode();
    }
}
