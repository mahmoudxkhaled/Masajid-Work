import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class TranslationService {
    private availableLanguages = ['en', 'ar'];

    constructor(private translate: TranslateService) {
        this.setDefaultLang('en');
    }

    setDefaultLang(lang: string) {
        this.translate.setDefaultLang(lang);
    }

    useLanguage(lang: string) {
        if (this.availableLanguages.includes(lang)) {
            this.translate.use(lang);
        } else {
            this.translate.use('en');
        }
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
