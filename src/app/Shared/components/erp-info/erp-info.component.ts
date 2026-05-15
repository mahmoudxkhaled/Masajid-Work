import { AfterViewInit, Component, ElementRef, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Component({
  selector: 'app-erp-info',
  templateUrl: './erp-info.component.html',
  styleUrl: './erp-info.component.scss'
})
export class ERPInfoComponent implements OnInit, AfterViewInit {
  @Input() icon: string = 'fas fa-info-circle text-primary';
  @Input() severity: string = 'info';
  @Input() title: string = 'Title Here';
  @Input() description: string = 'Description here...';
  @Input() isDynamic: boolean = false;
  @Input() isDashboard: boolean = false;
  safeDescription: SafeHtml = '';
  get boxClass() {
    return `color-box ${this.severity}`;
  }

  constructor(private sanitizer: DomSanitizer, private router: Router, private elementRef: ElementRef) { }

  ngAfterViewInit(): void {
    const links = this.elementRef.nativeElement.querySelectorAll('.dynamic-link');
    links.forEach((link: HTMLAnchorElement) => {
      link.addEventListener('click', (event: MouseEvent) => {
        event.preventDefault();
        const path = link.getAttribute('data-path');
        if (path) {
          this.router.navigateByUrl(path);
        }
      });
    });
  }

  ngOnInit(): void {
    if (this.isDynamic) {
      this.safeDescription = this.sanitizer.bypassSecurityTrustHtml(this.description);
    }
  }
}
