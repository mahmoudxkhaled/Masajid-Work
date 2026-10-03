import { Component } from '@angular/core';
import type { Engine, ISourceOptions } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';
import { buildAuthParticlesOptions } from './auth-particles.options';

@Component({
    selector: 'app-auth-layout',
    templateUrl: './auth-layout.component.html',
    styleUrls: ['./auth-layout.component.scss'],
})
export class AuthLayoutComponent {
    readonly particleOptions: ISourceOptions = buildAuthParticlesOptions(this.prefersReducedMotion());

    initParticles = async (engine: Engine): Promise<void> => {
        await loadSlim(engine);
    };

    // #region Motion
    private prefersReducedMotion(): boolean {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    // #endregion
}
