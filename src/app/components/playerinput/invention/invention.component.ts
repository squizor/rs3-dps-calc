import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faPlus,
  faTrash,
  faCheck,
  faTimes,
  faHammer,
  faBolt,
  faShieldAlt,
  IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { IInventionAugment, IInventionPerkSlot, IPerk, IArmor } from '../playerinput.model';

@Component({
  selector: 'app-invention',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './invention.component.html',
  styleUrls: ['./invention.component.scss'],
})
export class InventionComponent implements OnInit {
  @Input() inventionPerks: IInventionAugment[] = [];
  @Input() activeInventionItem: IInventionAugment | null = null;
  @Input() allPerkInstances: IPerk[] = [];
  @Input() isArmorLoaded = false;
  @Input() augmentableArmorPieces: IArmor[] = [];
  @Input() getIconByName: (name: string) => string = () => '';
  @Input() getInventionItemIcon: (augment: IInventionAugment) => string = () => '';

  @Output() selectInventionItem = new EventEmitter<IInventionAugment>();
  @Output() calculateStats = new EventEmitter<void>();
  @Output() addItem = new EventEmitter<IArmor>();
  @Output() removeItem = new EventEmitter<IInventionAugment>();
  @Output() saveAugments = new EventEmitter<void>();

  faPlus: IconDefinition = faPlus;
  faTrash: IconDefinition = faTrash;
  faCheck: IconDefinition = faCheck;
  faTimes: IconDefinition = faTimes;
  faHammer: IconDefinition = faHammer;
  faSword: IconDefinition = faBolt; // Using Bolt for "Power/Weapon" if Sword is missing
  faShieldAlt: IconDefinition = faShieldAlt;

  addItemSearchTerm = '';
  itemPendingDeletion: IInventionAugment | null = null;

  get filteredAugmentableArmorPieces(): IArmor[] {
    if (!this.addItemSearchTerm) {
      return this.augmentableArmorPieces;
    }
    return this.augmentableArmorPieces.filter((armor) =>
      armor.name.toLowerCase().includes(this.addItemSearchTerm.toLowerCase()),
    );
  }

  // Methods restored from previous version
  ngOnInit(): void {
    if (this.inventionPerks) {
      this.inventionPerks.forEach((augment) => this.updateAugmentPerkSlotsState(augment));
    }
  }

  openAddItemModal(): void {
    if (!this.isArmorLoaded) return;
    this.addItemSearchTerm = '';
    this.isAddItemModalOpen = true;
  }

  closeAddItemModal(): void {
    this.isAddItemModalOpen = false;
  }

  addInventionItem(item: IArmor): void {
    this.addItem.emit(item);
    this.closeAddItemModal();
  }

  requestRemoveItem(item: IInventionAugment): void {
    this.itemPendingDeletion = item;
  }

  cancelRemoveItem(): void {
    this.itemPendingDeletion = null;
  }

  confirmRemoveItem(itemToRemove: IInventionAugment): void {
    this.removeItem.emit(itemToRemove);
    this.itemPendingDeletion = null;
  }
  
  // Invention Part Modal (different from Perk Modal)
  openInventionModal(augment: IInventionAugment): void {
    this.selectedAugmentForModal = augment;
    this.isInventionModalOpen = true;
  }

  closeInventionModal(): void {
    this.isInventionModalOpen = false;
    this.selectedAugmentForModal = null;
  }

  selectLongPartFromModal(longPart: string): void {
    if (this.selectedAugmentForModal) {
      this.selectedAugmentForModal.activeLongPart = longPart;
    }
    this.closeInventionModal();
  }

  // Properties for modals
  isAddItemModalOpen = false;
  isInventionModalOpen = false;
  selectedAugmentForModal: IInventionAugment | null = null;
  
  // Property for new dropdown search
  perkSearchTerm = '';

  // Dropdown State
  activeAugmentIndex: number | null = null;
  activeSlotIndex: number | null = null;
  
  // Helper to get currently active slot
  get activeSlot(): IInventionPerkSlot | null {
      if (this.activeAugmentIndex === null || this.activeSlotIndex === null) return null;
      if (!this.inventionPerks[this.activeAugmentIndex]) return null;
      return this.inventionPerks[this.activeAugmentIndex].perkSlots[this.activeSlotIndex];
  }

  togglePerkDropdown(
    augment: IInventionAugment, 
    augmentIndex: number, 
    slot: IInventionPerkSlot, 
    slotIndex: number
  ): void {
      // If clicking the already open slot, close it
      if (this.activeAugmentIndex === augmentIndex && this.activeSlotIndex === slotIndex) {
          this.closeDropdown();
          return;
      }

      // Open new slot
      this.activeAugmentIndex = augmentIndex;
      this.activeSlotIndex = slotIndex;
      this.perkSearchTerm = ''; // Reset search
      
      // Update the options for this slot (reusing the existing logic logic, but adapting for the new state if needed)
      // Actually, filteredPerkOptions relies on `activeSlot` now.
      
      // We need to set the options on the slot object itself, similar to before.
      const type = this.getAugmentType(augment.name);
      
      if (slotIndex === 0) {
        slot.options = this.allPerkInstances.filter(
          (perk) =>
            (perk.name === 'None' || perk.type === 'utility' || perk.type === type) &&
            (perk.name === 'None' ||
              (perk.slotsConsumed === 2 &&
                augment.perkSlots.length > 1 &&
                !augment.perkSlots[1].occupiedByAdjacent) ||
              perk.slotsConsumed === 1),
        );
      } else if (slotIndex === 1) {
        const firstSlotPerk = augment.perkSlots[0].selectedPerk;
        if (firstSlotPerk && firstSlotPerk.slotsConsumed === 2) {
            slot.options = [this.getPerkByName('None')!];
        } else {
            slot.options = this.allPerkInstances.filter(
            (perk) =>
                (perk.name === 'None' || perk.type === 'utility' || perk.type === type) &&
                (perk.name === 'None' || perk.slotsConsumed === 1),
            );
        }
      }
  }

