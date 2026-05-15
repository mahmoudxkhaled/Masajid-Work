import { Component, OnInit } from '@angular/core';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

@Component({
    selector: 'app-entity-user-accounts-page',
    templateUrl: './entity-user-accounts-page.component.html'
})
export class EntityUserAccountsPageComponent implements OnInit {
    entityId: string = '';

    constructor(private localStorageService: LocalStorageService) { }

    ngOnInit(): void {
        const currentEntityId = this.localStorageService.getEntityId();
        this.entityId = String(currentEntityId || '');
    }
}
