import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NetworkStatusService {
  private networkStatus$ = new BehaviorSubject<boolean>(navigator.onLine);

  constructor(private messageService: MessageService) {
    this.detectOffline();
    this.detectOnline();
    this.checkInitialNetworkStatus();
  }

  getNetworkStatus() {
    return this.networkStatus$.asObservable();
  }

  private checkInitialNetworkStatus() {
    if (!navigator.onLine) {
      this.simulateOfflineEvent();
    }
  }

  private detectOffline() {
    window.addEventListener('offline', () => {
      this.networkStatus$.next(false);
      this.showOfflineToast('offline-toast');
    });
  }

  private detectOnline() {
    window.addEventListener('online', () => {
      this.networkStatus$.next(true);
      this.showOnlineToast();
    });
  }

  private showOfflineToast(key: string) {
    this.messageService.clear('online-toast');
    this.messageService.add({
      key,
      detail: 'You are currently offline. Some features may not be available.',
      icon: 'pi pi-wifi-slash',
      severity: 'warn',
      closable: false,
      summary: 'No Internet Connection',
      sticky: true,
    });
  }

  private showOnlineToast() {
    this.messageService.clear('offline-toast');
    this.messageService.add({
      key: 'online-toast',
      detail: 'You are back online. All features are now available.',
      icon: 'pi pi-wifi',
      severity: 'success',
      closable: true,
      summary: 'Connection Restored',
      life: 5000,
    });

    setTimeout(() => window.location.reload(), 5000);
  }

  private simulateOfflineEvent() {
    const offlineEvent = new Event('offline');
    window.dispatchEvent(offlineEvent);
  }
}
