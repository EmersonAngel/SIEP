"""Auditoria del flujo competitivo (NPCs modulares + puertas + evidencia).

No reemplaza capture.py ni c_phase_audit.py: es el smoke de esta fase.

Uso:
  python flujo_competitivo_audit.py --out-dir ../../docs/audit-flujo-competitivo-npcs-2026-06-11 --before
  python flujo_competitivo_audit.py --out-dir ../../docs/audit-flujo-competitivo-npcs-2026-06-11 --after

--before: capturas 00-before-* + 00-before-measurements.json (estado HEAD previo).
--after:  capturas 01..04 + 11..13 + 14-measurements.json; exit 1 si hay
          overflow, 404 de assets o errores criticos de consola. Las capturas
          de caminos de decision (05-10) se toman con capture.py por separado
          (flujos con estado de intento que conviene controlar a mano).
"""
import argparse
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4201"
EMAIL = "estudiante@psychosim.edu.co"
PASSWORD = "Estudiante123!"

MEASURE_JS = """
() => {
  const rect = el => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height,
             right: r.right, bottom: r.bottom };
  };
  let avatarStored = null;
  try { avatarStored = localStorage.getItem('psychosim_avatar'); } catch (e) {}
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    canvasRect: rect(document.querySelector('canvas')),
    contextBar: (document.querySelector('.context-bar')?.textContent ?? '').trim().slice(0, 160),
    avatarStored: avatarStored ? JSON.parse(avatarStored) : null,
  };
}
"""


def login(page):
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.fill('input[formControlName="email"]', EMAIL)
    page.fill('input[formControlName="password"]', PASSWORD)
    page.click('button[type="submit"]')
    page.wait_for_url("**/portal/**", timeout=20000)


def open_game(page, settle=5.0, force_new=False):
    page.goto(f"{BASE}/portal/simulador/1", wait_until="networkidle")
    time.sleep(2.0)
    if force_new:
        new = page.get_by_text("Iniciar nuevo intento")
        if new.count():
            new.first.click()
    else:
        resume = page.get_by_text("Continuar intento en progreso")
        if resume.count():
            resume.first.click()
        else:
            new = page.get_by_text("Iniciar nuevo intento")
            if new.count():
                new.first.click()
    time.sleep(settle)
    canvas = page.locator("canvas").first
    if canvas.count():
        canvas.click(force=True)
        time.sleep(0.4)


def hold(page, key, ms):
    page.keyboard.down(key)
    time.sleep(ms / 1000)
    page.keyboard.up(key)
    time.sleep(0.25)


def wire_listeners(page, console_errors, asset404):
    page.on("console", lambda m: console_errors.append(m.text)
            if m.type == "error" else None)
    page.on("response", lambda r: asset404.append(f"{r.url} (HTTP {r.status})")
            if r.status >= 400 and "/assets/" in r.url else None)


def scenario_npcs(page):
    """NPCs configurados en el JSON del caso principal (servido por ng serve)."""
    try:
        resp = page.request.get(f"{BASE}/assets/game/scenarios/urgencias-crisis.json")
        data = resp.json()
        npcs = data["rooms"][0]["npcs"]
        return [{
            "key": n.get("key"),
            "preset": n.get("avatarPresetKey"),
            "behavior": (n.get("motion") or {}).get("behavior"),
        } for n in npcs]
    except Exception as exc:  # noqa: BLE001 - smoke tolerante
        return [{"error": str(exc)}]


def collect(page, label, console_errors, asset404):
    data = page.evaluate(MEASURE_JS)
    data["label"] = label
    data["consoleErrors"] = console_errors[:30]
    data["asset404"] = asset404[:30]
    data["scenarioNpcs"] = scenario_npcs(page)
    return data


def evaluate_failures(measurements):
    failures = []
    for m in measurements:
        vp = m["label"]
        iw = m["innerWidth"]
        if m["scrollWidth"] > iw + 1:
            failures.append(f"[{vp}] scrollWidth {m['scrollWidth']} > innerWidth {iw}+1")
        if m["bodyScrollWidth"] > iw + 1:
            failures.append(f"[{vp}] bodyScrollWidth {m['bodyScrollWidth']} > innerWidth {iw}+1")
        if m["canvasRect"] and m["canvasRect"]["right"] > iw + 1:
            failures.append(f"[{vp}] canvas.right {m['canvasRect']['right']:.0f} > innerWidth {iw}+1")
        if m["asset404"]:
            failures.append(f"[{vp}] 404 assets: {m['asset404']}")
        if m["consoleErrors"]:
            failures.append(f"[{vp}] errores consola: {m['consoleErrors'][:5]}")
    return failures


