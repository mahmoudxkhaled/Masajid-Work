import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemePreference = 'light' | 'dark';

@Injectable()
export class PublicThemePreferenceService {
  private static readonly STORAGE_KEY = 'dh.theme';

  private readonly darkSubject = new BehaviorSubject<boolean>(this.readInitialIsDark());

  readonly isDark$ = this.darkSubject.asObservable();

  get isDark(): boolean {
    return this.darkSubject.value;
  }

  toggle(): void {
    this.setDark(!this.darkSubject.value);
  }

  setDark(isDark: boolean): void {
    this.darkSubject.next(isDark);
    localStorage.setItem(
      PublicThemePreferenceService.STORAGE_KEY,
      isDark ? 'dark' : 'light',
    );
  }

  private readInitialIsDark(): boolean {
    const saved = localStorage.getItem(PublicThemePreferenceService.STORAGE_KEY) as ThemePreference | null;
    if (saved === 'dark') {
      return true;
    }
    return false;
  }
}
