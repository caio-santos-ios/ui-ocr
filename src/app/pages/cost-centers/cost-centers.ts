import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Loading } from '../../components/loading/loading';
import { GlobalService } from '../../services/global.service';
import { api } from '../../services/api';

export type CostCenterType = 'group' | 'subgroup' | 'subcostcenter' | 'costcenter';

export interface GroupItem {
  id: string;
  code: string;
  name: string;
  value?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubGroupItem {
  id: string;
  code: string;
  name: string;
  groupCode: string;
  value?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubCostCenterItem {
  id: string;
  code: string;
  name: string;
  groupCode: string;
  subGroupCode: string;
  value?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CostCenterItem {
  id: string;
  code: string;
  name: string;
  groupCode: string;
  subGroupCode: string;
  subCostCenter?: string;
  value?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SourceLineItem {
  id: string;
  description: string;
  value: number;
  formattedText?: string;
  costCenterId?: string;
}

export interface TreeItem {
  id: string;
  costCenterId?: string;
  code: string;
  name: string;
  type: CostCenterType;
  level: number;
  value: number;
  updatedAt?: string;
  createdAt?: string;
  groupCode?: string;
  subGroupCode?: string;
  subCostCenter?: string;
  hasChildren: boolean;
  children: TreeItem[];
  hasAmbiguity?: boolean;
  alternativeCandidates?: any[];
  sourceDescriptions?: string[];
  sourceLines?: SourceLineItem[];
  rawItem: any;
}

@Component({
  selector: 'app-cost-centers',
  standalone: true,
  imports: [CommonModule, FormsModule, Loading],
  templateUrl: './cost-centers.html',
  styleUrl: './cost-centers.css'
})
export class CostCenters implements OnInit {
  isLoading = false;
  isSaving = false;

  searchQuery = '';
  searchTimeout: any = null;

  treeData: TreeItem[] = [];
  expandedNodeIds: Set<string> = new Set<string>();

  counts = {
    groups: 0,
    subGroups: 0,
    subCostCenters: 0,
    costCenters: 0,
    totalValue: 0
  };

  allGroups: GroupItem[] = [];
  allSubGroups: SubGroupItem[] = [];
  allSubCostCenters: SubCostCenterItem[] = [];
  allCostCenters: CostCenterItem[] = [];

  activeTab: CostCenterType = 'group';
  isModalOpen = false;
  isDeleteModalOpen = false;
  modalMode: 'create' | 'edit' = 'create';
  parentContextInfo: string = '';
  isParentLocked = false;

  isImportModalOpen = false;
  selectedFile: File | null = null;
  isImporting = false;
  importResult: any = null;
  importTreeData: TreeItem[] = [];
  importExpandedNodeIds: Set<string> = new Set<string>();
  selectedImportCcIds: Set<string> = new Set<string>();
  selectedImportLineIds: Set<string> = new Set<string>();
  moveSelectedLineIds: Set<string> = new Set<string>();
  isConfirmImportModalOpen = false;
  isConfirmingImport = false;
  isAssignCcModalOpen = false;
  selectedUnmatchedRow: any = null;
  selectedUnmatchedIndex = -1;
  assignTargetCostCenterId = '';
  assignApplyToSameDescription = true;
  assignCcSearchQuery = '';

  isHistoryModalOpen = false;
  isLoadingHistory = false;
  historyList: any[] = [];
  selectedHistory: any = null;
  isLoadingHistoryDetail = false;
  historySearchQuery = '';
  isConfirmDeleteHistoryModalOpen = false;
  isDeletingHistory = false;
  itemHistoryToDelete: any = null;

  activeAddMenuId: string | null = null;

  isMoveModalOpen = false;
  isMoving = false;
  moveContext: 'main' | 'import' = 'main';
  itemToMove: TreeItem | null = null;
  moveTargetGroup = '';
  moveTargetSubGroup = '';
  moveHasSubCostCenter = false;
  moveTargetSubCostCenter = '';
  suggestedMoveCode = '';
  isLoadingMovePreview = false;

  draggedItem: TreeItem | null = null;
  draggedContext: 'main' | 'import' = 'main';
  dragOverTargetId: string | null = null;

  groupForm: GroupItem = { id: '', code: '', name: '', value: 0 };
  subGroupForm: SubGroupItem = { id: '', code: '', name: '', groupCode: '', value: 0 };
  subCostCenterForm: SubCostCenterItem = { id: '', code: '', name: '', groupCode: '', subGroupCode: '', value: 0 };
  costCenterForm: CostCenterItem = { id: '', code: '', name: '', groupCode: '', subGroupCode: '', subCostCenter: '', value: 0 };

  hasSubCostCenter = false;

  itemToDelete: any = null;
  itemToDeleteType: CostCenterType = 'group';

  constructor(
    private toastr: ToastrService,
    public global: GlobalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadTreeData();
  }

  async loadTreeData() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const [resG, resSG, resSCC, resCC] = await Promise.all([
        api.get('/api/group-cost-centers?deleted=false'),
        api.get('/api/group-sub-cost-centers?deleted=false'),
        api.get('/api/sub-cost-centers?deleted=false'),
        api.get('/api/cost-centers?deleted=false')
      ]);

      const rawGroups: GroupItem[] = (resG.data?.result?.data || resG.data?.result || []).filter((x: any) => !x.deleted);
      const rawSubGroups: SubGroupItem[] = (resSG.data?.result?.data || resSG.data?.result || []).filter((x: any) => !x.deleted);
      const rawSubCC: SubCostCenterItem[] = (resSCC.data?.result?.data || resSCC.data?.result || []).filter((x: any) => !x.deleted);
      const rawCC: CostCenterItem[] = (resCC.data?.result?.data || resCC.data?.result || []).filter((x: any) => !x.deleted);
      this.allGroups = rawGroups;
      this.allSubGroups = rawSubGroups;
      this.allSubCostCenters = rawSubCC;
      this.allCostCenters = rawCC;

      this.counts.groups = rawGroups.length;
      this.counts.subGroups = rawSubGroups.length;
      this.counts.subCostCenters = rawSubCC.length;
      this.counts.costCenters = rawCC.length;
      this.counts.totalValue = [
        ...rawGroups,
        ...rawSubGroups,
        ...rawSubCC,
        ...rawCC
      ].reduce((acc, it) => acc + (it.value || 0), 0);

      this.treeData = this.buildHierarchy(rawGroups, rawSubGroups, rawSubCC, rawCC);
    } catch (err: any) {
      console.log(err)
      this.toastr.error('Erro ao carregar estrutura de Centro de Custo', 'Erro');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  buildHierarchy(
    groups: GroupItem[],
    subGroups: SubGroupItem[],
    subCostCenters: SubCostCenterItem[],
    costCenters: CostCenterItem[]
  ): TreeItem[] {
    const sortByCode = (a: any, b: any) =>
      (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' });

    const sortedGroups = [...groups].sort(sortByCode);
    const sortedSubGroups = [...subGroups].sort(sortByCode);
    const sortedSubCC = [...subCostCenters].sort(sortByCode);
    const sortedCC = [...costCenters].sort(sortByCode);

    return sortedGroups.map(g => {

      const groupSubGroups = sortedSubGroups.filter(sg => sg.groupCode === g.code);

      const sgChildren: TreeItem[] = groupSubGroups.map(sg => {

        const sgSubCostCenters = sortedSubCC.filter(scc => scc.subGroupCode === sg.code);

        const sccChildren: TreeItem[] = sgSubCostCenters.map(scc => {

          const ccUnderScc = sortedCC
            .filter(cc => cc.subCostCenter === scc.code)
            .map(cc => ({
              id: cc.id,
              code: cc.code,
              name: cc.name,
              type: 'costcenter' as CostCenterType,
              level: 3,
              value: cc.value || 0,
              updatedAt: (cc as any).updated_at || cc.updatedAt,
              createdAt: (cc as any).created_at || cc.createdAt,
              groupCode: cc.groupCode,
              subGroupCode: cc.subGroupCode,
              subCostCenter: cc.subCostCenter,
              hasChildren: false,
              children: [],
              rawItem: cc
            }));

          return {
            id: scc.id,
            code: scc.code,
            name: scc.name,
            type: 'subcostcenter' as CostCenterType,
            level: 2,
            value: scc.value || 0,
            updatedAt: (scc as any).updated_at || scc.updatedAt,
            createdAt: (scc as any).created_at || scc.createdAt,
            groupCode: scc.groupCode,
            subGroupCode: scc.subGroupCode,
            hasChildren: ccUnderScc.length > 0,
            children: ccUnderScc,
            rawItem: scc
          };
        });

        const directCC: TreeItem[] = sortedCC
          .filter(cc => cc.subGroupCode === sg.code && (!cc.subCostCenter || cc.subCostCenter === ''))
          .map(cc => ({
            id: cc.id,
            code: cc.code,
            name: cc.name,
            type: 'costcenter' as CostCenterType,
            level: 2,
            value: cc.value || 0,
            updatedAt: (cc as any).updated_at || cc.updatedAt,
            createdAt: (cc as any).created_at || cc.createdAt,
            groupCode: cc.groupCode,
            subGroupCode: cc.subGroupCode,
            subCostCenter: '',
            hasChildren: false,
            children: [],
            rawItem: cc
          }));

        const allSgChildren = [...sccChildren, ...directCC].sort(sortByCode);

        return {
          id: sg.id,
          code: sg.code,
          name: sg.name,
          type: 'subgroup' as CostCenterType,
          level: 1,
          value: sg.value || 0,
          updatedAt: (sg as any).updated_at || sg.updatedAt,
          createdAt: (sg as any).created_at || sg.createdAt,
          groupCode: sg.groupCode,
          hasChildren: allSgChildren.length > 0,
          children: allSgChildren,
          rawItem: sg
        };
      });

      return {
        id: g.id,
        code: g.code,
        name: g.name,
        type: 'group' as CostCenterType,
        level: 0,
        value: g.value || 0,
        updatedAt: (g as any).updated_at || g.updatedAt,
        createdAt: (g as any).created_at || g.createdAt,
        hasChildren: sgChildren.length > 0,
        children: sgChildren,
        rawItem: g
      };
    });
  }

  get visibleRows(): TreeItem[] {
    const query = this.searchQuery.trim().toLowerCase();

    if (!query) {
      const flat: TreeItem[] = [];
      const traverse = (items: TreeItem[]) => {
        for (const it of items) {
          flat.push(it);
          if (it.hasChildren && this.expandedNodeIds.has(it.id)) {
            traverse(it.children);
          }
        }
      };
      traverse(this.treeData);
      return flat;
    }

    const filterTree = (items: TreeItem[]): TreeItem[] => {
      const result: TreeItem[] = [];
      for (const it of items) {
        const matches = it.name.toLowerCase().includes(query) || it.code.toLowerCase().includes(query);
        const matchingChildren = filterTree(it.children);
        if (matches || matchingChildren.length > 0) {
          result.push({
            ...it,
            hasChildren: matchingChildren.length > 0,
            children: matchingChildren
          });
        }
      }
      return result;
    };

    const filtered = filterTree(this.treeData);
    const flatFiltered: TreeItem[] = [];
    const traverseFiltered = (items: TreeItem[]) => {
      for (const it of items) {
        flatFiltered.push(it);
        if (it.hasChildren) {
          traverseFiltered(it.children);
        }
      }
    };
    traverseFiltered(filtered);
    return flatFiltered;
  }

  toggleExpand(item: TreeItem) {
    if (this.expandedNodeIds.has(item.id)) {
      this.expandedNodeIds.delete(item.id);
    } else {
      this.expandedNodeIds.add(item.id);
    }
    this.cdr.detectChanges();
  }

  isExpanded(item: TreeItem): boolean {
    return this.expandedNodeIds.has(item.id);
  }

  expandAll() {
    const addAll = (items: TreeItem[]) => {
      for (const it of items) {
        if (it.hasChildren) {
          this.expandedNodeIds.add(it.id);
          addAll(it.children);
        }
      }
    };
    addAll(this.treeData);
    this.cdr.detectChanges();
  }

  collapseAll() {
    this.expandedNodeIds.clear();
    this.cdr.detectChanges();
  }

  onSearchChange() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.cdr.detectChanges();
    }, 300);
  }

  getEndpointForTab(tab: CostCenterType): string {
    switch (tab) {
      case 'group': return '/api/group-cost-centers';
      case 'subgroup': return '/api/group-sub-cost-centers';
      case 'subcostcenter': return '/api/sub-cost-centers';
      case 'costcenter': return '/api/cost-centers';
    }
  }

  get filteredSubGroupsForForm(): SubGroupItem[] {
    const selectedGroup = this.activeTab === 'subcostcenter' ? this.subCostCenterForm.groupCode : this.costCenterForm.groupCode;
    if (!selectedGroup) return [];
    return this.allSubGroups.filter(sg => sg.groupCode === selectedGroup);
  }

  get filteredSubCostCentersForForm(): SubCostCenterItem[] {
    const selectedSG = this.costCenterForm.subGroupCode;
    if (!selectedSG) return [];
    return this.allSubCostCenters.filter(scc => scc.subGroupCode === selectedSG);
  }

  openCreateGroupModal() {
    this.activeTab = 'group';
    this.modalMode = 'create';
    this.parentContextInfo = '';
    this.isParentLocked = false;
    this.resetForms();
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  openCreateChildModal(
    parentItem: TreeItem,
    targetMode: 'subgroup' | 'subcostcenter' | 'costcenter-direct' | 'costcenter-under-subcc'
  ) {
    this.modalMode = 'create';
    this.resetForms();
    this.expandedNodeIds.add(parentItem.id);

    if (targetMode === 'subgroup') {
      this.activeTab = 'subgroup';
      this.subGroupForm.groupCode = parentItem.code;
      this.parentContextInfo = `Grupo: ${parentItem.code} - ${parentItem.name}`;
      this.isParentLocked = true;
    } else if (targetMode === 'subcostcenter') {
      this.activeTab = 'subcostcenter';
      this.subCostCenterForm.groupCode = parentItem.groupCode || '';
      this.subCostCenterForm.subGroupCode = parentItem.code;
      this.parentContextInfo = `SubGrupo: ${parentItem.code} - ${parentItem.name}`;
      this.isParentLocked = true;
    } else if (targetMode === 'costcenter-direct') {
      this.activeTab = 'costcenter';
      this.costCenterForm.groupCode = parentItem.groupCode || '';
      this.costCenterForm.subGroupCode = parentItem.code;
      this.hasSubCostCenter = false;
      this.costCenterForm.subCostCenter = '';
      this.parentContextInfo = `SubGrupo: ${parentItem.code} - ${parentItem.name} (Direto)`;
      this.isParentLocked = true;
    } else if (targetMode === 'costcenter-under-subcc') {
      this.activeTab = 'costcenter';
      this.costCenterForm.groupCode = parentItem.groupCode || '';
      this.costCenterForm.subGroupCode = parentItem.subGroupCode || '';
      this.hasSubCostCenter = true;
      this.costCenterForm.subCostCenter = parentItem.code;
      this.parentContextInfo = `SubCentro: ${parentItem.code} - ${parentItem.name}`;
      this.isParentLocked = true;
    }

    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  openEditModal(item: TreeItem) {
    this.modalMode = 'edit';
    this.activeTab = item.type;
    this.parentContextInfo = '';
    this.isParentLocked = true;
    this.resetForms();

    const raw = item.rawItem;
    if (item.type === 'group') {
      this.groupForm = { ...raw };
    } else if (item.type === 'subgroup') {
      this.subGroupForm = { ...raw };
    } else if (item.type === 'subcostcenter') {
      this.subCostCenterForm = { ...raw };
    } else if (item.type === 'costcenter') {
      this.costCenterForm = { ...raw };
      this.hasSubCostCenter = !!raw.subCostCenter;
    }

    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.isModalOpen = false;
    this.resetForms();
    this.cdr.detectChanges();
  }

  resetForms() {
    this.groupForm = { id: '', code: '', name: '', value: 0 };
    this.subGroupForm = { id: '', code: '', name: '', groupCode: this.allGroups[0]?.code || '', value: 0 };
    this.subCostCenterForm = { id: '', code: '', name: '', groupCode: this.allGroups[0]?.code || '', subGroupCode: '', value: 0 };
    this.costCenterForm = { id: '', code: '', name: '', groupCode: this.allGroups[0]?.code || '', subGroupCode: '', subCostCenter: '', value: 0 };
    this.hasSubCostCenter = false;
    this.parentContextInfo = '';
    this.isParentLocked = false;
  }

  async saveItem() {
    this.isSaving = true;
    this.cdr.detectChanges();

    const endpoint = this.getEndpointForTab(this.activeTab);
    const isEdit = this.modalMode === 'edit';

    try {
      let payload: any;
      if (this.activeTab === 'group') {
        if (!this.groupForm.name?.trim()) {
          this.toastr.warning('Preencha o nome do grupo');
          this.isSaving = false;
          return;
        }
        payload = { ...this.groupForm };
      } else if (this.activeTab === 'subgroup') {
        if (!this.subGroupForm.groupCode || !this.subGroupForm.name?.trim()) {
          this.toastr.warning('Selecione o grupo e preencha o nome do subgrupo');
          this.isSaving = false;
          return;
        }
        payload = { ...this.subGroupForm };
      } else if (this.activeTab === 'subcostcenter') {
        if (!this.subCostCenterForm.groupCode || !this.subCostCenterForm.subGroupCode || !this.subCostCenterForm.name?.trim()) {
          this.toastr.warning('Selecione o grupo, o subgrupo e preencha o nome do subcentro');
          this.isSaving = false;
          return;
        }
        payload = { ...this.subCostCenterForm };
      } else if (this.activeTab === 'costcenter') {
        if (!this.costCenterForm.groupCode || !this.costCenterForm.subGroupCode || !this.costCenterForm.name?.trim()) {
          this.toastr.warning('Selecione o grupo, o subgrupo e preencha o nome');
          this.isSaving = false;
          return;
        }
        if (this.hasSubCostCenter && !this.costCenterForm.subCostCenter) {
          this.toastr.warning('Selecione o subcentro de custo');
          this.isSaving = false;
          return;
        }
        if (!this.hasSubCostCenter) {
          this.costCenterForm.subCostCenter = '';
        }
        payload = { ...this.costCenterForm };
      }

      if (isEdit) {
        await api.put(endpoint, payload);
        this.toastr.success('Item atualizado com sucesso!');
      } else {
        await api.post(endpoint, payload);
        this.toastr.success('Item criado com sucesso!');
      }

      this.closeModal();
      await this.loadTreeData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Erro ao salvar item';
      this.toastr.error(msg, 'Erro');
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  openDeleteModal(item: TreeItem) {
    this.itemToDelete = item.rawItem;
    this.itemToDeleteType = item.type;
    this.isDeleteModalOpen = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.itemToDelete = null;
    this.cdr.detectChanges();
  }

  async confirmDelete() {
    if (!this.itemToDelete) return;
    this.isSaving = true;
    this.cdr.detectChanges();

    const endpoint = this.getEndpointForTab(this.itemToDeleteType);

    try {
      await api.delete(`${endpoint}/${this.itemToDelete.id}`);
      this.toastr.success('Excluído com sucesso!');
      this.closeDeleteModal();
      await this.loadTreeData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao excluir item';
      this.toastr.error(msg, 'Erro');
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  getTypeLabel(type: CostCenterType): string {
    switch (type) {
      case 'group': return 'Grupo';
      case 'subgroup': return 'SubGrupo';
      case 'subcostcenter': return 'SubCentro';
      case 'costcenter': return 'Centro de Custo';
    }
  }

  openImportModal() {
    this.isImportModalOpen = true;
    this.selectedFile = null;
    this.importResult = null;
    this.importTreeData = [];
    this.importExpandedNodeIds.clear();
    this.selectedImportCcIds.clear();
    this.selectedImportLineIds.clear();
    this.moveSelectedLineIds.clear();
    this.isConfirmImportModalOpen = false;
    this.closeAssignCcModal();
    this.cdr.detectChanges();
  }

  closeImportModal() {
    this.isImportModalOpen = false;
    this.selectedFile = null;
    this.importResult = null;
    this.importTreeData = [];
    this.importExpandedNodeIds.clear();
    this.selectedImportCcIds.clear();
    this.selectedImportLineIds.clear();
    this.moveSelectedLineIds.clear();
    this.isConfirmImportModalOpen = false;
    this.closeAssignCcModal();
    this.cdr.detectChanges();
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile = file;
      this.importResult = null;
      this.importTreeData = [];
      this.importExpandedNodeIds.clear();
      this.selectedImportCcIds.clear();
      this.selectedImportLineIds.clear();
      this.moveSelectedLineIds.clear();
      this.closeAssignCcModal();
      this.cdr.detectChanges();
    }
  }

  removeSelectedFile() {
    this.selectedFile = null;
    this.importResult = null;
    this.importTreeData = [];
    this.importExpandedNodeIds.clear();
    this.selectedImportCcIds.clear();
    this.selectedImportLineIds.clear();
    this.moveSelectedLineIds.clear();
    this.closeAssignCcModal();
    this.cdr.detectChanges();
  }

  async submitImport() {
    if (!this.selectedFile) {
      this.toastr.warning('Por favor, anexe uma planilha (.xlsx ou .csv)');
      return;
    }

    this.isImporting = true;
    this.cdr.detectChanges();

    try {
      const formData = new FormData();
      formData.append('file', this.selectedFile);

      const response = await api.post('/api/cost-centers/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const apiData = response.data?.result?.data || response.data?.result || response.data;
      this.importResult = apiData;
      this.importTreeData = this.importResult?.tree || [];
      this.initializeImportSelection();
      this.expandAllImport();

      const msg = response.data?.message || 'Planilha processada com sucesso!';
      this.toastr.success(msg, 'Leitura da Planilha');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Erro ao processar planilha';
      this.toastr.error(msg, 'Erro');
    } finally {
      this.isImporting = false;
      this.cdr.detectChanges();
    }
  }

  initializeNodeSourceLines(node: TreeItem) {
    if (node.type !== 'costcenter') return;
    if (!node.sourceLines || node.sourceLines.length === 0) {
      if (this.importResult?.detailedLines) {
        const matchingDetailed = this.importResult.detailedLines.filter(
          (dl: any) => dl.costCenterId === node.costCenterId || dl.costCenterId === node.id || dl.costCenterCode === node.code
        );
        if (matchingDetailed.length > 0) {
          node.sourceLines = matchingDetailed.map((dl: any, idx: number) => ({
            id: dl.id || `${node.id}_line_${idx}`,
            description: dl.sourceDescription,
            value: dl.value || 0,
            formattedText: `${dl.sourceDescription} (R$ ${(dl.value || 0).toFixed(2)})`,
            costCenterId: dl.costCenterId
          }));
        }
      }
      if (!node.sourceLines || node.sourceLines.length === 0) {
        if (node.sourceDescriptions && node.sourceDescriptions.length > 0) {
          node.sourceLines = node.sourceDescriptions.map((desc: string, idx: number) => ({
            id: `${node.id}_line_${idx}`,
            description: desc,
            value: node.sourceDescriptions!.length === 1 ? node.value : 0,
            formattedText: desc,
            costCenterId: node.costCenterId || node.id
          }));
        }
      }
    }
  }

  getNodeSourceLines(item: TreeItem): SourceLineItem[] {
    this.initializeNodeSourceLines(item);
    return item.sourceLines || [];
  }

  initializeImportSelection() {
    this.selectedImportCcIds.clear();
    this.selectedImportLineIds.clear();
    const collectCcIds = (nodes: TreeItem[]) => {
      for (const n of nodes) {
        if (n.type === 'costcenter') {
          this.initializeNodeSourceLines(n);
          const id = n.costCenterId || (n.id.includes('_row_') ? n.id.split('_row_')[0] : n.id);
          this.selectedImportCcIds.add(id);
          if (n.sourceLines) {
            for (const l of n.sourceLines) {
              this.selectedImportLineIds.add(l.id);
            }
          }
        }
        if (n.children && n.children.length > 0) {
          collectCcIds(n.children);
        }
      }
    };
    collectCcIds(this.importTreeData);
  }

  isSourceLineSelected(line: SourceLineItem): boolean {
    return this.selectedImportLineIds.has(line.id);
  }

  toggleSourceLineSelection(item: TreeItem, line: SourceLineItem, event?: Event) {
    if (event) event.stopPropagation();
    if (this.selectedImportLineIds.has(line.id)) {
      this.selectedImportLineIds.delete(line.id);
    } else {
      this.selectedImportLineIds.add(line.id);
    }
    const ccId = item.costCenterId || (item.id.includes('_row_') ? item.id.split('_row_')[0] : item.id);
    const anySelected = item.sourceLines ? item.sourceLines.some(l => this.selectedImportLineIds.has(l.id)) : false;
    if (anySelected) {
      this.selectedImportCcIds.add(ccId);
    } else {
      this.selectedImportCcIds.delete(ccId);
    }
    this.cdr.detectChanges();
  }

  isCcSelected(item: TreeItem): boolean {
    const id = item.costCenterId || (item.id.includes('_row_') ? item.id.split('_row_')[0] : item.id);
    return this.selectedImportCcIds.has(id);
  }

  isCcFullySelected(item: TreeItem): boolean {
    const id = item.costCenterId || (item.id.includes('_row_') ? item.id.split('_row_')[0] : item.id);
    if (!this.selectedImportCcIds.has(id)) return false;
    if (item.sourceLines && item.sourceLines.length > 0) {
      return item.sourceLines.every(l => this.selectedImportLineIds.has(l.id));
    }
    return true;
  }

  isCcPartiallySelected(item: TreeItem): boolean {
    if (!item.sourceLines || item.sourceLines.length <= 1) return false;
    const selectedCount = item.sourceLines.filter(l => this.selectedImportLineIds.has(l.id)).length;
    return selectedCount > 0 && selectedCount < item.sourceLines.length;
  }

  toggleCcSelection(item: TreeItem, event?: Event) {
    if (event) event.stopPropagation();
    const id = item.costCenterId || (item.id.includes('_row_') ? item.id.split('_row_')[0] : item.id);
    const fullySelected = this.isCcFullySelected(item);
    if (fullySelected) {
      this.selectedImportCcIds.delete(id);
      if (item.sourceLines) {
        for (const l of item.sourceLines) this.selectedImportLineIds.delete(l.id);
      }
    } else {
      this.selectedImportCcIds.add(id);
      if (item.sourceLines) {
        for (const l of item.sourceLines) this.selectedImportLineIds.add(l.id);
      }
    }
    this.cdr.detectChanges();
  }

  getNodeCcIds(node: TreeItem): string[] {
    const ids: string[] = [];
    const collect = (n: TreeItem) => {
      if (n.type === 'costcenter') {
        const id = n.costCenterId || (n.id.includes('_row_') ? n.id.split('_row_')[0] : n.id);
        ids.push(id);
      }
      if (n.children && n.children.length > 0) {
        for (const child of n.children) collect(child);
      }
    };
    collect(node);
    return ids;
  }

  isNodeFullySelected(node: TreeItem): boolean {
    const ids = this.getNodeCcIds(node);
    if (ids.length === 0) return false;
    return ids.every(id => this.selectedImportCcIds.has(id));
  }

  isNodePartiallySelected(node: TreeItem): boolean {
    const ids = this.getNodeCcIds(node);
    if (ids.length === 0) return false;
    const selectedCount = ids.filter(id => this.selectedImportCcIds.has(id)).length;
    return selectedCount > 0 && selectedCount < ids.length;
  }

  toggleNodeSelection(node: TreeItem, event?: Event) {
    if (event) event.stopPropagation();
    const ids = this.getNodeCcIds(node);
    const allSelected = ids.every(id => this.selectedImportCcIds.has(id));
    const toggleLines = (n: TreeItem, select: boolean) => {
      if (n.type === 'costcenter' && n.sourceLines) {
        for (const l of n.sourceLines) {
          if (select) this.selectedImportLineIds.add(l.id);
          else this.selectedImportLineIds.delete(l.id);
        }
      }
      if (n.children) {
        for (const c of n.children) toggleLines(c, select);
      }
    };
    if (allSelected) {
      for (const id of ids) this.selectedImportCcIds.delete(id);
      toggleLines(node, false);
    } else {
      for (const id of ids) this.selectedImportCcIds.add(id);
      toggleLines(node, true);
    }
    this.cdr.detectChanges();
  }

  getAllImportCcIds(): string[] {
    const ids: string[] = [];
    const collect = (nodes: TreeItem[]) => {
      for (const n of nodes) {
        if (n.type === 'costcenter') {
          const id = n.costCenterId || (n.id.includes('_row_') ? n.id.split('_row_')[0] : n.id);
          ids.push(id);
        }
        if (n.children && n.children.length > 0) {
          collect(n.children);
        }
      }
    };
    collect(this.importTreeData);
    return ids;
  }

  isAllImportSelected(): boolean {
    const allIds = this.getAllImportCcIds();
    return allIds.length > 0 && allIds.every(id => this.selectedImportCcIds.has(id));
  }

  isSomeImportSelected(): boolean {
    const allIds = this.getAllImportCcIds();
    if (allIds.length === 0) return false;
    const count = allIds.filter(id => this.selectedImportCcIds.has(id)).length;
    return count > 0 && count < allIds.length;
  }

  toggleSelectAllImport(event?: Event) {
    if (event) event.stopPropagation();
    const allSelected = this.isAllImportSelected();
    this.selectAllImport(!allSelected);
  }

  selectAllImport(select: boolean) {
    const allIds = this.getAllImportCcIds();
    if (select) {
      for (const id of allIds) this.selectedImportCcIds.add(id);
      const addLines = (nodes: TreeItem[]) => {
        for (const n of nodes) {
          if (n.sourceLines) {
            for (const l of n.sourceLines) this.selectedImportLineIds.add(l.id);
          }
          if (n.children) addLines(n.children);
        }
      };
      addLines(this.importTreeData);
    } else {
      this.selectedImportCcIds.clear();
      this.selectedImportLineIds.clear();
    }
    this.cdr.detectChanges();
  }

  get selectedCostCentersCount(): number {
    const allIds = this.getAllImportCcIds();
    return allIds.filter(id => this.selectedImportCcIds.has(id)).length;
  }

  get totalImportCostCentersCount(): number {
    return this.getAllImportCcIds().length;
  }

  getItemSelectedValue(item: TreeItem): number {
    if (item.type === 'costcenter') {
      if (item.sourceLines && item.sourceLines.length > 0) {
        return item.sourceLines
          .filter(l => this.selectedImportLineIds.has(l.id))
          .reduce((acc, l) => acc + (l.value || 0), 0);
      }
      const ccId = item.costCenterId || (item.id.includes('_row_') ? item.id.split('_row_')[0] : item.id);
      return this.selectedImportCcIds.has(ccId) ? (item.value || 0) : 0;
    }
    let total = 0;
    const sumChild = (n: TreeItem) => {
      if (n.type === 'costcenter') {
        total += this.getItemSelectedValue(n);
      } else if (n.children) {
        for (const c of n.children) sumChild(c);
      }
    };
    sumChild(item);
    return total;
  }

  get selectedImportTotalValue(): number {
    let total = 0;
    const traverse = (nodes: TreeItem[]) => {
      for (const n of nodes) {
        if (n.type === 'costcenter') {
          total += this.getItemSelectedValue(n);
        } else if (n.children && n.children.length > 0) {
          traverse(n.children);
        }
      }
    };
    traverse(this.importTreeData);
    return total;
  }

  get visibleImportRows(): TreeItem[] {
    const flat: TreeItem[] = [];
    const traverse = (items: TreeItem[]) => {
      for (const it of items) {
        flat.push(it);
        if (it.hasChildren && this.importExpandedNodeIds.has(it.id)) {
          traverse(it.children);
        }
      }
    };
    traverse(this.importTreeData);
    return flat;
  }

  toggleImportExpand(item: TreeItem) {
    if (this.importExpandedNodeIds.has(item.id)) {
      this.importExpandedNodeIds.delete(item.id);
    } else {
      this.importExpandedNodeIds.add(item.id);
    }
    this.cdr.detectChanges();
  }

  isImportExpanded(item: TreeItem): boolean {
    return this.importExpandedNodeIds.has(item.id);
  }

  expandAllImport() {
    const addAll = (items: TreeItem[]) => {
      for (const it of items) {
        if (it.hasChildren) {
          this.importExpandedNodeIds.add(it.id);
          addAll(it.children);
        }
      }
    };
    addAll(this.importTreeData);
    this.cdr.detectChanges();
  }

  collapseAllImport() {
    this.importExpandedNodeIds.clear();
    this.cdr.detectChanges();
  }

  openAssignCcModal(un: any, index: number) {
    this.selectedUnmatchedRow = un;
    this.selectedUnmatchedIndex = index;
    this.assignCcSearchQuery = '';
    this.assignApplyToSameDescription = true;
    if (un.bestMatchId && this.allCostCenters.some(c => c.id === un.bestMatchId)) {
      this.assignTargetCostCenterId = un.bestMatchId;
    } else if (un.bestMatchName) {
      const match = this.allCostCenters.find(c => c.name.toLowerCase() === un.bestMatchName.toLowerCase());
      this.assignTargetCostCenterId = match?.id || '';
    } else {
      this.assignTargetCostCenterId = '';
    }
    this.isAssignCcModalOpen = true;
    this.cdr.detectChanges();
  }

  closeAssignCcModal() {
    this.isAssignCcModalOpen = false;
    this.selectedUnmatchedRow = null;
    this.selectedUnmatchedIndex = -1;
    this.assignTargetCostCenterId = '';
    this.assignCcSearchQuery = '';
    this.cdr.detectChanges();
  }

  get selectedTargetCostCenter(): CostCenterItem | null {
    if (!this.assignTargetCostCenterId) return null;
    return this.allCostCenters.find(c => c.id === this.assignTargetCostCenterId) || null;
  }

  get selectedUnmatchedSameDescCount(): number {
    if (!this.selectedUnmatchedRow || !this.importResult?.unmatchedRows) return 0;
    return this.importResult.unmatchedRows.filter((r: any) => r.description === this.selectedUnmatchedRow.description).length;
  }

  get filteredAssignCostCenters(): CostCenterItem[] {
    const q = this.assignCcSearchQuery?.trim().toLowerCase() || '';
    if (!q) return this.allCostCenters;
    return this.allCostCenters.filter(cc =>
      cc.code?.toLowerCase().includes(q) ||
      cc.name?.toLowerCase().includes(q) ||
      cc.groupCode?.toLowerCase().includes(q) ||
      cc.subGroupCode?.toLowerCase().includes(q)
    );
  }

  getCostCenterHierarchyPath(cc: CostCenterItem | null): string {
    if (!cc) return '';
    const g = this.allGroups.find(x => x.code === cc.groupCode);
    const sg = this.allSubGroups.find(x => x.code === cc.subGroupCode);
    const scc = cc.subCostCenter ? this.allSubCostCenters.find(x => x.code === cc.subCostCenter) : null;
    let path = `${g?.name || cc.groupCode} > ${sg?.name || cc.subGroupCode}`;
    if (scc) path += ` > ${scc.name}`;
    return path;
  }

  getQuickMatchCc(un: any): CostCenterItem | null {
    if (!un) return null;
    if (un.bestMatchId) {
      const found = this.allCostCenters.find(c => c.id === un.bestMatchId);
      if (found) return found;
    }
    if (un.bestMatchName) {
      return this.allCostCenters.find(c => c.name.toLowerCase() === un.bestMatchName.toLowerCase()) || null;
    }
    return null;
  }

  quickAssignCc(un: any, event?: Event) {
    if (event) event.stopPropagation();
    const target = this.getQuickMatchCc(un);
    if (!target) return;
    this.assignUnmatchedToCostCenter(un, target.id, true);
  }

  confirmAssignCc() {
    if (!this.selectedUnmatchedRow || !this.assignTargetCostCenterId) {
      this.toastr.warning('Selecione um Centro de Custo para vincular.');
      return;
    }
    this.assignUnmatchedToCostCenter(this.selectedUnmatchedRow, this.assignTargetCostCenterId, this.assignApplyToSameDescription);
    this.closeAssignCcModal();
  }

  assignUnmatchedToCostCenter(unmatchedRow: any, targetCostCenterId: string, applyToAllSameDescription: boolean) {
    const targetCc = this.allCostCenters.find(c => c.id === targetCostCenterId);
    if (!targetCc) {
      this.toastr.error('Centro de Custo não encontrado.');
      return;
    }

    if (!this.importResult || !this.importResult.unmatchedRows) return;

    const rowsToAssign = applyToAllSameDescription
      ? this.importResult.unmatchedRows.filter((r: any) => r.description === unmatchedRow.description)
      : [unmatchedRow];

    if (rowsToAssign.length === 0) return;

    const totalValueToAdd = rowsToAssign.reduce((acc: number, r: any) => acc + (r.value || 0), 0);
    const newSourceDescs = rowsToAssign.map((r: any) => `${r.description} (R$ ${(r.value || 0).toFixed(2)})`);

    if (!this.importResult.detailedLines) {
      this.importResult.detailedLines = [];
    }

    const hierarchyPath = this.getCostCenterHierarchyPath(targetCc);

    for (const r of rowsToAssign) {
      this.importResult.detailedLines.push({
        costCenterId: targetCc.id,
        costCenterCode: targetCc.code,
        costCenterName: targetCc.name,
        hierarchyPath: hierarchyPath,
        sourceDescription: r.description,
        value: r.value || 0
      });
    }

    let groupNode = this.importTreeData.find(grp => grp.code === targetCc.groupCode);
    if (!groupNode) {
      const grpInfo = this.allGroups.find(grp => grp.code === targetCc.groupCode);
      groupNode = {
        id: grpInfo?.id || `grp_${targetCc.groupCode}`,
        code: targetCc.groupCode,
        name: grpInfo?.name || `Grupo ${targetCc.groupCode}`,
        type: 'group',
        level: 0,
        value: 0,
        hasChildren: true,
        children: [],
        rawItem: grpInfo
      };
      this.importTreeData.push(groupNode);
      this.importTreeData.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    }

    let subGroupNode = groupNode.children.find(sgrp => sgrp.code === targetCc.subGroupCode);
    if (!subGroupNode) {
      const sgInfo = this.allSubGroups.find(sgrp => sgrp.code === targetCc.subGroupCode);
      subGroupNode = {
        id: sgInfo?.id || `sg_${targetCc.subGroupCode}`,
        code: targetCc.subGroupCode,
        name: sgInfo?.name || `SubGrupo ${targetCc.subGroupCode}`,
        type: 'subgroup',
        level: 1,
        value: 0,
        groupCode: targetCc.groupCode,
        hasChildren: true,
        children: [],
        rawItem: sgInfo
      };
      groupNode.children.push(subGroupNode);
      groupNode.hasChildren = true;
      groupNode.children.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    }

    let targetContainer = subGroupNode;
    let newLevel = 2;
    if (targetCc.subCostCenter) {
      let subCcNode = subGroupNode.children.find(scc => scc.code === targetCc.subCostCenter && scc.type === 'subcostcenter');
      if (!subCcNode) {
        const sccInfo = this.allSubCostCenters.find(c => c.code === targetCc.subCostCenter);
        subCcNode = {
          id: sccInfo?.id || `scc_${targetCc.subCostCenter}`,
          code: targetCc.subCostCenter,
          name: sccInfo?.name || `SubCentro ${targetCc.subCostCenter}`,
          type: 'subcostcenter',
          level: 2,
          value: 0,
          groupCode: targetCc.groupCode,
          subGroupCode: targetCc.subGroupCode,
          hasChildren: true,
          children: [],
          rawItem: sccInfo
        };
        subGroupNode.children.push(subCcNode);
        subGroupNode.hasChildren = true;
        subGroupNode.children.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
      }
      targetContainer = subCcNode;
      newLevel = 3;
    }

    const existingCc = targetContainer.children.find(c =>
      c.type === 'costcenter' && (c.costCenterId === targetCc.id || c.id === targetCc.id || c.code === targetCc.code)
    );

    if (existingCc) {
      existingCc.value = (existingCc.value || 0) + totalValueToAdd;
      if (!existingCc.sourceDescriptions) existingCc.sourceDescriptions = [];
      existingCc.sourceDescriptions.push(...newSourceDescs);
      const ccId = existingCc.costCenterId || existingCc.id;
      this.selectedImportCcIds.add(ccId);
    } else {
      const newCcItem: TreeItem = {
        id: targetCc.id,
        costCenterId: targetCc.id,
        code: targetCc.code,
        name: targetCc.name,
        type: 'costcenter',
        level: newLevel,
        value: totalValueToAdd,
        groupCode: targetCc.groupCode,
        subGroupCode: targetCc.subGroupCode,
        subCostCenter: targetCc.subCostCenter || '',
        sourceDescriptions: newSourceDescs,
        hasChildren: false,
        children: [],
        rawItem: targetCc
      };
      targetContainer.children.push(newCcItem);
      targetContainer.hasChildren = true;
      targetContainer.children.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
      this.selectedImportCcIds.add(targetCc.id);
    }

    const recalculateValues = (node: TreeItem): number => {
      if (node.type === 'costcenter') {
        return node.value || 0;
      }
      let sum = 0;
      if (node.children) {
        for (const child of node.children) {
          sum += recalculateValues(child);
        }
      }
      node.value = sum;
      return sum;
    };
    for (const grp of this.importTreeData) {
      recalculateValues(grp);
    }

    this.importExpandedNodeIds.add(groupNode.id);
    this.importExpandedNodeIds.add(subGroupNode.id);
    if (targetCc.subCostCenter && targetContainer.id) {
      this.importExpandedNodeIds.add(targetContainer.id);
    }

    if (applyToAllSameDescription) {
      this.importResult.unmatchedRows = this.importResult.unmatchedRows.filter((r: any) => r.description !== unmatchedRow.description);
    } else {
      const idx = this.importResult.unmatchedRows.indexOf(unmatchedRow);
      if (idx >= 0) {
        this.importResult.unmatchedRows.splice(idx, 1);
      }
    }
    this.importResult.unmatchedCount = this.importResult.unmatchedRows.length;
    this.importResult.matchedCount = this.totalImportCostCentersCount;

    const countText = rowsToAssign.length > 1 ? `${rowsToAssign.length} linhas vinculadas` : 'Linha vinculada';
    this.toastr.success(`${countText} ao Centro de Custo ${targetCc.code} - ${targetCc.name} com sucesso!`, 'Vinculado com Sucesso');
    this.cdr.detectChanges();
  }

  openConfirmImportModal() {
    if (this.selectedCostCentersCount === 0) {
      this.toastr.warning('Selecione ao menos um Centro de Custo para confirmar a importação.', 'Atenção');
      return;
    }
    this.isConfirmImportModalOpen = true;
    this.cdr.detectChanges();
  }

  closeConfirmImportModal() {
    this.isConfirmImportModalOpen = false;
    this.cdr.detectChanges();
  }

  async executeConfirmImport() {
    if (!this.importTreeData || this.importTreeData.length === 0) return;

    if (this.selectedCostCentersCount === 0) {
      this.toastr.warning('Nenhum Centro de Custo selecionado para importação.', 'Atenção');
      return;
    }

    this.isConfirmingImport = true;
    this.cdr.detectChanges();

    try {
      const ccTotals = new Map<string, { id: string; code: string; value: number }>();
      const ccFinalLocation = new Map<string, { groupCode: string; subGroupCode: string; subCostCenter: string; path: string; code: string; name: string }>();

      const traverse = (nodes: TreeItem[]) => {
        for (const n of nodes) {
          if (n.type === 'costcenter') {
            const ccId = n.costCenterId || (n.id.includes('_row_') ? n.id.split('_row_')[0] : n.id);
            if (!this.selectedImportCcIds.has(ccId)) {
              continue;
            }
            const selectedVal = this.getItemSelectedValue(n);
            const current = ccTotals.get(ccId) || { id: ccId, code: n.code, value: 0 };
            current.value += selectedVal;
            ccTotals.set(ccId, current);

            ccFinalLocation.set(ccId, {
              groupCode: n.groupCode || '',
              subGroupCode: n.subGroupCode || '',
              subCostCenter: n.subCostCenter || '',
              path: this.getCurrentLocation(n),
              code: n.code,
              name: n.name
            });
          } else if (n.children && n.children.length > 0) {
            traverse(n.children);
          }
        }
      };
      traverse(this.importTreeData);

      const items = Array.from(ccTotals.values()).filter(it => it.value > 0 || this.selectedImportCcIds.has(it.id));
      if (items.length === 0) {
        this.toastr.warning('Nenhum Centro de Custo marcado para confirmação.', 'Aviso');
        return;
      }

      const detailedLines: any[] = [];
      const originalLines: any[] = this.importResult?.detailedLines || [];

      if (originalLines.length > 0) {
        for (const line of originalLines) {
          if (!ccTotals.has(line.costCenterId)) {
            continue;
          }
          if (line.id && !this.selectedImportLineIds.has(line.id)) {
            continue;
          }
          const finalLoc = ccFinalLocation.get(line.costCenterId);
          detailedLines.push({
            costCenterId: line.costCenterId,
            costCenterCode: finalLoc?.code || line.costCenterCode,
            costCenterName: finalLoc?.name || line.costCenterName,
            hierarchyPath: finalLoc?.path || line.hierarchyPath,
            sourceDescription: line.sourceDescription,
            value: line.value
          });
        }
      } else {
        for (const it of items) {
          const finalLoc = ccFinalLocation.get(it.id);
          detailedLines.push({
            costCenterId: it.id,
            costCenterCode: it.code,
            costCenterName: finalLoc?.name || it.code,
            hierarchyPath: finalLoc?.path || '',
            sourceDescription: it.code,
            value: it.value
          });
        }
      }

      const totalVal = items.reduce((acc, it) => acc + it.value, 0);

      const payload = {
        fileName: this.importResult?.fileName || this.selectedFile?.name || 'Planilha Importada',
        totalRows: this.importResult?.totalRows || detailedLines.length,
        matchedCount: items.length,
        unmatchedCount: this.importResult?.unmatchedCount || 0,
        totalValue: totalVal,
        items,
        lines: detailedLines
      };

      const response = await api.post('/api/cost-centers/import/confirm', payload);
      const msg = response.data?.message || 'Importação confirmada com sucesso!';
      this.toastr.success(msg, 'Sucesso!');

      this.closeConfirmImportModal();
      this.closeImportModal();
      await this.loadTreeData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Erro ao confirmar importação';
      this.toastr.error(msg, 'Erro');
    } finally {
      this.isConfirmingImport = false;
      this.cdr.detectChanges();
    }
  }

  toggleAddMenu(item: TreeItem, event: Event) {
    event.stopPropagation();
    if (this.activeAddMenuId === item.id) {
      this.activeAddMenuId = null;
    } else {
      this.activeAddMenuId = item.id;
    }
    this.cdr.detectChanges();
  }

  closeAddMenu() {
    this.activeAddMenuId = null;
    this.cdr.detectChanges();
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.activeAddMenuId) {
      this.activeAddMenuId = null;
      this.cdr.detectChanges();
    }
  }

  get filteredMoveSubGroups(): SubGroupItem[] {
    if (!this.moveTargetGroup) return [];
    return this.allSubGroups.filter(sg => sg.groupCode === this.moveTargetGroup);
  }

  get filteredMoveSubCostCenters(): SubCostCenterItem[] {
    if (!this.moveTargetGroup || !this.moveTargetSubGroup) return [];
    return this.allSubCostCenters.filter(scc => scc.groupCode === this.moveTargetGroup && scc.subGroupCode === this.moveTargetSubGroup);
  }

  async openMoveModal(item: TreeItem, context: 'main' | 'import', preSelectedTarget?: TreeItem, preSelectedLines?: SourceLineItem[]) {
    this.itemToMove = item;
    this.moveContext = context;
    this.isMoveModalOpen = true;
    this.suggestedMoveCode = '';
    this.moveSelectedLineIds.clear();

    this.initializeNodeSourceLines(item);

    if (context === 'import' && item.sourceLines) {
      if (preSelectedLines && preSelectedLines.length > 0) {
        for (const l of preSelectedLines) this.moveSelectedLineIds.add(l.id);
      } else {
        for (const l of item.sourceLines) this.moveSelectedLineIds.add(l.id);
      }
    }

    if (preSelectedTarget) {
      this.populateMoveFromTarget(preSelectedTarget);
    } else {
      this.moveTargetGroup = item.groupCode || item.rawItem?.groupCode || '';
      this.moveTargetSubGroup = item.subGroupCode || item.rawItem?.subGroupCode || '';
      this.moveHasSubCostCenter = !!(item.subCostCenter || item.rawItem?.subCostCenter);
      this.moveTargetSubCostCenter = item.subCostCenter || item.rawItem?.subCostCenter || '';
    }

    await this.updateMovePreviewCode();
    this.cdr.detectChanges();
  }

  openMoveModalForLines(item: TreeItem, linesToMove?: SourceLineItem[], event?: Event, targetAlt?: any) {
    if (event) event.stopPropagation();
    this.initializeNodeSourceLines(item);
    let preSelectedTarget: TreeItem | undefined;
    if (targetAlt) {
      preSelectedTarget = {
        id: targetAlt.id,
        code: targetAlt.code,
        name: targetAlt.name,
        type: targetAlt.subCostCenter ? 'subcostcenter' : 'subgroup',
        level: 2,
        value: 0,
        groupCode: targetAlt.groupCode,
        subGroupCode: targetAlt.subGroupCode,
        subCostCenter: targetAlt.subCostCenter,
        hasChildren: false,
        children: [],
        rawItem: targetAlt
      };
    }
    this.openMoveModal(item, 'import', preSelectedTarget, linesToMove);
  }

  toggleMoveLineSelection(line: SourceLineItem) {
    if (this.moveSelectedLineIds.has(line.id)) {
      this.moveSelectedLineIds.delete(line.id);
    } else {
      this.moveSelectedLineIds.add(line.id);
    }
    this.cdr.detectChanges();
  }

  toggleAllMoveLines(event: any) {
    const checked = event.target.checked;
    if (checked && this.itemToMove?.sourceLines) {
      for (const l of this.itemToMove.sourceLines) this.moveSelectedLineIds.add(l.id);
    } else {
      this.moveSelectedLineIds.clear();
    }
    this.cdr.detectChanges();
  }

  get isAllMoveLinesSelected(): boolean {
    if (!this.itemToMove?.sourceLines || this.itemToMove.sourceLines.length === 0) return false;
    return this.itemToMove.sourceLines.every(l => this.moveSelectedLineIds.has(l.id));
  }

  get selectedMoveLinesCount(): number {
    return this.moveSelectedLineIds.size;
  }

  get selectedMoveLinesTotalValue(): number {
    if (!this.itemToMove?.sourceLines) return 0;
    return this.itemToMove.sourceLines
      .filter(l => this.moveSelectedLineIds.has(l.id))
      .reduce((acc, l) => acc + (l.value || 0), 0);
  }

  populateMoveFromTarget(target: TreeItem) {
    if (target.type === 'group') {
      this.moveTargetGroup = target.code;
      const sub = this.allSubGroups.find(s => s.groupCode === target.code);
      this.moveTargetSubGroup = sub?.code || '';
      this.moveHasSubCostCenter = false;
      this.moveTargetSubCostCenter = '';
    } else if (target.type === 'subgroup') {
      this.moveTargetGroup = target.groupCode || this.findGroupBySubGroup(target.code) || '';
      this.moveTargetSubGroup = target.code;
      this.moveHasSubCostCenter = false;
      this.moveTargetSubCostCenter = '';
    } else if (target.type === 'subcostcenter') {
      this.moveTargetGroup = target.groupCode || '';
      this.moveTargetSubGroup = target.subGroupCode || '';
      this.moveHasSubCostCenter = true;
      this.moveTargetSubCostCenter = target.code;
    } else if (target.type === 'costcenter') {
      this.moveTargetGroup = target.groupCode || '';
      this.moveTargetSubGroup = target.subGroupCode || '';
      this.moveHasSubCostCenter = !!target.subCostCenter;
      this.moveTargetSubCostCenter = target.subCostCenter || '';
    }
  }

  findGroupBySubGroup(subGroupCode: string): string {
    const found = this.allSubGroups.find(s => s.code === subGroupCode);
    return found?.groupCode || '';
  }

  onMoveTargetGroupChange() {
    const firstSub = this.filteredMoveSubGroups[0];
    this.moveTargetSubGroup = firstSub?.code || '';
    this.moveTargetSubCostCenter = '';
    this.moveHasSubCostCenter = false;
    this.updateMovePreviewCode();
  }

  onMoveTargetSubGroupChange() {
    this.moveTargetSubCostCenter = '';
    this.moveHasSubCostCenter = false;
    this.updateMovePreviewCode();
  }

  onMoveHasSubCostCenterChange() {
    if (this.moveHasSubCostCenter) {
      const firstScc = this.filteredMoveSubCostCenters[0];
      this.moveTargetSubCostCenter = firstScc?.code || '';
    } else {
      this.moveTargetSubCostCenter = '';
    }
    this.updateMovePreviewCode();
  }

  async updateMovePreviewCode() {
    if (!this.itemToMove || !this.moveTargetGroup || !this.moveTargetSubGroup) {
      this.suggestedMoveCode = '';
      return;
    }

    if (this.moveContext === 'import') {
      const parentCode = (this.moveHasSubCostCenter && this.moveTargetSubCostCenter)
        ? this.moveTargetSubCostCenter
        : this.moveTargetSubGroup;
      this.suggestedMoveCode = `${parentCode}.* (automático)`;
      this.cdr.detectChanges();
      return;
    }

    this.isLoadingMovePreview = true;
    try {
      const params = new URLSearchParams({
        id: this.itemToMove.id,
        targetGroup: this.moveTargetGroup,
        targetSubGroup: this.moveTargetSubGroup,
        targetSubCostCenter: this.moveHasSubCostCenter && this.moveTargetSubCostCenter ? this.moveTargetSubCostCenter : ''
      });
      const res = await api.get(`/api/cost-centers/move/preview?${params.toString()}`);
      this.suggestedMoveCode = res.data?.result?.newCode || '';
    } catch {
      const parentCode = (this.moveHasSubCostCenter && this.moveTargetSubCostCenter)
        ? this.moveTargetSubCostCenter
        : this.moveTargetSubGroup;
      this.suggestedMoveCode = `${parentCode}.*`;
    } finally {
      this.isLoadingMovePreview = false;
      this.cdr.detectChanges();
    }
  }

  isMoveValid(): boolean {
    if (!this.itemToMove) return false;
    if (!this.moveTargetGroup || !this.moveTargetSubGroup) return false;
    if (this.moveHasSubCostCenter && !this.moveTargetSubCostCenter) return false;
    if (this.moveContext === 'import' && this.itemToMove.sourceLines && this.itemToMove.sourceLines.length > 0 && this.moveSelectedLineIds.size === 0) {
      return false;
    }
    return true;
  }

  getMoveDestinationDescription(): string {
    const grp = this.allGroups.find(g => g.code === this.moveTargetGroup)?.name || `Grupo ${this.moveTargetGroup}`;
    const subGrp = this.allSubGroups.find(sg => sg.code === this.moveTargetSubGroup)?.name || `SubGrupo ${this.moveTargetSubGroup}`;
    if (this.moveHasSubCostCenter && this.moveTargetSubCostCenter) {
      const scc = this.allSubCostCenters.find(c => c.code === this.moveTargetSubCostCenter)?.name || `SubCentro ${this.moveTargetSubCostCenter}`;
      return `${grp} > ${subGrp} > ${scc}`;
    }
    return `${grp} > ${subGrp} (Direto)`;
  }

  closeMoveModal() {
    this.isMoveModalOpen = false;
    this.itemToMove = null;
    this.suggestedMoveCode = '';
    this.moveSelectedLineIds.clear();
    this.isMoving = false;
    this.cdr.detectChanges();
  }

  async executeMove() {
    if (!this.isMoveValid() || !this.itemToMove) return;
    this.isMoving = true;
    this.cdr.detectChanges();

    if (this.moveContext === 'main') {
      try {
        const payload = {
          id: this.itemToMove.id,
          targetGroupCode: this.moveTargetGroup,
          targetSubGroupCode: this.moveTargetSubGroup,
          targetSubCostCenter: this.moveHasSubCostCenter && this.moveTargetSubCostCenter ? this.moveTargetSubCostCenter : ''
        };

        const res = await api.post('/api/cost-centers/move', payload);
        this.toastr.success(res.data?.message || 'Centro de custo transferido com sucesso!', 'Sucesso!');
        this.closeMoveModal();
        await this.loadTreeData();
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Erro ao mover centro de custo';
        this.toastr.error(msg, 'Erro');
      } finally {
        this.isMoving = false;
        this.cdr.detectChanges();
      }
    } else {
      try {
        const hasSourceLines = this.itemToMove.sourceLines && this.itemToMove.sourceLines.length > 0;
        const isSplitting = hasSourceLines && this.moveSelectedLineIds.size < this.itemToMove.sourceLines!.length;

        if (isSplitting) {
          this.applyImportSplitLinesMove(
            this.itemToMove,
            this.moveSelectedLineIds,
            this.moveTargetGroup,
            this.moveTargetSubGroup,
            this.moveHasSubCostCenter && this.moveTargetSubCostCenter ? this.moveTargetSubCostCenter : ''
          );
          this.toastr.success(`${this.moveSelectedLineIds.size} linha(s) transferida(s) no plano de importação!`, 'Reorganizado!');
        } else {
          this.applyImportTreeMove(
            this.itemToMove,
            this.moveTargetGroup,
            this.moveTargetSubGroup,
            this.moveHasSubCostCenter && this.moveTargetSubCostCenter ? this.moveTargetSubCostCenter : ''
          );
          this.toastr.success(`Item "${this.itemToMove.name}" transferido no plano de importação!`, 'Reorganizado!');
        }
        this.closeMoveModal();
      } catch (err: any) {
        this.toastr.error('Erro ao reorganizar item: ' + err.message, 'Erro');
      } finally {
        this.isMoving = false;
        this.cdr.detectChanges();
      }
    }
  }

  applyImportSplitLinesMove(
    sourceItem: TreeItem,
    selectedLineIds: Set<string>,
    targetGroupCode: string,
    targetSubGroupCode: string,
    targetSubCostCenterCode: string,
    targetCode?: string,
    targetId?: string
  ) {
    if (!this.importResult || !this.importTreeData || !sourceItem.sourceLines) return;

    const linesToMove = sourceItem.sourceLines.filter(l => selectedLineIds.has(l.id));
    const linesToKeep = sourceItem.sourceLines.filter(l => !selectedLineIds.has(l.id));

    if (linesToMove.length === 0) return;

    const moveVal = linesToMove.reduce((acc, l) => acc + (l.value || 0), 0);

    sourceItem.value = (sourceItem.value || 0) - moveVal;
    sourceItem.sourceLines = linesToKeep;
    sourceItem.sourceDescriptions = linesToKeep.map(l => l.formattedText || l.description);

    let groupNode = this.importTreeData.find(g => g.code === targetGroupCode);
    if (!groupNode) {
      const grpInfo = this.allGroups.find(g => g.code === targetGroupCode);
      groupNode = {
        id: grpInfo?.id || `grp_${targetGroupCode}`,
        code: targetGroupCode,
        name: grpInfo?.name || `Grupo ${targetGroupCode}`,
        type: 'group',
        level: 0,
        value: 0,
        hasChildren: true,
        children: [],
        rawItem: grpInfo
      };
      this.importTreeData.push(groupNode);
      this.importTreeData.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    }

    let subGroupNode = groupNode.children.find(sg => sg.code === targetSubGroupCode);
    if (!subGroupNode) {
      const sgInfo = this.allSubGroups.find(sg => sg.code === targetSubGroupCode);
      subGroupNode = {
        id: sgInfo?.id || `sg_${targetSubGroupCode}`,
        code: targetSubGroupCode,
        name: sgInfo?.name || `SubGrupo ${targetSubGroupCode}`,
        type: 'subgroup',
        level: 1,
        value: 0,
        groupCode: targetGroupCode,
        hasChildren: true,
        children: [],
        rawItem: sgInfo
      };
      groupNode.children.push(subGroupNode);
      groupNode.hasChildren = true;
      groupNode.children.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    }

    let targetContainer = subGroupNode;
    let newLevel = 2;
    if (targetSubCostCenterCode) {
      let subCcNode = subGroupNode.children.find(scc => scc.code === targetSubCostCenterCode && scc.type === 'subcostcenter');
      if (!subCcNode) {
        const sccInfo = this.allSubCostCenters.find(c => c.code === targetSubCostCenterCode);
        subCcNode = {
          id: sccInfo?.id || `scc_${targetSubCostCenterCode}`,
          code: targetSubCostCenterCode,
          name: sccInfo?.name || `SubCentro ${targetSubCostCenterCode}`,
          type: 'subcostcenter',
          level: 2,
          value: 0,
          groupCode: targetGroupCode,
          subGroupCode: targetSubGroupCode,
          hasChildren: true,
          children: [],
          rawItem: sccInfo
        };
        subGroupNode.children.push(subCcNode);
        subGroupNode.hasChildren = true;
        subGroupNode.children.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
      }
      targetContainer = subCcNode;
      newLevel = 3;
    }

    let finalCcCode = targetCode;
    let finalCcId = targetId;
    let finalCcName = sourceItem.name;

    const matchInTarget = this.allCostCenters.find(c =>
      c.name?.trim().toLowerCase() === sourceItem.name?.trim().toLowerCase() &&
      c.groupCode === targetGroupCode &&
      c.subGroupCode === targetSubGroupCode &&
      (targetSubCostCenterCode ? c.subCostCenter === targetSubCostCenterCode : (!c.subCostCenter || c.subCostCenter === ''))
    );

    if (matchInTarget) {
      finalCcCode = finalCcCode || matchInTarget.code;
      finalCcId = finalCcId || matchInTarget.id;
      finalCcName = matchInTarget.name;
    } else if (!finalCcCode) {
      const parentCode = targetSubCostCenterCode || targetSubGroupCode;
      finalCcCode = `${parentCode}.*`;
      finalCcId = finalCcId || `cc_split_${Date.now()}`;
    }

    const existingCc = targetContainer.children.find(c =>
      c.type === 'costcenter' && (
        (finalCcId && (c.costCenterId === finalCcId || c.id === finalCcId)) ||
        (finalCcCode && c.code === finalCcCode) ||
        (c.name.trim().toLowerCase() === sourceItem.name.trim().toLowerCase())
      )
    );

    let effectiveCcId = finalCcId || sourceItem.id;

    if (existingCc) {
      existingCc.value = (existingCc.value || 0) + moveVal;
      if (!existingCc.sourceLines) existingCc.sourceLines = [];
      existingCc.sourceLines.push(...linesToMove);
      if (!existingCc.sourceDescriptions) existingCc.sourceDescriptions = [];
      existingCc.sourceDescriptions.push(...linesToMove.map(l => l.formattedText || l.description));
      effectiveCcId = existingCc.costCenterId || existingCc.id;
      this.selectedImportCcIds.add(effectiveCcId);
    } else {
      const newCcItem: TreeItem = {
        id: finalCcId || `cc_${finalCcCode}_${Date.now()}`,
        costCenterId: finalCcId || sourceItem.costCenterId,
        code: finalCcCode || sourceItem.code,
        name: finalCcName,
        type: 'costcenter',
        level: newLevel,
        value: moveVal,
        groupCode: targetGroupCode,
        subGroupCode: targetSubGroupCode,
        subCostCenter: targetSubCostCenterCode || '',
        sourceLines: [...linesToMove],
        sourceDescriptions: linesToMove.map(l => l.formattedText || l.description),
        hasChildren: false,
        children: [],
        rawItem: matchInTarget || sourceItem.rawItem
      };
      targetContainer.children.push(newCcItem);
      targetContainer.hasChildren = true;
      targetContainer.children.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
      effectiveCcId = newCcItem.costCenterId || newCcItem.id;
      this.selectedImportCcIds.add(effectiveCcId);
    }

    if (this.importResult?.detailedLines) {
      const grp = this.allGroups.find(g => g.code === targetGroupCode);
      const subGrp = this.allSubGroups.find(sg => sg.code === targetSubGroupCode);
      const scc = targetSubCostCenterCode ? this.allSubCostCenters.find(c => c.code === targetSubCostCenterCode) : null;
      let path = `${grp?.name || targetGroupCode} > ${subGrp?.name || targetSubGroupCode}`;
      if (scc) path += ` > ${scc.name}`;

      for (const movedLine of linesToMove) {
        const found = this.importResult.detailedLines.find((dl: any) =>
          (movedLine.id && dl.id === movedLine.id) ||
          (dl.costCenterId === (sourceItem.costCenterId || sourceItem.id) && dl.sourceDescription === movedLine.description && dl.value === movedLine.value)
        );
        if (found) {
          found.costCenterId = effectiveCcId;
          found.costCenterCode = finalCcCode || found.costCenterCode;
          found.costCenterName = finalCcName;
          found.hierarchyPath = path;
        }
      }
    }

    const recalculateValues = (node: TreeItem): number => {
      if (node.type === 'costcenter') {
        return node.value || 0;
      }
      let sum = 0;
      if (node.children) {
        for (const child of node.children) {
          sum += recalculateValues(child);
        }
      }
      node.value = sum;
      return sum;
    };

    for (const grp of this.importTreeData) {
      recalculateValues(grp);
    }

    this.importExpandedNodeIds.add(groupNode.id);
    this.importExpandedNodeIds.add(subGroupNode.id);
    if (targetSubCostCenterCode && targetContainer.id) {
      this.importExpandedNodeIds.add(targetContainer.id);
    }

    this.cdr.detectChanges();
  }

  applyImportTreeMove(
    item: TreeItem,
    targetGroupCode: string,
    targetSubGroupCode: string,
    targetSubCostCenterCode: string,
    targetCode?: string,
    targetId?: string
  ) {
    if (!this.importResult || !this.importTreeData) return;

    const removeItem = (nodes: TreeItem[]): boolean => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.id === item.id) {
          nodes.splice(i, 1);
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (removeItem(node.children)) {
            node.hasChildren = node.children.length > 0;
            return true;
          }
        }
      }
      return false;
    };
    removeItem(this.importTreeData);

    let groupNode = this.importTreeData.find(g => g.code === targetGroupCode);
    if (!groupNode) {
      const grpInfo = this.allGroups.find(g => g.code === targetGroupCode);
      groupNode = {
        id: grpInfo?.id || `grp_${targetGroupCode}`,
        code: targetGroupCode,
        name: grpInfo?.name || `Grupo ${targetGroupCode}`,
        type: 'group',
        level: 0,
        value: 0,
        hasChildren: true,
        children: [],
        rawItem: grpInfo
      };
      this.importTreeData.push(groupNode);
      this.importTreeData.sort((a, b) => a.code.localeCompare(b.code));
    }

    let subGroupNode = groupNode.children.find(sg => sg.code === targetSubGroupCode);
    if (!subGroupNode) {
      const sgInfo = this.allSubGroups.find(sg => sg.code === targetSubGroupCode);
      subGroupNode = {
        id: sgInfo?.id || `sg_${targetSubGroupCode}`,
        code: targetSubGroupCode,
        name: sgInfo?.name || `SubGrupo ${targetSubGroupCode}`,
        type: 'subgroup',
        level: 1,
        value: 0,
        groupCode: targetGroupCode,
        hasChildren: true,
        children: [],
        rawItem: sgInfo
      };
      groupNode.children.push(subGroupNode);
      groupNode.hasChildren = true;
      groupNode.children.sort((a, b) => a.code.localeCompare(b.code));
    }

    let targetContainer = subGroupNode;
    let newLevel = 2;
    if (targetSubCostCenterCode) {
      let subCcNode = subGroupNode.children.find(scc => scc.code === targetSubCostCenterCode && scc.type === 'subcostcenter');
      if (!subCcNode) {
        const sccInfo = this.allSubCostCenters.find(c => c.code === targetSubCostCenterCode);
        subCcNode = {
          id: sccInfo?.id || `scc_${targetSubCostCenterCode}`,
          code: targetSubCostCenterCode,
          name: sccInfo?.name || `SubCentro ${targetSubCostCenterCode}`,
          type: 'subcostcenter',
          level: 2,
          value: 0,
          groupCode: targetGroupCode,
          subGroupCode: targetSubGroupCode,
          hasChildren: true,
          children: [],
          rawItem: sccInfo
        };
        subGroupNode.children.push(subCcNode);
        subGroupNode.hasChildren = true;
        subGroupNode.children.sort((a, b) => a.code.localeCompare(b.code));
      }
      targetContainer = subCcNode;
      newLevel = 3;
    }

    item.groupCode = targetGroupCode;
    item.subGroupCode = targetSubGroupCode;
    item.subCostCenter = targetSubCostCenterCode || '';
    item.level = newLevel;

    if (targetCode) {
      item.code = targetCode;
    } else {

      const matchInTarget = this.allCostCenters.find(c =>
        c.name?.trim().toLowerCase() === item.name?.trim().toLowerCase() &&
        c.groupCode === targetGroupCode &&
        c.subGroupCode === targetSubGroupCode &&
        (targetSubCostCenterCode ? c.subCostCenter === targetSubCostCenterCode : (!c.subCostCenter || c.subCostCenter === ''))
      );
      if (matchInTarget) {
        item.code = matchInTarget.code;
        item.costCenterId = matchInTarget.id;
      } else {
        const parentCode = targetSubCostCenterCode || targetSubGroupCode;
        item.code = `${parentCode}.*`;
      }
    }

    if (targetId) {
      item.costCenterId = targetId;
    }

    const existingCc = targetContainer.children.find(c =>
      c.type === 'costcenter' && (
        (targetId && (c.costCenterId === targetId || c.id === targetId)) ||
        (targetCode && c.code === targetCode) ||
        (c.costCenterId && item.costCenterId && c.costCenterId === item.costCenterId) ||
        (c.name.trim().toLowerCase() === item.name.trim().toLowerCase())
      )
    );

    if (existingCc && existingCc.id !== item.id) {
      existingCc.value = (existingCc.value || 0) + (item.value || 0);
      if (item.sourceLines && item.sourceLines.length > 0) {
        if (!existingCc.sourceLines) existingCc.sourceLines = [];
        existingCc.sourceLines.push(...item.sourceLines);
      }
      if (item.sourceDescriptions && item.sourceDescriptions.length > 0) {
        if (!existingCc.sourceDescriptions) existingCc.sourceDescriptions = [];
        existingCc.sourceDescriptions.push(...item.sourceDescriptions);
      }
      if (item.hasAmbiguity) {
        existingCc.hasAmbiguity = true;
        existingCc.alternativeCandidates = item.alternativeCandidates || existingCc.alternativeCandidates;
      }
      const oldId = item.costCenterId || item.id;
      const existId = existingCc.costCenterId || existingCc.id;
      if (this.selectedImportCcIds.has(oldId)) {
        this.selectedImportCcIds.add(existId);
      }
    } else {
      targetContainer.children.push(item);
      targetContainer.hasChildren = true;
      targetContainer.children.sort((a, b) => a.code.localeCompare(b.code));
      const newId = item.costCenterId || item.id;
      this.selectedImportCcIds.add(newId);
    }

    const recalculateValues = (node: TreeItem): number => {
      if (node.type === 'costcenter') {
        return node.value || 0;
      }
      let sum = 0;
      if (node.children) {
        for (const child of node.children) {
          sum += recalculateValues(child);
        }
      }
      node.value = sum;
      return sum;
    };

    this.importTreeData = this.importTreeData.filter(g => {
      g.children = g.children.filter(sg => {
        if (sg.children) {
          sg.children = sg.children.filter(c => c.type === 'costcenter' || (c.children && c.children.length > 0));
        }
        return sg.children && sg.children.length > 0;
      });
      return g.children && g.children.length > 0;
    });

    for (const grp of this.importTreeData) {
      recalculateValues(grp);
    }

    this.importExpandedNodeIds.add(groupNode.id);
    this.importExpandedNodeIds.add(subGroupNode.id);
    if (targetSubCostCenterCode && targetContainer.id) {
      this.importExpandedNodeIds.add(targetContainer.id);
    }

    this.cdr.detectChanges();
  }

  onDragStart(item: TreeItem, event: DragEvent, context: 'main' | 'import') {
    if (item.type !== 'costcenter') {
      event.preventDefault();
      return;
    }
    this.draggedItem = item;
    this.draggedContext = context;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', item.id);
    }
  }

  onDragEnd() {
    this.draggedItem = null;
    this.dragOverTargetId = null;
    this.cdr.detectChanges();
  }

  onDragOver(targetItem: TreeItem, event: DragEvent, context: 'main' | 'import') {
    if (!this.draggedItem || this.draggedContext !== context) return;
    if (this.draggedItem.id === targetItem.id) return;

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverTargetId = targetItem.id;
  }

  onDragLeave(targetItem: TreeItem, event: DragEvent) {
    if (this.dragOverTargetId === targetItem.id) {
      this.dragOverTargetId = null;
    }
  }

  onDrop(targetItem: TreeItem, event: DragEvent, context: 'main' | 'import') {
    event.preventDefault();
    event.stopPropagation();

    const item = this.draggedItem;
    this.draggedItem = null;
    this.dragOverTargetId = null;

    if (!item || item.id === targetItem.id) return;

    this.openMoveModal(item, context, targetItem);
  }

  getCurrentLocation(item: TreeItem): string {
    const grp = this.allGroups.find(g => g.code === item.groupCode)?.name || `Grupo ${item.groupCode}`;
    const subGrp = this.allSubGroups.find(sg => sg.code === item.subGroupCode)?.name || `SubGrupo ${item.subGroupCode}`;
    if (item.subCostCenter) {
      const scc = this.allSubCostCenters.find(c => c.code === item.subCostCenter)?.name || `SubCentro ${item.subCostCenter}`;
      return `${subGrp} > ${scc}`;
    }
    return `${grp} > ${subGrp}`;
  }

  onSwitchDestinationClick(item: TreeItem, alt: any, event?: Event) {
    if (event) event.stopPropagation();
    this.initializeNodeSourceLines(item);
    if (item.sourceLines && item.sourceLines.length > 1) {
      this.openMoveModalForLines(item, undefined, event, alt);
    } else {
      this.quickSwitchDestination(item, alt);
    }
  }

  quickSwitchDestination(item: TreeItem, alt: any) {

    const oldLocation = {
      id: item.costCenterId || (item.id.includes('_row_') ? item.id.split('_row_')[0] : item.id),
      code: item.code,
      name: item.name,
      groupCode: item.groupCode,
      subGroupCode: item.subGroupCode,
      subCostCenter: item.subCostCenter || '',
      path: this.getCurrentLocation(item)
    };

    this.applyImportTreeMove(
      item,
      alt.groupCode,
      alt.subGroupCode,
      alt.subCostCenter || '',
      alt.code,
      alt.id
    );

    item.hasAmbiguity = true;
    if (item.rawItem) item.rawItem.hasAmbiguity = true;

    let alts = (item.alternativeCandidates || item.rawItem?.alternativeCandidates || []).filter(
      (c: any) => c.id !== alt.id && c.code !== alt.code
    );
    alts.unshift(oldLocation);
    item.alternativeCandidates = alts;
    if (item.rawItem) item.rawItem.alternativeCandidates = alts;

    this.toastr.success(`Item transferido para ${alt.code} - ${alt.path}! O aviso permanece para sua conferência.`, 'Alocação Atualizada');
    this.cdr.detectChanges();
  }

  dismissAmbiguity(item: TreeItem) {
    item.hasAmbiguity = false;
    if (item.rawItem) item.rawItem.hasAmbiguity = false;

    if (this.importResult && this.importResult.ambiguousCount > 0) {
      this.importResult.ambiguousCount--;
    }

    this.toastr.info(`Alocação de "${item.name}" mantida neste local.`, 'Confirmado');
    this.cdr.detectChanges();
  }

  async openHistoryModal() {
    this.isHistoryModalOpen = true;
    this.selectedHistory = null;
    this.historySearchQuery = '';
    this.isLoadingHistory = true;
    this.cdr.detectChanges();

    try {
      const res = await api.get('/api/cost-centers/import/history');
      const data = res.data?.result;
      this.historyList = Array.isArray(data) ? data : (data?.list || []);
    } catch (err: any) {
      this.toastr.error('Erro ao carregar histórico de importações', 'Erro');
    } finally {
      this.isLoadingHistory = false;
      this.cdr.detectChanges();
    }
  }

  closeHistoryModal() {
    this.isHistoryModalOpen = false;
    this.selectedHistory = null;
    this.historySearchQuery = '';
    this.cdr.detectChanges();
  }

  async viewHistoryDetail(hist: any) {
    this.isLoadingHistoryDetail = true;
    this.selectedHistory = hist;
    this.historySearchQuery = '';
    this.cdr.detectChanges();

    try {
      const res = await api.get(`/api/cost-centers/import/history/${hist.id}`);
      this.selectedHistory = res.data?.result || hist;
    } catch (err: any) {
      this.toastr.error('Erro ao carregar detalhes da importação', 'Erro');
    } finally {
      this.isLoadingHistoryDetail = false;
      this.cdr.detectChanges();
    }
  }

  backToHistoryList() {
    this.selectedHistory = null;
    this.historySearchQuery = '';
    this.cdr.detectChanges();
  }

  openDeleteHistoryModal(hist: any, event?: Event) {
    if (event) event.stopPropagation();
    this.itemHistoryToDelete = hist;
    this.isConfirmDeleteHistoryModalOpen = true;
    this.cdr.detectChanges();
  }

  closeDeleteHistoryModal() {
    this.isConfirmDeleteHistoryModalOpen = false;
    this.itemHistoryToDelete = null;
    this.isDeletingHistory = false;
    this.cdr.detectChanges();
  }

  async executeDeleteHistory() {
    if (!this.itemHistoryToDelete) return;
    this.isDeletingHistory = true;
    this.cdr.detectChanges();

    try {
      const res = await api.delete(`/api/cost-centers/import/history/${this.itemHistoryToDelete.id}`);
      this.toastr.success(res.data?.message || 'Importação removida e valores estornados com sucesso!', 'Sucesso!');
      if (this.selectedHistory && this.selectedHistory.id === this.itemHistoryToDelete.id) {
        this.selectedHistory = null;
      }
      this.closeDeleteHistoryModal();
      await this.openHistoryModal();
      await this.loadTreeData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Erro ao remover importação';
      this.toastr.error(msg, 'Erro');
    } finally {
      this.isDeletingHistory = false;
      this.cdr.detectChanges();
    }
  }

  get filteredHistoryLines(): any[] {
    if (!this.selectedHistory || !this.selectedHistory.items) return [];
    if (!this.historySearchQuery || !this.historySearchQuery.trim()) {
      return this.selectedHistory.items;
    }
    const q = this.historySearchQuery.trim().toLowerCase();
    return this.selectedHistory.items.filter((line: any) =>
      (line.costCenterCode && line.costCenterCode.toLowerCase().includes(q)) ||
      (line.costCenterName && line.costCenterName.toLowerCase().includes(q)) ||
      (line.sourceDescription && line.sourceDescription.toLowerCase().includes(q)) ||
      (line.hierarchyPath && line.hierarchyPath.toLowerCase().includes(q))
    );
  }
}
