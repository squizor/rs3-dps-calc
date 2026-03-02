import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  Input,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { Subscription } from 'rxjs';

import { IEnemy, IEnemyMode } from '../../../playerinput/playerinput.model';
import { PlayerDataService } from '../../../../services/player-data.service';
import { BestiaryService } from '../../../../services/bestiary.service';

@Component({
  selector: 'app-bossinformation',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './bossinformation.component.html',
  styleUrls: ['./bossinformation.component.scss'],
})
export class BossinformationComponent implements OnInit, OnDestroy {
  @Input() debuffs: { vuln: boolean; smoke: boolean; gstaff: boolean } = { vuln: false, smoke: false, gstaff: false };
  @Output() enemyChange = new EventEmitter<IEnemy | null>();
  @Output() debuffsChange = new EventEmitter<{ vuln: boolean; smoke: boolean; gstaff: boolean }>();

  faChevronDown = faChevronDown;
  faSpinner = faSpinner;

  allEnemies: IEnemy[] = [];
  filteredEnemies: IEnemy[] = [];
  selectedEnemy: IEnemy | null = null;
  selectedPhase: IEnemyMode | null = null;
  public filteredPhases: IEnemyMode[] = [];
  displayEnemy: IEnemy | null = null;
  searchQuery: string = '';
  isDropdownOpen: boolean = false;
  isLoading: boolean = false;
  isHardMode: boolean = false;
  enrageValue: number = 0;
  private hasDataBeenLoaded: boolean = false;
  private bestiarySubscription: Subscription | undefined;

  public affinities: { 
      style: string; 
      value: number | string; 
      valueColor: string; 
      styleColor: string;
      icon?: string 
  }[] = [];
  public susceptibilityIcons: { name: string; url: string }[] = [];
  public traits: { name: string; active: boolean; color: string; icon: string }[] = [];

  constructor(
    private bestiaryService: BestiaryService,
    private playerDataService: PlayerDataService,
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.bestiarySubscription?.unsubscribe();
  }

// toggleDropdown moved below

  selectEnemy(enemy: IEnemy) {
    this.selectedEnemy = enemy;
    this.searchQuery = enemy.name;
    this.isDropdownOpen = false;
    this.isHardMode = false;

    this.filterPhases();
    this.selectedPhase = this.filteredPhases.length ? this.filteredPhases[0] : null;

    this.updateDisplayEnemy();
    this.filterEnemies();
    this.enemyChange.emit(this.displayEnemy);
  }

  selectPhase(phase: IEnemyMode) {
    this.selectedPhase = phase;
    this.updateDisplayEnemy();
    this.enemyChange.emit(this.displayEnemy);
  }

  onHardModeToggle() {
    this.filterPhases();
    if (!this.filteredPhases.some((p: IEnemyMode) => p.name === this.selectedPhase?.name)) {
      this.selectedPhase = this.filteredPhases.length ? this.filteredPhases[0] : null;
    }
    this.updateDisplayEnemy();
    this.enemyChange.emit(this.displayEnemy);
  }

  onEnrageChange() {
    this.updateDisplayEnemy();
    this.enemyChange.emit(this.displayEnemy);
  }

  onDebuffChange() {
    this.debuffsChange.emit(this.debuffs);
  }

  private filterPhases() {
    if (!this.selectedEnemy || !this.selectedEnemy.phases) {
      this.filteredPhases = [];
      return;
    }

    if (this.isHardMode) {
      this.filteredPhases = this.selectedEnemy.phases;
    } else {
      this.filteredPhases = this.selectedEnemy.phases.filter(
        (p: IEnemyMode) => !p.name.toLowerCase().includes('hard'),
      );
    }
  }

  private updateDisplayEnemy() {
    if (!this.selectedEnemy) {
      this.displayEnemy = null;
      this.updateTemplateProperties();
      this.playerDataService.updateBoss(null);
      return;
    }

    let displayEnemyCandidate: IEnemy = { ...this.selectedEnemy };

    if (this.selectedPhase) {
      displayEnemyCandidate = { ...displayEnemyCandidate, ...this.selectedPhase };
      displayEnemyCandidate.name = `${this.selectedEnemy.name} (${this.selectedPhase.name})`;
    } else if (this.isHardMode && this.selectedEnemy.hardModeStats) {
      displayEnemyCandidate = { ...displayEnemyCandidate, ...this.selectedEnemy.hardModeStats };
    }

    if (this.enrageValue > 0 && displayEnemyCandidate.enrageLevel !== undefined) {
      displayEnemyCandidate.enrageLevel = this.enrageValue;
    }

    this.displayEnemy = displayEnemyCandidate;
    this.updateTemplateProperties();
    this.playerDataService.updateBoss(this.displayEnemy);
  }

