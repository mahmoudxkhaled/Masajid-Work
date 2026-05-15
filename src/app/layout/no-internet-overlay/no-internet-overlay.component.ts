import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-no-internet-overlay',
  templateUrl: './no-internet-overlay.component.html',
  styleUrl: './no-internet-overlay.component.scss'
})
export class NoInternetOverlayComponent implements OnChanges, OnInit {
  @Input() isInternetWork: boolean = true;

  constructor(private messageService: MessageService) {
  }
  ngOnInit(): void {
    this.messageService.clear();
  }

  ngOnChanges() {
    if (!this.isInternetWork) {
      this.messageService.clear();
    } else {
    }
  }

  retry() {
    window.location.reload();
  }
}