def run_before(out_dir, headed):
    measurements = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not headed)
        console_errors, asset404 = [], []
        ctx = browser.new_context(viewport={"width": 1600, "height": 900})
        page = ctx.new_page()
        wire_listeners(page, console_errors, asset404)
        login(page)

        page.goto(f"{BASE}/portal/personaje", wait_until="networkidle")
        time.sleep(2.5)
        page.screenshot(path=str(out_dir / "00-before-personaje.png"))
        measurements.append(collect(page, "personaje-1600x900", console_errors, asset404))

        open_game(page)
        page.screenshot(path=str(out_dir / "00-before-game-explore.png"))
        measurements.append(collect(page, "game-explore-1600x900", console_errors, asset404))

        # NPCs actuales (Kenney): acercarse al colega al oeste del spawn
        hold(page, "a", 900)
        page.screenshot(path=str(out_dir / "00-before-npcs.png"))
        page.keyboard.press("e")
        time.sleep(2.0)
        page.screenshot(path=str(out_dir / "00-before-dialogue.png"))
        page.keyboard.press("Escape")
        time.sleep(0.6)
        measurements.append(collect(page, "game-npcs-1600x900", console_errors, asset404))
        ctx.close()

        console_errors, asset404 = [], []
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        wire_listeners(page, console_errors, asset404)
        login(page)
        open_game(page)
        page.screenshot(path=str(out_dir / "00-before-mobile.png"))
        measurements.append(collect(page, "mobile-390x844", console_errors, asset404))
        ctx.close()
        browser.close()

    out = out_dir / "00-before-measurements.json"
    out.write_text(json.dumps(measurements, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"BEFORE -> {out}")
    for f in evaluate_failures(measurements):
        print(f"NOTE: {f}")
    return 0


def run_after(out_dir, headed):
    measurements = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not headed)

        # ── Desktop 1600x900: NPCs modulares + movimiento + puerta ───────────
        console_errors, asset404 = [], []
        ctx = browser.new_context(viewport={"width": 1600, "height": 900})
        page = ctx.new_page()
        wire_listeners(page, console_errors, asset404)
        login(page)
        open_game(page, force_new=True)
        time.sleep(1.0)
        page.screenshot(path=str(out_dir / "01-player-and-modular-npcs.png"))
        measurements.append(collect(page, "npcs-1600x900", console_errors, asset404))

        # Movimiento sobrio: segunda toma >=6s despues (madre/seguridad en otro punto)
        time.sleep(6.5)
        page.screenshot(path=str(out_dir / "02-npc-motion-zone.png"))
        measurements.append(collect(page, "npc-motion-1600x900", console_errors, asset404))
        # (El flujo de puertas 03/04 lo captura door_check.py con coreografia fina.)
        ctx.close()

        # ── Desktop 1366x768: sin solapes ────────────────────────────────────
        console_errors, asset404 = [], []
        ctx = browser.new_context(viewport={"width": 1366, "height": 768})
        page = ctx.new_page()
        wire_listeners(page, console_errors, asset404)
        login(page)
        open_game(page)
        page.screenshot(path=str(out_dir / "04b-desktop-1366.png"))
        measurements.append(collect(page, "desktop-1366x768", console_errors, asset404))
        ctx.close()

        # ── Mobile 390x844: explorar + nudge + dialogo ───────────────────────
        console_errors, asset404 = [], []
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        wire_listeners(page, console_errors, asset404)
        login(page)
        open_game(page)
        # nudge tactil: 3 taps a la derecha
        right = page.get_by_role("button", name="Mover derecha")
        if right.count():
            for _ in range(3):
                right.first.click()
                time.sleep(0.25)
        page.screenshot(path=str(out_dir / "11-mobile-explore.png"))
        measurements.append(collect(page, "mobile-390x844", console_errors, asset404))
        interact = page.get_by_text("Interactuar")
        if interact.count():
            interact.first.click()
            time.sleep(1.6)
        page.screenshot(path=str(out_dir / "12-mobile-dialogue.png"))
        # Reporte en mobile: cerrar dialogo si quedo abierto y pedir salida segura
        if page.locator(".dialogue-strip").count():
            page.keyboard.press("Escape")
            time.sleep(0.8)
        page.keyboard.press("Escape")
        time.sleep(2.5)
        page.screenshot(path=str(out_dir / "13-mobile-report.png"))
        measurements.append(collect(page, "mobile-report-390x844", console_errors, asset404))
        ctx.close()
        browser.close()

    out = out_dir / "14-measurements.json"
    out.write_text(json.dumps(measurements, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"MEASUREMENTS -> {out}")

    failures = evaluate_failures(measurements)
    for f in failures:
        print(f"FAIL: {f}")
    if failures:
        print(f"RESULTADO: {len(failures)} fallos")
        return 1
    print("RESULTADO: OK")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--before", action="store_true")
    ap.add_argument("--after", action="store_true")
    ap.add_argument("--headed", action="store_true")
    args = ap.parse_args()

    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.before:
        return run_before(out_dir, args.headed)
    if args.after:
        return run_after(out_dir, args.headed)
    print("Especifica --before o --after")
    return 2


if __name__ == "__main__":
    sys.exit(main())
