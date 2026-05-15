import { Component, OnInit } from '@angular/core';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

@Component({
    selector: 'app-entity-user-accounts-list',
    templateUrl: './entity-user-accounts-list.component.html'
})
export class EntityUserAccountsListComponent implements OnInit {
    entityId: string = '';

    constructor(private localStorageService: LocalStorageService) { }

    ngOnInit(): void {
        const currentEntityId = this.localStorageService.getEntityId();
        this.entityId = String(currentEntityId || '');
    }
}
