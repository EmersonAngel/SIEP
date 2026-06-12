"""Recorridos E2E del flujo competitivo (Task 9).

--good: camino ideal con evidencia (PAP + enfermera) hasta COMPLETED.
--bad:  decisión con información incompleta (gate) + prohibida + salida segura.

Las decisiones se disparan por la lista accesible sr-only (DOM estable);
el diálogo/choices/feedback son DOM normal. Solo la enfermera exige canvas.
"""
import argparse
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4201"
EMAIL = "estudiante@psychosim.edu.co"
PASSWORD = "Estudiante123!"
OUT = Path(__file__).resolve().parents[2] / "docs" / "audit-flujo-competitivo-npcs-2026-06-11"

CLICK_SR = """
(prefix) => {
  const section = document.querySelector('section[aria-label="Lista accesible de puntos interactivos"]');
  if (!section) return 'no-section';
  for (const btn of section.querySelectorAll('button')) {
    const label = btn.getAttribute('aria-label') || '';
    if (label.startsWith(prefix)) { btn.dispatchEvent(new Event('click')); return label; }
  }
  return 'not-found:' + prefix;
}
"""


def hold(page, key, ms):
    page.keyboard.down(key)
    time.sleep(ms / 1000)
    page.keyboard.up(key)
    time.sleep(0.3)


def speaker(page):
    loc = page.locator(".speaker-name")
    return (loc.first.text_content() or "").strip() if loc.count() else ""


def open_sr(page, prefix, failures):
    result = page.evaluate(CLICK_SR, prefix)
    print(f"  sr-click [{prefix}] -> {result[:70]}")
    if result.startswith("not-found") or result == "no-section":
        failures.append(f"botón accesible no encontrado: {prefix}")
        return False
    time.sleep(1.6)
    return True


def skip_typewriter(page):
    btn = page.get_by_role("button", name="Saltar animación de texto")
    if btn.count():
        btn.first.click()
        time.sleep(0.5)


def click_choice(page, text, failures):
    skip_typewriter(page)
    btn = page.locator(".choice-btn", has_text=text)
    if not btn.count():
        failures.append(f"choice no encontrada: {text} (speaker={speaker(page)!r})")
        return False
    btn.first.click()
    time.sleep(0.6)
    return True


def close_dialogue(page):
    # Solo cerrar si hay diálogo: Escape sin diálogo = salida segura (REGLA-004).
    if page.locator(".dialogue-strip").count():
        page.keyboard.press("Escape")
        time.sleep(0.8)


def decide(page, prefix, failures, shot=None, expect_gate=False):
    """Abre el objeto de decisión, ejecuta 'Preparar esta intervención' y cierra feedback."""
    if not open_sr(page, prefix, failures):
        return
    if shot:
        skip_typewriter(page)
        time.sleep(0.4)
        page.screenshot(path=str(OUT / shot))
    if not click_choice(page, "Preparar esta intervenci", failures):
        return
    if expect_gate:
        time.sleep(0.6)
        if not page.get_by_text("Información insuficiente").count():
            failures.append(f"no apareció el gate de evidencia para {prefix}")
        else:
            print("  gate de evidencia visible OK")
        page.screenshot(path=str(OUT / "06b-evidence-gate.png"))
        if not click_choice(page, "Decidir con información incompleta", failures):
            return
    time.sleep(3.2)   # fade + backend + reload mundo + feedback supervisión


def login_and_start(page, force_new=True):
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.fill('input[formControlName="email"]', EMAIL)
    page.fill('input[formControlName="password"]', PASSWORD)
    page.click('button[type="submit"]')
    page.wait_for_url("**/portal/**", timeout=20000)
    page.goto(f"{BASE}/portal/simulador/1", wait_until="networkidle")
    time.sleep(2.0)
    btn = page.get_by_text("Iniciar nuevo intento" if force_new else "Continuar intento en progreso")
    if btn.count():
        btn.first.click()
    time.sleep(5.0)
    page.locator("canvas").first.click(force=True)
    time.sleep(0.5)


