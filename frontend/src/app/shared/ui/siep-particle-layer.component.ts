import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';

type ParticleDensity = 'low' | 'medium' | 'high';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

@Component({
  selector: 'app-siep-particle-layer',
  standalone: true,
  template: `<canvas #canvas class="siep-particle-layer__canvas" aria-hidden="true"></canvas>`,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      display: block;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }

    .siep-particle-layer__canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  `,
})
export class SiepParticleLayerComponent implements AfterViewInit, OnDestroy {
  @Input() density: ParticleDensity = 'medium';
  @Input() interactive = false;
  @Input() mode: 'background' | 'foreground' = 'background';

  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly host = inject(ElementRef<HTMLElement>);
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private frameId = 0;
  private resizeObserver: ResizeObserver | null = null;
  private mouseX = -1000;
  private mouseY = -1000;
  private reducedMotion = false;
  private boundPointerMove = (event: PointerEvent) => this.onPointerMove(event);

  ngAfterViewInit(): void {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host.nativeElement);
    this.resize();

    if (this.interactive && !this.reducedMotion) {
      this.host.nativeElement.closest('.landing-hero')?.addEventListener('pointermove', this.boundPointerMove);
    }

    if (!this.reducedMotion) {
      this.animate();
    } else {
      this.drawStatic();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    this.host.nativeElement.closest('.landing-hero')?.removeEventListener('pointermove', this.boundPointerMove);
  }

  private particleCount(): number {
    const area = this.host.nativeElement.clientWidth * this.host.nativeElement.clientHeight;
    const densityFactor = this.density === 'low' ? 0.00004 : this.density === 'high' ? 0.0001 : 0.00007;
    return Math.max(18, Math.min(90, Math.round(area * densityFactor)));
  }

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    const { clientWidth, clientHeight } = this.host.nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(clientHeight * dpr));
    canvas.style.width = `${clientWidth}px`;
    canvas.style.height = `${clientHeight}px`;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.seedParticles();
    if (this.reducedMotion) {
      this.drawStatic();
    }
  }

  private seedParticles(): void {
    const width = this.host.nativeElement.clientWidth;
    const height = this.host.nativeElement.clientHeight;
    const count = this.particleCount();
    this.particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: 1 + Math.random() * 2.2,
      alpha: 0.18 + Math.random() * 0.42,
    }));
  }

  private onPointerMove(event: PointerEvent): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;
  }

  private animate(): void {
    this.update();
    this.draw();
    this.frameId = requestAnimationFrame(() => this.animate());
  }

  private update(): void {
    const width = this.host.nativeElement.clientWidth;
    const height = this.host.nativeElement.clientHeight;

    for (const particle of this.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < 0 || particle.x > width) {
        particle.vx *= -1;
      }
      if (particle.y < 0 || particle.y > height) {
        particle.vy *= -1;
      }

      if (this.interactive) {
        const dx = particle.x - this.mouseX;
        const dy = particle.y - this.mouseY;
        const dist = Math.hypot(dx, dy);
        if (dist < 120 && dist > 0) {
          const force = (120 - dist) / 120;
          particle.vx += (dx / dist) * force * 0.04;
          particle.vy += (dy / dist) * force * 0.04;
        }
      }

      particle.vx *= 0.995;
      particle.vy *= 0.995;
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }

    const width = this.host.nativeElement.clientWidth;
    const height = this.host.nativeElement.clientHeight;
    ctx.clearRect(0, 0, width, height);

    for (const particle of this.particles) {
      ctx.beginPath();
      ctx.fillStyle = this.mode === 'foreground'
        ? `rgba(196, 181, 253, ${particle.alpha})`
        : `rgba(167, 139, 250, ${particle.alpha})`;
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawStatic(): void {
    this.draw();
  }
}
