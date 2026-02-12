import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-searchable-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './searchable-dropdown.html',
  styleUrls: ['./searchable-dropdown.scss']
})
export class SearchableDropdownComponent {
  @Input() items: any[] = [];
  @Output() itemSelected = new EventEmitter<any>();

  constructor() { }

  selectItem(item: any): void {
    this.itemSelected.emit(item);
  }
}
