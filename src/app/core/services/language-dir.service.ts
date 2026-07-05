import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

@Injectable({
    providedIn: 'root',
})
export class LanguageDirService {

    private rtlSubject!: BehaviorSubject<boolean>;
    isRtl$!: Observable<boolean>;

    private languageSubject!: BehaviorSubject<string>;
    userLanguageCode$!: Observable<string>;

    constructor(private localStorage: LocalStorageService) {
        this.languageSubject = new BehaviorSubject<string>(this.resolveBootstrapLanguageCode());
        this.rtlSubject = new BehaviorSubject<boolean>(this.getRtlFromStorage());
        this.userLanguageCode$ = this.languageSubject.asObservable();
        this.isRtl$ = this.rtlSubject.asObservable();
    }

    get isRtl(): boolean {
        return this.rtlSubject.value;
    }

    setRtl(isRtl: boolean) {
        this.rtlSubject.next(isRtl);
        localStorage.setItem('isRtl', JSON.stringify(isRtl));
    }

    getRtlFromStorage(): boolean {
        if (!this.localStorage.getToken()) {
            return this.getPublicLanguageCode() === 'ar';
        }

        return this.localStorage.getPreferredLanguageCode() === 'ar';
    }

    getLanguageFromStorage(): string {
        return this.localStorage.getPreferredLanguageCode();
    }

    setUserLanguageCode(lang: string) {
        const code = lang === 'ar' ? 'ar' : 'en';
        this.localStorage.setPreferredLanguageCode(code);
        this.languageSubject.next(code);
        this.setRtl(code === 'ar');
        this.syncDocumentLanguage(code);
    }

    getPublicLanguageCode(): string {
        return this.localStorage.getGuestLanguageCode();
    }

    setGuestLanguageCode(lang: string) {
        const code = lang === 'ar' ? 'ar' : 'en';
        this.localStorage.setGuestLanguageCode(code);
        this.languageSubject.next(code);
        this.setRtl(code === 'ar');
        this.syncDocumentLanguage(code);
    }

    private syncDocumentLanguage(code: 'en' | 'ar'): void {
        if (typeof document === 'undefined') {
            return;
        }
        document.documentElement.lang = code === 'ar' ? 'ar' : 'en';
        document.documentElement.setAttribute('dir', code === 'ar' ? 'rtl' : 'ltr');
    }

    private resolveBootstrapLanguageCode(): string {
        if (this.localStorage.getToken()) {
            return this.getLanguageFromStorage();
        }
        return this.getPublicLanguageCode();
    }
}
