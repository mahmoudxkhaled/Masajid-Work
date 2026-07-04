import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';
import { APP_DEFAULT_LANGUAGE } from '../config/app-branding.config';

@Injectable({
    providedIn: 'root',
})
export class TranslationService {
    private availableLanguages = ['en', 'ar'];
    private preloaderHideTimer?: ReturnType<typeof setTimeout>;

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

    // #region Bootstrap preloader (#app-preloader in index.html)
    // Revert language-switch spinner: remove showLanguageSwitchPreloader + preloaderHideTimer;
    // set hideBootstrapPreloader() back to: document.getElementById('app-preloader')?.remove();
    // remove .app-preloader--hidden from preloading.css / preloading.scss;
    // remove showLanguageSwitchPreloader() calls in header-section + app.topbar;
    // in public-layout syncHtmlAndLayout, hide preloader on every subscribe (drop bootstrapPreloaderDone guard).

    showBootstrapPreloader(): void {
        document.getElementById('app-preloader')?.classList.remove('app-preloader--hidden');
    }

    hideBootstrapPreloader(): void {
        document.getElementById('app-preloader')?.classList.add('app-preloader--hidden');
    }

    showLanguageSwitchPreloader(durationMs = 300): void {
        if (this.preloaderHideTimer) {
            clearTimeout(this.preloaderHideTimer);
        }
        this.showBootstrapPreloader();
        this.preloaderHideTimer = setTimeout(() => {
            this.hideBootstrapPreloader();
            this.preloaderHideTimer = undefined;
        }, durationMs);
    }
    // #endregion
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
