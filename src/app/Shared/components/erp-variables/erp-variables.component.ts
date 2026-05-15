import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-erp-variables',
  templateUrl: './erp-variables.component.html',
  styleUrl: './erp-variables.component.scss'
})
export class ERPVariablesComponent {

  constructor(private messageService: MessageService) { }

  erpVariables = [
    { name: 'Full Name', value: '[User\'s Name]', description: 'The recipient\'s full name, used for personalization.' },
  ];

  copyVariable(value: string) {
    navigator.clipboard.writeText(value).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Variable Copied',
        detail: 'The variable has been copied to your clipboard successfully.',
      });
    }).catch((err) => {
      this.messageService.add({
        severity: 'error',
        summary: 'Failed to Copy',
        detail: 'There was an issue copying the variable. Please try again.',
      });
    });
  }
}
