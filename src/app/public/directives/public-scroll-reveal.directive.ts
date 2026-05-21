import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  Renderer2,
} from '@angular/core';

@Directive({
  standalone: false,
  selector: '[publicScrollReveal]',
})
export class PublicScrollRevealDirective implements AfterViewInit, OnDestroy {
  @Input() publicScrollReveal: 'up' | 'down' = 'up';

  @Input() publicRevealDelay = 0;

  @Input() publicRevealRootMargin = '0px 0px -7% 0px';

  @Input() publicRevealThreshold = 0.07;

  private observer?: IntersectionObserver;

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  ngAfterViewInit(): void {
    const host = this.el.nativeElement;
    this.renderer.addClass(host, 'public-reveal');
    const dirClass = this.publicScrollReveal === 'down' ? 'public-reveal--down' : 'public-reveal--up';
    this.renderer.addClass(host, dirClass);

    if (this.publicRevealDelay > 0) {
      host.style.setProperty('--public-reveal-delay', `${this.publicRevealDelay}ms`);
    }

    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.renderer.addClass(host, 'public-reveal--visible');
      return;
    }

    this.observe(host);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private observe(host: HTMLElement): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.renderer.addClass(host, 'public-reveal--visible');
      return;
    }

    const rect = host.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight * 0.9 && rect.bottom > 40;
    if (alreadyVisible) {
      this.renderer.addClass(host, 'public-reveal--visible');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.renderer.addClass(host, 'public-reveal--visible');
            this.observer?.disconnect();
            this.observer = undefined;
            break;
          }
        }
      },
      {
        root: null,
        rootMargin: this.publicRevealRootMargin,
        threshold: this.publicRevealThreshold,
      },
    );
    this.observer.observe(host);
  }
}
