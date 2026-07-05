import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { PermissionService } from './permission.service';
import {
    IModulesDetails,
    IFunctionDetail,
    IMenuFunction,
    IMenuModule
} from '../models/account-status.model';
import { MasajidUserType } from '../models/masajid-user-type.model';
import {
    STATIC_FUNCTIONS_DETAILS,
    STATIC_MODULES_DETAILS,
    MODULE_ROLE_VISIBILITY,
    DEFAULT_MODULE_VISIBLE_ROLES,
    SYSTEM_ADMIN_ONLY_LEGACY_FUNCTIONS,
} from '../config/static-navigation.config';
import { Roles } from '../models/system-roles';
import {
    MASAJID_WORKSPACE_FUNCTION_USER_TYPE,
    MASAJID_WORKSPACE_FUNCTIONS,
    MASAJID_WORKSPACE_MODULES,
    MASAJID_WORKSPACE_MODULE_ROLE_VISIBILITY,
} from '../config/masajid-workspace.config';

@Injectable({
    providedIn: 'root'
})
export class ModuleNavigationService {
    constructor(
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) { }

    getFunctionsWithModules(userType?: MasajidUserType | null): IMenuFunction[] {
        const resolvedUserType = userType ?? this.localStorageService.getMasajidUserType();
        const legacyFunctions = this.buildLegacyFunctionsWithModules(resolvedUserType);
        const workspaceFunctions = this.buildWorkspaceFunctionsWithModules(resolvedUserType);
        const merged = [...legacyFunctions, ...workspaceFunctions];
        merged.sort((a, b) => a.defaultOrder - b.defaultOrder);
        return merged;
    }

    private buildLegacyFunctionsWithModules(userType: MasajidUserType | null | undefined): IMenuFunction[] {
        const functionsArray: IMenuFunction[] = [];

        Object.entries(STATIC_FUNCTIONS_DETAILS).forEach(([functionCode, functionData]) => {
            if (!functionData?.FunctionID) {
                return;
            }

            if (!this.canSeeLegacyFunction(functionCode, userType)) {
                return;
            }

            let modules = this.getModulesForFunction(
                functionData.FunctionID,
                STATIC_MODULES_DETAILS,
                functionCode,
                (moduleCode) => this.canSeeLegacyModule(moduleCode),
            );

            if (!modules.length) {
                return;
            }

            functionsArray.push(this.toMenuFunction(functionCode, functionData, modules));
        });

        return functionsArray;
    }

    private buildWorkspaceFunctionsWithModules(userType: MasajidUserType | null | undefined): IMenuFunction[] {
        if (!userType || userType === MasajidUserType.Unknown) {
            return [];
        }

        const functionsArray: IMenuFunction[] = [];

        Object.entries(MASAJID_WORKSPACE_FUNCTIONS).forEach(([functionCode, functionData]) => {
            if (!functionData?.FunctionID) {
                return;
            }

            if (MASAJID_WORKSPACE_FUNCTION_USER_TYPE[functionCode] !== userType) {
                return;
            }

            let modules = this.getModulesForFunction(
                functionData.FunctionID,
                MASAJID_WORKSPACE_MODULES,
                functionCode,
                (moduleCode) => this.canSeeWorkspaceModule(moduleCode),
            );

            if (!modules.length) {
                return;
            }

            functionsArray.push(this.toMenuFunction(functionCode, functionData, modules));
        });

        return functionsArray;
    }

    private toMenuFunction(
        functionCode: string,
        functionData: IFunctionDetail,
        modules: IMenuModule[],
    ): IMenuFunction {
        return {
            code: functionCode,
            name: this.getLocalizedName(functionData.Name || '', functionData.Name_Regional || ''),
            nameRegional: functionData.Name_Regional || '',
            defaultOrder: functionData.Default_Order || 0,
            icon: undefined,
            modules,
            url: functionData.URL || '',
        };
    }

