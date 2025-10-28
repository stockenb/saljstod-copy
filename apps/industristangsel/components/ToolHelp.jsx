"use client";
import React, { useEffect, useState, useRef } from "react";

// Inline-styles du använde (oförändrade)
const bodyWrap = {
  padding: 14,
  overflowY: "auto",
  maxHeight: "calc(80vh - 56px)", // matchar panelhöjden TESTKOMMENTAR
};
const body = { display: "grid", gap: 10 };
const h2 = { margin: "12px 0 8px", fontSize: 16, fontWeight: 800 };
const ul = { margin: "6px 0 12px", paddingLeft: 18, display: "grid", gap: 6 };
const li = { margin: 0, lineHeight: 1.5 };
const p  = { margin: "6px 0", lineHeight: 1.5 };
const hr = { border: 0, height: 1, background: "#e5e7eb", margin: "16px 0" };

/**
 * Fullscreen popup med mjuk fade + scale
 */
export default function ToolHelp({ open, onClose }) {
  // mount/unmount så exit-animering hinner spelas
  const [mounted, setMounted] = useState(open);
  const [enter, setEnter] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setEnter(true)); // trigga CSS
      return () => cancelAnimationFrame(id);
    } else {
      setEnter(false);
      const t = setTimeout(() => setMounted(false), 220);      // matcha CSS-duration
      return () => clearTimeout(t);
    }
  }, [open]);

  // ESC stänger
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div
      className={`th-backdrop ${enter ? "in" : ""}`}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        className={`th-modal ${enter ? "in" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Hjälp"
        onClick={(e) => e.stopPropagation()} // klick i rutan ska inte bubbla
      >
        {/* Header */}
        <div className="th-head">
          <strong>Hjälp & instruktioner</strong>
          <button className="th-close" onClick={onClose} aria-label="Stäng">✕</button>
        </div>

        {/* DIN BEFINTLIGA TEXT — OFÖRÄNDRAD */}
        <div className="toolhelp-scroll">
  <div className="th-body th-pro">

    {/* HERO */}
    <section className="th-hero-2">
      <div className="th-hero-2__left">
        
        <div>
          <h2>Stängselplaneraren</h2>
          <p>Rita på kartan, få materialspec & pris. Klart för beställning på minuter.</p>
        </div>
      </div>
      <div className="th-hero-2__badges">
        <span className="badge">Nyhet</span>
      </div>
    </section>

    {/* 3 KORT */}
    <div className="th-grid">
      <div className="th-card th-card--glass">
        <div className="th-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="#0f172a" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="th-card-body">
          <div className="th-card-title">Välj spec</div>
          <div className="th-card-text">Höjd, färg, maska + grindar & tillbehör vid behov.</div>
        </div>
      </div>
      <div className="th-card th-card--glass">
        <div className="th-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#0f172a" strokeWidth="2"/>
            <path d="M20 20l-3.5-3.5" stroke="#0f172a" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="th-card-body">
          <div className="th-card-title">Rita sträckor</div>
          <div className="th-card-text">Rita ut dina stängsel-sträckor på kartan.</div>
        </div>
      </div>
      <div className="th-card th-card--glass">
        <div className="th-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M6 6h12v12H6z" stroke="#0f172a" strokeWidth="2"/>
            <path d="M9 9h6v6H9z" fill="#0f172a"/>
          </svg>
        </div>
        <div className="th-card-body">
          <div className="th-card-title">Skapa varukorg, eller Offert</div>
          <div className="th-card-text">Skapa en varukorg i vår webshop, eller generera en PDF offert.</div>
        </div>
      </div>
    </div>

    {/* CALLOUT */}
    <div className="th-montage">
      <i><strong>Behöver du hjälp med montage?</strong> Vi har ett brett nätverk med kunniga montörer vi kan rekommendera i samband med er order. Kontakta <a href="mailto:info@nilsahlgren.se">info@nilsahlgren.se</a> för att få din offert på montage!</i>
    </div>

    {/* SEKTIONSLISTOR — DIN ORIGINALTEXT MED IKON-BULLETS */}
    <section className="th-section">
      <header className="th-sec-head">
        <span className="th-sec-ico">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7l3-7z" stroke="#0033A1" strokeWidth="1.3" fill="none"/>
          </svg>
        </span>
        <h3>Kom igång</h3>
      </header>
      <ul className="th-list th-list--bullets">
        <li>Sök adress i rutan eller panorera/zooma till rätt plats.</li>
        <li>Klicka i kartan för att lägga ut stolp-punkter (minst två). Fortsätt klicka för fler segment.</li>
        <li>Avsluta slingan genom att klicka på första punkten (eller låt den vara öppen).</li>
        <li>Klicka på <strong>Generera PDF</strong> för en offert, eller <strong>Skapa varukorg</strong> för att skapa en varukorg i vår webbshop.</li>
      </ul>
    </section>

    <section className="th-section">
      <header className="th-sec-head">
        <span className="th-sec-ico">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M3 12l6-6 6 6-6 6-6-6z" stroke="#0033A1" strokeWidth="1.3" fill="none"/>
          </svg>
        </span>
        <h3>Kartan & punkter</h3>
      </header>
      <ul className="th-list th-list--bullets">
        <li>Dra punkter för att finjustera linjen.</li>
        <li>Infoga punkter: dra den mindre, halvgenomskinliga mittenpunkten till önskat läge (släpper du den skapas en ny punkt där).</li>
        <li>Ångra med knappen <em>Ångra</em> eller <span className="th-kbd">Ctrl/⌘</span>+<span className="th-kbd">Z</span>.</li>
        <li>Rensa tar bort nuvarande sträcka (eller alla, beroende på knappval).</li>
        <li>Ta bort punkt: högerklicka på punkten.</li>
      </ul>
    </section>

    <section className="th-section">
      <header className="th-sec-head">
        <span className="th-sec-ico">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M4 7h16M4 12h16M4 17h10" stroke="#0033A1" strokeWidth="1.3"/>
          </svg>
        </span>
        <h3>Specifikation</h3>
      </header>
      <ul className="th-list th-list--bullets">
        <li><strong>Höjd:</strong> välj 2000 mm eller 3000 mm beroende på behov.</li>
        <li><strong>Färg:</strong> Välj bland våra färger.</li>
        <li><strong>Maska:</strong> Fast 50 mm maskstorlek för industristängsel.</li>
      </ul>
    </section>

    <section className="th-section">
      <header className="th-sec-head">
        <span className="th-sec-ico">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M4 6h16v12H4z" stroke="#0033A1" strokeWidth="1.3" fill="none"/>
          </svg>
        </span>
        <h3>Sträckor</h3>
      </header>
      <ul className="th-list th-list--bullets">
        <li><strong>Ny sträcka:</strong> klicka på <strong>+ Ny sträcka</strong> i panelen ”Sträckor”. En tom sträcka skapas och blir aktiv.</li>
        <li><strong>Byt sträcka att redigera:</strong> klicka <strong>Redigera</strong> på den sträcka du vill justera.</li>
        <li><strong>Ta bort sträcka:</strong> Klicka på <strong>Ta bort</strong> i listan av sträckor.</li>
        <li>Varje sträcka kan vara öppen eller sluten. Verktyget summerar resultat över alla sträckor.</li>
      </ul>
    </section>

    <section className="th-section">
      <header className="th-sec-head">
        <span className="th-sec-ico">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M3 7h18M6 7v10m12-10v10" stroke="#0033A1" strokeWidth="1.3"/>
          </svg>
        </span>
        <h3>Tillbehör & grindar</h3>
      </header>
      <ul className="th-list th-list--bullets">
        <li><strong>Plintbetong:</strong> bocka i för att räkna med plintbetong i din offert (3 per stolpe).</li>
        <li><strong>Taggtråd:</strong> bocka i för tre rader taggtråd i samma färg som stängslet (rullar à 250 m).</li>
        <li><strong>Grindar:</strong> bocka i ”Lägg till grind” och välj typ/bredd. Klicka <em>Placera</em> och sedan på sträckan för att fästa grinden på ett segment. Flytta vid behov genom att dra.</li>
      </ul>
    </section>

    <section className="th-section">
      <header className="th-sec-head">
        <span className="th-sec-ico">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M6 6h12v12H6z" stroke="#0033A1" strokeWidth="1.3" fill="none"/>
          </svg>
        </span>
      <h3>Beräkning</h3>
      </header>
      <ul className="th-list th-list--bullets">
        <li>Under <em>Beräkning</em> ser du total längd, antal stolpar (änd, hörn, mellan), antal stag, rullar stängsel (25 m), stagtråd samt taggtråd (rullar à 250 m). Allt uppdateras i realtid när du ritar.</li>
      </ul>
    </section>

    <section className="th-section">
      <header className="th-sec-head">
        <span className="th-sec-ico">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M4 7h16l-2 10H6L4 7z" stroke="#0033A1" strokeWidth="1.3"/>
          </svg>
        </span>
        <h3>Offert & varukorg</h3>
      </header>
      <ul className="th-list th-list--bullets">
        <li><strong>Generera PDF</strong> för en snygg sammanställning.</li>
        <li><strong>Skapa varukorg</strong> skapar en varukorg på vår webbshop och öppnar checkout med artiklarna förifyllda. Där kan du lätt betala med Klarna (privatkunder) eller Svea Bank (företagskunder).</li>
      </ul>
    </section>

    {/* CALLOUT */}
    <div className="th-callout">
      <div className="th-callout-title">Vanliga fel & lösning</div>
      <ul>
        <li><strong>“Inga artiklar att lägga i varukorgen”</strong>: säkerställ att produkter är inlästa och att sträckan inte är tom.</li>
        <li><strong>“Grinden får inte plats”</strong>: välj en rakare/längre del av sträckan.</li>
      </ul>
    </div>

    {/* FOOTER */}
    <footer className="th-footer">
      <div>Frågor? <a href="mailto:info@nilsahlgren.se">info@nilsahlgren.se</a> · 08-500 125 80</div>
      <div className="th-muted">Nils Ahlgren AB · © 2025</div>
    </footer>
  </div>
</div>


      </div>
    </div>
  );
}
