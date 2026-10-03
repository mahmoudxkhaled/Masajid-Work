import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { map, take } from 'rxjs';
import { DashboardResolverService } from '../services/dashboard-resolver.service';
import { LocalStorageService } from '../services/local-storage.service';
import { readCommunityTrusted } from '../utils/community-trusted.util';
import { canAccessOpenValidationRoute } from '../utils/open-validation-access.util';

@Injectable({ providedIn: 'root' })
export class OpenValidationGuard {
  constructor(
    private router: Router,
    private dashboardResolverService: DashboardResolverService,
    private localStorageService: LocalStorageService,
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) {
    return this.dashboardResolverService.resolveCurrentUserType().pipe(
      take(1),
      map((userType) => {
        const communityTrusted = readCommunityTrusted(this.localStorageService.getAccountDetails());
        if (canAccessOpenValidationRoute(userType, communityTrusted)) {
          return true;
        }
        this.router.navigate(['/dashboard']);
        return false;
      }),
    );
  }
}