    private canSeeLegacyModule(moduleCode: string): boolean {
        const roleId = this.permissionService.getCurrentRoleId();
        if (!roleId) {
            return false;
        }

        const allowed = MODULE_ROLE_VISIBILITY[moduleCode] ?? DEFAULT_MODULE_VISIBLE_ROLES;
        return this.permissionService.hasAnyRole(allowed);
    }

    private canSeeLegacyFunction(functionCode: string, userType: MasajidUserType | null | undefined): boolean {
        if (!SYSTEM_ADMIN_ONLY_LEGACY_FUNCTIONS.includes(functionCode)) {
            return true;
        }

        if (userType === MasajidUserType.SystemAdmin) {
            return true;
        }

        return this.permissionService.hasAnyRole([Roles.Developer, Roles.SystemAdministrator]);
    }

    private canSeeWorkspaceModule(moduleCode: string): boolean {
        const roleId = this.permissionService.getCurrentRoleId();
        if (!roleId) {
            return false;
        }

        const allowed = MASAJID_WORKSPACE_MODULE_ROLE_VISIBILITY[moduleCode] ?? DEFAULT_MODULE_VISIBLE_ROLES;
        return this.permissionService.hasAnyRole(allowed);
    }

    private getModulesForFunction(
        functionId: number,
        modulesDetails: IModulesDetails,
        functionCode: string,
        canSee: (moduleCode: string) => boolean,
    ): IMenuModule[] {
        const modules: IMenuModule[] = [];

        Object.entries(modulesDetails).forEach(([moduleCode, moduleData]) => {
            if (!moduleData || moduleData.FunctionID !== functionId || !canSee(moduleCode)) {
                return;
            }

            const url = this.resolveModuleUrl(moduleCode, moduleData.URL || '');

            modules.push({
                code: moduleCode,
                name: this.getLocalizedName(moduleData.Name || '', moduleData.Name_Regional || ''),
                nameRegional: moduleData.Name_Regional || '',
                defaultOrder: moduleData.Default_Order || 0,
                url,
                icon: undefined,
                isImplemented: url.trim() !== '',
                moduleId: moduleData.ModuleID,
                functionCode,
            });
        });

        modules.sort((a, b) => (a.defaultOrder || 0) - (b.defaultOrder || 0));
        return modules;
    }

    private getLocalizedName(name: string, nameRegional: string): string {
        return this.localStorageService.pickLocalizedField(name, nameRegional);
    }

    private resolveModuleUrl(moduleCode: string, staticUrl: string): string {
        const entityProfileCodes = ['FAC_PROFILE', 'VND_PROFILE', 'CHR_PROFILE'];
        if (entityProfileCodes.includes(moduleCode)) {
            const entityId = String(this.localStorageService.getEntityId() || '').trim();
            if (entityId) {
                return `/entity-administration/entities/${entityId}`;
            }
        }
        return staticUrl || '';
    }

    getFunctionByCode(functionCode: string): IFunctionDetail | null {
        return STATIC_FUNCTIONS_DETAILS[functionCode] ?? MASAJID_WORKSPACE_FUNCTIONS[functionCode] ?? null;
    }

    findModuleByUrl(url: string): IMenuModule | null {
        if (!url) {
            return null;
        }

        const functionsWithModules = this.getFunctionsWithModules();
        const normalizedUrl = url.trim().replace(/^\/+|\/+$/g, '');

        let bestMatch: IMenuModule | null = null;
        let bestMatchLength = -1;

        for (const functionItem of functionsWithModules) {
            for (const module of functionItem.modules) {
                if (!module.url) {
                    continue;
                }

                const normalizedModuleUrl = module.url.trim().replace(/^\/+|\/+$/g, '');

                if (normalizedModuleUrl === normalizedUrl) {
                    return module;
                }

                const isPrefixMatch =
                    normalizedModuleUrl.startsWith(normalizedUrl + '/') ||
                    normalizedUrl.startsWith(normalizedModuleUrl + '/');

                if (isPrefixMatch && normalizedModuleUrl.length > bestMatchLength) {
                    bestMatch = module;
                    bestMatchLength = normalizedModuleUrl.length;
                }
            }
        }

        return bestMatch;
    }
}
