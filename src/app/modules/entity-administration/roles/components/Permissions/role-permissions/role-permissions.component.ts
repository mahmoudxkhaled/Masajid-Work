import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService, TreeNode } from 'primeng/api';
import { RolesService } from '../../../services/roles.service';
import { SettingsConfigurationsService } from 'src/app/modules/system-administration/erp-functions/services/settings-configurations.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';

@Component({
    selector: 'app-role-permissions',
    templateUrl: './role-permissions.component.html',
    styleUrls: ['./role-permissions.component.scss']
})
export class RolePermissionsComponent implements OnInit, OnDestroy {
    roleId: string = '';
    roleTitle: string = '';

    loading: boolean = false;
    saving: boolean = false;
    loadingFunctions: boolean = false;
    loadingModules: boolean = false;

    // Functions
    functions: number[] = [];
    availableFunctions: any[] = []; // Store full objects with id and name
    selectedFunctions: number[] = []; // Store IDs for selected items

    // Modules
    modules: number[] = [];
    availableModules: any[] = []; // Store full objects with id and name
    selectedModules: number[] = []; // Store IDs for selected items

    // Tree structure
    treeNodes: TreeNode[] = [];
    selectedTreeNodes: TreeNode[] = [];
    rootLevelModules: any[] = []; // Summary and HR modules (functionId = null)

