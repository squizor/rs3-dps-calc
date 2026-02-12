import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faPlus,
  faTrash,
  faCheck,
  faTimes,
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

  isAddItemModalOpen = false;
  isPerkModalOpen = false;
  isInventionModalOpen = false;
  selectedSlotForModal: IInventionPerkSlot | null = null;
  selectedAugmentForPerkModal: IInventionAugment | null = null;
  selectedSlotIndexForModal: number | null = null;
  selectedAugmentForModal: IInventionAugment | null = null;

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

  openPerkModal(
    targetSlot: IInventionPerkSlot,
    currentAugment: IInventionAugment,
    currentSlotIndex: number,
  ): void {
    this.selectedSlotForModal = targetSlot;
    this.selectedAugmentForPerkModal = currentAugment;
    this.selectedSlotIndexForModal = currentSlotIndex;

    if (currentSlotIndex === 0) {
      targetSlot.options = this.allPerkInstances.filter(
        (perk) =>
          perk.name === 'None' ||
          (perk.slotsConsumed === 2 &&
            currentAugment.perkSlots.length > 1 &&
            !currentAugment.perkSlots[1].occupiedByAdjacent) ||
          perk.slotsConsumed === 1,
      );
    } else if (currentSlotIndex === 1) {
      const firstSlotPerk = currentAugment.perkSlots[0].selectedPerk;
      if (firstSlotPerk && firstSlotPerk.slotsConsumed === 2) {
        targetSlot.options = [this.getPerkByName('None')!];
      } else {
        targetSlot.options = this.allPerkInstances.filter(
          (perk) => perk.name === 'None' || perk.slotsConsumed === 1,
        );
      }
    }

    this.isPerkModalOpen = true;
  }

  closePerkModal(): void {
    this.isPerkModalOpen = false;
    this.selectedSlotForModal = null;
    this.selectedAugmentForPerkModal = null;
    this.selectedSlotIndexForModal = null;
  }

  selectPerkFromModal(perk: IPerk): void {
    if (
      !this.selectedSlotForModal ||
      !this.selectedAugmentForPerkModal ||
      this.selectedSlotIndexForModal === null
    ) {
      return;
    }

    const currentSlot = this.selectedSlotForModal;
    const augment = this.selectedAugmentForPerkModal;
    const slotIndex = this.selectedSlotIndexForModal;
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
          alert('2-slot perks can only be applied to the first slot (Perk 1/3/5/7/9).');
          this.closePerkModal();
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
    this.closePerkModal();
    this.updateAugmentPerkSlotsState(augment);
    this.calculateStats.emit();
    this.saveAugments.emit();
  }

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
}
