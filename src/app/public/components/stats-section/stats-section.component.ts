import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { STATS } from '../../data/public-landing.data';

@Component({
  standalone: false,
  selector: 'app-stats-section',
  templateUrl: './stats-section.component.html',
  styleUrl: './stats-section.component.scss',
})
export class StatsSectionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('statsRoot', { static: true }) statsRoot!: ElementRef<HTMLElement>;

  readonly stats = STATS;

  /** Current displayed integers (count-up). */
  displayed: number[];

  private observer?: IntersectionObserver;
  private rafId = 0;
  private started = false;

  constructor(private readonly cdr: ChangeDetectorRef) {
    this.displayed = this.stats.map(() => 0);
  }

  ngAfterViewInit(): void {
    const el = this.statsRoot?.nativeElement;
    if (!el) {
      this.startCountUp();
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      this.startCountUp();
      return;
    }

    const rect = el.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    if (alreadyVisible) {
      this.startCountUp();
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.startCountUp();
            this.observer?.disconnect();
            this.observer = undefined;
            break;
          }
        }
      },
      { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  formatStat(i: number): string {
    return `${this.displayed[i] ?? 0}${this.stats[i].suffix}`;
  }

  private startCountUp(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    const targets = this.stats.map((s) => s.target);

    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (let i = 0; i < targets.length; i++) {
        this.displayed[i] = targets[i];
      }
      this.cdr.markForCheck();
      return;
    }

    const durationMs = 1600;
    const start = performance.now();

    const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutQuad(t);

      for (let i = 0; i < targets.length; i++) {
        this.displayed[i] = Math.round(eased * targets[i]);
      }
      this.cdr.markForCheck();

      if (t < 1) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.rafId = 0;
        for (let i = 0; i < targets.length; i++) {
          this.displayed[i] = targets[i];
        }
        this.cdr.markForCheck();
      }
    };

    this.rafId = requestAnimationFrame(tick);
  }
}
