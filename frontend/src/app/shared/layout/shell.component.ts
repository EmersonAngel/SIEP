import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { APP_BRAND } from '../../core/config/brand.config';
import { isGameRoute } from './game-route.util';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  caption: string;
  roles: string[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule
  ],
  template: `
    <mat-sidenav-container class="portal-shell">
      <mat-sidenav #drawer class="portal-sidenav liquid-glass" [mode]="compactNav() ? 'over' : 'side'" [opened]="!compactNav() || drawerOpen()">
        <div class="sidenav-header">
          <a class="portal-brand" routerLink="/portal/dashboard" aria-label="Ir al dashboard">
            <img class="portal-brand__logo" src="/assets/images/institution/logo-cue-ccaq-vertical.webp" alt="CUE Alexander Von Humboldt" width="82" height="41">
            <span>
              <strong>{{ brand.shortName }}</strong>
              <small>{{ brand.fullName }}</small>
            </span>
          </a>
        </div>

        <mat-nav-list aria-label="Navegación del portal">
          @for (item of visibleNavItems(); track item.route) {
            <a mat-list-item [routerLink]="item.route" routerLinkActive="active-link" (click)="closeMobileNav()">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
              <span matListItemLine>{{ item.caption }}</span>
            </a>
          }
        </mat-nav-list>

        <a class="sidebar-primary-action" [routerLink]="sidebarPrimaryAction().route" (click)="closeMobileNav()">
          <mat-icon aria-hidden="true">{{ sidebarPrimaryAction().icon }}</mat-icon>
          <span>{{ sidebarPrimaryAction().label }}</span>
        </a>
      </mat-sidenav>

      <mat-sidenav-content class="portal-content">
        <div
          class="siep-mobile-nav-backdrop"
          [class.is-open]="menuOpen"
          (click)="closeMenu()"
        ></div>

        <section class="siep-mobile-nav" [class.is-open]="menuOpen" aria-label="Navegacion movil SIEP">
          <span class="siep-mobile-nav__bg top"></span>
          <span class="siep-mobile-nav__bg middle"></span>
          <span class="siep-mobile-nav__bg bottom"></span>

          <button
            class="siep-close-trigger"
            type="button"
            aria-label="Cerrar menu de navegacion"
            (click)="closeMenu()"
          >
            <span class="siep-close-trigger__bar left"></span>
            <span class="siep-close-trigger__bar right"></span>
          </button>

          <div class="siep-mobile-nav__content">
            <div class="siep-mobile-nav__brand">
              <div class="siep-mobile-nav__logo">S</div>
              <div>
                <strong>{{ brand.shortName }}</strong>
                <span>Sistema de Entrenamiento Psicosocial</span>
              </div>
            </div>

            <nav class="siep-mobile-nav__links" aria-label="Opciones del portal">
              @for (item of visibleNavItems(); track item.route; let index = $index) {
                <a
                  [routerLink]="item.route"
                  routerLinkActive="active"
                  [style.--item-index]="index"
                  (click)="closeMenu()"
                >
                  <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
                  <span>{{ item.label }}</span>
                  <small>{{ item.caption }}</small>
                </a>
              }
              <a class="siep-mobile-nav__primary" [routerLink]="sidebarPrimaryAction().route" (click)="closeMenu()">
                <mat-icon aria-hidden="true">{{ sidebarPrimaryAction().icon }}</mat-icon>
                <span>{{ sidebarPrimaryAction().label }}</span>
              </a>
            </nav>
          </div>
        </section>
        <header class="portal-topbar liquid-glass">
          <button
            class="siep-menu-trigger"
            type="button"
            aria-label="Abrir menu de navegacion"
            [class.is-hidden]="menuOpen"
            (click)="toggleMenu()"
          >
            <span class="siep-menu-trigger__bar top"></span>
            <span class="siep-menu-trigger__bar middle"></span>
            <span class="siep-menu-trigger__bar bottom"></span>
          </button>
          <div>
            <p class="topbar-kicker">{{ brand.shortName }} · Portal académico</p>
            <h1>{{ currentSection() }}</h1>
          </div>
          <span class="topbar-spacer"></span>
          <div class="user-pill">
            <mat-icon>account_circle</mat-icon>
            <span>{{ currentUserLabel() }}</span>
          </div>
          <button class="psy-icon-button" type="button" aria-label="Cerrar sesión" (click)="logout()">
            <mat-icon>logout</mat-icon>
          </button>
        </header>

        <main class="portal-main">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .portal-shell {
      min-height: 100vh;
      background: transparent;
    }
    .portal-sidenav {
      width: 296px;
      border-right: 2px solid rgba(75, 0, 181, 0.18);
      border-radius: 0 20px 20px 0;
      background:
        linear-gradient(180deg, #2a006b 0%, #4b00b5 42%, #3a0090 100%),
        repeating-linear-gradient(0deg, transparent 0 17px, rgba(255, 255, 255, 0.04) 17px 18px);
      box-shadow: 6px 0 0 rgba(42, 0, 107, 0.12);
      padding: 16px 12px;
      color: #fff;
    }
    .sidenav-header {
      padding: 10px 8px 18px;
      margin-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.16);
    }
    .portal-brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      min-height: 54px;
      color: #fff;
    }
    .portal-brand__logo {
      width: 82px;
      height: auto;
      object-fit: contain;
      padding: 6px;
      border-radius: 12px;
      background: rgba(255,255,255,.78);
      border: 2px solid rgba(0, 72, 118, .14);
      box-shadow: 3px 3px 0 rgba(0, 72, 118, .08);
    }
    .portal-brand strong,
    .portal-brand small { display: block; line-height: 1.12; }
    .portal-brand strong { font-size: 1.12rem; }
    .portal-brand small { color: rgba(255,255,255,.72); font-size: .78rem; margin-top: 3px; }
    mat-nav-list { display: grid; gap: 6px; }
    a[mat-list-item] {
      min-height: 58px;
      border: 2px solid transparent;
      border-radius: 12px;
      color: rgba(255,255,255,.92);
      background: rgba(255, 255, 255, 0.08);
      transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
    }
    a[mat-list-item] mat-icon { color: rgba(255,255,255,.88); }
    a[mat-list-item] .mdc-list-item__primary-text,
    a[mat-list-item] .mdc-list-item__secondary-text {
      color: inherit !important;
    }
    a[mat-list-item] .mdc-list-item__secondary-text {
      opacity: 0.72;
    }
    a[mat-list-item]:hover {
      border-color: rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.14);
      box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.12);
      transform: translate(-1px, -1px);
    }
    .active-link {
      position: relative;
      background: rgba(255, 255, 255, 0.18) !important;
      border: 2px solid rgba(255, 255, 255, 0.28) !important;
      box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.14);
    }
    .active-link::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 50%;
      width: 4px;
      height: 28px;
      transform: translateY(-50%);
      border-radius: 2px;
      background: #fff;
    }
    .active-link mat-icon {
      color: #fff !important;
    }
    .sidebar-primary-action {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 14px;
      min-height: 48px;
      padding: 10px 14px;
      border: 2px solid rgba(255,255,255,.28);
      border-radius: 12px;
      background: #fff;
      color: #2a006b;
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 800;
      box-shadow: 4px 4px 0 rgba(0,0,0,.14);
      transition: transform 160ms ease;
    }
    .sidebar-primary-action:hover,
    .sidebar-primary-action:focus-visible {
      transform: translate(-1px, -1px);
      outline: 2px solid rgba(255,255,255,.5);
      outline-offset: 2px;
    }
    .sidebar-primary-action mat-icon {
      color: #4b00b5;
    }
    .portal-content { min-height: 100vh; }
    .siep-menu-trigger,
    .siep-close-trigger {
      position: relative;
      flex: 0 0 auto;
      width: 48px;
      height: 48px;
      border: 2px solid rgba(0, 72, 118, 0.28);
      border-radius: 12px;
      cursor: pointer;
      background:
        linear-gradient(135deg, rgba(255,255,255,.96), rgba(226, 241, 250, .95)),
        repeating-linear-gradient(90deg, transparent 0 9px, rgba(0, 72, 118, .06) 9px 10px);
      box-shadow: 5px 5px 0 rgba(0, 82, 130, 0.12);
      transition: transform 180ms ease, opacity 180ms ease, visibility 180ms ease, box-shadow 180ms ease;
    }
    .siep-menu-trigger::after,
    .siep-close-trigger::after {
      content: '';
      position: absolute;
      right: 6px;
      bottom: 6px;
      width: 6px;
      height: 6px;
      background: #7756a7;
      box-shadow: -8px 0 0 rgba(0, 118, 173, .42);
    }
    .siep-menu-trigger:hover,
    .siep-close-trigger:hover {
      transform: translate(-1px, -1px);
      box-shadow: 6px 6px 0 rgba(0, 82, 130, 0.14);
    }
    .siep-menu-trigger.is-hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: translateX(-8px);
    }
    .siep-menu-trigger__bar,
    .siep-close-trigger__bar {
      position: absolute;
      left: 12px;
      width: 24px;
      height: 3px;
      border-radius: 0;
      background: var(--siep-blue);
      box-shadow: 2px 2px 0 rgba(119, 86, 167, .22);
      transform-origin: center;
    }
    .siep-menu-trigger__bar.top { top: 14px; transform: rotate(-8deg); }
    .siep-menu-trigger__bar.middle { top: 22px; width: 20px; transform: translateX(4px); background: #7756a7; }
    .siep-menu-trigger__bar.bottom { top: 30px; transform: rotate(-8deg); }
    .siep-close-trigger {
      position: absolute;
      top: 18px;
      right: 18px;
      z-index: 4;
      opacity: 0;
      transform: translateY(-10px) rotate(-3deg);
      background:
        linear-gradient(135deg, #ffffff, #eef7fc),
        repeating-linear-gradient(0deg, transparent 0 8px, rgba(119, 86, 167, .07) 8px 9px);
    }
    .siep-close-trigger__bar {
      top: 23px;
      background: #7756a7;
    }
    .siep-close-trigger__bar.left { transform: rotate(45deg); }
    .siep-close-trigger__bar.right { transform: rotate(-45deg); }
    .siep-mobile-nav {
      position: fixed;
      inset: 0 0 0 auto;
      z-index: 60;
      width: min(420px, 92vw);
      min-height: 100vh;
      overflow: hidden;
      pointer-events: none;
      transform: translateX(110%);
      transition: transform 360ms cubic-bezier(.22, .82, .22, 1);
    }
    .siep-mobile-nav.is-open {
      pointer-events: auto;
      transform: translateX(0);
    }
    .siep-mobile-nav__bg {
      position: absolute;
      left: -28%;
      width: 150%;
      height: 42%;
      border: 2px solid rgba(0, 72, 118, .12);
      transform: translateX(54%) rotate(-45deg);
      transform-origin: center;
      transition: transform 500ms cubic-bezier(.2, .78, .2, 1), opacity 260ms ease;
    }
    .siep-mobile-nav__bg.top {
      top: -18%;
      background: linear-gradient(135deg, #dff3fb, #ffffff);
      opacity: .96;
      transition-delay: 20ms;
    }
    .siep-mobile-nav__bg.middle {
      top: 28%;
      background:
        linear-gradient(135deg, rgba(0, 82, 130, .96), rgba(119, 86, 167, .9)),
        repeating-linear-gradient(90deg, transparent 0 13px, rgba(255,255,255,.08) 13px 14px);
      opacity: .94;
      transform: translateX(64%) rotate(-45deg) scaleY(0);
      transition-delay: 80ms;
    }
    .siep-mobile-nav__bg.bottom {
      bottom: -17%;
      background: linear-gradient(135deg, #ffffff, #edf7fb);
      opacity: .98;
      transition-delay: 120ms;
    }
    .siep-mobile-nav.is-open .siep-mobile-nav__bg {
      transform: translateX(0) rotate(-45deg);
    }
    .siep-mobile-nav.is-open .siep-mobile-nav__bg.middle {
      transform: translateX(0) rotate(-45deg) scaleY(1);
    }
    .siep-mobile-nav.is-open .siep-close-trigger {
      opacity: 1;
      transform: translateY(0) rotate(0deg);
      transition-delay: 220ms;
    }
    .siep-mobile-nav__content {
      position: relative;
      z-index: 3;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      padding: 74px 18px 24px;
      background:
        linear-gradient(180deg, rgba(255,255,255,.9), rgba(235, 246, 251, .86)),
        repeating-linear-gradient(0deg, transparent 0 16px, rgba(0, 72, 118, .045) 16px 17px);
      border-left: 2px solid rgba(0, 72, 118, .18);
      opacity: 0;
      transform: translateX(18px);
      transition: opacity 240ms ease, transform 320ms ease;
      transition-delay: 120ms;
    }
    .siep-mobile-nav.is-open .siep-mobile-nav__content {
      opacity: 1;
      transform: translateX(0);
    }
    .siep-mobile-nav__brand {
      position: relative;
      display: grid;
      grid-template-columns: 58px minmax(0, 1fr);
      gap: 12px;
      align-items: center;
      margin-bottom: 18px;
      padding: 14px;
      border: 2px solid rgba(0, 72, 118, .16);
      border-radius: 12px;
      background: rgba(255,255,255,.82);
      box-shadow: 5px 5px 0 rgba(0, 82, 130, 0.12);
    }
    .siep-mobile-nav__brand::before {
      content: '';
      position: absolute;
      top: 10px;
      right: 10px;
      width: 8px;
      height: 8px;
      background: #7756a7;
      box-shadow: -12px 0 0 rgba(0, 118, 173, .45), 0 12px 0 rgba(0, 82, 130, .18);
    }
    .siep-mobile-nav__logo {
      display: grid;
      place-items: center;
      width: 54px;
      height: 54px;
      border: 2px solid rgba(0, 72, 118, .26);
      border-radius: 10px;
      color: #fff;
      font-weight: 900;
      font-size: 1.45rem;
      background: linear-gradient(135deg, var(--siep-blue), #7756a7);
      box-shadow: 4px 4px 0 rgba(0, 82, 130, .16);
    }
    .siep-mobile-nav__brand strong,
    .siep-mobile-nav__brand span {
      display: block;
      line-height: 1.16;
    }
    .siep-mobile-nav__brand strong {
      color: var(--siep-blue);
      font-size: 1.25rem;
      font-weight: 900;
    }
    .siep-mobile-nav__brand span {
      margin-top: 4px;
      color: var(--psy-muted);
      font-size: .78rem;
      font-weight: 700;
    }
    .siep-mobile-nav__links {
      display: grid;
      gap: 10px;
    }
    .siep-mobile-nav__links a {
      position: relative;
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      grid-template-areas:
        'icon label'
        'icon caption';
      align-items: center;
      min-height: 64px;
      padding: 10px 12px;
      border: 2px solid rgba(0, 72, 118, .14);
      border-radius: 10px;
      color: var(--psy-ink);
      background: rgba(255,255,255,.84);
      box-shadow: 4px 4px 0 rgba(0, 82, 130, 0.09);
      opacity: 0;
      transform: translateY(14px);
      transition: opacity 260ms ease, transform 260ms ease, border-color 160ms ease, background 160ms ease;
      transition-delay: calc(180ms + (var(--item-index) * 42ms));
    }
    .siep-mobile-nav.is-open .siep-mobile-nav__links a {
      opacity: 1;
      transform: translateY(0);
    }
    .siep-mobile-nav__links a::after {
      content: '';
      position: absolute;
      right: 10px;
      top: 10px;
      width: 6px;
      height: 6px;
      background: rgba(0, 118, 173, .32);
      box-shadow: -9px 9px 0 rgba(119, 86, 167, .18);
    }
    .siep-mobile-nav__links mat-icon {
      grid-area: icon;
      color: var(--siep-blue);
    }
    .siep-mobile-nav__links span {
      grid-area: label;
      color: var(--siep-blue);
      font-weight: 900;
      line-height: 1.1;
    }
    .siep-mobile-nav__links small {
      grid-area: caption;
      margin-top: 4px;
      color: var(--psy-muted);
      font-size: .72rem;
      font-weight: 700;
      line-height: 1.15;
    }
    .siep-mobile-nav__links a:hover,
    .siep-mobile-nav__links a.active {
      border-color: rgba(119, 86, 167, .35);
      background: rgba(240, 245, 251, .96);
      box-shadow: 5px 5px 0 rgba(0, 82, 130, 0.12);
    }
    .siep-mobile-nav__links a.active mat-icon,
    .siep-mobile-nav__links a.active span {
      color: #7756a7;
    }
    .siep-mobile-nav__primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 54px;
      margin-top: 6px;
      padding: 12px 14px;
      border: 2px solid rgba(75, 0, 181, 0.24);
      border-radius: 10px;
      background: linear-gradient(135deg, #4b00b5, #2a006b);
      color: #fff;
      text-decoration: none;
      font-weight: 900;
      box-shadow: 4px 4px 0 rgba(42, 0, 107, 0.18);
    }
    .siep-mobile-nav__primary mat-icon {
      color: #fff;
    }
    .siep-mobile-nav-backdrop {
      position: fixed;
      inset: 0;
      z-index: 55;
      background: rgba(0, 49, 78, .28);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 240ms ease, visibility 240ms ease;
    }
    .siep-mobile-nav-backdrop.is-open {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }
    .portal-topbar {
      position: sticky;
      z-index: 20;
      top: 16px;
      width: calc(100% - 32px);
      min-height: 72px;
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 16px;
      padding: 10px 14px;
      border-radius: 18px;
      border: 2px solid rgba(0, 72, 118, 0.12);
      box-shadow: 4px 4px 0 rgba(0, 72, 118, 0.06);
    }
    .topbar-kicker {
      margin: 0;
      color: var(--siep-blue-soft);
      font-size: .72rem;
      font-weight: 800;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    .portal-topbar h1 {
      margin: 2px 0 0;
      color: var(--siep-blue);
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.2;
    }
    .topbar-spacer { flex: 1; }
    .user-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      max-width: 280px;
      min-height: 44px;
      padding: 0 14px;
      border-radius: 999px;
      color: var(--psy-muted);
      background: rgba(255,255,255,.52);
      border: 1px solid var(--psy-border);
      overflow: hidden;
    }
    .user-pill span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .portal-main { padding: 10px clamp(16px, 3vw, 36px) 44px; }
    @media (min-width: 921px) {
      .siep-menu-trigger,
      .siep-mobile-nav,
      .siep-mobile-nav-backdrop {
        display: none;
      }
    }
    @media (max-width: 920px) {
      .portal-sidenav { width: min(310px, 88vw); border-radius: 0 20px 20px 0; }
      .portal-topbar { top: 10px; width: calc(100% - 20px); margin: 10px; }
      .user-pill { display: none; }
      .portal-main { padding-inline: 16px; }
    }
    @media (max-width: 520px) {
      .portal-topbar h1 { font-size: 1rem; }
      .topbar-kicker { font-size: .64rem; }
      .siep-mobile-nav {
        width: min(380px, 94vw);
      }
      .siep-mobile-nav__content {
        padding-inline: 14px;
      }
      .siep-mobile-nav__brand {
        grid-template-columns: 50px minmax(0, 1fr);
        padding: 12px;
      }
      .siep-mobile-nav__logo {
        width: 48px;
        height: 48px;
      }
    }
  `]
})
export class ShellComponent implements OnDestroy {
  readonly brand = APP_BRAND;
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  menuOpen = false;
  readonly drawerOpen = signal(false);
  readonly compactNav = signal(window.matchMedia('(max-width: 920px)').matches);
  readonly inGameMode = signal(false);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',  icon: 'dashboard',       route: '/portal/dashboard',          caption: 'Seguimiento formativo', roles: ['ESTUDIANTE', 'PROFESOR', 'ADMIN'] },
    { label: 'Simulador',  icon: 'play_circle',     route: '/portal/simulador',          caption: 'Simulación formativa', roles: ['ESTUDIANTE', 'PROFESOR', 'ADMIN'] },
    { label: 'Mi personaje', icon: 'face',          route: '/portal/personaje',          caption: 'Editor de avatar', roles: ['ESTUDIANTE', 'ADMIN'] },
    { label: 'Docente',    icon: 'timeline',        route: '/portal/docente/trazabilidad', caption: 'Trazabilidad y rúbricas', roles: ['PROFESOR', 'ADMIN'] },
    { label: 'Grupos',     icon: 'groups',          route: '/portal/grupos',             caption: 'Cohortes académicas', roles: ['PROFESOR', 'ADMIN'] },
    { label: 'Reportes',   icon: 'analytics',       route: '/portal/reportes',           caption: 'Evaluación por rúbricas', roles: ['PROFESOR', 'ADMIN'] },
    { label: 'Usuarios',   icon: 'manage_accounts', route: '/portal/admin/usuarios',     caption: 'Administración y roles', roles: ['ADMIN'] }
  ];

  readonly visibleNavItems = computed(() => {
    const role = this.auth.currentUser()?.role;
    if (!role) return this.navItems;
    return this.navItems.filter(item => item.roles.includes(role));
  });

  readonly sidebarPrimaryAction = computed(() => {
    const role = this.auth.currentUser()?.role;
    if (role === 'ADMIN') {
      return { label: 'Gestionar usuarios', route: '/portal/admin/usuarios', icon: 'manage_accounts' };
    }
    if (role === 'PROFESOR') {
      return { label: 'Revisar intentos', route: '/portal/docente/trazabilidad', icon: 'timeline' };
    }
    return { label: 'Continuar simulación', route: '/portal/simulador', icon: 'play_arrow' };
  });

  private readonly routerSub: Subscription;

  constructor() {
    window.matchMedia('(max-width: 920px)').addEventListener('change', event => {
      this.compactNav.set(event.matches);
      if (!event.matches) {
        this.drawerOpen.set(false);
        this.menuOpen = false;
      }
    });

    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        const gameMode = isGameRoute(e.urlAfterRedirects);
        this.inGameMode.set(gameMode);
        this.closeMenu();
        if (gameMode) {
          document.body.classList.add('game-mode');
        } else {
          document.body.classList.remove('game-mode');
        }
      });
  }

  ngOnDestroy(): void {
    this.routerSub.unsubscribe();
    document.body.classList.remove('game-mode');
  }

  toggleNav() { this.drawerOpen.set(!this.drawerOpen()); }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    if (this.menuOpen) this.drawerOpen.set(false);
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  closeMobileNav() {
    if (this.compactNav()) this.drawerOpen.set(false);
  }

  logout(): void {
    this.closeMenu();
    this.drawerOpen.set(false);
    this.auth.logout();
  }

  currentUserLabel() {
    return this.auth.currentUser()?.role ? 'Cuenta institucional' : 'Usuario institucional';
  }

  currentSection() {
    return this.brand.subtitle;
  }
}
