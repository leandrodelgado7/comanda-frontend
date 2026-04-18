import { Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';

type ProductLayoutMode = 'grid' | 'list';
type ProductSortMode = 'ranking' | 'name-asc' | 'name-desc' | 'category-asc' | 'category-desc';
const SELECTION_CONTROLS_ANIMATION_MS = 420;
const SELECTION_CONTROLS_REVEAL_DELAY_MS = 120;

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss'
})
export class TopBarComponent implements OnInit, OnChanges, OnDestroy {

  readonly sortOptions: Array<{ value: ProductSortMode; label: string }> = [
    { value: 'ranking', label: 'Más pedidos' },
    { value: 'name-asc', label: 'Alfabético ascendente' },
    { value: 'name-desc', label: 'Alfabético descendente' },
    { value: 'category-asc', label: 'Categoría ascendente' },
    { value: 'category-desc', label: 'Categoría descendente' }
  ];
  categoryOptions: string[] = [];

  @Input() isVoiceMode = false;
  @Input() isBarcodeMode = false;
  @Input() layoutMode: ProductLayoutMode = 'grid';
  @Input() sortMode: ProductSortMode = 'ranking';
  @Output() searchChange = new EventEmitter<string>();
  @Output() categoriesChange = new EventEmitter<string[]>();
  @Output() sortModeChange = new EventEmitter<ProductSortMode>();
  @Output() layoutButtonPress = new EventEmitter<void>();
  @Output() selectionModeSelect = new EventEmitter<void>();
  @Output() voiceModeSelect = new EventEmitter<void>();
  @Output() barcodeModeSelect = new EventEmitter<void>();
  @Output() unregisteredItemRequest = new EventEmitter<void>();
  searchTerm = '';
  isCategoryDropdownOpen = false;
  isSortDropdownOpen = false;
  isSortPinned = false;
  isCompactSearchOpen = false;
  renderSelectionControls = true;
  areSelectionControlsVisible = true;
  selectedCategories = new Set<string>();
  private isSelectionModeActive = true;
  private hideSelectionControlsTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private showSelectionControlsTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly productService: ProductService) {}

  ngOnInit(): void {
    this.syncSelectionControls(true);
    this.productService
      .getCategories()
      .pipe(take(1))
      .subscribe((categories) => {
        this.categoryOptions = categories;
      });
  }

  ngOnChanges(_: SimpleChanges): void {
    this.syncSelectionControls(false);
  }

  ngOnDestroy(): void {
    if (this.hideSelectionControlsTimeoutId) {
      clearTimeout(this.hideSelectionControlsTimeoutId);
      this.hideSelectionControlsTimeoutId = null;
    }

    if (this.showSelectionControlsTimeoutId) {
      clearTimeout(this.showSelectionControlsTimeoutId);
      this.showSelectionControlsTimeoutId = null;
    }
  }

  get isSelectionMode(): boolean {
    return !this.isVoiceMode && !this.isBarcodeMode;
  }

  onSearchTermChange(): void {
    this.searchChange.emit(this.searchTerm);
  }

  clearSearchTerm(): void {
    if (!this.searchTerm) {
      return;
    }

    this.searchTerm = '';
    this.searchChange.emit(this.searchTerm);
  }

  openCompactSearchBar(): void {
    if (!this.isSelectionMode) {
      return;
    }

    this.isCompactSearchOpen = true;
    this.isCategoryDropdownOpen = false;
    this.isSortDropdownOpen = false;
  }

  closeCompactSearchBar(): void {
    this.isCompactSearchOpen = false;
    this.clearSearchTerm();
  }

  toggleCategoryDropdown(event: MouseEvent): void {
    if (!this.isSelectionMode) {
      return;
    }

    event.stopPropagation();
    this.isSortDropdownOpen = false;
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  toggleSortDropdown(event: MouseEvent): void {
    if (!this.isSelectionMode) {
      return;
    }

    event.stopPropagation();
    this.isCategoryDropdownOpen = false;
    this.isSortDropdownOpen = !this.isSortDropdownOpen;
  }

  onSortModeSelect(mode: ProductSortMode): void {
    this.sortMode = mode;
    this.isSortPinned = true;
    this.isSortDropdownOpen = false;
    this.sortModeChange.emit(mode);
  }

  isSortOptionSelected(mode: ProductSortMode): boolean {
    return this.sortMode === mode;
  }

  onCategoryToggle(category: string): void {
    if (this.selectedCategories.has(category)) {
      this.selectedCategories.delete(category);
    } else {
      this.selectedCategories.add(category);
    }

    this.categoriesChange.emit(Array.from(this.selectedCategories));
  }

  clearCategoryFilters(event: MouseEvent): void {
    event.stopPropagation();

    if (this.selectedCategories.size === 0) {
      return;
    }

    this.selectedCategories.clear();
    this.categoriesChange.emit([]);
  }

  isCategorySelected(category: string): boolean {
    return this.selectedCategories.has(category);
  }

  getCategoryButtonText(): string {
    if (this.selectedCategories.size === 0) {
      return 'Categorías';
    }

    if (this.selectedCategories.size === 1) {
      return Array.from(this.selectedCategories)[0];
    }

    return `${this.selectedCategories.size} categorías`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isCategoryDropdownOpen && !this.isSortDropdownOpen) {
      return;
    }

    const target = event.target as Element | null;
    if (!target) {
      return;
    }

    const isInsideCategoryDropdown = Boolean(target.closest('.categories-dropdown, .compact-categories-dropdown'));
    const isInsideSortDropdown = Boolean(target.closest('.sort-dropdown, .compact-sort-dropdown'));

    if (this.isCategoryDropdownOpen && !isInsideCategoryDropdown) {
      this.isCategoryDropdownOpen = false;
    }

    if (this.isSortDropdownOpen && !isInsideSortDropdown) {
      this.isSortDropdownOpen = false;
    }
  }

  onLayoutButtonPress(): void {
    this.layoutButtonPress.emit();
  }

  selectSelectionMode(): void {
    if (this.isSelectionMode) {
      return;
    }

    this.selectionModeSelect.emit();
  }

  selectVoiceMode(): void {
    this.voiceModeSelect.emit();
  }

  selectBarcodeMode(): void {
    this.barcodeModeSelect.emit();
  }

  requestUnregisteredItem(): void {
    this.unregisteredItemRequest.emit();
  }

  private syncSelectionControls(skipAnimation: boolean): void {
    const nextSelectionMode = this.isSelectionMode;
    if (!skipAnimation && nextSelectionMode === this.isSelectionModeActive) {
      return;
    }

    this.isSelectionModeActive = nextSelectionMode;

    if (this.hideSelectionControlsTimeoutId) {
      clearTimeout(this.hideSelectionControlsTimeoutId);
      this.hideSelectionControlsTimeoutId = null;
    }

    if (this.showSelectionControlsTimeoutId) {
      clearTimeout(this.showSelectionControlsTimeoutId);
      this.showSelectionControlsTimeoutId = null;
    }

    if (nextSelectionMode) {
      this.renderSelectionControls = true;

      if (skipAnimation) {
        this.areSelectionControlsVisible = true;
        return;
      }

      this.areSelectionControlsVisible = false;
      this.showSelectionControlsTimeoutId = setTimeout(() => {
        if (this.isSelectionMode) {
          this.areSelectionControlsVisible = true;
        }
        this.showSelectionControlsTimeoutId = null;
      }, SELECTION_CONTROLS_REVEAL_DELAY_MS);

      return;
    }

    this.isCategoryDropdownOpen = false;
    this.isSortDropdownOpen = false;
    this.isCompactSearchOpen = false;

    if (skipAnimation) {
      this.areSelectionControlsVisible = false;
      this.renderSelectionControls = false;
      return;
    }

    this.areSelectionControlsVisible = false;
    this.hideSelectionControlsTimeoutId = setTimeout(() => {
      this.renderSelectionControls = false;
      this.hideSelectionControlsTimeoutId = null;
    }, SELECTION_CONTROLS_ANIMATION_MS);
  }
}
