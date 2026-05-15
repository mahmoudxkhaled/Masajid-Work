import { Component, OnDestroy, Optional } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.scss'
})
export class LogoutComponent implements OnDestroy {

  isLoading$: Observable<boolean>;
  unsubs: Subscription = new Subscription();
  constructor(
    private authService: AuthService,
    @Optional() private dialogRef: DynamicDialogRef
  ) {
    this.isLoading$ = this.authService.isLoadingSubject;
  }

  onConfirmLogout() {
    this.unsubs.add(
      this.authService.logout().subscribe({
        complete: () => this.dialogRef?.close()
      })
    );
  }
  ngOnDestroy(): void {
    this.unsubs.unsubscribe();
  }
}
