import { Component, Input } from '@angular/core';
import { DonationRequestWorkflowItem } from '../../models/donation-request.model';

@Component({
  standalone: false,
  selector: 'app-donation-workflow-timeline',
  templateUrl: './donation-workflow-timeline.component.html',
  styleUrl: './donation-workflow-timeline.component.scss',
})
export class DonationWorkflowTimelineComponent {
  @Input() items: DonationRequestWorkflowItem[] = [];
  @Input() loading = false;
}
