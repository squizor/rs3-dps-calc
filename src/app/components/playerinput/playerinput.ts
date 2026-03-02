import { ArchaeologyComponent } from './archaeology/archaeology.component';
import {
  faPlus,
  IconDefinition,
  faChevronDown,
  faSearch,
  faBolt,
  faBullseye,
  faQuestionCircle,
  faTachometerAlt,
  faGavel,
  faCrosshairs,
  faWandMagicSparkles,
  faTimes,
  faCheck,
  faTrash,
  faHelmetSafety,
} from '@fortawesome/free-solid-svg-icons';
import { Wikiapi } from '../../services/wikiapi';
import { ElementRef, HostListener, ViewChild, OnInit } from '@angular/core';
import { FilterPipe } from '../../pipes/filter.pipe';
import { HiscoresService, PlayerStats } from '../../services/hiscores.service';
import { IActivePrayer, PlayerDataService } from '../../services/player-data.service';
import { AbilityListComponent } from '../rotation-builder/ability-list/ability-list.component';
import { StatsInputComponent } from './stats-input/stats-input.component';
import { PotionsComponent } from './potions/potions.component';
import { PrayersComponent } from './prayers/prayers.component';
import { SpellsComponent } from './spells/spells.component';
import { InventionComponent } from './invention/invention.component';
import { HttpClient } from '@angular/common/http';
import {
  ETabs,
  EPrayerBook,
  ESpellBook,
  IPrayer,
  ISpell,
  IInventionAugment,
  IArchPreset,
  IArchQuest,
  ISummoningFamiliar,
  IRelic,
  IPerk,
  IArmor,
  IEquipmentSlot,
  IEnemy,
  IEnemyMode,
  IPotion,
  IInventionPerkSlot,
  IGearPreset,
} from './playerinput.model';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { SearchableDropdownComponent } from '../searchable-dropdown/searchable-dropdown';
import { forkJoin, map } from 'rxjs';
import { PRAYERS, SPELLS, INVENTION_AUGMENTS, ARCH_QUESTS, ARCH_RELICS } from './playerinput.data';
import { RotationPersistenceService } from '../../services/rotation-persistence.service';
import { PlayerBuild } from '../../types/player-build.types';
import { RotationDpsService } from '../../services/rotation-dps.service';

@Component({
  selector: 'app-playerinput',
  templateUrl: './playerinput.html',
  styleUrls: ['./playerinput.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    SearchableDropdownComponent,
    StatsInputComponent,
    PotionsComponent,
    PrayersComponent,
    SpellsComponent,
    InventionComponent,
    ArchaeologyComponent,
    AbilityListComponent,
  ],
})
export class PlayerinputComponent implements OnInit {
  faPlus: IconDefinition = faPlus;
  faChevronDown: IconDefinition = faChevronDown;
  faSearch: IconDefinition = faSearch;
  faBolt: IconDefinition = faBolt;
  faBullseye: IconDefinition = faBullseye;
  faQuestionCircle: IconDefinition = faQuestionCircle;
  faTachometerAlt: IconDefinition = faTachometerAlt;
  faGavel: IconDefinition = faGavel;
  faCrosshairs: IconDefinition = faCrosshairs;
  faWandMagicSparkles: IconDefinition = faWandMagicSparkles;
  faTimes: IconDefinition = faTimes;
  faCheck: IconDefinition = faCheck;
  faTrash: IconDefinition = faTrash;
  faHelmetSafety: IconDefinition = faHelmetSafety;

  activeTab: ETabs = ETabs.STATS;
  eTabs = ETabs;
  tabs: ETabs[] = Object.values(ETabs);

  username: string = 'Z papp';
  playerStats!: PlayerStats;

  isArmorLoaded = false;
  equipmentSlots: IEquipmentSlot[] = [];
  allArmorPieces: IArmor[] = [];
  augmentableArmorPieces: IArmor[] = [];
  availableArmors: IArmor[] = [];

  inventionPerks: IInventionAugment[] = [];
  allPerkInstances: IPerk[] = [];
  isPerkModalOpen = false;
  activeInventionItem: IInventionAugment | null = null;
  isInventionModalOpen = false;
  selectedAugmentForModal: IInventionAugment | null = null;

  prayers: IPrayer[] = [];
  activePrayerBook: EPrayerBook = EPrayerBook.CURSES;
  activePrayerDmg: string = 'none';
  activePrayerOverhead: string = 'none';

  spells: ISpell[] = [];
  activeSpellBook: ESpellBook = ESpellBook.ANCIENT;
  activeSpells: string = 'none';

  activePotion: string = 'none';

  archQuests: IArchQuest[] = [];
  activeArchQuest: string = 'None';
  archRelics: IRelic[] = [];
  activeRelics: (IRelic | null)[] = [];
  archPresets: IArchPreset[] = [];
  activeArchPreset: IArchPreset | null = null;
  totalMonolithLimit: number = 0;
  currentMonolithEnergy: number = 0;
  isArchQuestDropdownOpen: boolean = false;
  isArchPresetDropdownOpen: boolean = false;
  isGearPresetDropdownOpen: boolean = false;
  gearPresets: IGearPreset[] = [];
  presetNameInput: string = '';
  presetPendingDeletion: string | null = null;

  activeFamiliar: string | null = null;

  private readonly ARCH_PRESETS_STORAGE_KEY = 'rs3-dps-calculator-arch-presets';
  private readonly INVENTION_AUGMENTS_STORAGE_KEY = 'rs3-dps-calculator-invention-augments';
  private readonly ACTIVE_TAB_STORAGE_KEY = 'rs3-dps-calculator-active-tab';

  playerBuilds: PlayerBuild[] = [];
  activeBuildId: string | null = null;


  constructor(
    private elementRef: ElementRef,
    private http: Wikiapi,
    private hiscoresService: HiscoresService,
    private httpClient: HttpClient,
    public playerDataService: PlayerDataService,
    private rotationPersistenceService: RotationPersistenceService,
    private rotationDpsService: RotationDpsService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}




  refreshBuilds() {
    const buildNames = this.rotationPersistenceService.getSavedBuilds();
    this.playerBuilds = buildNames.map(name => this.rotationPersistenceService.loadBuild(name)).filter((b): b is PlayerBuild => !!b);
  }