  private updateTemplateProperties() {
    if (!this.displayEnemy) {
      this.affinities = [];
      this.susceptibilityIcons = [];
      return;
    }

    const newAffinities = [];
    if (this.displayEnemy.affinity) {
      const affinityData = this.displayEnemy.affinity;
      const hybridValue = affinityData.hybrid;

      const styles: ('melee' | 'ranged' | 'magic' | 'necromancy')[] = ['melee', 'ranged', 'magic', 'necromancy'];

      const styleColors: { [key: string]: string } = {
          melee: '#e74c3c', // Orange/Red
          ranged: '#2ecc71', // Green
          magic: '#3498db',  // Blue
          necromancy: '#9b59b6' // Purple
      };

      for (const style of styles) {
        let value: number | undefined | null;
        
        if (style === 'necromancy') {
            value = hybridValue;
        } else {
            value = affinityData[style as 'melee' | 'ranged' | 'magic'];
             // Fallback to hybrid if specific style is missing
            if ((value === undefined || value === null) && hybridValue !== undefined) {
                value = hybridValue;
            }
        }

        if (value !== undefined && value !== null) {
          let valueColor = 'var(--white)'; 
          const styleColor = styleColors[style] || 'var(--wiki-theme-bright)';
          const iconUrl = this.weaknessIconMap[style] || '';
          
          newAffinities.push({ 
              style, 
              value, 
              valueColor, 
              styleColor,
              icon: iconUrl 
          });
        }
      }
    }
    this.affinities = newAffinities;

    if (this.displayEnemy.susceptibleTo) {
      const susceptibilities = Array.isArray(this.displayEnemy.susceptibleTo)
        ? this.displayEnemy.susceptibleTo
        : [this.displayEnemy.susceptibleTo];
      this.susceptibilityIcons = susceptibilities
        .map((susc: string) => {
          const url = this.susceptibilityIconMap[susc.toLowerCase()];
          return url ? { name: susc, url: url } : null;
        })
        .filter((icon): icon is { name: string; url: string } => icon !== null);
    } else {
      this.susceptibilityIcons = [];
    }

    // Traits
    this.traits = [
        { name: 'Poison', active: this.displayEnemy.poisonable, color: '#2ecc71', icon: 'assets/icons/Poison_immunity_icon.png' },
        { name: 'Stun', active: this.displayEnemy.stunnable, color: '#f1c40f', icon: 'assets/icons/Stun_immunity_icon.png' },
        { name: 'Reflect', active: this.displayEnemy.reflectable, color: '#95a5a6', icon: 'assets/icons/Deflect_immunity_icon.png' },
        { name: 'Drain', active: this.displayEnemy.statdrainable, color: '#e74c3c', icon: 'assets/icons/Drain_immunity_icon.png' }
    ];
  }

