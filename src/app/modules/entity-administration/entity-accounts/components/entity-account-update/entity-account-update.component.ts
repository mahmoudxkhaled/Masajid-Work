import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-entity-account-update',
  templateUrl: './entity-account-update.component.html'
})
export class EntityAccountUpdateComponent {
  @Input() visible: boolean = false;
  @Input() accountEmail: string = '';
  @Input() requestedSystemRole: number = 0;
  @Output() onSave = new EventEmitter<{ email: string; entityId: number; entityRoleId: number }>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();
}
