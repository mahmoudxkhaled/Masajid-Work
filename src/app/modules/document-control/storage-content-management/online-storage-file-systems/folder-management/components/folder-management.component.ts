import { DOCUMENT } from '@angular/common';
import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, ViewChild, ElementRef, ChangeDetectorRef, Inject, HostListener, Renderer2 } from '@angular/core';
import { Observable, firstValueFrom, forkJoin, of } from 'rxjs';
import { MenuItem, MessageService, TreeNode } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { FolderService } from '../services/folder.service';
import { FileService } from '../services/file.service';
import { FolderStructureItem, Folder, FolderContents } from '../models/folder.model';
import { FileUploadService } from 'src/app/core/file-system-lib/services/file-upload.service';
import { FileDownloadService } from 'src/app/core/file-system-lib/services/file-download.service';
import { TransferProgressService } from 'src/app/core/file-system-lib/services/transfer-progress.service';
import { isFolderNameValid } from 'src/app/core/validators/folder-name.validator';
import { AccessRight, FsPermissionsService } from '../services/fs-permissions.service';


export interface FolderTreeNode extends TreeNode {
  data: {
    folderId: number;
    folderName: string;
    parentFolderId: number;
  };
}


export interface FolderContentRow {
  id: number;
  name: string;
  type: 'folder' | 'file' | 'back';
  size?: string;

  created?: string;

  modified?: string;
  isFolder: boolean;
  isBackButton?: boolean;
}

type FolderBreadcrumbNavPiece =
  | { kind: 'segment'; folderId: number; label: string; isLast: boolean }
  | { kind: 'ellipsis'; hidden: Array<{ folderId: number; label: string }> };


@Component({
  selector: 'app-folder-management',
  templateUrl: './folder-management.component.html',
  styleUrls: ['./folder-management.component.scss']
})
export class FolderManagementComponent implements OnInit, OnChanges, OnDestroy {

  @Input() fileSystemId: number = 0;

  isLoading$: Observable<boolean>;
  treeLoading = false;
  tableLoadingSpinner = false;


  effectiveAccessRight: AccessRight = 'None';
  permissionsLoading = false;

  folderTreeNodes: TreeNode[] = [];
  selectedFolderNode: TreeNode | null = null;
  currentFolderId: number = 0;
  folderNavBackStack: number[] = [];

  folderContents: FolderContentRow[] = [];
  showDeletedFolders = false;

  folderSizeCache = new Map<number, string>();

  folderSizeLoading = new Set<number>();

  createFolderDialogVisible = false;
  uploadDialogVisible = false;
  renameFolderDialogVisible = false;
  moveFolderDialogVisible = false;
  deleteFolderConfirmVisible = false;

  selectedFiles: File[] = [];
  uploadProgressPercent = 0;
  uploadInProgress = false;
  uploadError: string | null = null;
  @ViewChild('fileInput', { static: false }) fileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('breadcrumbEllipsisTeleportHost') private breadcrumbEllipsisTeleportHostRef?: ElementRef<HTMLElement>;
  @ViewChild('breadcrumbEllipsisPanel') private breadcrumbEllipsisPanelRef?: ElementRef<HTMLElement>;
  fileUploadStatus = new Map<string, 'pending' | 'uploading' | 'completed' | 'error'>();
  currentUploadingFileName: string | null = null;
  isDragOver = false;

  newFolderName = '';
  newFolderParentId: number = 0;
  renameFolderName = '';

  createFolderNameError: string | null = null;

  renameFolderNameError: string | null = null;
  selectedFolderForRename: FolderTreeNode | null = null;
  selectedFolderForMove: FolderTreeNode | null = null;
  selectedFolderForDelete: FolderTreeNode | null = null;

  moveDestinationKind: 'root' | 'folder' = 'folder';
  moveDestinationNode: TreeNode | null = null;
  selectedFolderForRestore: FolderTreeNode | null = null;

  recycleBinDialogVisible = false;
  recycleBinLoading = false;
  deletedFolders: Folder[] = [];
  deletedFiles: any[] = [];

  recycleBinFolderSearch = '';

  recycleBinFileSearch = '';

  selectedFoldersToRestore: Folder[] = [];

  selectedFilesToRestore: any[] = [];

  skippedFileIds = new Set<number>();

  folderMenuItems: MenuItem[] = [];
  selectedFolderForMenu: FolderTreeNode | null = null;

  breadcrumbEllipsisOpen = false;
  breadcrumbEllipsisPanelTop = 0;
  breadcrumbEllipsisPanelLeft = 0;
  breadcrumbEllipsisHiddenFolders: Array<{ folderId: number; label: string }> = [];

  fileMenuItems: MenuItem[] = [];
  selectedFileForMenu: FolderContentRow | null = null;

  fileDetailsDialogVisible = false;
  renameFileDialogVisible = false;
  deleteFileConfirmVisible = false;

  selectedFileForDetails: FolderContentRow | null = null;
  selectedFileForRename: FolderContentRow | null = null;
  selectedFileForDelete: FolderContentRow | null = null;
  fileDetails: any = null;
  fileDetailsLoading = false;

  fileDetailsError: string | null = null;
  renameFileName = '';
  renameFileType = '';
  downloadProgressPercent = 0;
  downloadInProgress = false;
  currentDownloadingFileName: string | null = null;
  downloadProgressVisible = false;
  downloadFileSizeBytes: number = 0;
  downloadRemainingBytes: number = 0;

  constructor(
    private translate: TranslationService,
    private messageService: MessageService,
    @Inject(FolderService) private folderService: FolderService,
    private fileService: FileService,
    private fileUploadService: FileUploadService,
    private fileDownloadService: FileDownloadService,
    private transferProgressService: TransferProgressService,
    private localStorageService: LocalStorageService,
    private fsPermissionsService: FsPermissionsService,
    private cdr: ChangeDetectorRef,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private documentRef: Document
  ) {
    this.isLoading$ = this.folderService.isLoadingSubject.asObservable();
  }

  ngOnInit(): void {
    if (this.fileSystemId > 0) {
      this.clearFolderNavigationHistory();
      this.loadFileSystemPermissions();
      this.loadFolderStructure();
      this.loadFolderContents(0);
    }
  }

