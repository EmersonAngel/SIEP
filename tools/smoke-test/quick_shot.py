"""Captura rapida de iteracion visual: login + juego + 1 screenshot desktop.

Uso: python quick_shot.py [salida.png] [--dialogue|--journal]
"""
import sys
import time

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4201"
EMAIL = "estudiante@psychosim.edu.co"
PASSWORD = "Estudiante123!"


def main() -> int:
    out = sys.argv[1] if len(sys.argv) > 1 else "quick_shot.png"
    mode = sys.argv[2] if len(sys.argv) > 2 else ""
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1600, "height": 900})
        page = ctx.new_page()
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.goto(f"{BASE}/login", wait_until="networkidle")
        page.fill('input[formControlName="email"]', EMAIL)
        page.fill('input[formControlName="password"]', PASSWORD)
        page.click('button[type="submit"]')
        page.wait_for_url("**/portal/**", timeout=20000)
        page.goto(f"{BASE}/portal/simulador/1", wait_until="networkidle")
        time.sleep(2.0)
        resume = page.get_by_text("Continuar intento en progreso")
        if resume.count():
            resume.first.click()
        else:
            new = page.get_by_text("Iniciar nuevo intento")
            if new.count():
                new.first.click()
        time.sleep(5.0)
        if mode == "--move":
            canvas = page.locator("canvas").first
            if canvas.count():
                canvas.click(force=True)
            for key, ms in (("a", 1500), ("s", 300)):
                page.keyboard.down(key)
                time.sleep(ms / 1000)
                page.keyboard.up(key)
                time.sleep(0.3)
            time.sleep(0.8)
        if mode == "--safe-exit":
            btn = page.locator(".safe-exit")
            if btn.count():
                btn.first.click()
                time.sleep(3.0)
        if mode == "--dialogue":
            btns = page.locator(
                "section[aria-label='Lista accesible de puntos interactivos'] button")
            if btns.count():
                btns.first.dispatch_event("click")
                time.sleep(2.2)
        elif mode == "--decide":
            btns = page.locator(
                "section[aria-label='Lista accesible de puntos interactivos'] button")
            target = btns.filter(has_text="Escucha")
            if not target.count():
                target = btns
            if target.count():
                target.first.dispatch_event("click")
                time.sleep(2.5)
                # saltar typewriter y elegir la primera opción
                skip = page.get_by_role("button", name="Saltar")
                if skip.count():
                    skip.first.click()
                    time.sleep(0.6)
                choice = page.locator(".choice-btn")
                if choice.count():
                    choice.first.click()
                    time.sleep(3.5)   # pausa confirmación + fade + feedback
        elif mode == "--journal":
            page.keyboard.press("j")
            time.sleep(1.4)
        page.screenshot(path=out)
        browser.close()
    for e in errors[:10]:
        print(f"CONSOLE-ERROR: {e}")
    print(f"OK -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
