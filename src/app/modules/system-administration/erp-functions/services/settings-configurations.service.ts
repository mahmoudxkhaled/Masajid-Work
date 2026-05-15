import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import {
    FunctionsListResponse,
    ModulesListResponse,
    FunctionBackend,
    ModuleBackend,
    Function,
    Module
} from '../models/settings-configurations.model';

@Injectable({
    providedIn: 'root',
})
export class SettingsConfigurationsService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);

    constructor(
        private apiServices: ApiService,
        private localStorageService: LocalStorageService
    ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    }

    private getAccessToken(): string {
        return this.localStorageService.getAccessToken();
    }

    /**
     * Retrieve the list of all available functions
     * API Code: 705
     * @param options.silent - When true, do not set global loading state (avoids UI flicker)
     * @returns Observable containing FunctionsListResponse
     */
    getFunctionsList(options?: { silent?: boolean }): Observable<any> {
        if (!options?.silent) {
            this.isLoadingSubject.next(true);
        }
        return this.apiServices.callAPI(705, this.getAccessToken(), []).pipe(
            finalize(() => {
                if (!options?.silent) {
                    this.isLoadingSubject.next(false);
                }
            })
        );
    }

    /**
     * Retrieve the list of all available modules
     * API Code: 715
     * @param options.silent - When true, do not set global loading state
     * @returns Observable containing ModulesListResponse
     */
    getModulesList(options?: { silent?: boolean }): Observable<any> {
        if (!options?.silent) {
            this.isLoadingSubject.next(true);
        }
        return this.apiServices.callAPI(715, this.getAccessToken(), []).pipe(
            finalize(() => {
                if (!options?.silent) {
                    this.isLoadingSubject.next(false);
                }
            })
        );
    }

    // ==================== Functions CRUD Operations ====================

    /**
     * Add a new function
     * API Code: 700
     * @param code - Function code (max 10 characters)
     * @param name - Function name (max 30 characters)
     * @returns Observable containing FunctionCreateResponse
     */
    addFunction(code: string, name: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [code, name];
        return this.apiServices.callAPI(700, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get function details
     * API Code: 701
     * @param functionId - Function ID
     * @param options.silent - When true, do not set global loading state
     * @returns Observable containing FunctionDetailsResponse
     */
    getFunctionDetails(functionId: number, options?: { silent?: boolean }): Observable<any> {
        if (!options?.silent) {
            this.isLoadingSubject.next(true);
        }
        return this.apiServices.callAPI(701, this.getAccessToken(), [functionId.toString()]).pipe(
            finalize(() => {
                if (!options?.silent) {
                    this.isLoadingSubject.next(false);
                }
            })
        );
    }

    /**
     * Update function details
     * API Code: 702
     * @param functionId - Function ID
     * @param code - Function code
     * @param name - Function name
     * @param isRegional - Whether to update regional name
     * @param defaultOrder - Default order (must be > 0)
     * @param url - Function URL
     * @param options.silent - When true, do not set global loading state
     * @returns Observable containing response
     */
    updateFunctionDetails(
        functionId: number,
        code: string,
        name: string,
        isRegional: boolean,
        defaultOrder: number,
        url: string,
        options?: { silent?: boolean }
    ): Observable<any> {
        if (!options?.silent) {
            this.isLoadingSubject.next(true);
        }
        const params = [
            functionId.toString(),
            code,
            name,
            isRegional.toString(),
            defaultOrder.toString(),
            url.trim().toString()
        ];
        console.log('params', params);
        return this.apiServices.callAPI(702, this.getAccessToken(), params).pipe(
            finalize(() => {
                if (!options?.silent) {
                    this.isLoadingSubject.next(false);
                }
            })
        );
    }

    /**
     * Activate a function
     * API Code: 703
     * @param functionId - Function ID
     * @returns Observable containing response
     */
    activateFunction(functionId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(703, this.getAccessToken(), [functionId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Deactivate a function
     * API Code: 704
     * @param functionId - Function ID
     * @returns Observable containing response
     */
    deactivateFunction(functionId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(704, this.getAccessToken(), [functionId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Set function logo
     * API Code: 706
     * @param functionId - Function ID
     * @param imageFormat - Image format (png, jpg, jpe, jpeg, gif, bmp, tiff, tif, pict)
     * @param logoImage - Base64 encoded image
     * @returns Observable containing response
     */
    setFunctionLogo(functionId: number, imageFormat: string, logoImage: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const quotedBase64String = `"${logoImage}"`;
        const params = [functionId.toString(), imageFormat, quotedBase64String];
        return this.apiServices.callAPI(706, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get function logo
     * API Code: 707
     * @param functionId - Function ID
     * @param options.silent - When true, do not set global loading state (avoids table skeleton when opening logo dialog)
     * @returns Observable containing FunctionLogoResponse
     */
    getFunctionLogo(functionId: number, options?: { silent?: boolean }): Observable<any> {
        if (!options?.silent) {
            this.isLoadingSubject.next(true);
        }
        return this.apiServices.callAPI(707, this.getAccessToken(), [functionId.toString()]).pipe(
            finalize(() => {
                if (!options?.silent) {
                    this.isLoadingSubject.next(false);
                }
            })
        );
    }

    // ==================== Modules CRUD Operations ====================

    /**
     * Add a new module
     * API Code: 710
     * @param functionId - Function ID (module belongs to this function)
     * @param code - Module code (max 10 characters)
     * @param name - Module name (max 30 characters)
     * @returns Observable containing ModuleCreateResponse
     */
    addModule(functionId: number, code: string, name: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [functionId.toString(), code, name];
        return this.apiServices.callAPI(710, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get module details
     * API Code: 711
     * @param moduleId - Module ID
     * @returns Observable containing ModuleDetailsResponse
     */
    getModuleDetails(moduleId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(711, this.getAccessToken(), [moduleId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update module details
     * API Code: 712
     * @param moduleId - Module ID
     * @param functionId - Function ID
     * @param code - Module code
     * @param name - Module name
     * @param isRegional - Whether to update regional name
     * @param defaultOrder - Default order (must be > 0)
     * @param url - Module URL
     * @returns Observable containing response
     */
    updateModuleDetails(
        moduleId: number,
        functionId: number,
        code: string,
        name: string,
        isRegional: boolean,
        defaultOrder: number,
        url: string
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const normalizedUrl = url && url.trim().length > 0 ? url.trim() : '/under-development';
        const params = [
            moduleId.toString(),
            functionId.toString(),
            code,
            name,
            isRegional.toString(),
            defaultOrder.toString(),
            normalizedUrl
        ];
        console.log('params', params);
        return this.apiServices.callAPI(712, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Activate a module
     * API Code: 713
     * @param moduleId - Module ID
     * @returns Observable containing response
     */
    activateModule(moduleId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(713, this.getAccessToken(), [moduleId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Deactivate a module
     * API Code: 714
     * @param moduleId - Module ID
     * @returns Observable containing response
     */
    deactivateModule(moduleId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(714, this.getAccessToken(), [moduleId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Set module logo
     * API Code: 716
     * @param moduleId - Module ID
     * @param imageFormat - Image format (png, jpg, jpe, jpeg, gif, bmp, tiff, tif, pict)
     * @param logoImage - Base64 encoded image
     * @returns Observable containing response
     */
    setModuleLogo(moduleId: number, imageFormat: string, logoImage: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const quotedBase64String = `"${logoImage}"`;
        const params = [moduleId.toString(), imageFormat, quotedBase64String];
        console.log('params', params);
        return this.apiServices.callAPI(716, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get module logo
     * API Code: 717
     * @param moduleId - Module ID
     * @returns Observable containing ModuleLogoResponse
     */
    getModuleLogo(moduleId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(717, this.getAccessToken(), [moduleId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Parses the backend FunctionsListResponse into an array of Function objects
     * @param response - The API response containing functions list
     * @param isRegional - Whether to use regional names
     * @returns Array of normalized Function objects
     */
    parseFunctionsList(response: any, isRegional: boolean = false): Function[] {
        if (!response?.success || !response?.message) {
            return [];
        }

        // API returns message.Functions_List OR message directly as the object
        // Structure: { "1": { Function_ID: 1, ... }, "2": { Function_ID: 2, ... } }
        const functionsData = response.message.Functions_List || response.message;

        if (!functionsData || typeof functionsData !== 'object') {
            return [];
        }

        return (Object.values(functionsData) as any[])
            .filter((item: any) => item && item.Function_ID !== undefined)
            .map((item: any) => ({
                id: item.Function_ID,
                code: item.Code || '',
                name: isRegional ? (item.Name_Regional || item.Name || '') : (item.Name || ''),
                nameRegional: item.Name_Regional || '',
                defaultOrder: item.Default_Order,
                url: item.URL,
                isActive: item.Is_Active ?? true
            }));
    }

    /**
     * Parses the backend ModulesListResponse into an array of Module objects
     * @param response - The API response containing modules list
     * @param isRegional - Whether to use regional names
     * @returns Array of normalized Module objects
     */
    parseModulesList(response: any, isRegional: boolean = false): Module[] {
        if (!response?.success || !response?.message) {
            return [];
        }

        // API returns message.Modules_List OR message directly as the object
        // Structure: { "1": { Module_ID: 1, ... }, "2": { Module_ID: 2, ... } }
        const modulesData = response.message.Modules_List || response.message;

        if (!modulesData || typeof modulesData !== 'object') {
            return [];
        }

        return (Object.values(modulesData) as any[])
            .filter((item: any) => item && item.Module_ID !== undefined)
            .map((item: any) => ({
                id: item.Module_ID,
                functionId: item.Function_ID,
                code: item.Code || '',
                name: isRegional ? (item.Name_Regional || item.Name || '') : (item.Name || ''),
                nameRegional: item.Name_Regional || '',
                defaultOrder: item.Default_Order,
                url: item.URL,
                isActive: item.Is_Active ?? true
            }));
    }
}
