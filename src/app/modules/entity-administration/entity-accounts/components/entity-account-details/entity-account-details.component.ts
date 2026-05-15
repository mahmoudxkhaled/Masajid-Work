import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EntityAccount } from 'src/app/modules/entity-administration/entities/models/entities.model';

@Component({
  selector: 'app-entity-account-details',
  templateUrl: './entity-account-details.component.html'
})
export class EntityAccountDetailsComponent {
  @Input() visible: boolean = false;
  @Input() account?: EntityAccount;
  @Input() dialogMode: 'viewEdit' | 'view' | 'editDescription' = 'viewEdit';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();
}
