import { Component } from '@angular/core';
import type { ISourceOptions } from '@tsparticles/engine';
import {
    buildNightSkyOptions,
    initParticlesEngine,
    prefersReducedMotion,
} from 'src/app/Shared/particles/particles-options';

@Component({
    selector: 'app-auth-layout',
    templateUrl: './auth-layout.component.html',
    styleUrls: ['./auth-layout.component.scss'],
})
export class AuthLayoutComponent {
    readonly particleOptions: ISourceOptions = buildNightSkyOptions(prefersReducedMotion());
    readonly initParticles = initParticlesEngine;
}
