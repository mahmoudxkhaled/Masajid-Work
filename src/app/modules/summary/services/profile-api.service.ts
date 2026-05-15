import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

@Injectable({
    providedIn: 'root',
})
export class ProfileApiService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);

    constructor(
        private apiService: ApiService,
        private localStorageService: LocalStorageService
    ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    }

    private getAccessToken(): string {
        return this.localStorageService.getAccessToken();
    }

    /**
     * Get user details
     * API Code: 201
     * @param userId - User ID
     * Error codes: ERP11190 (Invalid User ID)
     */
    getUserDetails(userId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiService.callAPI(201, this.getAccessToken(), [userId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update user details
     * API Code: 202
     * @param userId - User ID
     * @param firstName - First name
     * @param middleName - Middle name
     * @param lastName - Last name
     * @param prefix - Prefix (varchar 10)
     * @param isRegional - Whether to use regional fields
     * @param gender - Gender (true: Male, false: Female)
     * Error codes: ERP11190 (Invalid User ID), ERP11180 (Invalid First Name), ERP11181 (Invalid Last Name), ERP11182 (Invalid Middle Name), ERP11183 (Invalid Prefix)
     */
    updateUserDetails(
        userId: number,
        firstName: string,
        middleName: string,
        lastName: string,
        prefix: string,
        isRegional: boolean,
        gender: boolean
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            userId.toString(),
            firstName,
            middleName,
            lastName,
            prefix,
            isRegional.toString(),
            gender.toString()
        ];
        return this.apiService.callAPI(202, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get user contact information
     * API Code: 204
     * @param userId - User ID
     * Error codes: ERP11190 (Invalid User ID)
     */
    getUserContactInfo(userId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiService.callAPI(204, this.getAccessToken(), [userId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update user contact information
     * API Code: 205
     * @param userId - User ID
     * @param address - Address
     * @param isRegional - Whether to use regional address
     * @param phoneNumbers - Array of phone numbers
     * @param linkedinPage - LinkedIn page URL
     * @param facebookPage - Facebook page URL
     * @param instagramPage - Instagram page URL
     * @param twitterPage - Twitter page URL
     * Error codes: ERP11190 (Invalid User ID), ERP11191 (Invalid Phone Numbers), ERP11192 (Invalid LinkedIn), ERP11193 (Invalid Facebook), ERP11194 (Invalid Instagram), ERP11195 (Invalid Twitter)
     */
    updateUserContactInfo(
        userId: number,
        address: string,
        isRegional: boolean,
        phoneNumbers: string[],
        linkedinPage: string,
        facebookPage: string,
        instagramPage: string,
        twitterPage: string
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            userId.toString(),
            address,
            isRegional.toString(),
            JSON.stringify(phoneNumbers),
            linkedinPage,
            facebookPage,
            instagramPage,
            twitterPage
        ];

        console.log('params updateUserContactInfo', params);
        return this.apiService.callAPI(205, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get user preferences
     * API Code: 301
     * @param userId - User ID
     */
    getUserPreferences(userId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiService.callAPI(301, this.getAccessToken(), [userId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Set user preferences
     * API Code: 300
     * @param userId - User ID
     * @param preferences - Dictionary of preference key-value pairs
     */
    setUserPreferences(userId: number, preferences: Record<string, string>): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [userId.toString(), this.serializePreferences(preferences)];
        return this.apiService.callAPI(300, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    private serializePreferences(preferences: Record<string, string>): string {
        const keys = Object.keys(preferences || {}).sort((a, b) => a.localeCompare(b));
        const body = keys.map((k) => ({ [k]: String(preferences[k] ?? '') }));
        return JSON.stringify(body);
    }

    /**
     * Get profile picture
     * API Code: 304
     * @param userId - User ID
     */
    getProfilePicture(userId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiService.callAPI(304, this.getAccessToken(), [userId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Assign/update profile picture
     * API Code: 303
     * @param userId - User ID
     * @param imageFormat - Image format (png, jpg, jpeg, gif, bmp, tiff, pict)
     * @param base64Image - Base64 encoded image string
     * Error codes: ERP11220 (Invalid Image Format), ERP11221 (Invalid Image Size)
     */
    assignProfilePicture(userId: number, imageFormat: string, base64Image: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const quotedBase64String = `"${base64Image}"`;
        const params = [userId.toString(), imageFormat, quotedBase64String];
        return this.apiService.callAPI(303, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Remove profile picture
     * API Code: 305
     * @param userId - User ID
     */
    removeProfilePicture(userId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiService.callAPI(305, this.getAccessToken(), [userId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update account details (description)
     * API Code: 156
     * @param email - Account email address
     * @param description - Account description (or regional description based on isRegional)
     * @param isRegional - Whether to use regional fields
     */
    updateAccountDetails(email: string, description: string, isRegional: boolean): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [email, description, isRegional.toString()];
        return this.apiService.callAPI(156, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }
}

