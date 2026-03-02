import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { IStat } from '../../../types/stat.types';

@Component({
  selector: 'app-stats-input',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './stats-input.component.html',
  styleUrls: ['./stats-input.component.scss'],
})
export class StatsInputComponent implements OnInit {
  @Input() stats: IStat[] = [];
  @Input() getIcon: (name: string) => string = () => '';
  @Output() statLevelChange = new EventEmitter<{ stat: IStat; newValue: number }>();
  @Output() lookupRsn = new EventEmitter<string>();

  rsn: string = '';

  FA_SEARCH = faSearch;

  ngOnInit(): void {
    // No initialization needed for selection
  }

  onStatValueChange(stat: IStat): void {
    let newValue = Number(stat.level);

    if (newValue > stat.maxLevel) {
      newValue = stat.maxLevel;
    }
    if (newValue < 1) {
      newValue = 1;
    }

    stat.level = newValue;

    this.statLevelChange.emit({ stat, newValue });
  }
}
