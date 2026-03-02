import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService, Theme } from '../../services/settings.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Settings</h3>
          <button class="close-button" (click)="close()">X</button>
        </div>
        <div class="modal-body">
          <div class="setting-row">
            <label for="appTheme">Theme</label>
            <div class="mode-toggle">
              <button 
                [class.active]="currentTheme === 'rs3'" 
                (click)="setTheme('rs3')">
                RS3 Theme
              </button>
              <button 
                [class.active]="currentTheme === 'osrs'" 
                (click)="setTheme('osrs')">
                OSRS Theme
              </button>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-label-group">
                <label for="cooldownText">Cooldown Text</label>
                <p class="setting-description">
                  Show remaining time on ability icons.
                </p>
            </div>
            <div class="mode-toggle">
              <button 
                [class.active]="showCooldownText" 
                (click)="toggleCooldownText(true)">
                On
              </button>
              <button 
                [class.active]="!showCooldownText" 
                (click)="toggleCooldownText(false)">
                Off
              </button>
            </div>
          </div>

          <p class="setting-description">
            Change the application's theme and display settings.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1002;
    }

    .modal-content {
      background-color: var(--wiki-theme-dark);
      border: 1px solid var(--border-color);
      width: 90%;
      max-width: 500px;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid var(--border-color);
      
      h3 {
        margin: 0;
        font-size: 1.25rem;
      }

      .close-button {
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 1.5rem;
        cursor: pointer;
        &:hover {
          color: var(--text-primary);
        }
      }
    }

    .modal-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .setting-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .setting-description {
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin: 0;
    }

    .mode-toggle {
      display: flex;
      background-color: var(--input-bg);
      border: 1px solid var(--border-color);
      overflow: hidden;

      button {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        padding: 0.5rem 1rem;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.2s ease-out;

        &:hover {
          background-color: var(--hover-bg);
        }

        &.active {
          background-color: var(--active-color);
          color: var(--wiki-theme-darkest);
          font-weight: 600;
        }
      }
    }
  `]
})
export class SettingsModalComponent {
  @Output() modalClosed = new EventEmitter<void>();
  private settingsService = inject(SettingsService);

  currentTheme: Theme = 'rs3';
  showCooldownText = true;

  constructor() {
    this.settingsService.theme$.subscribe(theme => this.currentTheme = theme);
    this.settingsService.showCooldownText$.subscribe(show => this.showCooldownText = show);
  }

  toggleCooldownText(show: boolean) {
      this.settingsService.setShowCooldownText(show);
  }

  setTheme(theme: Theme) {
    this.settingsService.setTheme(theme);
  }

  close() {
    this.modalClosed.emit();
  }
}
