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
  
  // --- Simulation Settings ---
  private readonly DAMAGE_MODE_KEY = 'simulation_damage_mode';
  private readonly ALWAYS_CRIT_KEY = 'simulation_always_crit';

  public damageMode = new BehaviorSubject<'min' | 'average' | 'max'>('average');
  public damageMode$ = this.damageMode.asObservable();

  public alwaysCrit = new BehaviorSubject<boolean>(false);
  public alwaysCrit$ = this.alwaysCrit.asObservable();
  
  private isBrowser: boolean;

  constructor() {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    if (this.isBrowser) {
      const initialTheme = localStorage.getItem(this.STORAGE_KEY) as Theme || 'rs3';
      this.theme.next(initialTheme);
      this.applyTheme(initialTheme);
      this.loadCooldownTextSetting();
      this.loadSimulationSettings();
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

  // --- Simulation Settings Management ---
  public setDamageMode(mode: 'min' | 'average' | 'max') {
      this.damageMode.next(mode);
      if (this.isBrowser) {
          localStorage.setItem(this.DAMAGE_MODE_KEY, mode);
      }
  }

  public setAlwaysCrit(always: boolean) {
      this.alwaysCrit.next(always);
      if (this.isBrowser) {
          localStorage.setItem(this.ALWAYS_CRIT_KEY, String(always));
      }
  }

  private loadSimulationSettings() {
      if (this.isBrowser) {
          const mode = localStorage.getItem(this.DAMAGE_MODE_KEY) as 'min' | 'average' | 'max';
          if (mode) this.damageMode.next(mode);

          const crit = localStorage.getItem(this.ALWAYS_CRIT_KEY);
          if (crit !== null) this.alwaysCrit.next(crit === 'true');
      }
  }
}
