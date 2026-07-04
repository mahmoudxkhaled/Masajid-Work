import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { PUBLIC_LANDING_ROUTE_PATH } from '../data/public-landing.data';
import { PublicThemePreferenceService } from '../services/public-theme-preference.service';

@Component({
  standalone: false,
  selector: 'app-public-layout',
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss',
})
export class PublicLayoutComponent implements OnInit, OnDestroy, AfterViewInit {
  private static readonly SCROLL_HEADER_OFFSET_PX = 88;

  dir: 'rtl' | 'ltr' = 'rtl';
  lang: 'en' | 'ar' = 'ar';
  isDark = false;

  private langSub?: Subscription;
  private rtlSub?: Subscription;
  private themeSub?: Subscription;
  private routerSub?: Subscription;

  constructor(
    private readonly languageDirService: LanguageDirService,
    private readonly localStorageService: LocalStorageService,
    private readonly translationService: TranslationService,
    private readonly theme: PublicThemePreferenceService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    if (this.localStorageService.getToken()) {
      void this.router.navigate(['/dashboard']);
      return;
    }

    const code = this.languageDirService.getPublicLanguageCode();
    this.languageDirService.setGuestLanguageCode(code);

    this.langSub = this.languageDirService.userLanguageCode$.subscribe((lang) => {
      this.syncHtmlAndLayout(lang);
    });

    this.rtlSub = this.languageDirService.isRtl$.subscribe((isRtl) => {
      this.dir = isRtl ? 'rtl' : 'ltr';
    });

    this.isDark = this.theme.isDark;
    this.applyThemeClass(this.isDark);
    this.themeSub = this.theme.isDark$.subscribe((dark) => {
      this.isDark = dark;
      this.applyThemeClass(dark);
    });

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.scheduleScrollToFragment());
  }

  ngAfterViewInit(): void {
    this.scheduleScrollToFragment();
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    this.rtlSub?.unsubscribe();
    this.themeSub?.unsubscribe();
    this.routerSub?.unsubscribe();
    document.documentElement.classList.remove('dh-theme-dark');
  }

  onDhClick(event: MouseEvent): void {
    if (!this.isLandingRoute()) {
      return;
    }
    const link = (event.target as HTMLElement | null)?.closest?.('a[href^="#"]');
    if (!link) {
      return;
    }
    const href = link.getAttribute('href');
    if (!href || href === '#' || href.length < 2) {
      return;
    }
    const id = decodeURIComponent(href.slice(1));
    if (!id || /[/:?]/.test(id)) {
      return;
    }
    const el = document.getElementById(id);
    if (!el) {
      return;
    }
    event.preventDefault();
    this.scrollElementIntoView(el);
    void this.router.navigate([PUBLIC_LANDING_ROUTE_PATH], {
      fragment: id,
      replaceUrl: true,
    });
  }

  private isLandingRoute(): boolean {
    const url = this.router.url.split('?')[0].split('#')[0];
    return url === '/' || url === '';
  }

  private scheduleScrollToFragment(): void {
    if (!this.isLandingRoute()) {
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.scrollToUrlFragment());
    });
  }

  private scrollToUrlFragment(): void {
    const fragment = this.router.parseUrl(this.router.url).fragment;
    if (!fragment) {
      return;
    }
    const el = document.getElementById(fragment);
    if (el) {
      this.scrollElementIntoView(el);
    }
  }

  private scrollElementIntoView(el: HTMLElement): void {
    if (typeof window === 'undefined') {
      return;
    }
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    const top =
      el.getBoundingClientRect().top +
      window.scrollY -
      PublicLayoutComponent.SCROLL_HEADER_OFFSET_PX;
    if (reduceMotion) {
      window.scrollTo(0, Math.max(0, top));
      return;
    }
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  private syncHtmlAndLayout(lang: string): void {
    this.lang = lang === 'ar' ? 'ar' : 'en';
    this.dir = this.lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = this.lang;
    document.documentElement.setAttribute('dir', this.dir);
    this.translationService.useLanguage(this.lang).subscribe({
      next: () => this.translationService.hideBootstrapPreloader(),
      error: () => this.translationService.hideBootstrapPreloader(),
    });
  }

  private applyThemeClass(isDark: boolean): void {
    document.documentElement.classList.toggle('dh-theme-dark', isDark);
  }
}
