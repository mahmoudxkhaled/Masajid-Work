import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

@Injectable({
    providedIn: 'root',
})
export class RolesService {
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

    private formatIntegerList(numbers: number[]): string {
        if (!numbers || numbers.length === 0) {
            return '{}';
        }
        // Remove duplicates
        const uniqueNumbers = [...new Set(numbers)];
        return `{${uniqueNumbers.join(',')}}`;
    }

    /**
     * Create a new functional role under an entity
     * API Code: 600
     * @param entityId - Entity ID
     * @param title - Role title
     * @param description - Role description
     */
    createEntityRole(entityId: number, title: string, description: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [entityId.toString(), title, description];
        return this.apiServices.callAPI(600, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get the details of an existing Entity Role
     * API Code: 601
     * @param roleId - Entity Role ID
     */
    getEntityRoleDetails(roleId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(601, this.getAccessToken(), [roleId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update the details of an Entity Role
     * API Code: 602
     * @param roleId - Entity Role ID
     * @param title - Role title
     * @param description - Role description
     * @param isRegional - Whether to use regional fields
     */
    updateEntityRole(roleId: number, title: string, description: string, isRegional: boolean): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [roleId.toString(), title, description, isRegional.toString()];
        return this.apiServices.callAPI(602, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Remove a role from an entity
     * API Code: 603
     * @param roleId - Entity Role ID
     */
    removeEntityRole(roleId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(603, this.getAccessToken(), [roleId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * List all roles within a specified entity
     * API Code: 604
     * @param entityId - Entity ID
     * @param lastRoleId - Last Role ID for pagination (negative if indicating page number)
     * @param filterCount - Number of records to return (minimum 5, maximum 100)
     */
    listEntityRoles(entityId: number, lastRoleId: number = 0, filterCount: number = 10): Observable<any> {
        this.isLoadingSubject.next(true);
        // Validate filter count: minimum 5, maximum 100
        const validatedFilterCount = Math.max(5, Math.min(100, filterCount));
        const params = [entityId.toString(), lastRoleId.toString(), validatedFilterCount.toString()];
        return this.apiServices.callAPI(604, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Assign an Entity Role to a specific account
     * API Code: 605
     * @param roleId - Entity Role ID
     * @param accountId - Account ID
     */
    assignRoleToAccount(roleId: number, accountId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [roleId.toString(), accountId.toString()];
        return this.apiServices.callAPI(605, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get the list of accounts assigned to one or more roles
     * API Code: 1280
     * @param roleIds - Array of Entity Role IDs
     * @param idsAndEmailsOnly - If true, returns Dictionary<int, string> (ID and email only). If false, returns List<Account> (full account objects)
     */
    getRoleAccountsList(roleIds: number[], idsAndEmailsOnly: boolean = false): Observable<any> {
        this.isLoadingSubject.next(true);
        const roleIdsString = this.formatIntegerList(roleIds);
        const params = [roleIdsString, idsAndEmailsOnly.toString()];
        return this.apiServices.callAPI(502, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }
}