  getUniqueBuildName(): string {
      let counter = 1;
      while (true) {
          const name = `Build ${counter}`;
          if (!this.playerBuilds.some(b => b.name === name)) {
              return name;
          }
          counter++;
      }
  }

  createBuild() {
      const name = this.getUniqueBuildName();

      const emptyState = {
          equipment: [
            { name: 'head', selectedArmor: null, isDropdownOpen: false },
            { name: 'body', selectedArmor: null, isDropdownOpen: false },
            { name: 'legs', selectedArmor: null, isDropdownOpen: false },
            { name: 'gloves', selectedArmor: null, isDropdownOpen: false },
            { name: 'boots', selectedArmor: null, isDropdownOpen: false },
            { name: 'cape', selectedArmor: null, isDropdownOpen: false },
            { name: 'necklace', selectedArmor: null, isDropdownOpen: false },
            { name: 'ring', selectedArmor: null, isDropdownOpen: false },
            { name: 'ammo', selectedArmor: null, isDropdownOpen: false },
            { name: 'pocket', selectedArmor: null, isDropdownOpen: false },
            { name: 'mainhand', selectedArmor: null, isDropdownOpen: false },
            { name: 'offhand', selectedArmor: null, isDropdownOpen: false },
            { name: 'twohand', selectedArmor: null, isDropdownOpen: false },
          ],
          activePrayers: [],
          activePotion: 'none',
          activeFamiliar: null,
          weaponStyle: 'dual-wield' as const,
          inputSets: [],
          stats: this.stats, 
          boss: null
      };
      
      const newBuild: PlayerBuild = {
          id: crypto.randomUUID(),
          name: name,
          lastModified: Date.now(),
          rotation: [],
          playerState: emptyState
      };
      
      this.rotationPersistenceService.saveBuild(newBuild);
      this.refreshBuilds(); 
      
      const createdBuild = this.playerBuilds.find(b => b.id === newBuild.id);
      if (createdBuild) {
          this.selectBuild(createdBuild);
      }
  }

  selectBuild(build: PlayerBuild) {
      this.activeBuildId = build.id;
      this.playerDataService.restoreState(build.playerState);
      this.rotationDpsService.updateRotation(build.rotation);
  }
  
  buildPendingDeletionId: string | null = null;
  deletionTimeout: any = null;

  deleteBuild(build: PlayerBuild, event: Event) {
      event.preventDefault();
      event.stopPropagation();
      
      if (this.buildPendingDeletionId === build.id) {
          // Second right-click: confirm deletion
          this.rotationPersistenceService.deleteBuild(build.name);
          this.refreshBuilds();
          if (this.activeBuildId === build.id) this.activeBuildId = null;
          this.clearPendingDeletion();
      } else {
          // First right-click: set pending state
          this.clearPendingDeletion(); // Clear any other pending deletion
          this.buildPendingDeletionId = build.id;
          
          // Auto-clear pending state after 3 seconds
          this.deletionTimeout = setTimeout(() => {
              this.clearPendingDeletion();
          }, 3000);
      }
  }

  clearPendingDeletion() {
      this.buildPendingDeletionId = null;
      if (this.deletionTimeout) {
          clearTimeout(this.deletionTimeout);
          this.deletionTimeout = null;
      }
  }


  getBuildIcon(build: PlayerBuild): string {
    const helmetSlot = build.playerState.equipment.find(s => s.name === 'head');
    if (helmetSlot && helmetSlot.selectedArmor) {
        if (helmetSlot.selectedArmor.icon) {
             return helmetSlot.selectedArmor.icon; 
        }
        return this.playerDataService.getIconByName(helmetSlot.selectedArmor.name);
    }
    // Fallback to default helmet slot icon
    return this.playerDataService.getIconByName('head');
  }

