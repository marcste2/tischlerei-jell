/* ============================================================
   scroll-cinematic.js — Scroll-Engine (Basis: scroll-cinematic Skill)
   Canvas-Bildsequenz, per Scroll-Fortschritt gescrubbt + Lenis + Reveals.

   Erweiterungen für Tischlerei Jell:
   - Poster-Zoom-Fallback: solange keine Frames gerendert sind (frameCount 0),
     fährt die Kamera per Zoom auf den Fluchtpunkt des Standbilds zu.
   - eigener, kleinerer Frame-Satz für Mobilgeräte (cfg.mobile)
   - Vorladen in zwei Durchgängen (grob → fein), damit früh gescrubbt werden kann
   - Textzeilen mit Haltephase statt Dreiecks-Blende; Zeile 1 steht ab Fortschritt 0
   ============================================================ */
(function () {
  "use strict";

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function initScrub(cfg) {
    const section = document.querySelector(cfg.section);
    const canvas = section.querySelector("canvas");
    const ctx = canvas.getContext("2d", { alpha: false });
    const lines = [...section.querySelectorAll(".reveal-line")];
    const rulerFill = section.querySelector("[data-ruler-fill]");
    const bgFill = cfg.bg || "#17120d";

    /* Hochformat-Handys bekommen den 8:9-Satz (volle Höhe); alles andere den 16:9-Satz */
    const small = matchMedia("(max-width: 820px) and (orientation: portrait)").matches;
    const set = small && cfg.mobile && cfg.mobile.frameCount ? cfg.mobile : cfg;
    const frameCount = set.frameCount | 0;
    /* Datensparmodus oder langsame Verbindung: keine Bildsequenz laden, Poster-Zoom genügt */
    const conn = navigator.connection || {};
    const lowData = conn.saveData === true || /^(slow-2g|2g|3g)$/.test(conn.effectiveType || "");
    const useFrames = frameCount > 0 && !reduceMotion && !lowData;

    const images = new Array(frameCount);
    let poster = null;
    let current = -1;
    let lastP = -1;

    /* Cover-Fit mit optionalem Zoom auf einen Fokuspunkt (fx, fy in 0..1) */
    function paint(img, zoom, fx, fy) {
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (!cw || !ch) return;
      const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
      let dw0, dh0;
      if (ir > cr) { dh0 = ch; dw0 = ch * ir; } else { dw0 = cw; dh0 = cw / ir; }
      const dw = dw0 * zoom, dh = dh0 * zoom;
      const px = (cw - dw0) / 2 + fx * dw0, py = (ch - dh0) / 2 + fy * dh0;
      const dx = clamp(px - fx * dw, cw - dw, 0), dy = clamp(py - fy * dh, ch - dh, 0);
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, dw, dh);
      if (!section.classList.contains("is-live")) section.classList.add("is-live");
    }

    function nearestLoaded(idx) {
      for (let d = 0; d < frameCount; d++) {
        const a = images[idx - d], b = images[idx + d];
        if (a) return a;
        if (b) return b;
      }
      return null;
    }

    function drawFrame(idx) {
      const img = nearestLoaded(idx);
      if (img) paint(img, 1, 0.5, 0.5);
      else if (poster) paint(poster, 1, 0.5, 0.5);
    }

    function drawPoster(p) {
      if (!poster) return;
      const f = cfg.posterFocus || [0.5, 0.5];
      const z = 1 + (cfg.posterZoom || 0.35) * easeInOut(p);
      paint(poster, reduceMotion ? 1 : z, f[0], f[1]);
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingQuality = "high";
      if (useFrames) drawFrame(current < 0 ? 0 : current);
      else drawPoster(lastP < 0 ? 0 : lastP);
    }

    /* Standbild: erstes Bild + Fallback */
    const posterSrc = small && cfg.posterSmall ? cfg.posterSmall : cfg.poster;
    if (posterSrc) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => { poster = img; if (!useFrames) drawPoster(lastP < 0 ? 0 : lastP); else if (!images[0]) drawFrame(0); };
      img.src = posterSrc;
    }

    /* Frames vorladen in zwei Stufen: grob (jedes 8. Bild) sofort, der Rest erst,
       wenn die Seite selbst fertig geladen ist oder gescrollt wird – so bremst die
       Sequenz weder Schriften noch Inhaltsbilder aus. */
    if (useFrames) {
      const coarse = [], fine = [];
      for (let i = 0; i < frameCount; i++) (i % 8 ? fine : coarse).push(i);
      const load = (list, parallel) => {
        let cursor = 0;
        const next = () => {
          if (cursor >= list.length) return;
          const i = list[cursor++];
          const img = new Image();
          img.decoding = "async";
          img.onload = () => {
            images[i] = img;
            if (current < 0 ? i === 0 : Math.abs(i - current) < 8) drawFrame(current < 0 ? 0 : current);
            next();
          };
          img.onerror = next;
          img.src = set.framePath(i + 1);
        };
        for (let k = 0; k < parallel; k++) next();
      };
      load(coarse, 4);
      let fineStarted = false;
      const startFine = () => { if (fineStarted) return; fineStarted = true; load(fine, 6); };
      if (document.readyState === "complete") startFine();
      else window.addEventListener("load", startFine, { once: true });
      window.addEventListener("scroll", startFine, { once: true, passive: true });
    }

    function update() {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < -vh || rect.top > vh) return;
      const scrollable = Math.max(1, rect.height - vh);
      const p = clamp(-rect.top / scrollable, 0, 1);
      if (Math.abs(p - lastP) < 0.0004) return;
      lastP = p;

      if (useFrames) {
        const idx = Math.min(frameCount - 1, Math.floor(p * (frameCount - 1)));
        if (idx !== current) { current = idx; drawFrame(idx); }
      } else {
        drawPoster(p);
      }

      const fade = 0.055;
      for (const el of lines) {
        const a = parseFloat(el.dataset.in), b = parseFloat(el.dataset.out);
        const oIn = a <= 0 ? 1 : (p - a) / fade;
        const oOut = b >= 1 ? 1 : (b - p) / fade;
        const o = clamp(Math.min(oIn, oOut), 0, 1);
        const dir = p < (a + b) / 2 ? 1 : -1;
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translate3d(0, ${((1 - o) * 26 * dir).toFixed(1)}px, 0)`;
        el.style.visibility = o === 0 ? "hidden" : "visible";
      }
      if (rulerFill) rulerFill.style.transform = `scaleX(${p.toFixed(4)})`;
    }

    window.addEventListener("resize", resize);
    resize();
    return { update, resize };
  }

  document.addEventListener("DOMContentLoaded", () => {
    const scrubs = (window.SCRUB_SECTIONS || [])
      .filter((c) => document.querySelector(c.section))
      .map(initScrub);

    let lenis = null;
    if (typeof window.Lenis === "function" && !reduceMotion) {
      lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
      window.__lenis = lenis;
    }
    function raf(t) {
      if (lenis) lenis.raf(t);
      for (const s of scrubs) s.update();
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    /* Reveals */
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    /* Scroll-Hinweis ausblenden */
    const hints = document.querySelectorAll(".scroll-hint");
    const onScroll = () => { const y = window.scrollY; hints.forEach((h) => (h.style.opacity = y > 60 ? "0" : "1")); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  });
})();
