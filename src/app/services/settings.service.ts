import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'rs3' | 'osrs' | 'dark';

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
      this.loadCooldownTextSetting();
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
    body.classList.remove('osrs-theme', 'dark-theme');
    
    if (theme === 'osrs') {
      body.classList.add('osrs-theme');
    } else if (theme === 'dark') {
      body.classList.add('dark-theme');
    }
  }

  // --- Cooldown Text Setting ---
  private readonly COOLDOWN_TEXT_KEY = 'show_cooldown_text';
  private showCooldownText = new BehaviorSubject<boolean>(true);
  public showCooldownText$ = this.showCooldownText.asObservable();

  public setShowCooldownText(show: boolean) {
      this.showCooldownText.next(show);
      if (this.isBrowser) {
          localStorage.setItem(this.COOLDOWN_TEXT_KEY, String(show));
      }
  }

  private loadCooldownTextSetting() {
      if (this.isBrowser) {
          const saved = localStorage.getItem(this.COOLDOWN_TEXT_KEY);
          if (saved !== null) {
              this.showCooldownText.next(saved === 'true');
          }
      }
  }
}
