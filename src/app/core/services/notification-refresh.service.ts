import { Injectable } from '@angular/core';
import { ReplaySubject, Subject } from 'rxjs';

/**
 * Scoped refresh for top bar and inbox independently.
 * - Top bar bell: loads its own list on click, does not trigger inbox.
 * - Top bar "mark all as read": notifies inbox to refresh.
 * - Inbox mark read/delete: notifies top bar to refresh badge.
 */
@Injectable({
    providedIn: 'root'
})
export class NotificationRefreshService {
    private topBarRefresh$ = new ReplaySubject<void>(1);
    private inboxRefresh$ = new Subject<void>();

    requestTopBarRefresh(): void {
        this.topBarRefresh$.next();
    }

    requestInboxRefresh(): void {
        this.inboxRefresh$.next();
    }

    onTopBarRefreshRequested() {
        return this.topBarRefresh$.asObservable();
    }

    onInboxRefreshRequested() {
        return this.inboxRefresh$.asObservable();
    }

    /** Refreshes both. Used on app init and login. */
    requestRefresh(): void {
        this.topBarRefresh$.next();
        this.inboxRefresh$.next();
    }
}