def run_good(page, failures):
    login_and_start(page)

    # ── Evidencia: PAP (DOM) + enfermera (canvas) ─────────────────────────────
    print("[1] usar PAP")
    if open_sr(page, "Primeros Auxilios Psicológicos", failures):
        click_choice(page, "Preparar esta intervenci", failures)
        time.sleep(1.2)
        close_dialogue(page)

    print("[2] hablar con la enfermera (canvas)")
    hold(page, "d", 1800)
    hold(page, "w", 400)
    page.keyboard.press("e")
    time.sleep(1.6)
    who = speaker(page)
    print(f"  diálogo: {who!r}")
    if "Enfermera" not in who:
        failures.append(f"no se habló con la enfermera: {who!r}")
    close_dialogue(page)

    print("[3] decisión adecuada etapa 1 (escucha segura) con línea desbloqueada")
    if open_sr(page, "Iniciar escucha segura", failures):
        skip_typewriter(page)
        time.sleep(0.4)
        if not page.get_by_text("él me amenazó con un cuchillo").count():
            failures.append("la línea desbloqueada por evidencia no apareció")
        else:
            print("  línea desbloqueada visible OK")
        page.screenshot(path=str(OUT / "07-stage-2-dialogue.png"))
        click_choice(page, "Preparar esta intervenci", failures)
        time.sleep(3.2)
    if "Supervisión" in speaker(page):
        print("  feedback de supervisión OK")
    page.screenshot(path=str(OUT / "05-stage-1-good-path.png"))
    close_dialogue(page)

    print("[4] etapa 2: valorar riesgo (RISK_METER) y activar ruta VBG")
    if open_sr(page, "Riesgo:", failures):
        click_choice(page, "Preparar esta intervenci", failures)
        time.sleep(1.2)
        page.screenshot(path=str(OUT / "08-stage-3-risk-assessment.png"))
        close_dialogue(page)
    decide(page, "Ruta VBG", failures)
    close_dialogue(page)

    print("[5] etapa 3: informe integral")
    decide(page, "Informe integral", failures)
    close_dialogue(page)

    print("[6] etapa 4: valoración estructurada (display label de comisaría)")
    decide(page, "Valoración de riesgo", failures)
    close_dialogue(page)

    print("[7] etapa 5: ruta NNA → cierre")
    decide(page, "Ruta NNA", failures)
    time.sleep(2.0)

    outcome = page.locator(".outcome")
    if outcome.count():
        print("  outcome visible OK")
        if not page.get_by_text("Línea de tiempo de decisiones clave").count():
            failures.append("el reporte no muestra la línea de tiempo")
        if not page.get_by_text("Consecuencias del caso").count():
            failures.append("el reporte no muestra consecuencias")
    else:
        failures.append("no apareció la pantalla de cierre tras la última decisión")
    page.screenshot(path=str(OUT / "09-final-report-good.png"), full_page=True)


def run_bad(page, failures):
    login_and_start(page)

    print("[1] decisión riesgosa SIN evidencia → chip + gate")
    if open_sr(page, "Ruta de atención VBG", failures):
        skip_typewriter(page)
        time.sleep(0.4)
        if not page.get_by_text("Información incompleta").count():
            failures.append("el chip de información incompleta no aparece")
        page.screenshot(path=str(OUT / "06-stage-1-risky-path.png"))
        click_choice(page, "Preparar esta intervenci", failures)
        time.sleep(0.8)
        if click_choice(page, "Decidir con información incompleta", failures):
            time.sleep(3.2)
    close_dialogue(page)

    print("[2] etapa 2: decisión PROHIBIDA (mediación con agresor)")
    decide(page, "Mediacion prohibida", failures, expect_gate=True)
    who = speaker(page)
    print(f"  feedback: {who!r}")
    if not page.get_by_text("Alerta ética").count():
        failures.append("no apareció la alerta ética de conducta prohibida")
    page.screenshot(path=str(OUT / "06c-prohibited-feedback.png"))
    close_dialogue(page)

    print("[3] salida segura → reporte con timeline negativa")
    page.keyboard.press("Escape")
    time.sleep(2.5)
    if not page.locator(".outcome").count():
        failures.append("no apareció el outcome tras salida segura")
    page.screenshot(path=str(OUT / "10-final-report-bad-or-risky.png"), full_page=True)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--good", action="store_true")
    ap.add_argument("--bad", action="store_true")
    ap.add_argument("--headed", action="store_true")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    failures: list[str] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not args.headed)
        page = browser.new_page(viewport={"width": 1600, "height": 900})
        console_errors = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        if args.good:
            run_good(page, failures)
        if args.bad:
            run_bad(page, failures)
        critical = [e for e in console_errors if "ERR_ABORTED" not in e]
        if critical:
            failures.append(f"errores de consola: {critical[:5]}")
        browser.close()

    for f in failures:
        print(f"FAIL: {f}")
    print("RESULTADO:", "OK" if not failures else f"{len(failures)} fallos")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