  onSearchInput() {
    this.isDropdownOpen = true;
    this.filterEnemies();
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.searchQuery = '';
      this.loadInitialData();
      this.filterEnemies();
    }
  }

  private loadInitialData() {
    if (!this.hasDataBeenLoaded && !this.isLoading && isPlatformBrowser(this.platformId)) {
      this.isLoading = true;
      this.bestiarySubscription = this.bestiaryService.getBestiaryData().subscribe({
        next: (allEnemies: IEnemy[]) => {
          this.allEnemies = allEnemies.sort((a, b) => {
            // Priority 1: Custom (or Custom Enemy)
            if (a.name.toLowerCase().includes('custom') && !a.name.toLowerCase().includes('dummy')) return -1;
            if (b.name.toLowerCase().includes('custom') && !b.name.toLowerCase().includes('dummy')) return 1;
            
            // Priority 2: Combat Dummy
            if (a.name === 'Combat Dummy') return -1;
            if (b.name === 'Combat Dummy') return 1;

            // Priority 3: Alphabetical
            return a.name.localeCompare(b.name);
          });
          this.filteredEnemies = this.allEnemies;
          const defaultEnemy = this.allEnemies.find((e) => e.name === 'Combat Dummy');
          if (defaultEnemy) {
            this.selectEnemy(defaultEnemy);
          }
        },
        error: (err: any) => console.error('Error fetching bestiary data:', err),
        complete: () => {
          this.isLoading = false;
          this.hasDataBeenLoaded = true;
        },
      });
    }
  }

  filterEnemies() {
    if (this.searchQuery) {
      this.filteredEnemies = this.allEnemies.filter((enemy) =>
        enemy.name.toLowerCase().includes(this.searchQuery.toLowerCase()),
      );
    } else {
      this.filteredEnemies = this.allEnemies;
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.filterEnemies();
  }

  susceptibilityIconMap: { [key: string]: string } = {
    hexhunter: 'assets/icons/Ranged.png',
    inqstaff: 'assets/icons/Magic.png',
    dragonbane: 'assets/icons/Ranged.png',
    kerapac: 'assets/icons/Magic.png',
    undead: 'assets/icons/undead_slayer.png',
    ghosthunter: 'assets/icons/undead_slayer.png',
    salve: 'assets/icons/Salve_amulet_(e).png',
    terrasaur: 'assets/icons/Attack.png',
    keris: 'assets/icons/Keris.png',
    demonslayer: 'assets/icons/demon_slayer.png',
    dragonslayer: 'assets/icons/dragon_slayer.png',
    balmung: 'assets/icons/Balmung.png',
    spear: 'assets/icons/Attack.png',
    salamancy: 'assets/icons/Magic.png',
    nope: 'assets/icons/Defence.png',
    conckeris: 'assets/icons/Consecrated_keris.png',
  };

  weaknessIconMap: { [key: string]: string } = {
    melee: 'assets/icons/Attack.png',
    ranged: 'assets/icons/Ranged.png',
    magic: 'assets/icons/Magic.png',
    fire: 'assets/icons/Magic.png',
    water: 'assets/icons/Magic.png',
    air: 'assets/icons/Magic.png',
    earth: 'assets/icons/Magic.png',
    stab: 'assets/icons/Attack.png',
    slash: 'assets/icons/Attack.png',
    crush: 'assets/icons/Strength.png',
    arrows: 'assets/icons/Ranged.png',
    bolts: 'assets/icons/Ranged.png',
    thrown: 'assets/icons/Ranged.png',
    necromancy: 'assets/icons/Necromancy_detail.png',
  };

  getWeaknessIcon(weakness: string): string {
    return this.weaknessIconMap[weakness.toLowerCase()] || '';
  }

  getTraitProperty(traitName: string): string {
    const lower = traitName.toLowerCase();
    if (lower === 'poison') return 'poisonable';
    if (lower === 'stun') return 'stunnable';
    if (lower === 'reflect') return 'reflectable';
    if (lower === 'drain') return 'statdrainable';
    return '';
  }

  isLargeNumber(value: number | undefined): boolean {
    if (value === undefined) {
      return false;
    }
    return value.toString().length > 6;
  }

  updateCustomStat(field: string, value: any) {
    if (!this.displayEnemy) return;

    const newBoss = { ...this.displayEnemy };

    if (field === 'lifePoints') newBoss.lifePoints = Number(value);
    if (field === 'defenceLevel') newBoss.defenceLevel = Number(value);
    if (field === 'armor') newBoss.armor = Number(value);
    
    this.displayEnemy = newBoss;
    this.playerDataService.updateBoss(this.displayEnemy);
  }

  updateCustomAffinity(style: string, value: any) {
    if (!this.displayEnemy || !this.displayEnemy.affinity) return;
    
    const numValue = Number(value);
    const newAffinity = { ...this.displayEnemy.affinity };
    
    if (style === 'hybrid') newAffinity.hybrid = numValue;
    if (style === 'melee') newAffinity.melee = numValue;
    if (style === 'ranged') newAffinity.ranged = numValue;
    if (style === 'magic') newAffinity.magic = numValue;
    if (style === 'necromancy') newAffinity.necromancy = numValue;

    const newBoss = { ...this.displayEnemy, affinity: newAffinity };
    this.displayEnemy = newBoss;

    this.updateTemplateProperties(); 
    this.playerDataService.updateBoss(this.displayEnemy);
  }

  toggleCustomTrait(trait: string) {
      if (!this.displayEnemy) return;
      
      const newBoss = { ...this.displayEnemy };

      if (trait === 'poisonable') newBoss.poisonable = !newBoss.poisonable;
      if (trait === 'stunnable') newBoss.stunnable = !newBoss.stunnable;
      if (trait === 'reflectable') newBoss.reflectable = !newBoss.reflectable;
      if (trait === 'statdrainable') newBoss.statdrainable = !newBoss.statdrainable;
      
      this.displayEnemy = newBoss;

      this.updateTemplateProperties();
      this.playerDataService.updateBoss(this.displayEnemy);
  }

  onBossChange() {
    if (this.displayEnemy) {
        this.displayEnemy = { ...this.displayEnemy };
        this.playerDataService.updateBoss(this.displayEnemy);
    }
  }
}
