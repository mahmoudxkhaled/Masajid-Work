import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-entity-account-list',
  templateUrl: './entity-account-list.component.html'
})
export class EntityAccountListComponent {
  @Input() entityId: string = '';
  @Input() requestedSystemRole: number = 0;
  @Output() accountCreated = new EventEmitter<string>();
  @Output() accountUpdated = new EventEmitter<void>();
}
