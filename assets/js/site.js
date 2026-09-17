/* ============================================================
   site.js — Navigation, Erreichbarkeit, Referenzen, Anfrageformular
   ============================================================ */
(function () {
  "use strict";

  /* Formular-Endpunkt: vor dem Livegang eintragen (z. B. Formspree, Netlify Forms
     oder ein eigenes PHP-Mailskript). Leer = Demo-Modus, es wird nichts versendet. */
  const FORM_ENDPOINT = "";

  /* Öffnungszeiten laut Google-Unternehmensprofil (Minuten ab Mitternacht) */
  const HOURS = {
    1: [[480, 720], [780, 1020]],
    2: [[480, 720], [780, 1020]],
    3: [[480, 720], [780, 1020]],
    4: [[480, 720], [780, 1020]],
    5: [[480, 720]],
    6: [],
    0: [],
  };
  const DAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

  /* ---------- Navigation ---------- */
  function initNav() {
    const nav = $(".nav");
    if (!nav) return;
    const hero = $("#hero");
    const toggle = $(".nav__toggle", nav);

    if (hero) {
      const setSolid = () => {
        const limit = hero.offsetTop + hero.offsetHeight - nav.offsetHeight - 8;
        nav.classList.toggle("is-solid", window.scrollY > limit);
      };
      window.addEventListener("scroll", setSolid, { passive: true });
      window.addEventListener("resize", setSolid);
      setSolid();
    }

    if (toggle) {
      const close = () => { nav.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); };
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
      });
      $$(".nav__links a", nav).forEach((a) => a.addEventListener("click", close));
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    }

    /* Sanftes Springen zu Ankern (mit Lenis, falls geladen) */
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const target = document.getElementById(id.slice(1));
        if (!target) return;
        e.preventDefault();
        const offset = -(nav.offsetHeight + 10);
        if (window.__lenis) window.__lenis.scrollTo(target, { offset, duration: 1.4 });
        else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: "smooth" });
        history.replaceState(null, "", id);
      });
    });

    /* aktiven Abschnitt markieren */
    const links = $$(".nav__links a[href^='#']", nav);
    const map = new Map(links.map((l) => [l.getAttribute("href").slice(1), l]));
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((l) => l.removeAttribute("aria-current"));
        const l = map.get(e.target.id);
        if (l) l.setAttribute("aria-current", "true");
      }
    }, { rootMargin: "-45% 0px -50% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- Erreichbarkeit (Zeitzone Wien) ---------- */
  function viennaNow() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Vienna", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    return { day, min: (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10) };
  }

  function initStatus() {
    const { day, min } = viennaNow();
    let open = false, text = "";
    for (const [a, b] of HOURS[day]) if (min >= a && min < b) { open = true; text = `Jetzt erreichbar · bis ${fmt(b)} Uhr`; }
    if (!open) {
      const later = HOURS[day].find(([a]) => a > min);
      const wieder = HOURS[day].some(([, b]) => b <= min) ? "wieder " : "";
      if (later) text = `Heute ${wieder}ab ${fmt(later[0])} Uhr erreichbar`;
      else {
        for (let i = 1; i <= 7; i++) {
          const d = (day + i) % 7;
          if (HOURS[d].length) { text = `${i === 1 ? "Morgen" : DAY_SHORT[d]} ab ${fmt(HOURS[d][0][0])} Uhr erreichbar`; break; }
        }
      }
    }
    $$("[data-status]").forEach((el) => {
      el.classList.toggle("is-open", open);
      const t = $("[data-status-text]", el);
      if (t) t.textContent = text;
    });
    $$("[data-day]").forEach((el) => { if (el.dataset.day.split(",").map(Number).includes(day)) el.classList.add("today"); });
  }

  /* ---------- Anrufleiste am Handy ---------- */
  function initCallbar() {
    const bar = $(".callbar"), hero = $("#hero"), form = $("#anfrage");
    if (!bar) return;
    if (!hero) { bar.classList.add("is-on"); return; }
    let pastHero = false, atForm = false;
    const sync = () => bar.classList.toggle("is-on", pastHero && !atForm);
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; sync(); }).observe(hero);
    if (form) new IntersectionObserver(([e]) => { atForm = e.isIntersecting; sync(); }, { threshold: 0.25 }).observe(form);
  }

  /* ---------- Laufband ---------- */
  function initMarquee() {
    $$(".marquee__track").forEach((track) => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const clones = [...track.children].map((n) => { const c = n.cloneNode(true); c.setAttribute("aria-hidden", "true"); return c; });
      clones.forEach((c) => track.appendChild(c));
    });
  }

  /* ---------- Referenzen: Filter + Raum/Detail-Wechsel ---------- */
  function initRefs() {
    const chips = $$("[data-filter]");
    const refs = $$(".ref");
    const count = $("[data-ref-count]");
    chips.forEach((chip) => chip.addEventListener("click", () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      let n = 0;
      refs.forEach((r) => {
        const show = f === "alle" || r.dataset.cat.split(" ").includes(f);
        r.hidden = !show;
        if (show) { n++; r.classList.add("in"); }
      });
      if (count) count.textContent = `${n} ${n === 1 ? "Projekt" : "Projekte"}`;
      if (window.__lenis) window.__lenis.resize();
    }));

    $$(".ref__media[data-gallery]").forEach((media) => {
      const items = JSON.parse(media.dataset.gallery);
      const main = $(".ref__main img", media), btn = $(".ref__detail", media);
      if (!btn || items.length < 2) return;
      const thumb = $("img", btn), label = $(".mono", btn);
      let i = 0;
      items.forEach((it) => { const pre = new Image(); pre.src = it.src; });
      btn.addEventListener("click", () => {
        i = (i + 1) % items.length;
        const cur = items[i], nxt = items[(i + 1) % items.length];
        main.style.opacity = "0";
        setTimeout(() => {
          main.removeAttribute("srcset");
          main.src = cur.src; main.alt = cur.alt;
          main.style.opacity = "1";
        }, 180);
        thumb.src = nxt.sm || nxt.src; thumb.alt = "";
        label.textContent = nxt.label;
        btn.setAttribute("aria-label", `Ansicht wechseln: ${nxt.label}`);
      });
    });
  }

  /* ---------- Anfrageformular ---------- */
  function initForm() {
    const form = $("#anfrage-form");
    if (!form) return;
    const fileInput = $("#f-fotos", form), fileTxt = $("[data-upload-text]", form), drop = $(".upload", form);
    const MAX_FILES = 5, MAX_MB = 8;

    const setErr = (field, msg) => {
      const wrap = field.closest(".field") || field.closest(".consent-wrap");
      if (!wrap) return;
      wrap.classList.toggle("has-err", !!msg);
      const err = $(".err", wrap);
      if (err) err.textContent = msg || "";
      field.setAttribute("aria-invalid", msg ? "true" : "false");
    };

    const rules = {
      name: (v) => (v.trim().length < 2 ? "Bitte geben Sie Ihren Namen an." : ""),
      kontakt: (v) => {
        const s = v.trim();
        const mail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
        const tel = s.replace(/[^\d]/g, "").length >= 6 && /^[\d\s+()\/.-]+$/.test(s);
        return mail || tel ? "" : "Bitte Telefonnummer oder E-Mail-Adresse angeben – sonst können wir uns nicht melden.";
      },
      leistung: (v) => (v ? "" : "Bitte wählen Sie eine Leistung aus."),
      ort: (v) => (v.trim().length < 2 ? "Bitte geben Sie den Ort an." : ""),
      nachricht: (v) => (v.trim().length < 10 ? "Zwei, drei Sätze reichen – worum geht es?" : ""),
    };

    Object.keys(rules).forEach((name) => {
      const el = form.elements[name];
      el.addEventListener("blur", () => setErr(el, rules[name](el.value)));
      el.addEventListener("input", () => { if (el.getAttribute("aria-invalid") === "true") setErr(el, rules[name](el.value)); });
    });

    const checkFiles = () => {
      const files = [...fileInput.files];
      let msg = "";
      if (files.length > MAX_FILES) msg = `Bitte höchstens ${MAX_FILES} Fotos auswählen.`;
      else if (files.some((f) => f.size > MAX_MB * 1024 * 1024)) msg = `Ein Foto ist größer als ${MAX_MB} MB – bitte ein kleineres wählen.`;
      setErr(fileInput, msg);
      fileTxt.innerHTML = files.length
        ? `<b>${files.length} ${files.length === 1 ? "Foto" : "Fotos"} ausgewählt</b><br>${files.map((f) => f.name).join(", ").slice(0, 90)}`
        : "<b>Fotos hinzufügen</b> (optional)<br>Raum, Nische, Skizze – bis zu 5 Bilder";
      return !msg;
    };
    fileInput.addEventListener("change", checkFiles);
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, () => drop.classList.add("is-drag")));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove("is-drag")));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let firstBad = null;
      Object.keys(rules).forEach((name) => {
        const el = form.elements[name], msg = rules[name](el.value);
        setErr(el, msg);
        if (msg && !firstBad) firstBad = el;
      });
      const consent = form.elements.datenschutz;
      setErr(consent, consent.checked ? "" : "Bitte bestätigen Sie die Datenschutzinformation.");
      if (!consent.checked && !firstBad) firstBad = consent;
      if (!checkFiles() && !firstBad) firstBad = fileInput;
      if (firstBad) { firstBad.focus(); return; }
      if (form.elements.hp_feld.value) return; /* Honeypot */

      const btn = $("button[type=submit]", form);
      btn.disabled = true;
      btn.dataset.label = btn.textContent;
      btn.textContent = "Wird gesendet …";
      try {
        if (FORM_ENDPOINT) {
          const res = await fetch(FORM_ENDPOINT, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error(String(res.status));
        } else {
          console.info("[Anfrageformular] Demo-Modus: kein FORM_ENDPOINT gesetzt – es wurde nichts versendet.");
          await new Promise((r) => setTimeout(r, 700));
          const demo = $("[data-demo-note]", form);
          if (demo) demo.hidden = false;
        }
        const okName = $("[data-ok-name]", form), okBox = $(".form-ok", form);
        if (okName) okName.textContent = form.elements.name.value.trim().split(" ")[0];
        form.classList.add("is-sent");
        if (okBox) okBox.focus();
      } catch (err) {
        btn.disabled = false;
        btn.textContent = btn.dataset.label;
        const box = $("[data-form-error]", form);
        if (box) box.hidden = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNav();
    initStatus();
    initCallbar();
    initMarquee();
    initRefs();
    initForm();
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  });
})();
