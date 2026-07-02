import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { map, take } from 'rxjs';
import { MasajidUserType } from '../models/masajid-user-type.model';
import { DashboardResolverService } from '../services/dashboard-resolver.service';

@Injectable({ providedIn: 'root' })
export class FacilityRepresentativeGuard {
  constructor(
    private router: Router,
    private dashboardResolverService: DashboardResolverService,
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) {
    return this.dashboardResolverService.resolveCurrentUserType().pipe(
      take(1),
      map((userType) => {
        if (
          userType === MasajidUserType.FacilityRepresentative ||
          userType === MasajidUserType.SystemAdmin
        ) {
          return true;
        }
        this.router.navigate(['/dashboard']);
        return false;
      }),
    );
  }
}
