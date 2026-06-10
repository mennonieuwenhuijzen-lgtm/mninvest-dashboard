"""
refresh_live.py - genereert live.json met verse koersen voor de dagelijkse koers-strip.

Draait dagelijks in GitHub Actions (cloud, laptop-onafhankelijk). Raakt NOOIT de
geschreven analyse-tekst van dashboard.html aan: schrijft alleen live.json, dat de
pagina client-side inleest. Zo kan botte cijfer-vervanging de tekst niet beschadigen.

Bron: yfinance (gratis, geen API-key). Valuta wordt door yfinance zelf gerapporteerd,
er worden geen handmatige valuta-aannames gedaan (CLAUDE.md-regel 14).

Lokaal testen:  python refresh_live.py
Output:         live.json (naast dit script)
"""

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import yfinance as yf

HERE = Path(__file__).parent
CONFIG = HERE / "positions.json"
OUTPUT = HERE / "live.json"


def fetch(symbol):
    """Geef (price, change_pct, currency) of (None, None, None) bij falen."""
    try:
        t = yf.Ticker(symbol)
        h = t.history(period="5d")
        if len(h) == 0:
            return None, None, None
        price = float(h["Close"].iloc[-1])
        # yfinance kan NaN teruggeven; NaN is ongeldige JSON, dus behandel als ontbrekend.
        if math.isnan(price):
            return None, None, None
        change = None
        if len(h) >= 2:
            prev = float(h["Close"].iloc[-2])
            if prev and not math.isnan(prev):
                change = (price - prev) / prev * 100.0
        if change is not None and math.isnan(change):
            change = None
        currency = None
        try:
            currency = t.fast_info.get("currency")
        except Exception:
            pass
        return round(price, 2), (round(change, 2) if change is not None else None), currency
    except Exception as e:
        print(f"  ! {symbol}: {str(e)[:60]}", file=sys.stderr)
        return None, None, None


def build_rows(items):
    rows = []
    for it in items:
        price, change, currency = fetch(it["yf"])
        row = {k: it[k] for k in it if not k.startswith("_")}
        row["price"] = price
        row["change_pct"] = change
        row["currency"] = currency
        rows.append(row)
        flag = "ok" if price is not None else "GEEN DATA"
        print(f"  {it['ticker']:<8} {str(price):>10}  {str(change):>7}%  {flag}")
    return rows


def main():
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    print("Posities:")
    positions = build_rows(cfg["positions"])
    print("Macro:")
    macro = build_rows(cfg["macro"])
    print("FX:")
    fx = build_rows(cfg["fx"])

    missing = sum(1 for r in positions + macro + fx if r["price"] is None)
    out = {
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "positions": positions,
        "macro": macro,
        "fx": fx,
        "missing": missing,
    }
    # allow_nan=False: liever luid falen dan ooit ongeldige JSON (NaN) wegschrijven.
    OUTPUT.write_text(json.dumps(out, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")
    print(f"\nGeschreven: {OUTPUT}  ({missing} zonder data)")
    # Exit 1 als alles faalt (dan niet committen in de Action).
    if missing == len(positions) + len(macro) + len(fx):
        print("ALLES faalde, geen geldige data.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
