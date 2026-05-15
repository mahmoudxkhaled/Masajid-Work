import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { Roles } from 'src/app/core/models/system-roles';

@Injectable({
    providedIn: 'root',
})
export class EntitiesService {
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

    private getEntityId(): string {
        return this.localStorageService.getEntityId()?.toString() ?? '';
    }

    private getParentEntityId(): string {
        return this.localStorageService.getParentEntityId()?.toString() ?? '';
    }

    addEntity(code: string, name: string, description: string, parentEntityId: number, isPersonal: boolean): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [code, name, description, parentEntityId.toString(), isPersonal.toString()];
        return this.apiServices.callAPI(400, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    activateEntity(entityId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(401, this.getAccessToken(), [entityId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    deactivateEntity(entityId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(402, this.getAccessToken(), [entityId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    getEntityDetails(entityId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(403, this.getAccessToken(), [entityId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    updateEntityDetails(
        entityId: string,
        code: string,
        name: string,
        description: string,
        parentEntityId: number,
        IsRegional: boolean,
        isPersonal: boolean
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            entityId.toString(),
            code,
            name,
            description,
            parentEntityId.toString(),
            IsRegional.toString(),
            isPersonal.toString()
        ];
        console.log('params', params);

        return this.apiServices.callAPI(404, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    deleteEntity(entityId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(405, this.getAccessToken(), [entityId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    private getRequestedSystemRoleFallback(): number {
        // Used when a caller does not provide a scope.
        const accountDetails = this.localStorageService.getAccountDetails();
        return (accountDetails?.System_Role_ID as Roles) || 0;
    }


    listEntities(
        lastEntityId: number = 0,
        filterCount: number = 10,
        textFilter: string = '',
        requestedSystemRole: number | null = null
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        console.log('listEntities');
        const validatedFilterCount = Math.max(10, Math.min(100, filterCount));

        const requestedRoleValue =
            requestedSystemRole === null ? this.getRequestedSystemRoleFallback() : requestedSystemRole;

        // Backend: List_Entities(Last_Entity_ID, Filter_Count, Text_Filter, Requested_System_Role)
        const params = [
            lastEntityId.toString(),
            validatedFilterCount.toString(),
            textFilter || '',
            requestedRoleValue.toString()
        ];
        console.log('params', params);
        return this.apiServices.callAPI(406, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    getEntityContacts(entityId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(407, this.getAccessToken(), [entityId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    updateEntityContacts(
        entityId: string,
        address: string,
        isRegional: boolean,
        phoneNumbers: string[],
        faxNumbers: string[],
        emails: string[]
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            entityId,
            address,
            isRegional.toString(),
            JSON.stringify(phoneNumbers),
            JSON.stringify(faxNumbers),
            JSON.stringify(emails)
        ];
        return this.apiServices.callAPI(408, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    assignEntityAdmin(entityId: string, accountId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(410, this.getAccessToken(), [entityId, accountId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    getEntityAdmins(entityId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(411, this.getAccessToken(), [entityId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    deleteEntityAdmin(entityId: string, accountId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(412, this.getAccessToken(), [entityId, accountId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    assignEntityLogo(entityId: string, imageFormat: string, base64String: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const quotedBase64String = `"${base64String}"`;
        return this.apiServices.callAPI(
            420,
            this.getAccessToken(),
            [entityId, imageFormat, quotedBase64String]
        ).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }


    getEntityLogo(entityId: string, withGlobalLoading: boolean = true): Observable<any> {
        if (withGlobalLoading) {
            this.isLoadingSubject.next(true);
        }

        return this.apiServices.callAPI(421, this.getAccessToken(), [entityId]).pipe(
            finalize(() => {
                if (withGlobalLoading) {
                    this.isLoadingSubject.next(false);
                }
            })
        );
    }

    removeEntityLogo(entityId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(422, this.getAccessToken(), [entityId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    createEntityRole(entityId: number, title: string, description: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [entityId.toString(), title, description];
        console.log('params', params);
        return this.apiServices.callAPI(600, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    createAccount(email: string, firstName: string, lastName: string, entityId: number, entityRoleId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        console.log('email', email);
        console.log('firstName', firstName);
        console.log('lastName', lastName);
        console.log('entityId', entityId);
        console.log('entityRoleId', entityRoleId);
        const params = [email, firstName, lastName, entityId.toString(), entityRoleId.toString()];
        return this.apiServices.callAPI(150, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }


    getEntityAccountsList(
        entityId: string,
        includeSubentities: boolean = false,
        activeOnly: boolean = false,
        lastAccountId: number = 0,
        filterCount: number = 10,
        textFilter: string = ''
    ): Observable<any> {
        this.isLoadingSubject.next(true);

        const validatedFilterCount = Math.max(10, Math.min(100, filterCount));

        const params = [
            entityId,
            includeSubentities.toString(),
            activeOnly.toString(),
            lastAccountId.toString(),
            validatedFilterCount.toString(),
            textFilter || '',
            'false'
        ];
        return this.apiServices.callAPI(500, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }


    activateAccount(accountId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(151, this.getAccessToken(), [accountId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    deactivateAccount(accountId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(152, this.getAccessToken(), [accountId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }


    deleteAccount(email: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(153, this.getAccessToken(), [email]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get account details by email
     * API Code: 155
     * @param email - Account email address
     */
    getAccountDetails(email: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(155, this.getAccessToken(), [email]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update account details
     * API Code: 156
     * @param email - Account email address
     * @param description - Account description
     * @param isRegional - Whether to use regional fields
     */
    updateAccountDetails(email: string, description: string, isRegional: boolean): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [email, description, isRegional.toString()];
        return this.apiServices.callAPI(156, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update account email address
     * API Code: 157
     * @param accountId - Account ID
     * @param currentEmail - Current email address
     * @param newEmail - New email address
     */
    updateAccountEmail(accountId: number, currentEmail: string, newEmail: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [accountId.toString(), currentEmail, newEmail];
        return this.apiServices.callAPI(157, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update account entity assignment
     * API Code: 158
     * @param email - Account email address
     * @param entityId - New entity ID
     * @param entityRoleId - New entity role ID
     */
    updateAccountEntity(email: string, entityId: number, entityRoleId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [email, entityId.toString(), entityRoleId.toString()];
        return this.apiServices.callAPI(158, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }
}

