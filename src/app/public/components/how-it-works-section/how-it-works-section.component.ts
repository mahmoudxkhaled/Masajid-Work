import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { PROCESS_STEPS } from '../../data/public-landing.data';

@Component({
  standalone: false,
  selector: 'app-how-it-works-section',
  templateUrl: './how-it-works-section.component.html',
  styleUrl: './how-it-works-section.component.scss',
})
export class HowItWorksSectionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('sectionRoot', { static: true }) sectionRoot!: ElementRef<HTMLElement>;

  readonly steps = PROCESS_STEPS;

  revealed = false;

  private observer?: IntersectionObserver;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      return;
    }

    const el = this.sectionRoot?.nativeElement;
    if (!el) {
      this.reveal();
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      this.reveal();
      return;
    }

    const rect = el.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight * 0.88 && rect.bottom > 0;
    if (alreadyVisible) {
      this.reveal();
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.reveal();
            this.observer?.disconnect();
            this.observer = undefined;
            break;
          }
        }
      },
      { root: null, rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
    );
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  staggerMs(index: number): number {
    return this.revealed ? index * 110 : 0;
  }

  private reveal(): void {
    if (this.revealed) {
      return;
    }
    this.revealed = true;
    this.cdr.markForCheck();
  }
}
