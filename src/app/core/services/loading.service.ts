import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class LoadingService {
    private loadingSubject = new BehaviorSubject<boolean>(false);
    public isLoading$ = this.loadingSubject.asObservable();

    showLoading() {
        this.loadingSubject.next(true);
    }

    hideLoading() {
        this.loadingSubject.next(false);
    }
}


