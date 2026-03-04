import { Component, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faLock, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { IPrayer, EPrayerBook, IPlayerToggles, DEFAULT_TOGGLES } from '../playerinput.model';
import { FilterPipe } from '../../../pipes/filter.pipe';

@Component({
  selector: 'app-prayers',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, FilterPipe],
  templateUrl: './prayers.component.html',
  styleUrls: ['./prayers.component.scss'],
})
export class PrayersComponent {
  @Input() prayers: IPrayer[] = [];
  @Input() activePrayerBook: EPrayerBook = EPrayerBook.STANDARD;
  @Input() activePrayerDmg: string = 'none';
  @Input() activePrayerOverhead: string = 'none';
  @Input() toggles: IPlayerToggles = DEFAULT_TOGGLES;
  @Input() getIcon: (name: string) => string = () => '';
  
  @Output() selectPrayer = new EventEmitter<IPrayer>();
  @Output() updatePrayerBook = new EventEmitter<EPrayerBook>();

  faChevronDown: IconDefinition = faChevronDown;
  faLock: IconDefinition = faLock;
  isPrayerDropdownOpen: boolean = false;
  EPrayerBook = EPrayerBook;

  @ViewChild('prayerDropdown') prayerDropdown!: ElementRef;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (
      this.isPrayerDropdownOpen &&
      this.prayerDropdown &&
      !this.prayerDropdown.nativeElement.contains(target)
    ) {
      this.isPrayerDropdownOpen = false;
    }
  }

  togglePrayerBookDropdown(): void {
    this.isPrayerDropdownOpen = !this.isPrayerDropdownOpen;
  }

  isPrayerActive(prayer: IPrayer): boolean {
    if (prayer.type === 'dmg') {
      return this.activePrayerDmg === prayer.name;
    } else if (prayer.type === 'overhead') {
      return this.activePrayerOverhead === prayer.name;
    }
    return false;
  }

  isPrayerLocked(prayer: IPrayer): boolean {
    if (prayer.prayerBook === EPrayerBook.CURSES) {
      if (!this.toggles.templeAtSenntisten) {
        return true;
      }
      const t99Prayers = ['Malevolence', 'Affliction', 'Desolation', 'Ruination'];
      if (t99Prayers.includes(prayer.name) && !this.toggles.praesulCodex) {
        return true;
      }
      return false;
    }
    
    if (prayer.prayerBook === EPrayerBook.STANDARD) {
      const kingsRansomPrayers = ['Piety', 'Rigour', 'Augury'];
      if (kingsRansomPrayers.includes(prayer.name)) {
        return !this.toggles.kingsRansom;
      }
    }
    
    return false;
  }

  handlePrayerClick(prayer: IPrayer): void {
    if (!this.isPrayerLocked(prayer)) {
      this.selectPrayer.emit(prayer);
    }
  }
}