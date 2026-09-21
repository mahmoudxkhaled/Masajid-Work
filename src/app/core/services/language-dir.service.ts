import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { catchError, finalize, shareReplay, tap } from 'rxjs/operators';
import { LocalStorageService } from './local-storage.service';
import { TranslationService } from './translation.service';

@Injectable({
    providedIn: 'root',
})
export class LanguageDirService {

    private rtlSubject!: BehaviorSubject<boolean>;
    isRtl$!: Observable<boolean>;

    private languageSubject!: BehaviorSubject<string>;
    userLanguageCode$!: Observable<string>;

    private languageApplyInFlight: { code: string; stream$: Observable<unknown> } | null = null;
    private languageApplySeq = 0;
    private languageApplySubscription?: Subscription;

    constructor(
        private localStorage: LocalStorageService,
        private translationService: TranslationService,
    ) {
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

    setUserLanguageCode(lang: string): Observable<unknown> {
        const code = lang === 'ar' ? 'ar' : 'en';
        this.localStorage.setPreferredLanguageCode(code);
        return this.applyLanguageAfterLoad(code);
    }

    getPublicLanguageCode(): string {
        return this.localStorage.getGuestLanguageCode();
    }

    setGuestLanguageCode(lang: string): Observable<unknown> {
        const code = lang === 'ar' ? 'ar' : 'en';
        this.localStorage.setGuestLanguageCode(code);
        return this.applyLanguageAfterLoad(code);
    }

    private applyLanguageAfterLoad(code: 'en' | 'ar'): Observable<unknown> {
        if (this.languageApplyInFlight?.code === code) {
            return this.languageApplyInFlight.stream$;
        }

        const requestId = ++this.languageApplySeq;
        this.languageApplySubscription?.unsubscribe();

        const stream$ = this.translationService.useLanguage(code).pipe(
            catchError(() => of(null)),
            tap(() => {
                if (requestId === this.languageApplySeq) {
                    this.announceLanguage(code);
                }
            }),
            finalize(() => {
                if (this.languageApplyInFlight?.code === code) {
                    this.languageApplyInFlight = null;
                }
            }),
            shareReplay({ bufferSize: 1, refCount: false }),
        );

        this.languageApplyInFlight = { code, stream$ };
        this.languageApplySubscription = stream$.subscribe();
        return stream$;
    }

    private announceLanguage(code: 'en' | 'ar'): void {
        this.languageSubject.next(code);
        this.setRtl(code === 'ar');
        this.syncDocumentLanguage(code);
        this.translationService.hideBootstrapPreloaderWhenStable();
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