  ngOnDestroy(): void {
    this.restoreBreadcrumbEllipsisPanelToHost();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fileSystemId'] && !changes['fileSystemId'].firstChange) {
      const newFileSystemId = changes['fileSystemId'].currentValue;
      if (newFileSystemId > 0) {
        this.currentFolderId = 0;
        this.clearFolderNavigationHistory();
        this.selectedFolderNode = null;
        this.loadFileSystemPermissions();
        this.loadFolderStructure();
        this.loadFolderContents(0);
      } else {
        this.folderTreeNodes = [];
        this.folderContents = [];
        this.effectiveAccessRight = 'None';
      }
    }
  }

  /**
   * Fetch effective access right for the current account on this file system.
   * UI uses this to hide actions that are not allowed.
   */
  loadFileSystemPermissions(): void {
    const accountId = this.localStorageService.getAccountDetails()?.Account_ID ?? 0;
    if (this.fileSystemId <= 0 || accountId <= 0) {
      this.effectiveAccessRight = 'None';
      return;
    }

    this.permissionsLoading = true;
    this.fsPermissionsService.listAccountFsPermissions(accountId, this.fileSystemId).subscribe({
      next: (result) => {
        this.permissionsLoading = false;
        this.effectiveAccessRight = result?.effectiveAccessRight ?? 'None';
      },
      error: (response: any) => {
        this.effectiveAccessRight = 'None';
        this.handleBusinessError('listPermissions', response);
      }
    });
  }

  private accessRank(right: AccessRight): number {
    const map: Record<AccessRight, number> = {
      None: 0,
      List: 1,
      Read: 2,
      Amend: 3,
      Modify: 4,
      Full: 5,
    };
    return map[right] ?? 0;
  }

  /** Read-only actions (download/details) */
  get canRead(): boolean {
    return this.accessRank(this.effectiveAccessRight) >= this.accessRank('Read');
  }

  /** Modify or Full: create/upload/move/delete/rename/restore */
  get canModify(): boolean {
    return this.accessRank(this.effectiveAccessRight) >= this.accessRank('Modify');
  }

  get canFull(): boolean {
    return this.effectiveAccessRight === 'Full';
  }

  /**
   * When loading and the contents list is empty, return placeholder rows
   * so the table can show skeleton cells.
   */
  get folderContentsTableValue(): FolderContentRow[] {
    if (this.tableLoadingSpinner && this.folderContents.length === 0) {
      return Array(12).fill(null).map(() => ({
        id: 0,
        name: '',
        type: 'folder',
        size: '',
        created: '',
        modified: '',
        isFolder: true
      }));
    }

    return this.folderContents;
  }

  /**
   * Load folder structure from Get_Folder_Structure API.
   * Builds the tree starting from root (Parent_Folder_ID = 0).
   */
  loadFolderStructure(): void {
    if (this.fileSystemId <= 0) {
      return;
    }

    this.treeLoading = true;
    this.folderService.getFolderStructure(this.fileSystemId, false).subscribe({
      next: (response: any) => {
        this.treeLoading = false;
        if (!response?.success) {
          this.handleBusinessError('getStructure', response);
          return;
        }

        const raw = response.message;
        const structureItems = this.normalizeFolderStructureResponse(raw);
        this.folderTreeNodes = this.buildTreeFromStructure(structureItems);
      },
      error: () => {
        this.treeLoading = false;
      }
    });
  }

  /**
   * Normalize Get_Folder_Structure response to FolderStructureItem[].
   * API may return array of arrays [[Folder_ID, Parent_Folder_ID, Folder_Name], ...]
   * or array of objects with folder_ID, parent_Folder_ID, folder_Name.
   */
  private normalizeFolderStructureResponse(raw: any): FolderStructureItem[] {
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : (raw?.Folders ?? raw?.folders ?? []);
    if (list.length === 0) return [];

    const first = list[0];
    if (Array.isArray(first)) {
      return (list as any[][]).map((row) => ({
        folder_ID: Number(row[0] ?? 0),
        parent_Folder_ID: Number(row[1] ?? 0),
        folder_Name: String(row[2] ?? '')
      }));
    }
    return list.map((item: any) => ({
      folder_ID: Number(item?.folder_ID ?? 0),
      parent_Folder_ID: Number(item?.parent_Folder_ID ?? 0),
      folder_Name: String(item?.folder_Name ?? '')
    }));
  }

  /**
   * Build PrimeNG TreeNode[] from flat folder structure array.
   * Root folders have Parent_Folder_ID = 0.
   */
  private buildTreeFromStructure(items: FolderStructureItem[]): TreeNode[] {
    const folderMap = new Map<number, TreeNode>();

    items.forEach((item) => {
      const folderId = Number(item?.folder_ID ?? 0);
      const folderName = String(item?.folder_Name ?? '');
      const parentId = Number(item?.parent_Folder_ID ?? 0);

      const node: FolderTreeNode = {
        label: folderName,
        data: {
          folderId,
          folderName,
          parentFolderId: parentId
        },
        key: folderId.toString(),
        expanded: false,
        children: []
      };

      folderMap.set(folderId, node);
    });

    const rootNodes: TreeNode[] = [];
    folderMap.forEach((node) => {
      const parentId = node.data.parentFolderId;
      if (parentId === 0) {
        rootNodes.push(node);
      } else {
        const parent = folderMap.get(parentId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      }
    });

    return rootNodes;
  }

  // #region Folder navigation
  private clearFolderNavigationHistory(): void {
    this.folderNavBackStack = [];
  }

  private findFolderTreeNodeByIdRecursive(nodes: TreeNode[], id: number): TreeNode | null {
    for (const node of nodes) {
      const nodeId = (node as FolderTreeNode).data?.folderId;
      if (nodeId === id) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = this.findFolderTreeNodeByIdRecursive(node.children, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  private findTreeAncestors(nodes: TreeNode[], targetId: number): TreeNode[] | null {
    for (const node of nodes) {
      const nodeId = (node as FolderTreeNode).data?.folderId;
      if (nodeId === targetId) {
        return [];
      }
      if (node.children && node.children.length > 0) {
        const childPath = this.findTreeAncestors(node.children, targetId);
        if (childPath !== null) {
          return [node, ...childPath];
        }
      }
    }
    return null;
  }

  private expandTreePathToFolder(targetId: number): void {
    const ancestors = this.findTreeAncestors(this.folderTreeNodes, targetId);
    if (ancestors) {
      ancestors.forEach((node) => {
        node.expanded = true;
      });
    }
  }

  private buildFolderPathChainFromTree(folderId: number): FolderTreeNode[] {
    if (folderId === 0) {
      return [];
    }
    const chain: FolderTreeNode[] = [];
    let curId: number | null = folderId;
    const visited = new Set<number>();
    while (curId != null && curId !== 0) {
      if (visited.has(curId)) {
        break;
      }
      visited.add(curId);
      const n = this.findFolderTreeNodeByIdRecursive(this.folderTreeNodes, curId);
      if (!n) {
        break;
      }
      chain.unshift(n as FolderTreeNode);
      const pid = (n as FolderTreeNode).data?.parentFolderId ?? 0;
      curId = pid === 0 ? null : pid;
    }
    return chain;
  }

  private buildFolderBreadcrumbSegmentsList(): Array<{ folderId: number; label: string }> {
    const segments: Array<{ folderId: number; label: string }> = [{ folderId: 0, label: '' }];
    if (this.currentFolderId === 0) {
      return segments;
    }
    const chain = this.buildFolderPathChainFromTree(this.currentFolderId);
    const unnamed = this.translate.getInstant('fileSystem.folderManagement.breadcrumbUnnamedFolder');
    for (const n of chain) {
      const label = String(n.label ?? n.data.folderName ?? '').trim();
      segments.push({
        folderId: n.data.folderId,
        label: label || unnamed
      });
    }
    if (chain.length === 0) {
      segments.push({
        folderId: this.currentFolderId,
        label: unnamed
      });
    }
    return segments;
  }

  get folderBreadcrumbNavPieces(): FolderBreadcrumbNavPiece[] {
    const segs = this.buildFolderBreadcrumbSegmentsList();
    if (segs.length <= 3) {
      return segs.map((s, i) => ({
        kind: 'segment' as const,
        folderId: s.folderId,
        label: s.label,
        isLast: i === segs.length - 1
      }));
    }
    const tail = segs.slice(-2);
    const hidden = segs.slice(1, -2);
    return [
      { kind: 'segment', folderId: segs[0].folderId, label: segs[0].label, isLast: false },
      { kind: 'ellipsis', hidden },
      ...tail.map((s, i) => ({
        kind: 'segment' as const,
        folderId: s.folderId,
        label: s.label,
        isLast: i === tail.length - 1
      }))
    ];
  }

  openBreadcrumbEllipsisMenu(
    event: MouseEvent,
    hidden: Array<{ folderId: number; label: string }>
  ): void {
    event.stopPropagation();
    if (this.breadcrumbEllipsisOpen) {
      this.closeBreadcrumbEllipsisPanel();
      return;
    }
    const anchor =
      (event.currentTarget as HTMLElement | null) ??
      (event.target instanceof HTMLElement ? event.target.closest('button') : null);
    if (!anchor) {
      return;
    }
    this.breadcrumbEllipsisHiddenFolders = [...hidden];
    const r = anchor.getBoundingClientRect();
    const gap = 4;
    const panelMinWidth = 240;
    let left = r.left;
    const maxLeft = window.innerWidth - panelMinWidth - 8;
    if (left > maxLeft) {
      left = Math.max(8, maxLeft);
    }
    if (left < 8) {
      left = 8;
    }
    const rowApprox = 40;
    const panelH = this.breadcrumbEllipsisHiddenFolders.length * rowApprox + 16;
    let top = r.bottom + gap;
    if (top + panelH > window.innerHeight) {
      top = Math.max(8, r.top - panelH - gap);
    }
    this.breadcrumbEllipsisPanelTop = top;
    this.breadcrumbEllipsisPanelLeft = left;
    this.breadcrumbEllipsisOpen = true;
    this.cdr.detectChanges();
    queueMicrotask(() => this.moveBreadcrumbEllipsisPanelToBody());
  }

  private moveBreadcrumbEllipsisPanelToBody(): void {
    const panel = this.breadcrumbEllipsisPanelRef?.nativeElement;
    const body = this.documentRef?.body;
    if (!panel || !body || panel.parentElement === body) {
      return;
    }
    this.renderer.appendChild(body, panel);
  }

  private restoreBreadcrumbEllipsisPanelToHost(): void {
    const panel = this.breadcrumbEllipsisPanelRef?.nativeElement;
    const host = this.breadcrumbEllipsisTeleportHostRef?.nativeElement;
    if (!panel || !host?.parentElement) {
      return;
    }
    if (panel.parentElement !== this.documentRef.body) {
      return;
    }
    const parent = host.parentElement;
    const refNode = host.nextSibling;
    if (refNode) {
      this.renderer.insertBefore(parent, panel, refNode);
    } else {
      this.renderer.appendChild(parent, panel);
    }
  }

  closeBreadcrumbEllipsisPanel(): void {
    this.restoreBreadcrumbEllipsisPanelToHost();
    this.breadcrumbEllipsisOpen = false;
    this.breadcrumbEllipsisHiddenFolders = [];
  }

  onEllipsisFolderClick(folderId: number): void {
    this.closeBreadcrumbEllipsisPanel();
    this.navigateBreadcrumbTo(folderId);
  }

  ellipsisTailSegments(segs: Array<{ folderId: number; label: string }>): Array<{ folderId: number; label: string }> {
    return segs.length <= 1 ? [] : segs.slice(1);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClickBreadcrumbEllipsis(event: MouseEvent): void {
    if (!this.breadcrumbEllipsisOpen) {
      return;
    }
    const t = event.target as HTMLElement;
    if (t.closest('.folder-breadcrumb__ellipsis-panel')) {
      return;
    }
    if (t.closest('.folder-breadcrumb__ellipsis')) {
      return;
    }
    this.closeBreadcrumbEllipsisPanel();
  }

  @HostListener('document:keydown.escape')
  onEscapeCloseBreadcrumbEllipsis(): void {
    if (this.breadcrumbEllipsisOpen) {
      this.closeBreadcrumbEllipsisPanel();
    }
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onWindowScrollResizeCloseEllipsis(): void {
    if (this.breadcrumbEllipsisOpen) {
      this.closeBreadcrumbEllipsisPanel();
    }
  }

  navigateBreadcrumbTo(folderId: number): void {
    if (folderId === this.currentFolderId) {
      return;
    }
    const node = folderId === 0 ? null : this.findFolderTreeNodeByIdRecursive(this.folderTreeNodes, folderId);
    this.selectedFolderNode = node;
    if (node) {
      this.expandTreePathToFolder(folderId);
    }
    this.loadFolderContents(folderId, true);
  }

  // #endregion

  /**
   * Load folder contents from Get_Folder_Contents API.
   * Shows subfolders and files in the selected folder.
   */
  loadFolderContents(folderId: number, recordHistory: boolean = false): void {
    if (this.fileSystemId <= 0) {
      return;
    }

    this.tableLoadingSpinner = true;
    const fromFolderId = this.currentFolderId;
    this.currentFolderId = folderId;

    this.folderService.getFolderContents(folderId, this.fileSystemId).subscribe({
      next: (response: any) => {
        this.tableLoadingSpinner = false;
        if (!response?.success) {
          this.handleBusinessError('getContents', response);
          return;
        }

        if (recordHistory && folderId !== fromFolderId) {
          this.folderNavBackStack.push(fromFolderId);
        }

        const raw = response.message;
        const contents: FolderContents = raw ?? { folders: [], files: [] };
        const foldersList = contents.folders ?? contents.Folders ?? [];
        const filesList = contents.files ?? contents.Files ?? [];

        const folderRows: FolderContentRow[] = foldersList.map((folder: any) => ({
          id: Number(folder?.folder_id ?? folder?.folder_ID ?? folder?.Folder_ID ?? 0),
          name: String(folder?.folder_name ?? folder?.folder_Name ?? ''),
          type: 'folder' as const,
          isFolder: true,
          created: String(folder?.created_At ?? folder?.created_at ?? ''),
          modified: String(folder?.last_modified ?? folder?.last_modified_At ?? '')
        }));

        const fileRows: FolderContentRow[] = filesList.map((file: any) => ({
          id: Number(file?.file_id ?? file?.file_ID ?? file?.File_ID ?? 0),
          name: String(file?.file_name ?? file?.file_Name ?? ''),
          type: 'file' as const,
          size: file?.size != null ? this.formatBytes(Number(file.size)) : '',
          created: String(file?.created_At ?? file?.created_at ?? file?.created ?? ''),
          modified: String(file?.last_modified ?? file?.modified_At ?? ''),
          isFolder: false
        }));

        this.folderContents = [...folderRows, ...fileRows];
      },
      error: () => {
        this.tableLoadingSpinner = false;
      }
    });
  }

  /**
   * Format bytes to human-readable string (e.g. "1.25 GB", "512.00 MB").
   */
  formatBytes(bytes: number): string {
    if (bytes <= 0) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return gb.toFixed(2) + ' GB';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? (mb.toFixed(2) + ' MB') : (bytes / 1024).toFixed(2) + ' KB';
  }

  /**
   * Called when user clicks the calculate-size icon on a folder row.
   * Uses Get_Total_Folder_Size API and updates the cache with formatted size.
   */
  onCalculateFolderSize(row: FolderContentRow): void {
    if (!row.isFolder || this.folderSizeLoading.has(row.id)) {
      return;
    }
    this.folderSizeLoading.add(row.id);
    this.folderService.getTotalFolderSize(row.id, this.fileSystemId).subscribe({
      next: (response: any) => {
        this.folderSizeLoading.delete(row.id);
        if (!response?.success) {
          this.cdr.markForCheck();
          return;
        }
        this.folderSizeCache.set(row.id, this.formatBytes(response.message));
        this.cdr.markForCheck();
      },
      error: () => {
        this.folderSizeLoading.delete(row.id);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Format ISO date-time string for display (e.g. "Jan 03, 2026, 07:36 PM"). Day and hour with leading zero, no seconds.
   */
  formatDateTime(value: string | null | undefined): string {
    if (value == null || value === '') return '—';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '—';
    const month = date.toLocaleString(undefined, { month: 'short' });
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    const time = date.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${month} ${day}, ${year}, ${time}`;
  }

  /**
   * Handle folder node selection in tree.
   */
  onFolderNodeSelect(event: { node: TreeNode }): void {
    const folderNode = event.node as FolderTreeNode;
    if (folderNode?.data?.folderId !== undefined) {
      this.selectedFolderNode = folderNode;
      this.loadFolderContents(folderNode.data.folderId, true);
    }
  }

  /**
   * Build menu items for the 3-dot row menu. Called when opening the menu.
   * Modify or Full: Create folder, Upload, Rename, Move, Delete.
   */
  buildFolderMenuItems(): void {
    const folder = this.selectedFolderForMenu;
    if (!folder) {
      this.folderMenuItems = [];
      return;
    }

    const items: MenuItem[] = [];

    if (this.canModify) {
      items.push(
        {
          label: this.translate.getInstant('fileSystem.folderManagement.createFolder'),
          icon: 'pi pi-plus',
          command: () => this.showCreateFolderDialogForFolder(folder)
        },
        {
          label: this.translate.getInstant('fileSystem.folderManagement.upload'),
          icon: 'pi pi-upload',
          command: () => this.showUploadDialogForFolder(folder)
        },
        { separator: true },
        {
          label: this.translate.getInstant('fileSystem.folderManagement.renameFolder'),
          icon: 'pi pi-pencil',
          command: () => this.showRenameFolderDialog(folder)
        },
        {
          label: this.translate.getInstant('fileSystem.folderManagement.moveFolder'),
          icon: 'pi pi-arrows-h',
          command: () => this.showMoveFolderDialog(folder)
        },
        {
          label: this.translate.getInstant('fileSystem.folderManagement.deleteFolder'),
          icon: 'pi pi-trash',
          command: () => this.showDeleteFolderConfirm(folder)
        }
      );
    }

    this.folderMenuItems = items;
  }

  /**
   * Open create folder dialog with the clicked folder as parent.
   */
  showCreateFolderDialogForFolder(folder: FolderTreeNode): void {
    const folderId = folder?.data?.folderId ?? 0;
    this.newFolderName = '';
    this.newFolderParentId = folderId;
    this.createFolderDialogVisible = true;
  }

  /**
   * Open upload dialog for the clicked folder (set as current folder and show upload).
   */
  showUploadDialogForFolder(folder: FolderTreeNode): void {
    const folderId = folder?.data?.folderId ?? 0;
    this.selectedFolderNode = folder;
    this.loadFolderContents(folderId, true);
    this.showUploadDialog();
  }

  /**
   * Open the 3-dot row menu for a folder.
   */
  openFolderMenu(menu: { toggle: (e: Event) => void }, node: FolderTreeNode, event: Event): void {
    event.stopPropagation();
    this.selectedFolderForMenu = node;
    this.buildFolderMenuItems();
    menu.toggle(event);
  }

  /**
   * Open the 3-dot menu for a folder row in the contents table (same menu as tree folders).
   */
  openFolderMenuForContentRow(menu: { toggle: (e: Event) => void }, row: FolderContentRow, event: Event): void {
    event.stopPropagation();
    if (!row.isFolder) {
      return;
    }
    const node: FolderTreeNode = {
      data: {
        folderId: row.id,
        folderName: row.name,
        parentFolderId: this.currentFolderId
      },
      label: row.name
    };
    this.selectedFolderForMenu = node;
    this.buildFolderMenuItems();
    menu.toggle(event);
  }

  /**
   * Show create folder dialog. Always creates a new root-level (parent) folder.
   */
  showCreateFolderDialog(): void {
    this.newFolderName = '';
    this.newFolderParentId = 0;
    this.createFolderNameError = null;
    this.createFolderDialogVisible = true;
  }

  /**
   * Show create folder dialog with current folder as parent (new folder will be created inside current folder).
   */
  showCreateFolderDialogInCurrentFolder(): void {
    this.newFolderName = '';
    this.newFolderParentId = this.currentFolderId;
    this.createFolderNameError = null;
    this.createFolderDialogVisible = true;
  }

  hideCreateFolderDialog(): void {
    this.createFolderDialogVisible = false;
    this.createFolderNameError = null;
  }

  private folderDisplayNameForId(folderId: number): string {
    if (folderId === 0) {
      return this.translate.getInstant('fileSystem.folderManagement.rootFolder');
    }
    const node = this.findFolderTreeNodeByIdRecursive(this.folderTreeNodes, folderId);
    if (node) {
      const n = node as FolderTreeNode;
      const name = String(n.label ?? n.data?.folderName ?? '').trim();
      return name || this.translate.getInstant('fileSystem.folderManagement.breadcrumbUnnamedFolder');
    }
    return this.translate.getInstant('fileSystem.folderManagement.currentFolder');
  }

  get createFolderParentDisplayLabel(): string {
    return this.folderDisplayNameForId(this.newFolderParentId);
  }

  get uploadDialogDestinationDisplayLabel(): string {
    return this.folderDisplayNameForId(this.currentFolderId);
  }

  /**
   * Show upload files dialog.
   */
  showUploadDialog(): void {
    this.uploadDialogVisible = true;
    this.selectedFiles = [];
    this.uploadError = null;
    this.uploadProgressPercent = 0;
    this.fileUploadStatus.clear();
    this.currentUploadingFileName = null;
    this.isDragOver = false;
    this.syncUploadProgressOverlay();
  }

  hideUploadDialog(): void {
    this.uploadDialogVisible = false;
    if (this.uploadInProgress) {
      this.isDragOver = false;
      this.syncUploadProgressOverlay();
      return;
    }

    this.selectedFiles = [];
    this.uploadError = null;
    this.uploadProgressPercent = 0;
    this.fileUploadStatus.clear();
    this.currentUploadingFileName = null;
    this.isDragOver = false;
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
    this.syncUploadProgressOverlay();
  }

  /**
   * Trigger file input click programmatically.
   */
  triggerFileInput(): void {
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.click();
    }
  }

  /**
   * Handle file input change; add selected files to existing list.
   */
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const newFiles = Array.from(input.files ?? []);
    this.uploadError = null;

    newFiles.forEach(newFile => {
      const isDuplicate = this.selectedFiles.some(
        existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size
      );
      if (!isDuplicate) {
        this.selectedFiles.push(newFile);
        this.fileUploadStatus.set(newFile.name, 'pending');
      }
    });

    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
    this.syncUploadProgressOverlay();
  }

  /**
   * Format file size in bytes to human-readable format (KB, MB, GB).
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get upload status for a file.
   */
  getFileUploadStatus(fileName: string): 'pending' | 'uploading' | 'completed' | 'error' {
    return this.fileUploadStatus.get(fileName) || 'pending';
  }

  /**
   * Handle drag over event - prevent default and show visual feedback.
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.uploadInProgress) {
      this.isDragOver = true;
    }
  }

  /**
   * Handle drag leave event - remove visual feedback.
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Handle drop event - add dropped files to existing list.
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (this.uploadInProgress) {
      return;
    }

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      this.uploadError = null;

      newFiles.forEach(newFile => {
        const isDuplicate = this.selectedFiles.some(
          existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size
        );
        if (!isDuplicate) {
          this.selectedFiles.push(newFile);
          this.fileUploadStatus.set(newFile.name, 'pending');
        }
      });
    }
    this.syncUploadProgressOverlay();
  }

  /**
   * Remove a file from the selected files list.
   */
  removeFile(fileToRemove: File): void {
    if (this.uploadInProgress) {
      return;
    }

    this.selectedFiles = this.selectedFiles.filter(file => file !== fileToRemove);
    this.fileUploadStatus.delete(fileToRemove.name);
    this.syncUploadProgressOverlay();
  }

  /**
   * Build menu items for the 3-dot file menu. Called when opening the menu.
   * Read+: Download, View Details. Modify or Full: Rename, Delete.
   */
  buildFileMenuItems(): void {
    const file = this.selectedFileForMenu;
    if (!file) {
      this.fileMenuItems = [];
      return;
    }

    const items: MenuItem[] = [];

    if (this.canRead) {
      items.push(
        {
          label: this.translate.getInstant('fileSystem.folderManagement.downloadFile'),
          icon: 'pi pi-download',
          command: () => this.downloadFile(file)
        },
        {
          label: this.translate.getInstant('fileSystem.folderManagement.viewFileDetails'),
          icon: 'pi pi-info-circle',
          command: () => this.showFileDetailsDialog(file)
        }
      );
    }

    if (this.canModify) {
      if (items.length > 0) {
        items.push({ separator: true });
      }
      items.push(
        {
          label: this.translate.getInstant('fileSystem.folderManagement.renameFile'),
          icon: 'pi pi-pencil',
          command: () => this.showRenameFileDialog(file)
        },
        {
          label: this.translate.getInstant('fileSystem.folderManagement.deleteFile'),
          icon: 'pi pi-trash',
          command: () => this.showDeleteFileConfirm(file)
        }
      );
    }

    this.fileMenuItems = items;
  }

  /**
   * Show file menu at click position.
   */
  openFileMenu(menu: { toggle: (e: Event) => void }, file: FolderContentRow, event: Event): void {
    event.stopPropagation();
    this.selectedFileForMenu = file;
    this.buildFileMenuItems();
    menu.toggle(event);
  }

  /**
   * Download file using FileDownloadService.
   * Uses Storage/File System error codes (ERP12xxx) via handleBusinessError on failure.
   */
  async downloadFile(file: FolderContentRow): Promise<void> {
    if (this.downloadInProgress || this.fileSystemId <= 0) {
      return;
    }

    const accessToken = this.localStorageService.getAccessToken();
    this.downloadInProgress = true;
    this.downloadProgressPercent = 0;
    this.currentDownloadingFileName = file.name;
    this.downloadFileSizeBytes = 0;
    this.downloadRemainingBytes = 0;
    this.downloadProgressVisible = true;
    this.syncDownloadProgressOverlay();

    try {
      const blob = await this.fileDownloadService.downloadFile(
        accessToken,
        BigInt(file.id),
        BigInt(this.currentFolderId),
        this.fileSystemId,
        (percent) => {
          const progress = Math.round(percent);
          this.downloadProgressPercent = progress;

          if (this.downloadFileSizeBytes > 0) {
            const downloadedBytes = (this.downloadFileSizeBytes * progress) / 100;
            this.downloadRemainingBytes = Math.max(0, this.downloadFileSizeBytes - downloadedBytes);
          }
          this.syncDownloadProgressOverlay();
        }
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.downloadProgressVisible = false;
      this.syncDownloadProgressOverlay();
      this.messageService.add({
        severity: 'success',
        summary: this.translate.getInstant('fileSystem.folderManagement.success'),
        detail: this.translate.getInstant('fileSystem.folderManagement.downloadFileSuccess')
      });
    } catch (err: unknown) {
      this.downloadProgressVisible = false;
      this.syncDownloadProgressOverlay();
      const response = this.normalizeUploadError(err);
      this.handleBusinessError('download', response);
    } finally {
      this.downloadInProgress = false;
      this.downloadProgressPercent = 0;
      this.currentDownloadingFileName = null;
      this.downloadFileSizeBytes = 0;
      this.downloadRemainingBytes = 0;
      this.syncDownloadProgressOverlay();
    }
  }

  /**
   * Hide download progress component.
   */
  hideDownloadProgress(): void {
    this.downloadProgressVisible = false;
    this.syncDownloadProgressOverlay();
  }

  /**
   * Show file details dialog using data from the folder contents row.
   * We do not call Get_File_Details (1105) to avoid CORS / 500 errors from that endpoint.
   */
  showFileDetailsDialog(file: FolderContentRow): void {
    this.selectedFileForDetails = file;
    this.fileDetailsError = null;
    this.fileDetailsLoading = false;
    this.fileDetailsDialogVisible = true;

    this.fileDetails = {
      name: file.name,
      fileType: this.getContentRowType(file),
      size: file.size ?? '—',
      modified: file.modified,
      created: file.created,
    };
  }

  /**
   * Hide file details dialog.
   */
  hideFileDetailsDialog(): void {
    this.fileDetailsDialogVisible = false;
    this.selectedFileForDetails = null;
    this.fileDetails = null;
    this.fileDetailsError = null;
  }

  /**
   * Show rename file dialog.
   */
  showRenameFileDialog(file: FolderContentRow): void {
    this.selectedFileForRename = file;
    this.renameFileName = file.name;
    const nameParts = file.name.split('.');
    this.renameFileType = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    this.renameFileDialogVisible = true;
  }

  /**
   * Hide rename file dialog.
   */
  hideRenameFileDialog(): void {
    this.renameFileDialogVisible = false;
    this.selectedFileForRename = null;
    this.renameFileName = '';
    this.renameFileType = '';
  }

  /**
   * Save renamed file.
   */
  onRenameFileSave(): void {
    if (!this.selectedFileForRename) {
      return;
    }

    const fileName = (this.renameFileName || '').trim();
    const fileType = (this.renameFileType || '').trim();

    if (!fileName) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.folderManagement.validation'),
        detail: this.translate.getInstant('fileSystem.folderManagement.fileNameRequired')
      });
      return;
    }

    this.fileService
      .updateFileDetails(
        this.selectedFileForRename.id,
        this.currentFolderId,
        this.fileSystemId,
        fileName,
        fileType
      )
      .subscribe({
        next: (response: any) => {
          console.log('response update file details', response);
          if (!response?.success) {
            this.handleBusinessError('updateFile', response);
            return;
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.folderManagement.success'),
            detail: this.translate.getInstant('fileSystem.folderManagement.renameFileSuccess')
          });
          this.hideRenameFileDialog();
          this.loadFolderContents(this.currentFolderId);
        }
      });
  }

  /**
   * Show delete file confirmation dialog.
   */
  showDeleteFileConfirm(file: FolderContentRow): void {
    this.selectedFileForDelete = file;
    this.deleteFileConfirmVisible = true;
  }

  /**
   * Hide delete file confirmation dialog.
   */
  hideDeleteFileConfirm(): void {
    this.deleteFileConfirmVisible = false;
    this.selectedFileForDelete = null;
  }

  /**
   * Confirm delete file operation.
   */
  onDeleteFileConfirm(): void {
    if (!this.selectedFileForDelete) {
      return;
    }

    const fileId = this.selectedFileForDelete.id;
    this.fileService
      .deleteFileAllocation(fileId, this.currentFolderId, this.fileSystemId)
      .subscribe({
        next: (response: any) => {
          console.log('response delete file allocation', response);
          if (!response?.success) {
            this.handleBusinessError('deleteFile', response);
            return;
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.folderManagement.success'),
            detail: this.translate.getInstant('fileSystem.folderManagement.deleteFileSuccess')
          });
          this.hideDeleteFileConfirm();
          this.loadFolderContents(this.currentFolderId);
        }
      });
  }

  /**
   * Upload selected files to the current folder.
   * Checks that no selected file has the same name as an existing file or folder in the current folder.
   * Uses Storage/File System error codes (ERP12xxx) via handleBusinessError on failure.
   */
  async onUploadConfirm(): Promise<void> {
    if (this.selectedFiles.length === 0 || this.fileSystemId <= 0) {
      return;
    }

    const existingNames = new Set(
      this.folderContents
        .filter((row) => !row.isBackButton)
        .map((row) => row.name.trim().toLowerCase())
    );

    const duplicateNames: string[] = [];
    for (const file of this.selectedFiles) {
      const name = (file.name || '').trim();
      if (!name) continue;
      if (existingNames.has(name.toLowerCase())) {
        duplicateNames.push(name);
      }
    }

    if (duplicateNames.length > 0) {
      const namesList = duplicateNames.join(', ');
      const messageTemplate = this.translate.getInstant('fileSystem.folderManagement.fileAlreadyExistsInFolder');
      const detail = messageTemplate.replace('{{names}}', namesList);
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.folderManagement.validation'),
        detail
      });
      return;
    }

    const accessToken = this.localStorageService.getAccessToken();
    this.uploadInProgress = true;
    this.uploadError = null;
    const totalFiles = this.selectedFiles.length;
    this.syncUploadProgressOverlay();

    this.uploadDialogVisible = false;
    try {
      for (let i = 0; i < this.selectedFiles.length; i++) {
        const file = this.selectedFiles[i];
        this.currentUploadingFileName = file.name;
        this.fileUploadStatus.set(file.name, 'uploading');
        this.syncUploadProgressOverlay();

        await this.fileUploadService.uploadFile(
          file,
          accessToken,
          this.fileSystemId,
          BigInt(this.currentFolderId),
          (percent) => {
            const completedFiles = Array.from(this.fileUploadStatus.values()).filter(s => s === 'completed').length;
            const currentFileProgress = percent / 100;
            const overallProgress = ((completedFiles + currentFileProgress) / totalFiles) * 100;
            this.uploadProgressPercent = Math.round(overallProgress);
            this.syncUploadProgressOverlay();
          }
        );

        this.fileUploadStatus.set(file.name, 'completed');
        this.currentUploadingFileName = null;
        this.syncUploadProgressOverlay();
      }

      console.log('Upload completed successfully', {
        totalFiles,
        files: this.selectedFiles,
        folderId: this.currentFolderId
      });

      this.messageService.add({
        severity: 'success',
        summary: this.translate.getInstant('fileSystem.folderManagement.success'),
        detail: this.translate.getInstant('fileSystem.folderManagement.fileUploadedSuccess')
      });
      this.hideUploadDialog();
      this.loadFolderContents(this.currentFolderId);
    } catch (err: unknown) {
      console.error('Upload failed', err);
      if (this.currentUploadingFileName) {
        this.fileUploadStatus.set(this.currentUploadingFileName, 'error');
        this.currentUploadingFileName = null;
        this.syncUploadProgressOverlay();
      }
      const response = this.normalizeUploadError(err);
      this.uploadError = this.handleBusinessError('upload', response);
    } finally {
      this.uploadInProgress = false;
      this.syncUploadProgressOverlay();
    }
  }

  private syncUploadProgressOverlay(): void {
    const files = this.selectedFiles.map((file) => ({
      name: file.name,
      size: file.size,
      status: this.getFileUploadStatus(file.name),
    }));
    this.transferProgressService.setUploadProgress({
      visible: this.uploadInProgress,
      percent: this.uploadProgressPercent,
      files,
    });
  }

  private syncDownloadProgressOverlay(): void {
    this.transferProgressService.setDownloadProgress({
      visible: this.downloadProgressVisible,
      percent: this.downloadProgressPercent,
      fileName: this.currentDownloadingFileName,
      fileSizeBytes: this.downloadFileSizeBytes,
      remainingBytes: this.downloadRemainingBytes,
    });
  }

  /**
   * Build a response-like object for error extraction from a thrown upload/download error.
   */
  private normalizeUploadError(err: unknown): Record<string, unknown> {
    if (!err || typeof err !== 'object') {
      return {};
    }
    const e = err as Record<string, unknown>;
    if (typeof e['Body'] === 'string') {
      try {
        return JSON.parse(e['Body'] as string) as Record<string, unknown>;
      } catch {
        return { message: e['Body'] };
      }
    }
    if (e['error'] && typeof e['error'] === 'object') {
      return e['error'] as Record<string, unknown>;
    }
    if (typeof e['error'] === 'string') {
      return { message: e['error'] };
    }
    return e;
  }

  /**
   * Create new folder.
   */
  onCreateFolderConfirm(): void {
    const folderName = (this.newFolderName || '').trim();
    this.createFolderNameError = null;
    if (!folderName) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.folderManagement.validation'),
        detail: this.translate.getInstant('fileSystem.folderManagement.folderNameRequired')
      });
      return;
    }
    if (!isFolderNameValid(folderName)) {
      this.createFolderNameError = this.translate.getInstant('fileSystem.folderManagement.folderNameInvalidFormat');
      return;
    }

    this.folderService
      .createFolder(this.fileSystemId, folderName, this.newFolderParentId)
      .subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.handleBusinessError('create', response);
            return;
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.folderManagement.success'),
            detail: this.translate.getInstant('fileSystem.folderManagement.createFolderSuccess')
          });
          this.hideCreateFolderDialog();
          this.loadFolderStructure();
          this.loadFolderContents(this.currentFolderId);
        }
      });
  }

  /**
   * Show rename folder dialog.
   */
  showRenameFolderDialog(folder: FolderTreeNode): void {
    this.selectedFolderForRename = folder;
    this.renameFolderName = folder.data.folderName;
    this.renameFolderNameError = null;
    this.renameFolderDialogVisible = true;
  }

  hideRenameFolderDialog(): void {
    this.renameFolderDialogVisible = false;
    this.selectedFolderForRename = null;
    this.renameFolderNameError = null;
  }

  /**
   * Save renamed folder.
   */
  onRenameFolderSave(): void {
    if (!this.selectedFolderForRename) {
      return;
    }

    const folderName = (this.renameFolderName || '').trim();
    this.renameFolderNameError = null;
    if (!folderName) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.folderManagement.validation'),
        detail: this.translate.getInstant('fileSystem.folderManagement.folderNameRequired')
      });
      return;
    }
    if (!isFolderNameValid(folderName)) {
      this.renameFolderNameError = this.translate.getInstant('fileSystem.folderManagement.folderNameInvalidFormat');
      return;
    }

    this.folderService
      .updateFolderDetails(
        this.selectedFolderForRename.data.folderId,
        this.fileSystemId,
        folderName
      )
      .subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.handleBusinessError('update', response);
            return;
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.folderManagement.success'),
            detail: this.translate.getInstant('fileSystem.folderManagement.renameFolderSuccess')
          });
          this.hideRenameFolderDialog();
          this.loadFolderStructure();
          this.loadFolderContents(this.currentFolderId);
        }
      });
  }

  /**
   * Show move folder dialog.
   */
  showMoveFolderDialog(folder: FolderTreeNode): void {
    this.selectedFolderForMove = folder;
    this.moveDestinationKind = 'folder';
    this.moveDestinationNode = null;
    this.moveFolderDialogVisible = true;
  }

  hideMoveFolderDialog(): void {
    this.moveFolderDialogVisible = false;
    this.selectedFolderForMove = null;
    this.moveDestinationKind = 'folder';
    this.moveDestinationNode = null;
  }

  /** Move button is enabled when destination is root, or when a folder is selected in the tree. */
  get isMoveFolderButtonDisabled(): boolean {
    if (this.moveDestinationKind === 'root') {
      return false;
    }
    return !this.moveDestinationNode;
  }

  /**
   * Confirm move folder operation.
   */
  onMoveFolderConfirm(): void {
    if (!this.selectedFolderForMove) {
      return;
    }

    let newParentId: number;
    if (this.moveDestinationKind === 'root') {
      newParentId = 0;
    } else {
      if (!this.moveDestinationNode) {
        return;
      }
      const destinationNode = this.moveDestinationNode as FolderTreeNode;
      newParentId = destinationNode?.data?.folderId ?? 0;
    }

    if (this.isDescendantOf(this.selectedFolderForMove.data.folderId, newParentId)) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('fileSystem.folderManagement.error'),
        detail: this.translate.getInstant('fileSystem.folderManagement.cannotMoveToSelfOrChild')
      });
      return;
    }

    this.folderService
      .moveFolder(
        this.selectedFolderForMove.data.folderId,
        this.fileSystemId,
        newParentId
      )
      .subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.handleBusinessError('move', response);
            return;
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.folderManagement.success'),
            detail: this.translate.getInstant('fileSystem.folderManagement.moveFolderSuccess')
          });
          this.hideMoveFolderDialog();
          this.loadFolderStructure();
          this.loadFolderContents(this.currentFolderId);
        }
      });
  }

  /**
   * Check if folderId is a descendant of ancestorId in the tree.
   */
  private isDescendantOf(folderId: number, ancestorId: number): boolean {
    if (folderId === ancestorId) {
      return true;
    }

    const findNodeById = (nodes: TreeNode[], id: number): TreeNode | null => {
      for (const node of nodes) {
        const nodeId = (node as FolderTreeNode).data?.folderId;
        if (nodeId === id) {
          return node;
        }
        if (node.children && node.children.length > 0) {
          const found = findNodeById(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const ancestorNode = findNodeById(this.folderTreeNodes, ancestorId);
    if (!ancestorNode) {
      return false;
    }

    const checkDescendants = (node: TreeNode, targetId: number): boolean => {
      if ((node as FolderTreeNode).data?.folderId === targetId) {
        return true;
      }
      if (node.children) {
        for (const child of node.children) {
          if (checkDescendants(child, targetId)) {
            return true;
          }
        }
      }
      return false;
    };

    return checkDescendants(ancestorNode, folderId);
  }

  /**
   * Show delete folder confirmation dialog.
   */
  showDeleteFolderConfirm(folder: FolderTreeNode): void {
    this.selectedFolderForDelete = folder;
    this.deleteFolderConfirmVisible = true;
  }

  hideDeleteFolderConfirm(): void {
    this.deleteFolderConfirmVisible = false;
    this.selectedFolderForDelete = null;
  }

  /**
   * Confirm delete folder operation.
   */
  onDeleteFolderConfirm(): void {
    if (!this.selectedFolderForDelete) {
      return;
    }

    const folderId = this.selectedFolderForDelete.data.folderId;
    const parentFolderId = this.selectedFolderForDelete.data.parentFolderId;
    this.folderService.deleteFolder(folderId, this.fileSystemId).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleBusinessError('delete', response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('fileSystem.folderManagement.success'),
          detail: this.translate.getInstant('fileSystem.folderManagement.deleteFolderSuccess')
        });
        this.hideDeleteFolderConfirm();

        if (this.currentFolderId === folderId) {
          this.currentFolderId = parentFolderId;
          this.selectedFolderNode = null;
          this.clearFolderNavigationHistory();
        }

        this.loadFolderStructure();
        this.loadFolderContents(this.currentFolderId);
      }
    });
  }

  /**
   * Show Recycle bin dialog and load deleted folders and files.
   */
  showRecycleBinDialog(): void {
    if (!this.canFull) {
      return;
    }
    this.recycleBinDialogVisible = true;
    this.selectedFoldersToRestore = [];
    this.selectedFilesToRestore = [];
    this.skippedFileIds.clear();
    this.loadRecycleBinContents();
  }

  hideRecycleBinDialog(): void {
    this.recycleBinDialogVisible = false;
    this.selectedFoldersToRestore = [];
    this.selectedFilesToRestore = [];
    this.skippedFileIds.clear();
    this.deletedFolders = [];
    this.deletedFiles = [];
    this.recycleBinFolderSearch = '';
    this.recycleBinFileSearch = '';
  }

  /**
   * Load recycle bin contents and folder structure.
   * Uses Get_File_System_Recycle_Bin_Contents and Get_Folder_Structure to show folder names for deleted files.
   */
  private loadRecycleBinContents(): void {
    if (this.fileSystemId <= 0) {
      return;
    }
    this.recycleBinLoading = true;
    const recycleBin$ = this.folderService.getRecycleBinContents(this.fileSystemId);
    const folderStructure$ = this.folderService.getFolderStructure(this.fileSystemId, false);

    forkJoin({ recycleBin: recycleBin$, folderStructure: folderStructure$ }).subscribe({
      next: (result: { recycleBin: any; folderStructure: any }) => {
        this.recycleBinLoading = false;
        const response = result.recycleBin;
        if (!response?.success) {
          this.handleBusinessError('restore', response);
          return;
        }
        const raw = response.message ?? {};
        console.log('response load recycle bin contents', raw);
        const foldersList = raw.Folders ?? [];
        const filesList = raw.Files ?? [];
        this.deletedFolders = foldersList.map((f: any) => ({
          folder_ID: Number(f?.folder_id ?? 0),
          folder_Name: String(f?.folder_name ?? ''),
          parent_Folder_ID: Number(f?.parent_folder_id ?? 0),
          file_System_ID: this.fileSystemId
        }));

        const folderIdToName: Record<number, string> = {};
        if (result.folderStructure?.success && result.folderStructure?.message) {
          const structureItems = this.normalizeFolderStructureResponse(result.folderStructure.message);
          structureItems.forEach((item) => {
            const id = item.folder_ID ?? 0;
            const name = item.folder_Name ?? '';
            if (id) folderIdToName[id] = name;
          });
        }
        this.deletedFolders.forEach((fold) => {
          folderIdToName[fold.folder_ID] = fold.folder_Name;
        });

        this.deletedFiles = filesList.map((f: any) => {
          const folderId = Number(f?.folder_id ?? 0);
          const sizeBytes = Number(f?.size ?? f?.Size ?? 0);
          return {
            file_id: Number(f?.file_id ?? 0),
            folder_id: folderId,
            folder_name: folderIdToName[folderId] ?? '',
            file_name: String(f?.file_name ?? ''),
            size: sizeBytes
          };
        });
        this.cdr.markForCheck();
      },
      error: () => {
        this.recycleBinLoading = false;
        this.handleBusinessError('restore', {});
      }
    });
  }

  /** True if at least one folder or file is selected in the Recycle bin dialog. */
  /** Toggle folder selection when user clicks anywhere on the row (recycle bin folders table). */
  toggleRecycleBinFolderSelection(folder: Folder): void {
    console.log('toggleRecycleBinFolderSelection', folder);
    const key = folder.folder_ID;
    const idx = this.selectedFoldersToRestore.findIndex(
      (f) => (f.folder_ID ?? (f as any).Folder_ID) === key
    );
    if (idx === -1) {
      this.selectedFoldersToRestore = [...this.selectedFoldersToRestore, folder];
    } else {
      this.selectedFoldersToRestore = this.selectedFoldersToRestore.filter((_, i) => i !== idx);
    }
    this.cdr.markForCheck();
  }

  /** Toggle file selection when user clicks anywhere on the row (recycle bin files table). */
  toggleRecycleBinFileSelection(file: any): void {
    console.log('toggleRecycleBinFileSelection', file);
    const key = file.file_id;
    const idx = this.selectedFilesToRestore.findIndex(
      (f) => (f.file_id) === key
    );
    if (idx === -1) {
      this.selectedFilesToRestore = [...this.selectedFilesToRestore, file];
    } else {
      this.selectedFilesToRestore = this.selectedFilesToRestore.filter((_, i) => i !== idx);
    }
    this.cdr.markForCheck();
  }

  get hasRecycleBinSelection(): boolean {
    return this.selectedFoldersToRestore.length > 0 || this.selectedFilesToRestore.length > 0;
  }

  /** Restore button is enabled only when there is selection and no skipped file is selected. */
  get canRestoreRecycleBin(): boolean {
    if (!this.hasRecycleBinSelection) return false;
    const hasSkippedSelected = this.selectedFilesToRestore.some((f) =>
      this.skippedFileIds.has(Number(f?.file_id ?? 0))
    );
    return !hasSkippedSelected;
  }

  /** Check if a file is in the skipped list (could not be restored due to duplicate name). */
  isSkippedFile(file: any): boolean {
    const id = Number(file?.file_id ?? 0);
    return id > 0 && this.skippedFileIds.has(id);
  }

  /** Deleted folders filtered by search (folder name). Used for recycle bin table with pagination. */
  get filteredDeletedFolders(): Folder[] {
    const q = (this.recycleBinFolderSearch || '').trim().toLowerCase();
    if (!q) return this.deletedFolders;
    return this.deletedFolders.filter(
      (f) => (f.folder_Name ?? '').toLowerCase().includes(q)
    );
  }

  /** Deleted files filtered by search (file name or folder name). Used for recycle bin table with pagination. */
  get filteredDeletedFiles(): any[] {
    const q = (this.recycleBinFileSearch || '').trim().toLowerCase();
    if (!q) return this.deletedFiles;
    return this.deletedFiles.filter((f) => {
      const fileName = (f.file_name ?? '').toLowerCase();
      const folderName = (f.folder_name ?? '').toLowerCase();
      return fileName.includes(q) || folderName.includes(q);
    });
  }

  /**
   * Restore selected deleted folders and/or files.
   */
  onRestoreRecycleBinConfirm(): void {
    if (!this.hasRecycleBinSelection) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.folderManagement.validation'),
        detail: this.translate.getInstant('fileSystem.folderManagement.selectItemsToRestore')
      });
      return;
    }

    const folderIds = this.selectedFoldersToRestore.map(
      (f) => f.folder_ID ?? 0
    );
    const fileIds = this.selectedFilesToRestore.map(
      (f) => f.file_id ?? 0
    );
    const folderIdsForFiles = this.selectedFilesToRestore.map(
      (f) => f.folder_id ?? 0
    );

    const calls: Observable<any>[] = [];
    if (folderIds.length > 0) {
      calls.push(this.folderService.restoreDeletedFolders(folderIds, this.fileSystemId));
    }
    if (fileIds.length > 0) {
      calls.push(this.fileService.restoreDeletedFiles(fileIds, folderIdsForFiles, this.fileSystemId));
    }

    forkJoin(calls).subscribe({
      next: (responses: any[]) => {
        const failed = responses.find((r) => !r?.success);
        if (failed) {
          this.handleBusinessError('restore', failed);
          return;
        }
        const skippedFileIdsFromApi: number[] = [];
        responses.forEach((r: any) => {
          const message = r?.message;
          if (Array.isArray(message) && message.length > 0) {
            const isSkippedFileList = message.some(
              (item: any) => item?.file_id != null
            );
            if (isSkippedFileList) {
              message.forEach((item: any) => {
                const id = Number(item?.file_id ?? 0);
                if (id > 0) skippedFileIdsFromApi.push(id);
              });
              return;
            }
          }
          const rawSkipped =
            message && typeof message === 'object'
              ? (message as any).Skipped_IDs ?? (message as any).skipped_IDs ?? (message as any).skippedIds ?? []
              : [];
          if (Array.isArray(rawSkipped)) {
            rawSkipped.forEach((item: any) => {
              const id = typeof item === 'number' ? item : Number(item?.file_id ?? item?.file_ID ?? item?.Item1 ?? 0);
              if (id > 0) skippedFileIdsFromApi.push(id);
            });
          }
        });

        const allSelectedFilesWereSkipped =
          this.selectedFilesToRestore.length > 0 &&
          this.selectedFilesToRestore.length === skippedFileIdsFromApi.length &&
          this.selectedFilesToRestore.every((f) => {
            const id = Number(f?.file_id ?? f?.file_ID ?? f?.File_ID ?? 0);
            return skippedFileIdsFromApi.includes(id);
          });
        const hadFoldersRestored = folderIds.length > 0;
        const hasPartialSuccess = skippedFileIdsFromApi.length > 0 && (hadFoldersRestored || !allSelectedFilesWereSkipped);
        if (hadFoldersRestored || !allSelectedFilesWereSkipped) {
          const successKey = hasPartialSuccess
            ? 'fileSystem.folderManagement.restoreRecycleBinPartialSuccess'
            : 'fileSystem.folderManagement.restoreRecycleBinSuccess';
          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.folderManagement.success'),
            detail: this.translate.getInstant(successKey)
          });
        }

        if (skippedFileIdsFromApi.length > 0) {
          this.skippedFileIds = new Set(skippedFileIdsFromApi);
          const skippedNames = skippedFileIdsFromApi
            .map((id) => this.deletedFiles.find((f) => Number(f?.file_id ?? f?.file_ID ?? f?.File_ID ?? 0) === id))
            .filter(Boolean)
            .map((f) => f?.file_name ?? f?.file_Name ?? '?')
            .join(', ');
          const msgTemplate = this.translate.getInstant(
            'fileSystem.folderManagement.uncheckSkippedFilesToRestore'
          );
          const detail = msgTemplate.replace('{{names}}', skippedNames);
          this.messageService.add({
            severity: 'warn',
            summary: this.translate.getInstant('fileSystem.folderManagement.validation'),
            detail
          });
          this.loadRecycleBinContents();
        } else {
          this.hideRecycleBinDialog();
          this.loadFolderStructure();
          this.loadFolderContents(this.currentFolderId);
        }
      },
      error: (err) => {
        this.handleBusinessError('restore', err);
      }
    });
  }

  // #region Business errors
  private handleBusinessError(
    context:
      | 'listPermissions'
      | 'getStructure'
      | 'getContents'
      | 'create'
      | 'update'
      | 'updateFile'
      | 'delete'
      | 'deleteFile'
      | 'move'
      | 'restore'
      | 'upload'
      | 'download',
    response: any
  ): string {
    const code = String(response?.message || '');
    let detail = this.getStorageApiErrorMessage(code) ?? '';
    if (!detail) {
      detail = this.getNonCodeErrorDetail(response) ?? '';
    }
    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('common.error'),
        detail
      });
    }
    this.applyBusinessErrorUiCleanup(context);
    return detail;
  }

  private applyBusinessErrorUiCleanup(
    context:
      | 'listPermissions'
      | 'getStructure'
      | 'getContents'
      | 'create'
      | 'update'
      | 'updateFile'
      | 'delete'
      | 'deleteFile'
      | 'move'
      | 'restore'
      | 'upload'
      | 'download'
  ): void {
    if (context === 'listPermissions') {
      this.permissionsLoading = false;
    }
    if (context === 'getStructure') {
      this.treeLoading = false;
    }
    if (context === 'getContents') {
      this.tableLoadingSpinner = false;
    }
  }

  private getNonCodeErrorDetail(response: any): string | null {
    const read = (root: any): string | null => {
      if (root == null) {
        return null;
      }
      const msg = root.message;
      if (msg != null && typeof msg === 'object' && (msg as { detail?: string }).detail != null) {
        return String((msg as { detail?: string }).detail);
      }
      if (typeof msg === 'string' && !/^(ERP|FWA)\d+$/.test(msg)) {
        return msg;
      }
      return null;
    };
    return read(response) ?? read(response?.error);
  }

  private getStorageApiErrorMessage(code: string): string | null {
    switch (code) {
      case 'ERP12000':
        return this.translate.getInstant('fileSystem.admin.errorAccessDenied');
      case 'ERP12001':
        return this.translate.getInstant('fileSystem.admin.errorBlockedIpPermanent');
      case 'ERP12002':
        return this.translate.getInstant('fileSystem.admin.errorBlockedIpTemporary');
      case 'ERP12005':
        return this.translate.getInstant('fileSystem.admin.errorMissingStorageToken');
      case 'ERP12006':
        return this.translate.getInstant('fileSystem.admin.errorInvalidStorageToken');
      case 'ERP12007':
        return this.translate.getInstant('fileSystem.admin.errorAccessDeniedAction');
      case 'ERP12008':
        return this.translate.getInstant('fileSystem.admin.errorInvalidRequestRouting');
      case 'ERP12009':
        return this.translate.getInstant('fileSystem.admin.errorRequestUnderDevelopment');
      case 'ERP12010':
        return this.translate.getInstant('fileSystem.admin.errorResponseManagement');
      case 'ERP12011':
        return this.translate.getInstant('fileSystem.admin.errorApiCallExecution');
      case 'ERP12012':
        return this.translate.getInstant('fileSystem.admin.errorFileServerDatabase');
      case 'ERP12240':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileId');
      case 'ERP12250':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFolderId');
      case 'ERP12260':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemId');
      case 'ERP12270':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemAccessToken');
      case 'ERP12280':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileAllocation');
      case 'ERP12290':
        return this.translate.getInstant('fileSystem.admin.errorInvalidDriveId');
      case 'ERP12291':
        return this.translate.getInstant('fileSystem.admin.errorDriveInactive');
      case 'ERP12292':
        return this.translate.getInstant('fileSystem.admin.errorAccessDeniedDriveOwner');
      case 'ERP12295':
        return this.translate.getInstant('fileSystem.admin.errorNotEnoughFileSystemAccessRight');
      case 'ERP12293':
        return this.translate.getInstant('fileSystem.admin.errorInvalidAccessType');
      case 'ERP12294':
        return this.translate.getInstant('fileSystem.admin.errorInvalidAccessRight');
      case 'ERP12296':
        return this.translate.getInstant('fileSystem.admin.errorInvalidAccountId');
      case 'ERP12297':
        return this.translate.getInstant('fileSystem.admin.errorOwnerOrFullRequired');
      case 'ERP12298':
        return this.translate.getInstant('fileSystem.admin.errorActionNotAllowedOnReferenceAllocation');
      case 'ERP12299':
        return this.translate.getInstant('fileSystem.admin.errorActionNotAllowedOnCopyAllocation');
      case 'ERP12220':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileName');
      case 'ERP12221':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileType');
      case 'ERP12222':
        return this.translate.getInstant('fileSystem.admin.errorInvalidDateFormat');
      case 'ERP12223':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSize');
      case 'ERP12224':
        return this.translate.getInstant('fileSystem.admin.errorInvalidNChunks');
      case 'ERP12225':
        return this.translate.getInstant('fileSystem.admin.errorNChunksMismatch');
      case 'ERP12226':
        return this.translate.getInstant('fileSystem.admin.errorInsufficientStorage');
      case 'ERP12227':
        return this.translate.getInstant('fileSystem.admin.errorFileExistsInFolder');
      case 'ERP12230':
        return this.translate.getInstant('fileSystem.admin.errorInvalidUploadToken');
      case 'ERP12231':
        return this.translate.getInstant('fileSystem.admin.errorInvalidChunkId');
      case 'ERP12232':
        return this.translate.getInstant('fileSystem.admin.errorInvalidOffset');
      case 'ERP12233':
        return this.translate.getInstant('fileSystem.admin.errorNoChunksReceived');
      case 'ERP12234':
        return this.translate.getInstant('fileSystem.admin.errorChunkEmpty');
      case 'ERP12235':
        return this.translate.getInstant('fileSystem.admin.errorChunkHashEmpty');
      case 'ERP12236':
        return this.translate.getInstant('fileSystem.admin.errorChunkHashInvalid');
      case 'ERP12237':
        return this.translate.getInstant('fileSystem.admin.errorFileStorage');
      case 'ERP12248':
        return this.translate.getInstant('fileSystem.admin.errorInvalidEntityFilter');
      case 'ERP12251':
      case 'ERP12252':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemName');
      case 'ERP12255':
        return this.translate.getInstant('fileSystem.admin.errorFileSystemInUse');
      case 'ERP12267':
        return this.translate.getInstant('fileSystem.folderManagement.errorInvalidRestoreSelection');
      case 'ERP12263':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileAllocationType');
      case 'FWA12251':
      case 'FWA12252':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemName');
      case 'FWA12255':
        return this.translate.getInstant('fileSystem.admin.errorFileSystemInUse');
      default:
        return null;
    }
  }
  // #endregion

  /**
   * Check if a node is the root node (folderId = 0 or parentFolderId = 0).
   */
  isRootNode(node: TreeNode): boolean {
    const folderNode = node as FolderTreeNode;
    return (
      folderNode?.data?.folderId === 0 ||
      folderNode?.data?.parentFolderId === 0
    );
  }

  /**
   * Get display name for folder content row.
   */
  getContentRowName(row: FolderContentRow): string {
    return row?.name ?? '—';
  }

  /**
   * Get display type for folder content row.
   */
  getContentRowType(row: FolderContentRow): string {
    return row.isFolder
      ? this.translate.getInstant('fileSystem.folderManagement.typeFolder')
      : this.translate.getInstant('fileSystem.folderManagement.typeFile');
  }

  /**
   * Handle double-click on folder content row (navigate into folder).
   * Selects the folder in the tree, expands its parent path if needed, and loads contents.
   */
  onContentRowDoubleClick(row: FolderContentRow): void {
    if (!row.isFolder) {
      return;
    }
    const folderNode = this.findFolderTreeNodeByIdRecursive(this.folderTreeNodes, row.id);
    if (folderNode) {
      this.expandTreePathToFolder(row.id);
      this.selectedFolderNode = folderNode;
      this.onFolderNodeSelect({ node: folderNode });
    } else {
      this.selectedFolderNode = null;
      this.loadFolderContents(row.id, true);
    }
  }

  goBack(): void {
    if (this.folderNavBackStack.length === 0) {
      this.selectedFolderNode = null;
      this.loadFolderContents(0, false);
      return;
    }
    const previousFolderId = this.folderNavBackStack.pop()!;
    const node = this.findFolderTreeNodeByIdRecursive(this.folderTreeNodes, previousFolderId);
    this.selectedFolderNode = node;
    if (node) {
      this.expandTreePathToFolder(previousFolderId);
    }
    this.loadFolderContents(previousFolderId, false);
  }
}
