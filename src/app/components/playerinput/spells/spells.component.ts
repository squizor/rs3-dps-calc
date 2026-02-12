import { Component, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronDown, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { ISpell, ESpellBook } from '../playerinput.model';
import { FilterPipe } from '../../../pipes/filter.pipe';

@Component({
  selector: 'app-spells',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, FilterPipe],
  templateUrl: './spells.component.html',
  styleUrls: ['./spells.component.scss'],
})
export class SpellsComponent {
  @Input() spells: ISpell[] = [];
  @Input() activeSpellBook: ESpellBook = ESpellBook.STANDARD;
  @Input() activeSpells: string = 'none';
  @Input() getIcon: (name: string) => string = () => '';
  
  @Output() selectSpell = new EventEmitter<string>();
  @Output() updateSpellBook = new EventEmitter<ESpellBook>();

  faChevronDown: IconDefinition = faChevronDown;
  isSpellDropdownOpen: boolean = false;
  ESpellBook = ESpellBook;

  @ViewChild('spellDropdown') spellDropdown!: ElementRef;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (
      this.isSpellDropdownOpen &&
      this.spellDropdown &&
      !this.spellDropdown.nativeElement.contains(target)
    ) {
      this.isSpellDropdownOpen = false;
    }
  }

  toggleSpellBookDropdown(): void {
    this.isSpellDropdownOpen = !this.isSpellDropdownOpen;
  }
}