import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'rs3' | 'osrs';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'app_theme';
  private theme = new BehaviorSubject<Theme>('rs3');
  public theme$ = this.theme.asObservable();
  
  private isBrowser: boolean;

  constructor() {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    if (this.isBrowser) {
      const initialTheme = localStorage.getItem(this.STORAGE_KEY) as Theme || 'rs3';
      this.theme.next(initialTheme);
      this.applyTheme(initialTheme);
    }
  }

  setTheme(theme: Theme) {
    this.theme.next(theme);
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEY, theme);
      this.applyTheme(theme);
    }
  }

  private applyTheme(theme: Theme) {
    const body = document.body;
    if (theme === 'osrs') {
      body.classList.add('osrs-theme');
    } else {
      body.classList.remove('osrs-theme');
    }
  }
}
