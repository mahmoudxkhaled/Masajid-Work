import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

@Injectable({
    providedIn: 'root',
})
export class GroupsService {
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

    private getAccountId(): number {
        const accountDetails = this.localStorageService.getAccountDetails();
        return accountDetails?.Account_ID || 0;
    }

    /**
     * Create a new Account Group
     * API Code: 570
     * @param title - Group title
     * @param description - Group description
     * @param entityId - Entity ID (0 for personal groups)
     */
    createGroup(title: string, description: string, entityId: number = 0): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [title, description, entityId.toString()];
        return this.apiServices.callAPI(570, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get Account Group details
     * API Code: 571
     * @param groupId - Group ID
     */
    getGroup(groupId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(571, this.getAccessToken(), [groupId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update Account Group
     * API Code: 572
     * @param groupId - Group ID
     * @param title - Group title
     * @param description - Group description
     * @param isRegional - Whether to use regional fields
     */
    updateGroup(groupId: number, title: string, description: string, isRegional: boolean): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [groupId.toString(), title, description, isRegional.toString()];
        return this.apiServices.callAPI(572, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Activate Account Group
     * API Code: 573
     * @param groupId - Group ID
     */
    activateGroup(groupId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(573, this.getAccessToken(), [groupId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Deactivate Account Group
     * API Code: 574
     * @param groupId - Group ID
     */
    deactivateGroup(groupId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(574, this.getAccessToken(), [groupId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Delete Account Group
     * API Code: 575
     * @param groupId - Group ID
     */
    deleteGroup(groupId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(575, this.getAccessToken(), [groupId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * List Personal Account Groups
     * API Code: 576
     * @param accountId - Account ID
     * @param activeOnly - Filter by active groups only
     */
    listPersonalGroups(accountId: number, activeOnly: boolean = false): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [accountId.toString(), activeOnly.toString()];
        return this.apiServices.callAPI(576, this.getAccessToken(), params).pipe(
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
        this.isLoadingSubject.next(true);
        const params = [groupId.toString(), JSON.stringify(accountIds)];
        return this.apiServices.callAPI(583, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get current user's account ID
     */
    getCurrentAccountId(): number {
        return this.getAccountId();
    }
}