  ngOnInit() {
    this.prayers = PRAYERS;
    this.spells = SPELLS;
    this.archQuests = ARCH_QUESTS;
    this.archRelics = ARCH_RELICS;

    if (isPlatformBrowser(this.platformId)) {
        this.refreshBuilds();
        this.loadAllArmor();
        this.loadAllPerks();
        this.loadEnemies();
    }
    this.playerDataService.updatePrayers(this.prayers);
    this.playerDataService.updateSpells(this.spells);

    if (isPlatformBrowser(this.platformId)) {
      const savedArchPresets = localStorage.getItem(this.ARCH_PRESETS_STORAGE_KEY);
      if (savedArchPresets) {
        this.archPresets = JSON.parse(savedArchPresets);
      }

      this.inventionPerks = JSON.parse(JSON.stringify(INVENTION_AUGMENTS));

      const savedAugmentsText = localStorage.getItem(this.INVENTION_AUGMENTS_STORAGE_KEY);
      if (savedAugmentsText) {
        const savedAugments: IInventionAugment[] = JSON.parse(savedAugmentsText);

        savedAugments.forEach((savedAugment) => {
          const index = this.inventionPerks.findIndex(
            (defaultAugment) => defaultAugment.name === savedAugment.name,
          );
          if (index !== -1) {
            this.inventionPerks[index] = savedAugment;
          } else {
            this.inventionPerks.push(savedAugment);
          }
        });
      }

      this.activeInventionItem = this.inventionPerks[0] || null;

      const savedActiveTab = localStorage.getItem(this.ACTIVE_TAB_STORAGE_KEY);
      if (savedActiveTab) {
        this.activeTab = JSON.parse(savedActiveTab);
      }
    } else {
      this.inventionPerks = INVENTION_AUGMENTS;
      this.activeInventionItem = this.inventionPerks[0];
    }

    this.playerDataService.activePrayers$.subscribe((prayers) => {
      if (prayers && prayers.length > 0) {
        const activeDmg = prayers.find(p => p.isActive && p.type === 'dmg');
        if (activeDmg) this.activePrayerDmg = activeDmg.name;
        
        const activeOverhead = prayers.find(p => p.isActive && p.type === 'overhead');
        if (activeOverhead) this.activePrayerOverhead = activeOverhead.name;
        
        this.calculateStats();

        if (this.activeBuildId) {
             const buildIndex = this.playerBuilds.findIndex(b => b.id === this.activeBuildId);
             if (buildIndex > -1) {
                 this.playerBuilds[buildIndex].playerState.activePrayers = JSON.parse(JSON.stringify(prayers));
                 this.playerBuilds[buildIndex].lastModified = Date.now();
                 this.rotationPersistenceService.saveBuild(this.playerBuilds[buildIndex]);
             }
        }
      }
    });

    this.playerDataService.gearPresets$.subscribe((presets) => {
      if (presets && presets.length > 0) {
        this.gearPresets = presets;
      }
    });

    this.playerDataService.equipmentSlots$.subscribe((slots) => {
      if (slots && slots.length > 0) {
        this.equipmentSlots = slots;
        
        if (this.activeBuildId) {
             const buildIndex = this.playerBuilds.findIndex(b => b.id === this.activeBuildId);
             if (buildIndex > -1) {
                 this.playerBuilds[buildIndex].playerState.equipment = JSON.parse(JSON.stringify(slots));
                 this.playerBuilds[buildIndex].lastModified = Date.now();
                 this.rotationPersistenceService.saveBuild(this.playerBuilds[buildIndex]);
             }
        }
      }
    });

    this.playerDataService.stats$.subscribe((stats) => {
      if (stats && stats.length > 0) {
        this.stats = stats;
        
        if (this.activeBuildId) {
             const buildIndex = this.playerBuilds.findIndex(b => b.id === this.activeBuildId);
             if (buildIndex > -1) {
                 this.playerBuilds[buildIndex].playerState.stats = JSON.parse(JSON.stringify(stats));
                 this.playerBuilds[buildIndex].lastModified = Date.now();
                 this.rotationPersistenceService.saveBuild(this.playerBuilds[buildIndex]);
             }
        }
      }
    });
    
    this.playerDataService.activePotion$.subscribe((potion) => {
        if (this.activeBuildId) {
             const buildIndex = this.playerBuilds.findIndex(b => b.id === this.activeBuildId);
             if (buildIndex > -1) {
                 this.playerBuilds[buildIndex].playerState.activePotion = potion;
                 this.playerBuilds[buildIndex].lastModified = Date.now();
                 this.rotationPersistenceService.saveBuild(this.playerBuilds[buildIndex]);
             }
        }
    });

    this.playerDataService.activeFamiliar$.subscribe((familiar) => {
        if (this.activeBuildId) {
             const buildIndex = this.playerBuilds.findIndex(b => b.id === this.activeBuildId);
             if (buildIndex > -1) {
                 this.playerBuilds[buildIndex].playerState.activeFamiliar = familiar;
                 this.playerBuilds[buildIndex].lastModified = Date.now();
                 this.rotationPersistenceService.saveBuild(this.playerBuilds[buildIndex]);
             }
        }
    });

    this.playerDataService.weaponStyle$.subscribe((style) => {
        if (this.activeBuildId) {
             const buildIndex = this.playerBuilds.findIndex(b => b.id === this.activeBuildId);
             if (buildIndex > -1) {
                 this.playerBuilds[buildIndex].playerState.weaponStyle = style;
                 this.playerBuilds[buildIndex].lastModified = Date.now();
                 this.rotationPersistenceService.saveBuild(this.playerBuilds[buildIndex]);
             }
        }
    });

    this.playerDataService.inputSets$.subscribe((sets) => {
        if (this.activeBuildId) {
             const buildIndex = this.playerBuilds.findIndex(b => b.id === this.activeBuildId);
             if (buildIndex > -1) {
                 this.playerBuilds[buildIndex].playerState.inputSets = JSON.parse(JSON.stringify(sets));
                 this.playerBuilds[buildIndex].lastModified = Date.now();
                 this.rotationPersistenceService.saveBuild(this.playerBuilds[buildIndex]);
             }
        }
    });

    this.playerDataService.boss$.subscribe((boss) => {
        if (this.activeBuildId) {
             const buildIndex = this.playerBuilds.findIndex(b => b.id === this.activeBuildId);
             if (buildIndex > -1) {
                 this.playerBuilds[buildIndex].playerState.boss = boss;
                 this.playerBuilds[buildIndex].lastModified = Date.now();
                 this.rotationPersistenceService.saveBuild(this.playerBuilds[buildIndex]);
             }
        }
    });

    this.playerDataService.weaponStyle$.subscribe((style) => {
      this.weaponStyleSetting = style;
    });

    this.playerDataService.activePotion$.subscribe((potion) => {
      this.activePotion = potion;
    });

    this.playerDataService.activePrayers$.subscribe((prayers) => {
      if (prayers && prayers.length > 0) {
        prayers.forEach((savedPrayer) => {
          if (savedPrayer.isActive) {
            const prayer = this.prayers.find((p) => p.name === savedPrayer.name);
            if (prayer) {
              if (prayer.type === 'dmg') {
                this.activePrayerDmg = prayer.name;
              } else if (prayer.type === 'overhead') {
                this.activePrayerOverhead = prayer.name;
              }
            }
          }
        });
      }
      this.calculateStats();
    });

    const defaultQuest = this.archQuests.find((q) => q.name === this.activeArchQuest);
    if (defaultQuest) {
      this.totalMonolithLimit = defaultQuest.limit;
      this.currentMonolithEnergy = this.totalMonolithLimit;
    }
  }

  lookupRsn(rsn: string) {
    if (!rsn) return;

    this.hiscoresService.getPlayerStats(rsn).subscribe((playerStats) => {
      if (playerStats) {
        this.stats.forEach((stat) => {
          const newLevel = playerStats[stat.name as keyof PlayerStats];
          if (newLevel) {
            stat.level = newLevel;
          }
        });
        this.playerDataService.updateStats(this.stats);
        this.calculateStats();
      } else {
        alert(`Could not find stats for player: ${rsn}`);
      }
    });
  }
  selectArchQuest(event: any) {}

  selectArchPreset(preset: IArchPreset) {
    this.activeRelics = preset.relics.map((relicName) => {
      return this.archRelics.find((r) => r.name === relicName) || null;
    });
    this.activeArchPreset = preset;
    this.isArchPresetDropdownOpen = false;
  }

