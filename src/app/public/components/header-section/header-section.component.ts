import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  AUTH_LOGIN_PATH,
  LOGO_SRC,
  LOGO_SRC_DARK,
  REGISTER_CHARITY_CENTER_PATH,
  REGISTER_DONOR_PATH,
  REGISTER_FACILITY_PATH,
  REGISTER_SELECTION_PATH,
  REGISTER_VENDOR_PATH,
} from '../../data/public-landing.data';
import { PublicThemePreferenceService } from '../../services/public-theme-preference.service';

@Component({
  standalone: false,
  selector: 'app-header-section',
  templateUrl: './header-section.component.html',
  styleUrl: './header-section.component.scss',
})
export class HeaderSectionComponent implements OnInit, OnDestroy {
  @ViewChild('langMenu', { read: ElementRef }) langMenu?: ElementRef<HTMLElement>;

  readonly logoSrcLight = LOGO_SRC;
  readonly logoSrcDark = LOGO_SRC_DARK;
  readonly loginPath = AUTH_LOGIN_PATH;
  readonly registerSelectionPath = REGISTER_SELECTION_PATH;
  readonly registerDonorPath = REGISTER_DONOR_PATH;
  readonly registerFacilityPath = REGISTER_FACILITY_PATH;
  readonly registerVendorPath = REGISTER_VENDOR_PATH;
  readonly registerCharityPath = REGISTER_CHARITY_CENTER_PATH;

  currentLang: 'en' | 'ar' = 'ar';
  isDarkTheme = false;
  langMenuOpen = false;

  private langSub?: Subscription;
  private themeSub?: Subscription;

  constructor(
    private readonly languageDirService: LanguageDirService,
    private readonly translationService: TranslationService,
    private readonly theme: PublicThemePreferenceService,
  ) { }

  ngOnInit(): void {
    const code = this.languageDirService.getPublicLanguageCode();
    this.currentLang = code === 'ar' ? 'ar' : 'en';

    this.langSub = this.languageDirService.userLanguageCode$.subscribe((lang) => {
      this.currentLang = lang === 'ar' ? 'ar' : 'en';
    });

    this.isDarkTheme = this.theme.isDark;
    this.themeSub = this.theme.isDark$.subscribe((d) => {
      this.isDarkTheme = d;
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    this.themeSub?.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const root = this.langMenu?.nativeElement;
    if (!root || !this.langMenuOpen) {
      return;
    }
    const target = event.target as Node | null;
    if (target && !root.contains(target)) {
      this.langMenuOpen = false;
    }
  }

  toggleLangMenu(event: Event): void {
    event.stopPropagation();
    this.langMenuOpen = !this.langMenuOpen;
  }

  setLang(lang: 'en' | 'ar'): void {
    if (lang === this.currentLang) {
      return;
    }
    this.langMenuOpen = false;
    this.translationService.showLanguageSwitchPreloader();
    this.languageDirService.setGuestLanguageCode(lang);
  }

  toggleTheme(): void {
    this.theme.toggle();
  }
}
