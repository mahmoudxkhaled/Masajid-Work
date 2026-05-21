import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  FOOTER_LEGAL_LINKS,
  FOOTER_QUICK_LINKS,
  LOGO_SRC,
  LOGO_SRC_DARK,
} from '../../data/public-landing.data';
import { PublicThemePreferenceService } from '../../services/public-theme-preference.service';

@Component({
  standalone: false,
  selector: 'app-footer-section',
  templateUrl: './footer-section.component.html',
  styleUrl: './footer-section.component.scss',
})
export class FooterSectionComponent implements OnInit, OnDestroy {
  readonly logoSrcLight = LOGO_SRC;
  readonly logoSrcDark = LOGO_SRC_DARK;
  readonly quickLinks = FOOTER_QUICK_LINKS;
  readonly legalLinks = FOOTER_LEGAL_LINKS;

  isDarkTheme = false;

  private themeSub?: Subscription;

  constructor(private readonly theme: PublicThemePreferenceService) {}

  ngOnInit(): void {
    this.isDarkTheme = this.theme.isDark;
    this.themeSub = this.theme.isDark$.subscribe((d) => {
      this.isDarkTheme = d;
    });
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }
}
