import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';
import { APP_DEFAULT_LANGUAGE } from '../config/app-branding.config';

@Injectable({
    providedIn: 'root',
})
export class TranslationService {
    private availableLanguages = ['en', 'ar'];

    constructor(private translate: TranslateService) {
        this.setDefaultLang(APP_DEFAULT_LANGUAGE);
    }

    setDefaultLang(lang: string) {
        this.translate.setDefaultLang(lang);
    }

    useLanguage(lang: string): Observable<unknown> {
        const code = this.availableLanguages.includes(lang) ? lang : APP_DEFAULT_LANGUAGE;
        return this.translate.use(code);
    }

    hideBootstrapPreloader(): void {
        document.getElementById('app-preloader')?.remove();
    }
    getCurrentLang(): Observable<string> {
        return this.translate.onLangChange.pipe(map((event) => event.lang));
    }
    getInstant(key: string): string {
        return this.translate.instant(key);
    }

    setFallbackLang(fallbackLang: string) {
        this.translate.setDefaultLang(fallbackLang);
    }
}
