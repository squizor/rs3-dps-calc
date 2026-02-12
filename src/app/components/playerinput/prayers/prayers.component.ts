import { Component, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronDown, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { IPrayer, EPrayerBook } from '../playerinput.model';
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
  @Input() getIcon: (name: string) => string = () => '';
  
  @Output() selectPrayer = new EventEmitter<IPrayer>();
  @Output() updatePrayerBook = new EventEmitter<EPrayerBook>();

  faChevronDown: IconDefinition = faChevronDown;
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
}