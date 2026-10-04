import type { Engine, ISourceOptions, ParticlesGroups, RecursivePartial } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';

interface NightSkyCounts {
    stars: number;
    brightStars: number;
    shootingStars: number;
}

const starColors = ['#ffffff', '#fff3c4', '#ffd21f'];
const brightStarColor = '#ffd21f';
const shootingStarColor = '#fff3c4';

const defaultNightSkyCounts: NightSkyCounts = { stars: 90, brightStars: 10, shootingStars: 2 };

export async function initParticlesEngine(engine: Engine): Promise<void> {
    await loadSlim(engine);
}

export function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function buildNightSkyOptions(
    reducedMotion: boolean,
    counts: NightSkyCounts = defaultNightSkyCounts,
    scaleWithArea = false,
): ISourceOptions {
    return {
        fullScreen: { enable: false },
        fpsLimit: 60,
        detectRetina: true,
        background: { color: 'transparent' },
        particles: {
            number: {
                value: counts.stars,
                density: buildDensity(scaleWithArea),
            },
            color: { value: starColors },
            shape: { type: 'circle' },
            opacity: {
                value: { min: 0.15, max: 0.9 },
                animation: {
                    enable: !reducedMotion,
                    speed: 0.6,
                    sync: false,
                    startValue: 'random',
                },
            },
            size: { value: { min: 0.6, max: 2 } },
            move: {
                enable: !reducedMotion,
                speed: 0.12,
                direction: 'none',
                random: true,
                outModes: { default: 'out' },
            },
            groups: buildNightSkyGroups(reducedMotion, counts, scaleWithArea),
        },
        responsive: [
            {
                maxWidth: 576,
                mode: 'screen',
                options: {
                    particles: { number: { value: Math.round(counts.stars * 0.45) } },
                },
            },
            {
                maxWidth: 1024,
                mode: 'screen',
                options: {
                    particles: { number: { value: Math.round(counts.stars * 0.72) } },
                },
            },
        ],
    };
}

export function buildPageNightSkyOptions(reducedMotion: boolean): ISourceOptions {
    return buildNightSkyOptions(reducedMotion, defaultNightSkyCounts, true);
}

function buildDensity(scaleWithArea: boolean) {
    return scaleWithArea ? { enable: true, width: 1920, height: 1080 } : { enable: false };
}

function buildNightSkyGroups(
    reducedMotion: boolean,
    counts: NightSkyCounts,
    scaleWithArea: boolean,
): RecursivePartial<ParticlesGroups> {
    const density = buildDensity(scaleWithArea);
    return {
        brightStars: {
            number: { value: counts.brightStars, density, limit: { value: 0 } },
            color: { value: brightStarColor },
            shape: {
                type: 'star',
                options: { star: { sides: 5, inset: 2.2 } },
            },
            size: { value: { min: 2.5, max: 4 } },
            opacity: {
                value: { min: 0.35, max: 1 },
                animation: {
                    enable: !reducedMotion,
                    speed: 0.4,
                    sync: false,
                    startValue: 'random',
                },
            },
        },
        shootingStars: {
            number: {
                value: reducedMotion ? 0 : counts.shootingStars,
                density,
                limit: { value: 0 },
            },
            color: { value: shootingStarColor },
            shape: { type: 'line' },
            stroke: { width: 1.5, color: { value: shootingStarColor } },
            size: { value: { min: 18, max: 30 } },
            opacity: { value: 0.85 },
            rotate: { value: 45, animation: { enable: false } },
            move: {
                enable: true,
                speed: { min: 14, max: 20 },
                direction: 'bottom-right',
                straight: true,
                random: false,
                outModes: { default: 'out' },
            },
            life: {
                count: 0,
                delay: { value: { min: 4, max: 10 } },
                duration: { value: { min: 0.8, max: 1.4 } },
            },
        },
    };
}
