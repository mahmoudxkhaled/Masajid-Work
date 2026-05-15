import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { Roles } from 'src/app/core/models/system-roles';

/**
 * Service for managing Entity Groups (Entity_ID > 0)
 * Entity Groups can only be managed by Entity Administrators
 */
@Injectable({
    providedIn: 'root',
})
export class EntityGroupsService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);

    constructor(
        private apiServices: ApiService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    }

    private getAccessToken(): string {
        return this.localStorageService.getAccessToken();
    }

    private getEntityId(): number {
        const entityDetails = this.localStorageService.getEntityDetails();
        return entityDetails?.Entity_ID || 0;
    }

    /**
     * Check if current user is Entity Admin
     */
    isEntityAdmin(): boolean {
        return this.permissionService.hasRole(Roles.EntityAdministrator) ||
            this.permissionService.hasRole(Roles.SystemAdministrator) ||
            this.permissionService.hasRole(Roles.Developer);
    }

    /**
     * Create a new Entity Group
     * API Code: 570
     * @param title - Group title
     * @param description - Group description
     * @param entityId - Entity ID (must be > 0 for entity groups)
     */
    createEntityGroup(title: string, description: string, entityId: number): Observable<any> {
        if (!this.isEntityAdmin()) {
            throw new Error('Only Entity Administrators can create entity groups.');
        }
        if (entityId <= 0) {
            throw new Error('Entity ID must be greater than 0 for entity groups.');
        }

        this.isLoadingSubject.next(true);
        const params = [title, description, entityId.toString()];
        return this.apiServices.callAPI(570, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get Entity Group details
     * API Code: 571
     * @param groupId - Group ID
     */
    getEntityGroup(groupId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(571, this.getAccessToken(), [groupId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update Entity Group
     * API Code: 572
     * @param groupId - Group ID
     * @param title - Group title
     * @param description - Group description
     * @param isRegional - Whether to use regional fields
     */
    updateEntityGroup(groupId: number, title: string, description: string, isRegional: boolean): Observable<any> {
        if (!this.isEntityAdmin()) {
            throw new Error('Only Entity Administrators can update entity groups.');
        }

        this.isLoadingSubject.next(true);
        const params = [groupId.toString(), title, description, isRegional.toString()];
        return this.apiServices.callAPI(572, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Activate Entity Group
     * API Code: 573
     * @param groupId - Group ID
     */
    activateEntityGroup(groupId: number): Observable<any> {
        if (!this.isEntityAdmin()) {
            throw new Error('Only Entity Administrators can activate entity groups.');
        }

        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(573, this.getAccessToken(), [groupId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Deactivate Entity Group
     * API Code: 574
     * @param groupId - Group ID
     */
    deactivateEntityGroup(groupId: number): Observable<any> {
        if (!this.isEntityAdmin()) {
            throw new Error('Only Entity Administrators can deactivate entity groups.');
        }

        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(574, this.getAccessToken(), [groupId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Delete Entity Group
     * API Code: 575
     * @param groupId - Group ID
     */
    deleteEntityGroup(groupId: number): Observable<any> {
        if (!this.isEntityAdmin()) {
            throw new Error('Only Entity Administrators can delete entity groups.');
        }

        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(575, this.getAccessToken(), [groupId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * List Entity Account Groups
     * API Code: 577
     * @param entityId - Entity ID
     * @param activeOnly - Filter by active groups only
     */
    listEntityGroups(entityId: number, activeOnly: boolean = false): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [entityId.toString(), activeOnly.toString()];
        return this.apiServices.callAPI(577, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Assign Group Members (replaces all existing members)
     * API Code: 580
     * @param groupId - Group ID
     * @param accountIds - Array of Account IDs
     */
    assignGroupMembers(groupId: number, accountIds: number[]): Observable<any> {
        if (!this.isEntityAdmin()) {
            throw new Error('Only Entity Administrators can assign group members.');
        }

        this.isLoadingSubject.next(true);
        const params = [groupId.toString(), JSON.stringify(accountIds)];
        return this.apiServices.callAPI(580, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Add Group Members
     * API Code: 581
     * @param groupId - Group ID
     * @param accountIds - Array of Account IDs to add
     */
    addGroupMembers(groupId: number, accountIds: number[]): Observable<any> {
        if (!this.isEntityAdmin()) {
            throw new Error('Only Entity Administrators can add group members.');
        }

        this.isLoadingSubject.next(true);
        const params = [groupId.toString(), JSON.stringify(accountIds)];
        return this.apiServices.callAPI(581, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get Group Members
     * API Code: 582
     * @param groupId - Group ID
     * @param idsAndEmails - Return IDs and emails (true) or just IDs (false)
     */
    getGroupMembers(groupId: number, idsAndEmails: boolean = false): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [groupId.toString(), idsAndEmails.toString()];
        return this.apiServices.callAPI(582, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Remove Group Members
     * API Code: 583
     * @param groupId - Group ID
     * @param accountIds - Array of Account IDs to remove
     */
    removeGroupMembers(groupId: number, accountIds: number[]): Observable<any> {
        if (!this.isEntityAdmin()) {
            throw new Error('Only Entity Administrators can remove group members.');
        }

        this.isLoadingSubject.next(true);
        const params = [groupId.toString(), JSON.stringify(accountIds)];
        return this.apiServices.callAPI(583, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get current entity ID
     */
    getCurrentEntityId(): number {
        return this.getEntityId();
    }
}
