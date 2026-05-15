import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Notifies the top bar (and any other subscriber) to refresh entity details from localStorage.
 * Call requestRefresh() after updating the current entity (e.g. in entity form) so the top bar title updates.
 */
@Injectable({
    providedIn: 'root'
})
export class EntityDetailsRefreshService {
    private refresh$ = new Subject<void>();

    requestRefresh(): void {
        this.refresh$.next();
    }

    onRefreshRequested() {
        return this.refresh$.asObservable();
    }
}
