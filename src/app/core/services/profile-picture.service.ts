import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ProfilePictureService {
    private profilePictureSubject = new BehaviorSubject<string | null>(null);
    public profilePicture$: Observable<string | null> = this.profilePictureSubject.asObservable();

    constructor() { }

    updateProfilePicture(pictureUrl: string | null): void {
        this.profilePictureSubject.next(pictureUrl);
    }

    getCurrentProfilePicture(): string | null {
        return this.profilePictureSubject.value;
    }
}

