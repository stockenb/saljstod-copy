"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function HelpTip({ text, ariaLabel = "Mer info", maxWidth = 340 }) {
  const btnRef = useRef(null);
  const bubbleRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: "bottom" });

  useEffect(() => setMounted(true), []);

  // Stäng på ESC, utanför-klick, scroll/resize
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onClick = (e) => {
      if (!bubbleRef.current || !btnRef.current) return;
      if (!bubbleRef.current.contains(e.target) && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onScroll = () => setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    window.addEventListener("touchstart", onClick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("touchstart", onClick);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  // Positionera bubblan inom viewport
useLayoutEffect(() => {
  if (!open || !btnRef.current || !bubbleRef.current) return;

  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  // marginaler mot skärmkant (inkl. iOS notch)
  const insetL = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('padding-left')) || 0)
               + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('margin-left')) || 0); // fallback
  // säkrare: env() om det finns
  const safeL = (window.CSS && CSS.supports('padding: env(safe-area-inset-left)')) ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('padding-left')) : 0;
  const safeR = (window.CSS && CSS.supports('padding: env(safe-area-inset-right)')) ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('padding-right')) : 0;

  const pad = 8 + (safeL || 0);      // vänstermarginal
  const padR = 8 + (safeR || 0);     // högermarginal
  const gap = 8;                      // avstånd från knappen

  const btnRect = btnRef.current.getBoundingClientRect();

  // Temporärt visa för att kunna mäta korrekt bredd/höjd
  const b = bubbleRef.current;
  const prevVis = b.style.visibility;
  const prevDisp = b.style.display;
  const prevMax = b.style.maxWidth;

  b.style.visibility = "hidden";
  b.style.display = "block";
  b.style.maxWidth = `${maxWidth}px`;

  const bw = Math.min(maxWidth, b.getBoundingClientRect().width || maxWidth);
  const bh = b.getBoundingClientRect().height || 80;

  b.style.visibility = prevVis;
  b.style.display = prevDisp;
  b.style.maxWidth = prevMax;

  // förvald: under knappen
  let placement = "bottom";
  let top = btnRect.bottom + gap;
  let left = btnRect.left + btnRect.width / 2 - bw / 2;

  // om inte plats under → ovanför
  if (top + bh + pad > vpH) {
    placement = "top";
    top = btnRect.top - gap - bh;
  }

  // klamra inom viewporten horisontellt
  left = Math.max(pad, Math.min(left, vpW - bw - padR));

  setPos({ top: Math.max(4, top), left, placement });
}, [open, maxWidth]);


  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="help-tip-btn"
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>

      {mounted && open &&
        createPortal(
          <div
            ref={bubbleRef}
            className={`ht-bubble ${pos.placement === "top" ? "ht-top" : "ht-bottom"}`}
            style={{ top: pos.top, left: pos.left, maxWidth }}
            role="tooltip"
          >
            <div className={`ht-arrow ${pos.placement === "top" ? "ht-arrow-bottom" : "ht-arrow-top"}`} />
            {text}
          </div>,
          document.body
        )
      }
    </>
  );
}
