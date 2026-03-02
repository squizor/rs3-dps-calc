import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faTrash, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { IArchQuest, IRelic } from '../playerinput.model';

@Component({
  selector: 'app-archaeology',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './archaeology.component.html',
  styleUrls: ['./archaeology.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchaeologyComponent implements OnChanges {
  @Input() archQuests: IArchQuest[] = [];
  @Input() activeArchQuest: string = '';
  @Input() totalMonolithLimit: number = 0;
  @Input() currentMonolithEnergy: number = 0;
  @Input() archPresets: any[] = [];
  @Input() activeArchPreset: any = null;
  @Input() archRelics: IRelic[] = [];
  @Input() activeRelics: (IRelic | null)[] = [null, null, null];
  @Input() getIconByName: (name: string) => string = () => '';

  @Output() selectArchQuest = new EventEmitter<IArchQuest>();
  @Output() selectArchPreset = new EventEmitter<any>();
  @Output() saveArchPreset = new EventEmitter<string>();
  @Output() deleteArchPreset = new EventEmitter<string>();
  @Output() selectRelic = new EventEmitter<IRelic>();
  @Output() clearRelic = new EventEmitter<void>();

  get displayableArchQuests(): IArchQuest[] {
    return this.archQuests.filter((quest) => quest.name !== 'None');
  }

  get isAnyRelicActive(): boolean {
    return this.activeRelics.some((r) => r !== null);
  }

  readonly faChevronDown = faChevronDown;
  readonly faTrash = faTrash;
  readonly faCheck = faCheck;
  readonly faTimes = faTimes;

  isArchQuestDropdownOpen = false;
  isArchPresetDropdownOpen = false;
  isRelicModalOpen = false;
  selectedRelicSlot = 0;
  notEnoughEnergyWarning = false;
  newArchPresetName = '';
  private isInitialized = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeRelics']) {
      this.calculateMonolithEnergy();
    }

    if (changes['archQuests'] && !this.isInitialized) {
      const quests: IArchQuest[] = changes['archQuests'].currentValue || [];
      if (quests.length > 0) {
        const tutorialQuest = quests.find((q) => q.name === 'Archaeology tutorial');

        this.onSelectArchQuest(tutorialQuest || quests[0]);
        this.isInitialized = true;
      }
    }
  }

  calculateMonolithEnergy(): void {
    const totalRelicCost = this.activeRelics
      .filter((relic): relic is IRelic => relic !== null)
      .reduce((total, relic) => total + relic.cost, 0);
    this.currentMonolithEnergy = this.totalMonolithLimit - totalRelicCost;
  }

  openArchQuestDropdown(): void {
    this.isArchQuestDropdownOpen = !this.isArchQuestDropdownOpen;
  }

  onSelectArchQuest(quest: IArchQuest): void {
    this.activeArchQuest = quest.name;
    this.totalMonolithLimit = quest.limit;
    this.selectArchQuest.emit(quest);
    this.isArchQuestDropdownOpen = false;

    const totalRelicCost = this.activeRelics
      .filter((relic): relic is IRelic => relic !== null)
      .reduce((total, relic) => total + relic.cost, 0);

    if (totalRelicCost > quest.limit) {
      this.activeRelics.fill(null);
    }

    this.calculateMonolithEnergy();
  }

  openArchPresetsDropdown(): void {
    this.isArchPresetDropdownOpen = !this.isArchPresetDropdownOpen;
  }

  onSelectArchPreset(preset: any): void {
    this.selectArchPreset.emit(preset);
    this.isArchPresetDropdownOpen = false;
  }

  confirmDeleteArchPreset(preset: any): void {
    this.deleteArchPreset.emit(preset.name);
  }

  onOpenRelicModal(slotIndex: number): void {
    this.selectedRelicSlot = slotIndex;
    this.isRelicModalOpen = true;
  }

  isRelicUnaffordable(relic: IRelic): boolean {
    const otherRelicsCost = this.activeRelics.reduce((total, r, index) => {
      if (r !== null && index !== this.selectedRelicSlot) {
        return total + r.cost;
      }
      return total;
    }, 0);

    return otherRelicsCost + relic.cost > this.totalMonolithLimit;
  }

  onSelectRelic(relic: IRelic): void {
    const isAlreadySelectedElsewhere = this.activeRelics.some(
      (activeRelic, index) => activeRelic?.name === relic.name && index !== this.selectedRelicSlot,
    );

    if (isAlreadySelectedElsewhere) {
      return;
    }

    this.activeRelics[this.selectedRelicSlot] = relic;
    this.calculateMonolithEnergy();
    this.isRelicModalOpen = false;
    this.selectRelic.emit(relic);
  }

  onClearAllRelics(): void {
    this.activeRelics.fill(null);
    this.calculateMonolithEnergy();
    this.clearRelic.emit();
  }

  isRelicSelected(relic: IRelic): boolean {
    return this.activeRelics.some((activeRelic) => activeRelic?.name === relic.name);
  }

  confirmSaveArchPreset(): void {
    if (this.newArchPresetName) {
      this.saveArchPreset.emit(this.newArchPresetName);
      this.newArchPresetName = '';
      this.isArchPresetDropdownOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isRelicModalOpen) {
      this.isRelicModalOpen = false;
    }
  }
}