    private subscriptions: Subscription[] = [];
    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private rolesService: RolesService,
        private settingsConfigurationsService: SettingsConfigurationsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        // Get roleId from route params
        this.roleId = this.route.snapshot.paramMap.get('roleId') || '';
        if (!this.roleId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid role ID.'
            });
            this.router.navigate(['/entity-administration/roles/list']);
            return;
        }

        // Show skeleton immediately while data loads
        this.loading = true;

        // Load role details to get role title
        this.loadRoleDetails();
        this.loadAvailableFunctionsAndModules();
    }

    private loadAvailableFunctionsAndModules(): void {
        // Ensure arrays are initialized
        this.availableFunctions = this.availableFunctions || [];
        this.availableModules = this.availableModules || [];
        this.selectedFunctions = this.selectedFunctions || [];
        this.selectedModules = this.selectedModules || [];

        let functionsLoaded = false;
        let modulesLoaded = false;

        // Helper function to build tree when both are loaded
        const tryBuildTree = () => {
            if (functionsLoaded && modulesLoaded) {
                this.buildTreeStructure();
                // Load permissions after tree is built
                this.loadPermissions();
            }
        };

        // Load available functions
        const functionsSub = this.settingsConfigurationsService.getFunctionsList().subscribe({
            next: (response) => {
                if (response?.success) {
                    // Store full objects with id and name for display
                    const parsedFunctions = this.settingsConfigurationsService.parseFunctionsList(response, this.isRegional);
                    this.availableFunctions = parsedFunctions || [];
                } else {
                    this.availableFunctions = [];
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Warning',
                        detail: 'Failed to load available functions.'
                    });
                }
                functionsLoaded = true;
                tryBuildTree();
            },
            error: () => {
                this.availableFunctions = [];
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'An error occurred while loading available functions.'
                });
                functionsLoaded = true;
                tryBuildTree();
            }
        });

        // Load available modules
        const modulesSub = this.settingsConfigurationsService.getModulesList().subscribe({
            next: (response) => {
                if (response?.success) {
                    // Store full objects with id and name for display
                    const parsedModules = this.settingsConfigurationsService.parseModulesList(response, this.isRegional);
                    this.availableModules = parsedModules || [];
                } else {
                    this.availableModules = [];
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Warning',
                        detail: 'Failed to load available modules.'
                    });
                }
                modulesLoaded = true;
                tryBuildTree();
            },
            error: () => {
                this.availableModules = [];
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'An error occurred while loading available modules.'
                });
                modulesLoaded = true;
                tryBuildTree();
            }
        });

        this.subscriptions.push(functionsSub, modulesSub);
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    private loadRoleDetails(): void {
        if (!this.roleId) {
            return;
        }

        const sub = this.rolesService.getEntityRoleDetails(Number(this.roleId)).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const role = response?.message || {};
                    this.roleTitle = this.isRegional
                        ? (role?.Title_Regional || role?.Title || '')
                        : (role?.Title || '');
                }
            },
            error: () => {
                // Handle error silently
            }
        });
        this.subscriptions.push(sub);
    }

    private loadPermissions(): void {
        if (!this.roleId) {
            return;
        }

        this.loading = true;
        this.loadingFunctions = true;
        this.loadingModules = true;

        // Load functions
        const functionsSub = this.rolesService.getRoleFunctions(Number(this.roleId)).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    let functionsList: number[] = [];

                    if (Array.isArray(response.message)) {
                        // Check if it's an array of objects or array of IDs
                        if (response.message.length > 0 && typeof response.message[0] === 'object') {
                            // Array of function objects - extract functionID from each
                            functionsList = response.message
                                .map((func: any) => func.functionID || func.Function_ID || func.id)
                                .filter((id: any) => id !== undefined && id !== null);
                        } else {
                            // Array of IDs (numbers)
                            functionsList = response.message;
                        }
                    } else if (response.message?.Functions && Array.isArray(response.message.Functions)) {
                        // Nested Functions array
                        functionsList = response.message.Functions;
                    }

                    this.parsePermissionList(functionsList, 'functions');
                }
                this.loadingFunctions = false;
                this.loading = false;
            },
            error: () => {
                this.loadingFunctions = false;
                this.loading = false;
            }
        });

        // Load modules
        const modulesSub = this.rolesService.getRoleModules(Number(this.roleId)).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    let modulesList: number[] = [];

                    if (Array.isArray(response.message)) {
                        // Check if it's an array of objects or array of IDs
                        if (response.message.length > 0 && typeof response.message[0] === 'object') {
                            // Array of module objects - extract moduleID from each
                            modulesList = response.message
                                .map((module: any) => module.moduleID || module.Module_ID || module.id)
                                .filter((id: any) => id !== undefined && id !== null);
                        } else {
                            // Array of IDs (numbers)
                            modulesList = response.message;
                        }
                    } else if (response.message?.Modules && Array.isArray(response.message.Modules)) {
                        // Nested Modules array
                        modulesList = response.message.Modules;
                    }

                    this.parsePermissionList(modulesList, 'modules');
                }
                this.loadingModules = false;
            },
            error: () => {
                this.loadingModules = false;
            }
        });

        this.subscriptions.push(functionsSub, modulesSub);
    }

    private parsePermissionList(list: number[], type: 'functions' | 'modules'): void {
        if (!list || list.length === 0) {
            if (type === 'functions') {
                this.functions = [];
                this.selectedFunctions = [];
            } else {
                this.modules = [];
                this.selectedModules = [];
            }
            // Update tree selection after both functions and modules are parsed
            if (type === 'modules') {
                this.updateTreeSelection();
            }
            return;
        }

        // Filter out wildcard (0) and negative IDs (exceptions), keep only positive IDs
        const positiveIds = list.filter(id => id > 0);

        if (type === 'functions') {
            this.selectedFunctions = positiveIds;
            this.functions = list;
        } else {
            this.selectedModules = positiveIds;
            this.modules = list;
            // Update tree selection after modules are parsed
            this.updateTreeSelection();
        }
    }

    /**
     * Build tree structure from available functions and modules
     * Functions are parent nodes, modules are children
     */
    private buildTreeStructure(): void {
        if (!this.availableFunctions || !this.availableModules) {
            this.treeNodes = [];
            return;
        }

        // Separate root-level modules (functionId is null or undefined)
        this.rootLevelModules = this.availableModules.filter(module => !module.functionId || module.functionId === null);

        // Group modules by functionId
        const modulesByFunction: { [key: number]: any[] } = {};
        this.availableModules.forEach(module => {
            if (module.functionId && module.functionId !== null) {
                if (!modulesByFunction[module.functionId]) {
                    modulesByFunction[module.functionId] = [];
                }
                modulesByFunction[module.functionId].push(module);
            }
        });

        // Build tree nodes
        this.treeNodes = this.availableFunctions
            .filter(func => func && func.id)
            .sort((a, b) => (a.defaultOrder || 0) - (b.defaultOrder || 0))
            .map(func => {
                // Get modules for this function
                const functionModules = (modulesByFunction[func.id] || [])
                    .sort((a, b) => (a.defaultOrder || 0) - (b.defaultOrder || 0))
                    .map(module => ({
                        label: module.name || `Module #${module.id}`,
                        data: {
                            type: 'module',
                            id: module.id,
                            functionId: module.functionId
                        },
                        leaf: true
                    } as TreeNode));

                return {
                    label: func.name || `Function #${func.id}`,
                    data: {
                        type: 'function',
                        id: func.id
                    },
                    children: functionModules,
                    expanded: true
                } as TreeNode;
            });

        // Update tree selection if permissions are already loaded
        if (this.functions.length > 0 || this.modules.length > 0) {
            this.updateTreeSelection();
        }
    }

    /**
     * Update tree selection based on current selectedFunctions and selectedModules
     */
    private updateTreeSelection(): void {
        if (!this.treeNodes || this.treeNodes.length === 0) {
            this.selectedTreeNodes = [];
            return;
        }

        const selectedNodes: TreeNode[] = [];

        // Select specific functions and modules
        this.treeNodes.forEach(funcNode => {
            const functionId = funcNode.data?.id;
            if (this.selectedFunctions.includes(functionId)) {
                selectedNodes.push(funcNode);
                // Select modules if they are in selectedModules
                if (funcNode.children) {
                    funcNode.children.forEach(moduleNode => {
                        const moduleId = moduleNode.data?.id;
                        if (this.selectedModules.includes(moduleId)) {
                            selectedNodes.push(moduleNode);
                        }
                    });
                }
            } else {
                // Function not selected, but check if any of its modules are selected
                if (funcNode.children) {
                    funcNode.children.forEach(moduleNode => {
                        const moduleId = moduleNode.data?.id;
                        if (this.selectedModules.includes(moduleId)) {
                            selectedNodes.push(moduleNode);
                        }
                    });
                }
            }
        });

        this.selectedTreeNodes = selectedNodes;
    }

    /**
     * Handle tree node selection
     */
    onNodeSelect(event: any): void {
        const node = event.node;
        if (!node || !node.data) {
            return;
        }

        if (node.data.type === 'function') {
            // When a function is selected, select all its child modules
            if (node.children && node.children.length > 0) {
                node.children.forEach((childNode: TreeNode) => {
                    if (!this.selectedTreeNodes.includes(childNode)) {
                        this.selectedTreeNodes.push(childNode);
                    }
                });
            }
        } else if (node.data.type === 'module') {
            // When a module is selected, automatically select its parent function
            const functionId = node.data.functionId;
            if (functionId) {
                // Find the parent function node
                const parentFunctionNode = this.treeNodes.find(funcNode => funcNode.data?.id === functionId);
                if (parentFunctionNode && !this.selectedTreeNodes.includes(parentFunctionNode)) {
                    this.selectedTreeNodes.push(parentFunctionNode);
                }
            }
        }

        // Update selectedFunctions and selectedModules from tree selection
        this.extractSelectionFromTree();
    }

    /**
     * Handle tree node unselection
     */
    onNodeUnselect(event: any): void {
        const node = event.node;
        if (!node || !node.data) {
            return;
        }

        if (node.data.type === 'function') {
            // When a function is unselected, unselect all its child modules
            if (node.children && node.children.length > 0) {
                node.children.forEach((childNode: TreeNode) => {
                    const index = this.selectedTreeNodes.indexOf(childNode);
                    if (index > -1) {
                        this.selectedTreeNodes.splice(index, 1);
                    }
                });
            }
        } else if (node.data.type === 'module') {
            // When a module is unselected, check if all modules of its parent function are unselected
            const functionId = node.data.functionId;
            if (functionId) {
                // Find the parent function node
                const parentFunctionNode = this.treeNodes.find(funcNode => funcNode.data?.id === functionId);
                if (parentFunctionNode && parentFunctionNode.children) {
                    // Check if any module of this function is still selected
                    const hasSelectedModule = parentFunctionNode.children.some((moduleNode: TreeNode) =>
                        this.selectedTreeNodes.includes(moduleNode)
                    );

                    // If no modules are selected, unselect the function
                    if (!hasSelectedModule) {
                        const functionIndex = this.selectedTreeNodes.indexOf(parentFunctionNode);
                        if (functionIndex > -1) {
                            this.selectedTreeNodes.splice(functionIndex, 1);
                        }
                    }
                }
            }
        }

        // Update selectedFunctions and selectedModules from tree selection
        this.extractSelectionFromTree();
    }

    /**
     * Extract selected functions and modules from tree selection
     * If at least one module of a function is selected, the function is considered selected
     */
    private extractSelectionFromTree(): void {
        const selectedFunctionIds: number[] = [];
        const selectedModuleIds: number[] = [];

        // First, collect all selected modules
        this.selectedTreeNodes.forEach(node => {
            if (node.data?.type === 'module') {
                selectedModuleIds.push(node.data.id);
            }
        });

        // Collect functions that are explicitly selected
        this.selectedTreeNodes.forEach(node => {
            if (node.data?.type === 'function') {
                selectedFunctionIds.push(node.data.id);
            }
        });

        // Also include functions that have at least one module selected
        // (even if the function node itself is not in selectedTreeNodes)
        this.treeNodes.forEach(funcNode => {
            const functionId = funcNode.data?.id;
            if (functionId && !selectedFunctionIds.includes(functionId)) {
                // Check if any module of this function is selected
                if (funcNode.children && funcNode.children.length > 0) {
                    const hasSelectedModule = funcNode.children.some((moduleNode: TreeNode) => {
                        const moduleId = moduleNode.data?.id;
                        return selectedModuleIds.includes(moduleId);
                    });

                    if (hasSelectedModule) {
                        selectedFunctionIds.push(functionId);
                    }
                }
            }
        });

        this.selectedFunctions = selectedFunctionIds;
        this.selectedModules = selectedModuleIds;
    }

    savePermissions(): void {
        if (!this.roleId) {
            return;
        }

        // Ensure we have the latest selection from tree
        this.extractSelectionFromTree();

        this.saving = true;

        // Always use normal mode: send selected function and module IDs
        const functionsToSave: number[] = [...this.selectedFunctions];
        const modulesToSave: number[] = [...this.selectedModules];

        // Save functions
        const functionsSub = this.rolesService.setRoleFunctions(Number(this.roleId), functionsToSave).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('functions', response);
                    return;
                }
                this.saveModules(modulesToSave);
            },
            error: () => {
                this.saving = false;
            }
        });

        this.subscriptions.push(functionsSub);
    }

    private saveModules(modulesToSave: number[]): void {
        const modulesSub = this.rolesService.setRoleModules(Number(this.roleId), modulesToSave).subscribe({
            next: (response: any) => {
                this.saving = false;
                if (!response?.success) {
                    this.handleBusinessError('modules', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Permissions updated successfully.'
                });

                // Navigate back to role details after successful save, open Permissions tab (index 1)
                this.router.navigate(['/entity-administration/roles', this.roleId], {
                    queryParams: { tab: 1 }
                });
            },
            error: () => {
                this.saving = false;
            }
        });

        this.subscriptions.push(modulesSub);
    }

    navigateBack(): void {
        // Navigate back to role details, open Permissions tab (index 1)
        this.router.navigate(['/entity-administration/roles', this.roleId], {
            queryParams: { tab: 1 }
        });
    }

    /**
     * Get function name by ID
     */
    getFunctionName(functionId: number): string {
        if (!this.availableFunctions || !Array.isArray(this.availableFunctions)) {
            return `Function #${functionId}`;
        }
        const functionObj = this.availableFunctions.find(f => f && f.id === functionId);
        return functionObj && functionObj.name ? functionObj.name : `Function #${functionId}`;
    }

    /**
     * Get module name by ID
     */
    getModuleName(moduleId: number): string {
        if (!this.availableModules || !Array.isArray(this.availableModules)) {
            return `Module #${moduleId}`;
        }
        const moduleObj = this.availableModules.find(m => m && m.id === moduleId);
        return moduleObj && moduleObj.name ? moduleObj.name : `Module #${moduleId}`;
    }


    private handleBusinessError(type: 'functions' | 'modules', response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (code) {
            case 'ERP11310':
                detail = 'Invalid Entity Role ID';
                break;
            case 'ERP11316':
                detail = type === 'functions' ? 'Invalid Functions list format' : 'Invalid Modules list format';
                break;
            case 'ERP11318':
                detail = 'Invalid Modules list format';
                break;
            case 'ERP11305':
                detail = 'Access Denied to Entity Roles';
                break;
            default:
                return null;
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.saving = false;
        return null;
    }
}
