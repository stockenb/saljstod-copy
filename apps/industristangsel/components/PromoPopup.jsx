"use client";
import { useEffect, useRef, useState, useCallback } from "react";

const KEY = "promo_popup_last_seen";
const DAYS = 1;
const CODE = "STANGSEL10";

export default function PromoPopup({ delayMs = 1500 }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);

  // Show only if not seen in the last N days
  useEffect(() => {
    const last = localStorage.getItem(KEY);
    const now = Date.now();
    const seenRecently =
      last && now - Number(last) < DAYS * 24 * 60 * 60 * 1000;

    if (!seenRecently) {
      const t = setTimeout(() => setOpen(true), delayMs);
      return () => clearTimeout(t);
    }
  }, [delayMs]);

  // Focus management on open
  useEffect(() => {
    if (open) {
      closeBtnRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => (document.body.style.overflow = "");
  }, [open]);

  const close = useCallback(() => {
    localStorage.setItem(KEY, String(Date.now()));
    setOpen(false);
  }, []);

  // Close on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(CODE);
      // Simple feedback
      const btn = document.getElementById("copy-code-btn");
      if (btn) {
        const original = btn.textContent;
        btn.textContent = "Kopierad!";
        setTimeout(() => (btn.textContent = original), 1200);
      }
    } catch {}
  };

  if (!open) return null;

  return (
    <div
      className="promo-overlay"
      role="presentation"
      onClick={(e) => {
        // Close when clicking on overlay (but not dialog)
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="promo-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-title"
        aria-describedby="promo-desc"
        ref={dialogRef}
      >
        <button
          ref={closeBtnRef}
          onClick={close}
          className="promo-close"
          aria-label="Stäng"
          title="Stäng"
        >
          ×
        </button>

        <h2 id="promo-title" className="promo-title">
          10% rabatt på ditt stängsel!
        </h2>
        <p id="promo-desc" className="promo-text">
          Ange koden <strong className="promo-code">{CODE}</strong> i kassan.
          Gäller hela varukorgen (vissa undantag kan förekomma).
        </p>

        <div className="promo-actions">
          <button id="copy-code-btn" className="promo-btn" onClick={copyCode}>
            Kopiera kod
          </button>
          <button className="promo-btn secondary" onClick={close}>
            Jag förstår
          </button>
        </div>
      </div>
    </div>
  );
}
