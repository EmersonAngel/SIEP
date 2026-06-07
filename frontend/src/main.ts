import { bootstrapApplication } from '@angular/platform-browser';
import { isDevMode } from '@angular/core';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    // axe-core: run accessibility audits in dev mode only.
    // Results appear in the browser DevTools console.
    if (isDevMode()) {
      import('axe-core').then(({ default: axe }) => {
        axe.configure({ reporter: 'v2' });
        axe.run(document, (err, results) => {
          if (err) return;
          const violations = results.violations;
          if (violations.length) {
            console.group('%c[axe-core] Accessibility violations', 'color:#E25A4F;font-weight:bold');
            violations.forEach(v => {
              console.warn(`[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}`, v.nodes);
            });
            console.groupEnd();
          } else {
            console.info('%c[axe-core] No accessibility violations found.', 'color:#6EC67A;font-weight:bold');
          }
        });
      });
    }
  })
  .catch(err => console.error(err));