  closeDropdown(): void {
    this.activeAugmentIndex = null;
    this.activeSlotIndex = null;
    this.perkSearchTerm = '';
  }

  selectPerkFromDropdown(perk: IPerk): void {
    if (this.activeAugmentIndex === null || this.activeSlotIndex === null) return;

    const augment = this.inventionPerks[this.activeAugmentIndex];
    if (!augment) return;

    const currentSlot = augment.perkSlots[this.activeSlotIndex];
    const slotIndex = this.activeSlotIndex;
    const otherSlotIndex = slotIndex === 0 ? 1 : 0;
    const otherSlot = augment.perkSlots[otherSlotIndex];

    if (perk.name === 'None') {
      if (currentSlot.selectedPerk && currentSlot.selectedPerk.slotsConsumed === 2) {
        if (otherSlot) {
          otherSlot.selectedPerk = this.getPerkByName('None')!;
          otherSlot.occupiedByAdjacent = false;
        }
      }
      currentSlot.selectedPerk = this.getPerkByName('None')!;
      currentSlot.occupiedByAdjacent = false;
    } else {
      if (perk.slotsConsumed === 2) {
        if (slotIndex === 1) {
          // This case should be filtered out by UI usually, but good safeguard
          this.closeDropdown();
          return;
        }
        if (otherSlot && otherSlot.selectedPerk && otherSlot.selectedPerk.name !== 'None') {
          otherSlot.selectedPerk = this.getPerkByName('None')!;
        }
        currentSlot.selectedPerk = perk;
        if (otherSlot) {
          otherSlot.occupiedByAdjacent = true;
        }
      } else {
        if (currentSlot.selectedPerk && currentSlot.selectedPerk.slotsConsumed === 2) {
          if (otherSlot) {
            otherSlot.selectedPerk = this.getPerkByName('None')!;
            otherSlot.occupiedByAdjacent = false;
          }
        }
        currentSlot.selectedPerk = perk;
        currentSlot.occupiedByAdjacent = false;
      }
    }
    this.closeDropdown();
    this.updateAugmentPerkSlotsState(augment);
    this.calculateStats.emit();
    this.saveAugments.emit();
  }

  get filteredPerkOptions(): IPerk[] {
    const slot = this.activeSlot;
    if (!slot) return [];
    
    let options = slot.options || [];
    if (this.perkSearchTerm) {
      options = options.filter((p) =>
        p.name.toLowerCase().includes(this.perkSearchTerm.toLowerCase()),
      );
    }
    
    // Ensure "None" is always at the top
    return options.sort((a, b) => {
        if (a.name === 'None') return -1;
        if (b.name === 'None') return 1;
        return 0; // Keep original order for others
    });
  }
  
  // ... existing helpers ...

  getAugmentType(augmentName: string): 'weapon' | 'armor' {
    const name = augmentName.toLowerCase();
    if (name.includes('weapon')) return 'weapon';
    if (name.includes('armour') || name.includes('body') || name.includes('leg')) return 'armor';
    return 'weapon'; // Default fallback
  }

  getRomanRank(rank: number | undefined): string {
    if (!rank) return '';
    return rank.toString();
  }

  getSlotIcon(): IconDefinition {
      // Used for header icon if we still needed it, but context is now local
      // keeping for safety or refactoring later
      if (this.activeAugmentIndex === null) return this.faHammer;
      const augment = this.inventionPerks[this.activeAugmentIndex];
      const type = this.getAugmentType(augment.name);
      return type === 'weapon' ? this.faSword : this.faShieldAlt;
  }
  
  // ... existing modal handlers (can be removed or kept if needing a hybrid approach, but we are replacing)
  // For cleanliness, I will remove the old 'openPerkModal', 'closePerkModal', 'selectPerkFromModal' placeholders 
  // by mostly replacing this block.

  getPerkByName(name: string): IPerk | undefined {
    return this.allPerkInstances.find((perk) => perk.name === name);
  }

  private updateAugmentPerkSlotsState(augment: IInventionAugment): void {
    augment.perkSlots.forEach((slot: IInventionPerkSlot) => (slot.occupiedByAdjacent = false));

    if (augment.perkSlots.length > 1) {
      const firstSlot = augment.perkSlots[0];
      const secondSlot = augment.perkSlots[1];

      if (firstSlot.selectedPerk && firstSlot.selectedPerk.slotsConsumed === 2) {
        secondSlot.occupiedByAdjacent = true;
      }
    }
  }


}
