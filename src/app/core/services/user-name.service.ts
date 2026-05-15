import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class UserNameService {
    private userNameSubject = new BehaviorSubject<string>('');
    public userName$: Observable<string> = this.userNameSubject.asObservable();

    constructor() { }

    updateUserName(userName: string): void {
        console.log('UserNameService: Updating user name to:', userName);
        this.userNameSubject.next(userName);
    }

    getCurrentUserName(): string {
        return this.userNameSubject.value;
    }
}
