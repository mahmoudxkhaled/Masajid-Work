import type { ISourceOptions } from '@tsparticles/engine';

const starColors = ['#ffffff', '#fff3c4', '#ffd21f'];
const brightStarColor = '#ffd21f';
const shootingStarColor = '#fff3c4';

export function buildAuthParticlesOptions(reducedMotion: boolean): ISourceOptions {
    return {
        fullScreen: { enable: false },
        fpsLimit: 60,
        detectRetina: true,
        background: { color: 'transparent' },
        particles: {
            number: {
                value: 90,
                density: { enable: false },
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
            groups: {
                brightStars: {
                    number: { value: 10, density: { enable: false }, limit: { value: 0 } },
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
                    number: { value: reducedMotion ? 0 : 2, density: { enable: false }, limit: { value: 0 } },
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
            },
        },
        responsive: [
            {
                maxWidth: 576,
                mode: 'screen',
                options: {
                    particles: { number: { value: 40 } },
                },
            },
            {
                maxWidth: 1024,
                mode: 'screen',
                options: {
                    particles: { number: { value: 65 } },
                },
            },
        ],
    };
}