  saveArchPreset(presetName: string) {
    if (!presetName) {
      alert('Please enter a name for the preset.');
      return;
    }

    const newPreset: IArchPreset = {
      name: presetName,
      relics: this.activeRelics.map((r) => (r ? r.name : null)),
    };

    const existingPresetIndex = this.archPresets.findIndex((p) => p.name === presetName);
    if (existingPresetIndex > -1) {
      this.archPresets[existingPresetIndex] = newPreset;
    } else {
      this.archPresets.push(newPreset);
    }

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.ARCH_PRESETS_STORAGE_KEY, JSON.stringify(this.archPresets));
    }
  }

  deleteArchPreset(presetName: string) {
    if (confirm(`Are you sure you want to delete the preset "${presetName}"?`)) {
      this.archPresets = this.archPresets.filter((p) => p.name !== presetName);
      if (this.activeArchPreset?.name === presetName) {
        this.activeArchPreset = null;
      }
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(this.ARCH_PRESETS_STORAGE_KEY, JSON.stringify(this.archPresets));
      }
    }
  }

  selectRelic(event: any) {}
  clearRelic() {}

  loadAllPerks() {
    this.httpClient.get<IPerk[]>('assets/data/perks.json').subscribe((perkDefs: IPerk[]) => {
      const allInstances: IPerk[] = [];

      perkDefs.forEach((def) => {
        if (def.maxRank && def.maxRank > 1) {
          for (let i = 1; i <= def.maxRank; i++) {
            allInstances.push({
              name: `${def.name} ${i}`,
              baseName: def.name,
              rank: i,
              slotsConsumed: def.slotsConsumed,
              type: def.type,
            });
          }
        } else {
          allInstances.push({
            name: def.name,
            baseName: def.name,
            rank: 1,
            slotsConsumed: def.slotsConsumed,
            type: def.type,
          });
        }
      });

      this.allPerkInstances = allInstances;

      this.inventionPerks.forEach((augment: IInventionAugment) => {
        augment.perkSlots.forEach((slot: IInventionPerkSlot) => {
          slot.options = this.allPerkInstances;
          if (!slot.selectedPerk) {
            slot.selectedPerk = this.allPerkInstances.find((p) => p.name === 'None') || null;
          }
        });
      });
    });
  }

  loadEnemies() {
    this.httpClient
      .get<IEnemy[]>('assets/data/custom-enemies.json')
      .subscribe((enemies: IEnemy[]) => {
        this.allEnemies = enemies;
        if (this.allEnemies.length > 0) {
          this.selectedEnemy = this.allEnemies[0];
          this.onEnemyChange();
        }
      });
  }

  loadAllArmor() {
    const equipmentFileMap: { [key: string]: string } = {
      pocket: 'pocket',
      cape: 'cape',
      necklace: 'necklace',
      ammo: 'ammo',
      ring: 'ring',
      head: 'head',
      body: 'body',
      legs: 'legs',
      gloves: 'gloves',
      boots: 'boots',
      'weapons/mainhand': 'mainhand',
      'weapons/offhand': 'offhand',
      'weapons/twohand': 'twohand',
    };
    const equipmentFiles = Object.keys(equipmentFileMap);

    const requests = equipmentFiles.map((file) =>
      this.httpClient.get<IArmor[]>(`assets/data/equipment/${file}.json`).pipe(
        map((armors) => {
          const armorType = equipmentFileMap[file];
          return armors.map((armor) => ({ ...armor, type: armorType }));
        }),
      ),
    );

    forkJoin(requests)
      .pipe(
        map((allArmorArrays) => {
          const allArmor = allArmorArrays.reduce((acc, val) => acc.concat(val), []);
          allArmor.forEach((armor) => {
            armor.icon = armor.icon || this.playerDataService.getIconByName(armor.name);
          });
          return allArmor;
        }),
      )
      .subscribe((allArmor) => {
        allArmor.forEach((armor) => {
          if (['mainhand', 'offhand', 'twohand', 'body', 'legs'].includes(armor.type)) {
            if (armor.augmentable === undefined) {
              armor.augmentable = true;
            }
          }
        });

        this.allArmorPieces = [...allArmor];
        this.availableArmors = this.allArmorPieces;
        this.augmentableArmorPieces = this.allArmorPieces.filter((armor) => armor.augmentable);
        this.isArmorLoaded = true;
      });
  }

  equipmentSearchQuery: string = '';
  isSearchDropdownOpen: boolean = false;

  openSearchDropdown(): void {
    this.isSearchDropdownOpen = true;
    this.filterAllArmor();
  }

  closeSearchDropdown(): void {
    this.isSearchDropdownOpen = false;
    this.equipmentSearchQuery = '';
    this.filterAllArmor();
  }

  clearSearch(): void {
    this.equipmentSearchQuery = '';
    this.filterAllArmor();
  }

  filterAllArmor(): void {
    if (this.equipmentSearchQuery) {
      this.availableArmors = this.allArmorPieces.filter((armor) =>
        armor.name.toLowerCase().includes(this.equipmentSearchQuery.toLowerCase()),
      );
    } else {
      this.availableArmors = this.allArmorPieces;
    }
  }

  selectSearchedArmor(armor: IArmor): void {
    const slot = this.equipmentSlots.find((s) => s.name === armor.type);
    if (slot) {
      if (
        (slot.name === 'mainhand' || slot.name === 'offhand') &&
        this.weaponStyleSetting === '2h'
      ) {
        this.setWeaponStyle('dual-wield');
      } else if (slot.name === 'twohand' && this.weaponStyleSetting === 'dual-wield') {
        this.setWeaponStyle('2h');
      }
      slot.selectedArmor = armor;
      this.calculateStats();
      this.playerDataService.updateEquipment(this.equipmentSlots);
    }
  }

  onSlotClick(slot: IEquipmentSlot): void {
    if (slot.name === 'twohand') {
      if (this.weaponStyleSetting === 'dual-wield') {
        this.setWeaponStyle('2h');
      } else {
        this.clearEquipmentSlot(slot);
      }
    } else if (slot.name === 'mainhand' || slot.name === 'offhand') {
      if (this.weaponStyleSetting === '2h') {
        this.setWeaponStyle('dual-wield');
      } else {
        this.clearEquipmentSlot(slot);
      }
    } else {
      this.clearEquipmentSlot(slot);
    }
    this.playerDataService.updateEquipment(this.equipmentSlots);
  }

  clearEquipmentSlot(slot: IEquipmentSlot): void {
    if (slot.selectedArmor) {
      slot.selectedArmor = null;
      this.calculateStats();
      this.playerDataService.updateEquipment(this.equipmentSlots);
    }
  }

  weaponStyleSetting: 'dual-wield' | '2h' = 'dual-wield';

  setWeaponStyle(style: 'dual-wield' | '2h'): void {
    this.weaponStyleSetting = style;
    this.playerDataService.updateWeaponStyle(style);
    this.calculateStats();
  }

  accuracy: number = 0;
  abilityDamage: number = 0;
  displayedDamage: number = 0;
  weaponDamage: number = 0;
  skillBonus: number = 0;
  gearDamageBonus: number = 0;
  weaponType: string = '';
  weaponStyle: string = '';
  weaponSpeed: string = '';
  abilityDamageMin: number = 0;
  abilityDamageMax: number = 0;

  allEnemies: IEnemy[] = [];
  selectedEnemy: IEnemy | null = null;
  selectedEnemyMode: IEnemyMode | null = null;
  hitChance: number = 0;

  public onEnemyChange(): void {
    if (this.selectedEnemy && this.selectedEnemy.phases && this.selectedEnemy.phases.length > 0) {
      const currentModeIsForSelectedEnemy = this.selectedEnemy.phases.some(
        (p) => p.name === this.selectedEnemyMode?.name,
      );
      if (!this.selectedEnemyMode || !currentModeIsForSelectedEnemy) {
        this.selectedEnemyMode = this.selectedEnemy.phases[0];
      }
    } else {
      this.selectedEnemyMode = null;
    }
    this.calculateStats();
  }

  strengthMultiplier: number = 1;
  twoHandedMultiplier: number = 1;
  weaponSpeedMultiplier: number = 1;

  styleIconMap: { [key: string]: string } = {
    stab: 'https://runescape.wiki/images/Stab_weakness_icon.png',
    slash: 'https://runescape.wiki/images/Slash_weakness_icon.png',
    crush: 'https://runescape.wiki/images/Crush_weakness_icon.png',
    arrows: 'https://runescape.wiki/images/Arrow_weakness_icon.png',
    bolts: 'https://runescape.wiki/images/Bolt_weakness_icon.png',
    thrown: 'https://runescape.wiki/images/Thrown_weakness_icon.png',
  };

  getStyleIcon(style: string): string {
    if (!style) return '';
    const styleKey = style.toLowerCase().replace('ing', '');
    return this.styleIconMap[styleKey] || '';
  }

  isAutoScrollEnabled: boolean = false;
  scrollRate: number = 5;
  summoningFamiliars: ISummoningFamiliar[] = [
    { name: 'Blood Nihil', icon: 'bloodnihil', specialAttackCost: 6 },
    { name: 'Shadow Nihil', icon: 'shadownihil', specialAttackCost: 6 },
    { name: 'Smoke Nihil', icon: 'smokenihil', specialAttackCost: 6 },
    { name: 'Ice Nihil', icon: 'icenihil', specialAttackCost: 6 },
    { name: 'Pack Yak', icon: 'bob', specialAttackCost: 6 },
    { name: 'Hellhound', icon: 'tank', specialAttackCost: 0 },
    { name: 'Blood Reaver', icon: 'bloodreaver', specialAttackCost: 3 },
    { name: "Kal'gerion Demon", icon: 'critdemon', specialAttackCost: 6 },
    { name: 'Ripper Demon', icon: 'ripperdemon', specialAttackCost: 12 },
    { name: 'Steel Titan', icon: 'steeltitan', specialAttackCost: 12 },
  ];

  selectPrayer(prayer: IPrayer) {
    if (prayer.type === 'dmg') {
      this.activePrayerDmg = this.activePrayerDmg === prayer.name ? 'none' : prayer.name;
    } else if (prayer.type === 'overhead') {
      this.activePrayerOverhead = this.activePrayerOverhead === prayer.name ? 'none' : prayer.name;
    }
    this.calculateStats();
    this.updateActivePrayers();
  }

  private updateActivePrayers() {
    const activePrayers: IActivePrayer[] = this.prayers.map((p) => {
      const isActive =
        p.type === 'dmg' ? this.activePrayerDmg === p.name : this.activePrayerOverhead === p.name;
      return {
        ...p,
        isActive: isActive,
        boost: p.damageBoost,
      };
    });
    this.playerDataService.updateActivePrayers(activePrayers);
  }

  selectTab(tabName: ETabs): void {
    this.activeTab = tabName;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.ACTIVE_TAB_STORAGE_KEY, JSON.stringify(tabName));
    }
  }

  selectInventionItem(item: IInventionAugment) {
    this.activeInventionItem = item;
  }

  selectPotion(potion: string): void {
    this.activePotion = this.activePotion === potion ? 'none' : potion;
    this.playerDataService.updateActivePotion(this.activePotion);
    this.calculateStats();
  }

  getInventionItemIcon(augment: IInventionAugment): string {
    const slotNameMap: { [key: string]: string } = {
      'Mainhand Weapon': 'mainhand',
      'Offhand Weapon': 'offhand',
      'Body Armour': 'body',
      'Leg Armour': 'legs',
      'Two-Handed Weapon': 'twohand',
    };

    const slotName = slotNameMap[augment.name];

    if (slotName) {
      if (slotName === 'twohand') {
        const twoHandSlot = this.equipmentSlots.find((s) => s.name === 'twohand');
        if (twoHandSlot && twoHandSlot.selectedArmor) {
          return twoHandSlot.selectedArmor.icon || twoHandSlot.selectedArmor.name;
        }
        return 'mainhand';
      }

      const slot = this.equipmentSlots.find((s) => s.name === slotName);
      if (slot && slot.selectedArmor) {
        return slot.selectedArmor.icon || slot.selectedArmor.name;
      }
      
      if (slotName === 'body') {
        return 'body';
      }
      
      return augment.icon || '';
    }

    return augment.icon || '';
  }

  stats = [
    { name: 'attack', level: 99, maxLevel: 99, iconName: 'attack' },
    { name: 'constitution', level: 99, maxLevel: 99, iconName: 'constitution' },
    { name: 'ranged', level: 99, maxLevel: 99, iconName: 'ranged' },
    { name: 'strength', level: 99, maxLevel: 99, iconName: 'strength' },
    { name: 'necromancy', level: 120, maxLevel: 120, iconName: 'necromancy' },
    { name: 'magic', level: 99, maxLevel: 99, iconName: 'magic' },
    { name: 'defence', level: 99, maxLevel: 99, iconName: 'defence' },
    { name: 'prayer', level: 99, maxLevel: 99, iconName: 'prayer' },
    { name: 'summoning', level: 99, maxLevel: 99, iconName: 'summoning' },
    { name: 'herblore', level: 120, maxLevel: 120, iconName: 'herblore' },
    { name: 'invention', level: 120, maxLevel: 120, iconName: 'invention' },
    { name: 'archaeology', level: 120, maxLevel: 120, iconName: 'archaeology' },
  ];

  potions: IPotion[] = [
    { name: 'standard', minLevel: 1, staticBonus: 1, scalingBonus: 0.08 },
    { name: 'super', minLevel: 45, staticBonus: 2, scalingBonus: 0.12 },
    { name: 'grand', minLevel: 75, staticBonus: 2, scalingBonus: 0.14 },
    { name: 'extreme', minLevel: 88, staticBonus: 3, scalingBonus: 0.15 },
    { name: 'overload', minLevel: 96, staticBonus: 3, scalingBonus: 0.15 },
    { name: 'supreme_attack', minLevel: 93, staticBonus: 4, scalingBonus: 0.16 },
    { name: 'supreme_overload', minLevel: 98, staticBonus: 4, scalingBonus: 0.16 },
    { name: 'elder_overload', minLevel: 106, staticBonus: 5, scalingBonus: 0.17 },
  ];

  get herbloreLevel(): number {
    const herbloreStat = this.stats.find((stat) => stat.name === 'herblore');
    return herbloreStat ? herbloreStat.level : 0;
  }

  onStatLevelChange(event: { stat: any; newValue: number }) {
    const { stat, newValue } = event;
    const statToUpdate = this.stats.find((s) => s.name === stat.name);
    if (statToUpdate) {
      statToUpdate.level = newValue;
      this.playerDataService.updateStats(this.stats);
      this.calculateStats();
    }
  }

  onPrayerBookChange(prayerBook: EPrayerBook): void {
    this.activePrayerBook = prayerBook;
    const prayersForBook = this.prayers.filter((p) => p.prayerBook === prayerBook);
    if (!prayersForBook.find((p) => p.name === this.activePrayerDmg)) {
      this.activePrayerDmg = 'none';
    }
    if (!prayersForBook.find((p) => p.name === this.activePrayerOverhead)) {
      this.activePrayerOverhead = 'none';
    }
    this.updateActivePrayers();
  }

  onSpellBookChange(spellBook: ESpellBook): void {
    this.activeSpellBook = spellBook;
    const spellsForBook = this.spells.filter((s) => s.spellBook === spellBook);
    if (!spellsForBook.find((s) => s.name === this.activeSpells)) {
      this.activeSpells = 'none';
    }
  }

  onSelectSpell(spell: string): void {
    this.activeSpells = this.activeSpells === spell ? 'none' : spell;
  }

  selectFamiliar(familiar: ISummoningFamiliar): void {
    this.activeFamiliar = this.activeFamiliar === familiar.icon ? null : familiar.icon;
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

  isAddItemModalOpen = false;

  openAddItemModal(): void {
    if (!this.isArmorLoaded) return;
    this.isAddItemModalOpen = true;
  }

  closeAddItemModal(): void {
    this.isAddItemModalOpen = false;
  }

  addInventionItem(item: IArmor): void {
    if (this.inventionPerks.some((p) => p.name === item.name)) {
      alert(`'${item.name}' is already in your invention list.`);
      return;
    }

    const newItem: IInventionAugment = {
      name: item.name,
      icon: item.icon || '',
      perkSlots: [
        {
          name: 'Perk 1',
          selectedPerk: null,
          options: this.allPerkInstances,
          occupiedByAdjacent: false,
        },
        {
          name: 'Perk 2',
          selectedPerk: null,
          options: this.allPerkInstances,
          occupiedByAdjacent: false,
        },
      ],
      longPartOptions: [],
      activeLongPart: 'None',
      isCustom: true,
    };

    this.inventionPerks.push(newItem);
    this.allArmorPieces.push(item);
    this.activeInventionItem = newItem;
    this.saveInventionAugments();
  }

  removeInventionItem(itemToRemove: IInventionAugment): void {
    this.inventionPerks = this.inventionPerks.filter((item) => item !== itemToRemove);
    if (this.activeInventionItem === itemToRemove) {
      this.activeInventionItem = this.inventionPerks[0] || null;
    }
    this.saveInventionAugments();
  }

  saveInventionAugments(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(
        this.INVENTION_AUGMENTS_STORAGE_KEY,
        JSON.stringify(this.inventionPerks),
      );
    }
  }

  loadInventionAugments(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedAugments = localStorage.getItem(this.INVENTION_AUGMENTS_STORAGE_KEY);
      if (savedAugments) {
        const customAugments: IInventionAugment[] = JSON.parse(savedAugments);
        this.inventionPerks.push(...customAugments);
      }
    }
  }

  saveGearPreset(presetName: string) {
    if (!presetName) {
      alert('Please enter a name for the preset.');
      return;
    }

    const newPreset: IGearPreset = {
      name: presetName,
      equipment: JSON.parse(JSON.stringify(this.equipmentSlots)), // Deep copy
    };

    const existingPresetIndex = this.gearPresets.findIndex((p) => p.name === presetName);
    if (existingPresetIndex > -1) {
      if (confirm(`Preset "${presetName}" already exists. Overwrite?`)) {
        this.gearPresets[existingPresetIndex] = newPreset;
      } else {
        return;
      }
    } else {
      this.gearPresets.push(newPreset);
    }

    this.playerDataService.updateGearPresets(this.gearPresets);
    this.isGearPresetDropdownOpen = false;
  }

  trackByPresetName(index: number, preset: IGearPreset): string {
    return preset.name;
  }

  requestDeletePreset(presetName: string, event: Event) {
    event.stopPropagation();
    this.presetPendingDeletion = presetName;
  }

  cancelDeletePreset(event: Event) {
    event.stopPropagation();
    this.presetPendingDeletion = null;
  }

  confirmDeletePreset(presetName: string, event: Event) {
    event.stopPropagation();
    // Ensure new reference and filter
    const newPresets = this.gearPresets.filter((p) => p.name !== presetName);
    this.gearPresets = [...newPresets];
    this.playerDataService.updateGearPresets(this.gearPresets);
    this.presetPendingDeletion = null;
  }

  getPresetIcons(preset: IGearPreset): string[] {
    const importantSlots = ['helmet', 'body', 'legs', 'mainhand', 'offhand', 'twohand'];
    const icons: string[] = [];

    importantSlots.forEach(slotName => {
        const slot = preset.equipment.find(s => s.name === slotName);
        if (slot && slot.selectedArmor && slot.selectedArmor.icon) {
            icons.push(slot.selectedArmor.icon);
        } else if (slot && slot.selectedArmor && slot.selectedArmor.name) {
             // Fallback if icon is missing but name exists, try to get it
             const icon = this.playerDataService.getIconByName(slot.selectedArmor.name);
             if (icon) icons.push(icon);
        }
    });

    return icons.slice(0, 5); // Limit to 5 icons
  }

  loadGearPreset(preset: IGearPreset) {
    // Deep copy to avoid reference issues
    this.equipmentSlots = JSON.parse(JSON.stringify(preset.equipment));
    
    // Re-link references if needed (e.g. icons might need refreshing if not stored fully)
    // But for now, we assume IArmor is fully stored.
    
    this.playerDataService.updateEquipment(this.equipmentSlots);
    this.calculateStats();
    this.isGearPresetDropdownOpen = false;
  }

  private calculateLevelBonus(level: number): number {
    if (level < 1) {
      return 0;
    }
    const RAW_BONUS = Math.pow(level, 3) / 1250 + 4 * level + 40;
    return Math.floor(RAW_BONUS);
  }

  public calculateStats(): void {
    this.accuracy = 0;
    this.abilityDamage = 0;
    this.weaponDamage = 0;
    this.skillBonus = 0;
    this.gearDamageBonus = 0;
    this.strengthMultiplier = 1;
    this.twoHandedMultiplier = 1;
    this.weaponSpeedMultiplier = 1;
    this.weaponType = '';
    this.weaponStyle = '';
    this.weaponSpeed = '';
    this.hitChance = 0;
    this.abilityDamageMin = 0;
    this.abilityDamageMax = 0;

    const mainhandSlot = this.equipmentSlots.find((s) => s.name === 'mainhand');
    const mainhand = mainhandSlot ? mainhandSlot.selectedArmor : null;
    const offhandSlot = this.equipmentSlots.find((s) => s.name === 'offhand');
    const offhand = offhandSlot ? offhandSlot.selectedArmor : null;
    const twohandSlot = this.equipmentSlots.find((s) => s.name === 'twohand');
    const twohand = twohandSlot ? twohandSlot.selectedArmor : null;
    const auraSlot = this.equipmentSlots.find((s) => s.name === 'aura');
    const aura = auraSlot ? auraSlot.selectedArmor : null;

    let weapon: IArmor | null = null;
    let weaponClass: 'melee' | 'ranged' | 'magic' | 'necromancy' = 'melee';

    if (this.weaponStyleSetting === '2h') {
      weapon = twohand;
    } else {
      weapon = mainhand;
    }

    if (weapon && weapon.class_type) {
      weaponClass = weapon.class_type.toLowerCase() as 'melee' | 'ranged' | 'magic' | 'necromancy';
      this.weaponType = weapon.class_type || 'Melee';
      this.weaponStyle = weapon.style || '';
      this.weaponSpeed = weapon.attack_speed ? String(weapon.attack_speed) : '';
    }

    const boostedStats: { [key: string]: number } = {};
    const activePotion = this.potions.find((p) => p.name === this.activePotion);

    this.stats.forEach((stat) => {
      const baseLevel = stat.level;
      let boostedLevel = baseLevel;

      if (aura) {
        if (
          aura.name.toLowerCase() === 'berserker' &&
          (stat.name === 'attack' || stat.name === 'strength')
        ) {
          boostedLevel = Math.floor(boostedLevel * 1.1);
        } else if (aura.name.toLowerCase() === 'reckless' && stat.name === 'ranged') {
          boostedLevel = Math.floor(boostedLevel * 1.1);
        } else if (aura.name.toLowerCase() === 'maniacal' && stat.name === 'magic') {
          boostedLevel = Math.floor(boostedLevel * 1.1);
        }
      }

      let potionLevelBoost = 0;
      if (activePotion) {
        if (this.activePotion.includes('overload')) {
          if (
            ['attack', 'strength', 'ranged', 'magic', 'defence', 'necromancy'].includes(stat.name)
          ) {
            potionLevelBoost = Math.floor(
              activePotion.staticBonus + baseLevel * activePotion.scalingBonus,
            );
          }
        } else {
          const styleToSkill: { [key: string]: string } = {
            melee: 'attack',
            strength: 'strength',
            ranged: 'ranged',
            magic: 'magic',
            necromancy: 'necromancy',
          };
          if (
            styleToSkill[weaponClass] === stat.name ||
            (weaponClass === 'melee' && stat.name === 'strength')
          ) {
            potionLevelBoost = Math.floor(
              activePotion.staticBonus + baseLevel * activePotion.scalingBonus,
            );
          }
        }
      }

      boostedStats[stat.name] = boostedLevel + potionLevelBoost;
    });

    const styleToSkill: { [key: string]: string } = {
      melee: 'attack',
      ranged: 'ranged',
      magic: 'magic',
      necromancy: 'necromancy',
    };
    const accuracySkillName = styleToSkill[weaponClass];
    const accuracyLevel = boostedStats[accuracySkillName];

    const skillAccuracy = this.calculateLevelBonus(accuracyLevel);
    const weaponAccuracy = weapon ? weapon.accuracy || 0 : 0;

    let totalAccuracy = skillAccuracy + weaponAccuracy;

    const activePrayerForAccuracy = this.prayers.find((p) => p.name === this.activePrayerDmg);
    if (
      activePrayerForAccuracy &&
      (activePrayerForAccuracy.style === weaponClass || activePrayerForAccuracy.style === 'all')
    ) {
      totalAccuracy *= 1 + activePrayerForAccuracy.accuracyBoost;
    }

    this.accuracy = Math.floor(totalAccuracy);

    const styleToDamageSkill: { [key: string]: string } = {
      melee: 'strength',
      ranged: 'ranged',
      magic: 'magic',
      necromancy: 'necromancy',
    };
    const damageSkillName = styleToDamageSkill[weaponClass];
    const damageLevel = boostedStats[damageSkillName];

    const activePrayer = this.prayers.find((p) => p.name === this.activePrayerDmg);
    let prayerDamageMultiplier = 1;
    if (activePrayer && (activePrayer.style === weaponClass || activePrayer.style === 'all')) {
      prayerDamageMultiplier = 1 + activePrayer.damageBoost;
    }

    let finalAbilityDamage = 0;

    if (!weapon) {
      finalAbilityDamage = damageLevel * 2.5;
    } else {
      let bonusFromOtherGear = 0;
      this.equipmentSlots.forEach((slot) => {
        if (slot.selectedArmor && !['mainhand', 'offhand', 'twohand'].includes(slot.name)) {
          const armor = slot.selectedArmor;
          if (armor.damage_bonus) {
            switch (weaponClass) {
              case 'melee':
                bonusFromOtherGear += armor.damage_bonus.melee || 0;
                break;
              case 'ranged':
                bonusFromOtherGear += armor.damage_bonus.ranged || 0;
                break;
              case 'magic':
                bonusFromOtherGear += armor.damage_bonus.magic || 0;
                break;
              case 'necromancy':
                bonusFromOtherGear += armor.damage_bonus.necromancy || 0;
                break;
            }
          }
        }
      });

      if (weaponClass === 'melee') {
        if (this.weaponStyleSetting === '2h') {
          const TIER = weapon.tier || weapon.level_requirement || 0;
          const stat_comp1 = Math.floor(2.5 * damageLevel);
          const stat_comp2 = Math.floor(1.25 * damageLevel);
          const gear_comp1 = Math.floor(9.6 * Math.min(TIER, damageLevel) + bonusFromOtherGear);
          const gear_comp2 = Math.floor(4.8 * TIER + 0.5 * bonusFromOtherGear);
          finalAbilityDamage = stat_comp1 + stat_comp2 + gear_comp1 + gear_comp2;
        } else if (this.weaponStyleSetting === 'dual-wield') {
          let ad_mh = 0;
          if (mainhand) {
            const stat_comp_mh = Math.floor(2.5 * damageLevel);
            const gear_comp_mh = Math.floor((mainhand.ability_damage || 0) + bonusFromOtherGear);
            ad_mh = stat_comp_mh + gear_comp_mh;
          }
          let ad_oh = 0;
          if (offhand) {
            const stat_comp_oh_mh_equivalent =
              Math.floor(2.5 * damageLevel) +
              Math.floor((offhand.ability_damage || 0) * 2 + bonusFromOtherGear);
            ad_oh = Math.floor(0.5 * stat_comp_oh_mh_equivalent);
          }
          finalAbilityDamage = ad_mh + ad_oh;
        }
      }
    }

    this.abilityDamage = Math.floor(finalAbilityDamage * prayerDamageMultiplier);
    this.displayedDamage = this.abilityDamage;

    if (!this.selectedEnemy) {
      this.hitChance = 0;
    } else {
      const activeMode = this.selectedEnemyMode || this.selectedEnemy;
      const targetArmour = activeMode.armor ?? this.selectedEnemy.armor ?? 0;
      const targetDefenceLevel = activeMode.defenceLevel ?? this.selectedEnemy.defenceLevel ?? 0;
      const armourBonus = this.calculateLevelBonus(targetDefenceLevel);
      const finalArmour = Math.floor(targetArmour + armourBonus);

      let effectiveBossAffinity = 55;
      if (activeMode.affinity) {
        const playerAttackTypeForAffinity: 'melee' | 'ranged' | 'magic' | 'necromancy' =
          weaponClass === 'melee'
            ? 'melee'
            : weaponClass === 'ranged'
              ? 'ranged'
              : weaponClass === 'magic'
                ? 'magic'
                : 'necromancy';

        effectiveBossAffinity =
          activeMode.affinity[playerAttackTypeForAffinity] ?? activeMode.affinity.hybrid ?? 55;
      }

      if (finalArmour > 0) {
        const hitChanceRaw = (effectiveBossAffinity / 100) * (this.accuracy / finalArmour);
        this.hitChance = Math.min(100, Math.max(0, hitChanceRaw * 100));
      } else {
        this.hitChance = 100;
      }
    }

    this.playerDataService.updateCalculatedStats({
      accuracy: this.accuracy,
      hitChance: this.hitChance,
    });
    this.playerDataService.updateAbilityDamage(this.abilityDamage);
  }

  toggleAutoScroll(): void {
    this.isAutoScrollEnabled = !this.isAutoScrollEnabled;
  }

  closePerkModal() {
    this.isPerkModalOpen = false;
  }

  @ViewChild('prayerDropdown') prayerDropdown!: ElementRef;
  @ViewChild('spellDropdown') spellDropdown!: ElementRef;
  @ViewChild('archQuestDropdown') archQuestDropdown!: ElementRef;
  @ViewChild('archPresetDropdown') archPresetDropdown!: ElementRef;
  @ViewChild('equipmentSearchDropdown') equipmentSearchDropdown!: ElementRef;
  @ViewChild('gearPresetDropdown') gearPresetDropdown!: ElementRef;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    if (
      this.isArchQuestDropdownOpen &&
      this.archQuestDropdown &&
      !this.archQuestDropdown.nativeElement.contains(target)
    ) {
      this.isArchQuestDropdownOpen = false;
    }
    if (
      this.isArchPresetDropdownOpen &&
      this.archPresetDropdown &&
      !this.archPresetDropdown.nativeElement.contains(target)
    ) {
      this.isArchPresetDropdownOpen = false;
    }
    if (
      this.isGearPresetDropdownOpen &&
      this.gearPresetDropdown &&
      !this.gearPresetDropdown.nativeElement.contains(target)
    ) {
      this.isGearPresetDropdownOpen = false;
    }
    if (
      this.isSearchDropdownOpen &&
      this.equipmentSearchDropdown &&
      !this.equipmentSearchDropdown.nativeElement.contains(target)
    ) {
      this.closeSearchDropdown();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event) {
    if (this.isInventionModalOpen) {
      this.closeInventionModal();
    }
    if (this.isPerkModalOpen) {
      this.closePerkModal();
    }
    if (this.isSearchDropdownOpen) {
      this.closeSearchDropdown();
    }
    this.isArchQuestDropdownOpen = false;
    this.isArchPresetDropdownOpen = false;
    this.equipmentSlots.forEach((slot: IEquipmentSlot) => {
      slot.isDropdownOpen = false;
    });
  }
}
