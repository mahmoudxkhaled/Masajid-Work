import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import {
    IFunctionsDetails,
    IModulesDetails,
    IModuleDetail,
    IFunctionDetail,
    IMenuFunction,
    IMenuModule
} from '../models/account-status.model';

@Injectable({
    providedIn: 'root'
})
export class ModuleNavigationService {
    constructor(private localStorageService: LocalStorageService) { }

    /**
     * Get all functions with their associated modules, sorted by Default_Order
     * @returns Array of IMenuFunction objects
     */
    getFunctionsWithModules(): IMenuFunction[] {
        const functionsDetails = this.localStorageService.getFunctionsDetails();
        const modulesDetails = this.localStorageService.getModulesDetails();

        if (!functionsDetails || !modulesDetails) {
            return [];
        }

        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';

        // Convert functions object to array and group modules
        const functionsArray: IMenuFunction[] = [];

        Object.entries(functionsDetails).forEach(([functionCode, functionData]) => {
            if (!functionData || !functionData.FunctionID) {
                return;
            }

            // Get all modules for this function
            const modules = this.getModulesForFunction(functionData.FunctionID, modulesDetails, functionCode, isRegional);

            // Sort modules by Default_Order
            modules.sort((a, b) => (a.defaultOrder || 0) - (b.defaultOrder || 0));

            functionsArray.push({
                code: functionCode,
                name: isRegional ? (functionData.Name_Regional || functionData.Name || '') : (functionData.Name || ''),
                nameRegional: functionData.Name_Regional || '',
                defaultOrder: functionData.Default_Order || 0,
                icon: undefined, // Function logos can be added later if needed
                modules: modules,
                url: functionData.URL || ''
            });
        });

        // Sort functions by Default_Order
        functionsArray.sort((a, b) => a.defaultOrder - b.defaultOrder);

        return functionsArray;
    }

    /**
     * Get modules for a specific function
     * @param functionId - Function ID to filter modules
     * @param modulesDetails - All modules details from localStorage
     * @param functionCode - Function code
     * @param isRegional - Whether to use regional names
     * @returns Array of IMenuModule objects
     */
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

            // Use URL field directly from localStorage

            modules.push({
                code: moduleCode,
                name: isRegional ? (moduleData.Name_Regional || moduleData.Name || '') : (moduleData.Name || ''),
                nameRegional: moduleData.Name_Regional || '',
                defaultOrder: moduleData.Default_Order || 0,
                url: moduleData.URL || '',
                icon: undefined, // Module logos can be fetched on-demand
                isImplemented: moduleData.URL.trim() !== '', // Module is implemented if URL is not empty
                moduleId: moduleData.ModuleID,
                functionCode: functionCode
            });
        });

        return modules;
    }



    getFunctionByCode(functionCode: string): IFunctionDetail | null {
        const functionsDetails = this.localStorageService.getFunctionsDetails();
        if (!functionsDetails) {
            return null;
        }
        return functionsDetails[functionCode as keyof IFunctionsDetails] || null;
    }

    /**
     * Find a module by URL (exact or partial match)
     * @param url - The URL to search for
     * @returns IMenuModule if found, null otherwise
     */
    findModuleByUrl(url: string): IMenuModule | null {
        if (!url) {
            return null;
        }

        const functionsWithModules = this.getFunctionsWithModules();

        // Normalize URL for comparison (remove leading/trailing slashes)
        const normalizedUrl = url.trim().replace(/^\/+|\/+$/g, '');

        for (const functionItem of functionsWithModules) {
            for (const module of functionItem.modules) {
                if (!module.url) {
                    continue;
                }

                // Normalize module URL
                const normalizedModuleUrl = module.url.trim().replace(/^\/+|\/+$/g, '');

                // Exact match
                if (normalizedModuleUrl === normalizedUrl) {
                    return module;
                }

                // Partial match - check if breadcrumb URL is a prefix of module URL
                // e.g., '/entity-administration/entities' matches '/entity-administration/entities/list'
                if (normalizedModuleUrl.startsWith(normalizedUrl + '/') ||
                    normalizedUrl.startsWith(normalizedModuleUrl + '/')) {
                    return module;
                }
            }
        }

        return null;
    }
}
