import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { PermissionService } from './permission.service';
import {
    IModulesDetails,
    IModuleDetail,
    IFunctionDetail,
    IMenuFunction,
    IMenuModule
} from '../models/account-status.model';
import {
    STATIC_FUNCTIONS_DETAILS,
    STATIC_MODULES_DETAILS,
    MODULE_ROLE_VISIBILITY,
    DEFAULT_MODULE_VISIBLE_ROLES
} from '../config/static-navigation.config';

@Injectable({
    providedIn: 'root'
})
export class ModuleNavigationService {
    constructor(
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) { }

    getFunctionsWithModules(): IMenuFunction[] {
        const functionsDetails: Record<string, IFunctionDetail> = STATIC_FUNCTIONS_DETAILS;
        const modulesDetails = STATIC_MODULES_DETAILS;
        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        const functionsArray: IMenuFunction[] = [];

        Object.entries(functionsDetails).forEach(([functionCode, functionData]) => {
            if (!functionData || !functionData.FunctionID) {
                return;
            }

            let modules = this.getModulesForFunction(functionData.FunctionID, modulesDetails, functionCode, isRegional);
            modules = modules.filter((m) => this.canSeeModule(m.code));

            modules.sort((a, b) => (a.defaultOrder || 0) - (b.defaultOrder || 0));

            if (modules.length === 0) {
                return;
            }

            functionsArray.push({
                code: functionCode,
                name: isRegional ? (functionData.Name_Regional || functionData.Name || '') : (functionData.Name || ''),
                nameRegional: functionData.Name_Regional || '',
                defaultOrder: functionData.Default_Order || 0,
                icon: undefined,
                modules: modules,
                url: functionData.URL || ''
            });
        });

        functionsArray.sort((a, b) => a.defaultOrder - b.defaultOrder);

        return functionsArray;
    }

    private canSeeModule(moduleCode: string): boolean {
        const roleId = this.permissionService.getCurrentRoleId();
        if (!roleId) {
            return false;
        }

        const allowed = MODULE_ROLE_VISIBILITY[moduleCode] ?? DEFAULT_MODULE_VISIBLE_ROLES;
        return this.permissionService.hasAnyRole(allowed);
    }

    private getModulesForFunction(
        functionId: number,
        modulesDetails: IModulesDetails,
        functionCode: string,
        isRegional: boolean
    ): IMenuModule[] {
        const modules: IMenuModule[] = [];

        Object.entries(modulesDetails).forEach(([moduleCode, moduleData]) => {
            if (!moduleData || moduleData.FunctionID !== functionId) {
                return;
            }

            modules.push({
                code: moduleCode,
                name: isRegional ? (moduleData.Name_Regional || moduleData.Name || '') : (moduleData.Name || ''),
                nameRegional: moduleData.Name_Regional || '',
                defaultOrder: moduleData.Default_Order || 0,
                url: moduleData.URL || '',
                icon: undefined,
                isImplemented: moduleData.URL.trim() !== '',
                moduleId: moduleData.ModuleID,
                functionCode: functionCode
            });
        });

        return modules;
    }

    getFunctionByCode(functionCode: string): IFunctionDetail | null {
        const row = STATIC_FUNCTIONS_DETAILS[functionCode];
        return row ?? null;
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
