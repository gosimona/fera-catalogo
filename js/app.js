// Lógica del catálogo: propósitos, precios, kits, filtros, detalle, pedido y WhatsApp.
(() => {
  const POR_PAGINA = 24;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const propById = Object.fromEntries(PROPOSITOS.map((p) => [p.id, p]));
  const kitById = Object.fromEntries(KITS.map((k) => [k.id, k]));

  PERFUMES.forEach((p, i) => {
    p.id = slug(p.nombre);
    p.orden = i;
    p.presentaciones = p.presentaciones || PRESENTACIONES;
    [p.insp, p.marca = ""] = p.inspiracion.split(" – ");
  });
  const perfumeById = Object.fromEntries(PERFUMES.map((p) => [p.id, p]));
  const MAYOR = PRESENTACIONES.at(-1);

  // ---------- Precios ----------
  const plata = (n) => "$" + Math.round(n).toLocaleString("es-CO");
  const precioDe = (ml) => PRECIOS[ml] || 0;
  const mlNum = (ml) => parseInt(ml, 10);
  const porMl = (ml) => precioDe(ml) / mlNum(ml);
  const DESDE = Math.min(...PRESENTACIONES.map(precioDe));

  // ---------- Promoción (urgencia real, con fecha) ----------
  function finPromo() {
    if (!PROMO.activa) return null;
    if (PROMO.hasta) return new Date(PROMO.hasta);
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth() + 1, 0, 23, 59, 59);
  }
  const promoVigente = () => {
    const f = finPromo();
    return !!f && f > new Date();
  };
  const restante = () => {
    const ms = Math.max(0, finPromo() - new Date());
    return { ms, d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 };
  };
  const dos = (n) => String(n).padStart(2, "0");
  const fechaFin = () => finPromo()?.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

  // ---------- Kits ----------
  const antesKit = (k) => k.espacios.reduce((t, e) => t + precioDe(e.tamano), 0);
  const precioKit = (k) => (promoVigente() ? k.precio : antesKit(k));
  const ahorroKit = (k) => antesKit(k) - precioKit(k);
  const pctKit = (k) => Math.round((ahorroKit(k) / antesKit(k)) * 100);
  const KITS_VITRINA = KITS.filter((k) => k.vitrina !== false);
  const HUELLA = KITS.find((k) => k.mismoAroma);
  // Si todos los frascos del kit son del mismo tamaño, cuánto sale cada uno
  const tamanoUnico = (k) => (k.espacios.every((e) => e.tamano === k.espacios[0].tamano) ? k.espacios[0].tamano : null);
  const cabeEn = (p, e) =>
    (!e.propositos || !e.propositos.length || e.propositos.some((x) => p.propositos.includes(x))) &&
    (!e.generos || !e.generos.length || e.generos.includes(p.genero)) &&
    p.presentaciones.includes(e.tamano);
  const elegibles = (e) =>
    PERFUMES.filter((p) => cabeEn(p, e)).sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || a.nombre.localeCompare(b.nombre, "es"));

  // ---------- Pedido: perfumes sueltos + kits ----------
  let seleccion = new Map(); // id -> presentación
  let kitsPedido = []; // [{ kit, items: [ids] }]
  const tamanoValido = (id, ml) => (perfumeById[id].presentaciones.includes(ml) ? ml : MAYOR);
  try {
    const guardado = JSON.parse(localStorage.getItem("pedido") || "null");
    if (guardado) {
      (guardado.p || []).forEach(([id, ml]) => perfumeById[id] && seleccion.set(id, tamanoValido(id, ml)));
      kitsPedido = (guardado.k || []).filter((k) => kitById[k.kit] && k.items.every((id) => perfumeById[id]));
    } else {
      JSON.parse(localStorage.getItem("seleccion") || "[]").forEach(([id, ml]) => perfumeById[id] && seleccion.set(id, tamanoValido(id, ml)));
    }
  } catch (e) {}
  const guardarPedido = () => {
    try { localStorage.setItem("pedido", JSON.stringify({ p: [...seleccion], k: kitsPedido })); } catch (e) {}
  };
  const totalPedido = () =>
    [...seleccion].reduce((t, [, ml]) => t + precioDe(ml), 0) + kitsPedido.reduce((t, k) => t + precioKit(kitById[k.kit]), 0);
  const ahorroPedido = () => kitsPedido.reduce((t, k) => t + ahorroKit(kitById[k.kit]), 0);

  // ---------- WhatsApp ----------
  const wa = (texto) => `https://wa.me/${TIENDA.whatsapp}?text=${encodeURIComponent(texto)}`;
  const saludo = `Hola ${TIENDA.nombre} 👋\n`;
  const lineaPerfume = (p) => `*${p.codigo} · ${p.nombre}* (inspirado en ${p.inspiracion})`;
  const mensajes = {
    general: saludo + "Quiero hacer un pedido:\n\n*CÓDIGO · PERFUME* - tamaño (30, 60 o 100 ml)\n\n*OBSERVACIONES*\n-",
    asesoria: saludo + "Quiero asesoría para elegir un perfume. ¿Me ayudan?",
  };
  const mensajePerfume = (p, ml) =>
    `${saludo}Quiero pedir este perfume:\n\n${lineaPerfume(p)}\nTamaño: ${ml} - ${plata(precioDe(ml))}\n\n¿Está disponible?`;
  const textoKit = (k, items) =>
    `🎁 *Kit ${k.nombre}* - ${plata(precioKit(k))}${ahorroKit(k) ? ` (ahorro ${plata(ahorroKit(k))})` : ""}\n` +
    k.espacios.map((e, i) => `   ${i + 1}. ${e.titulo} (${e.tamano}): ${items[i] ? lineaPerfume(perfumeById[items[i]]) : "por elegir"}`).join("\n");
  const mensajeKit = (k, items) => `${saludo}Quiero pedir este kit:\n\n${textoKit(k, items)}\n\n¿Está disponible?`;
  const mensajePedido = () => {
    const partes = [];
    if (kitsPedido.length) partes.push(kitsPedido.map((k) => textoKit(kitById[k.kit], k.items)).join("\n\n"));
    if (seleccion.size)
      partes.push([...seleccion].map(([id, ml], i) => `${i + 1}. ${lineaPerfume(perfumeById[id])} - ${ml} - ${plata(precioDe(ml))}`).join("\n"));
    const ahorro = ahorroPedido();
    return (
      saludo + "Quiero hacer este pedido:\n\n" + partes.join("\n\n") +
      `\n\n*TOTAL: ${plata(totalPedido())}*` + (ahorro ? `\nAhorro con kits: ${plata(ahorro)}` : "") +
      "\n\n*OBSERVACIONES*\n-"
    );
  };

  // ---------- Frasco de muestra (cuando no hay foto) ----------
  const mezcla = (hex, con, t) => {
    const a = parseInt(hex.slice(1), 16), b = parseInt(con.slice(1), 16);
    const c = [16, 8, 0].map((s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t));
    return `rgb(${c.join(",")})`;
  };
  // Color del acorde y si su texto debe ir oscuro (colores muy claros)
  const colorAcorde = (a) => ACORDES[a] || "#999999";
  const textoSobre = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return l > 0.62 ? "#1a1408" : "#ffffff";
  };
  // Escala de acordes (barras de color con ancho según intensidad)
  const escala = (p) =>
    `<div class="scale">${p.acordes
      .map(([a, v]) => {
        const c = colorAcorde(a);
        return `<div class="scale-row"><span class="scale-bar" style="--w:${v}%;--c:${c};color:${textoSobre(c)}">${esc(a)}</span><span class="scale-v">${v}%</span></div>`;
      })
      .join("")}</div>`;

  // Cada nota se pinta con el color del acorde al que pertenece
  const NOTA_ACORDE = [
    [/oud/, "Oud"],
    [/caf[eé]|cacao|chocolate/, "Café"],
    [/caramelo|miel|leche/, "Caramelo"],
    [/vainilla|haba tonka/, "Vainilla"],
    [/pral|malvavisco|chicle|az[uú]car|cupcake|macaron|crema|gourmand|almendra|castañ|avellana|d[aá]til/, "Dulce"],
    [/coco|tiar/, "Coco"],
    [/pi[nñ]a|mango|maracuy|tropical/, "Tropical"],
    [/lim[oó]n|lima|toronja|pomelo|bergamota|mandarina|naranja|yuzu|neroli|azahar/, "Cítrico"],
    [/marin|acu[aá]tic|agua|ozono|sal mineral|helado/, "Acuático"],
    [/menta|absenta|an[ií]s|hinojo|champ[aá]n|vodka|ron\b/, "Fresco"],
    [/lavanda/, "Lavanda"],
    [/rosa\b|rosa |rosad|peon[ií]a/, "Rosa"],
    [/jazm|flor|tuberosa|nardo|gardenia|fresia|lirio|orqu|magnolia|loto|ylang|mimosa|camelia|madreselva|violeta|iris|geranio|clavel|ciclamen|campanilla|heliotropo|p[eé]talos|tiar/, "Floral"],
    [/manzana|pera|fresa|frambuesa|mora|grosella|ciruela|cereza|mel[oó]n|melocot|durazno|kiwi|membrillo|lichi|granada|frutas|frutos|bayas|arandano|sandia/, "Frutal"],
    [/canela|pimienta|cardamomo|jengibre|nuez|clavo|azafr|comino|alcaravea|especias/, "Especiado"],
    [/cuero|gamuza/, "Cuero"],
    [/tabaco/, "Tabaco"],
    [/incienso|abedul|ahumad/, "Ahumado"],
    [/pachul|musgo|terros/, "Terroso"],
    [/[aá]mbar|benju|l[aá]dano|resina|ambrox/, "Ámbar"],
    [/almizcle|cachemira|algod/, "Almizclado"],
    [/cedro|s[aá]ndalo|vetiver|madera|guayaco|abeto|roble|caoba|amberwood/, "Amaderado"],
    [/t[eé] verde|hoja|verde|g[aá]lbano|bamb[uú]|laurel|tomate|cilantro/, "Verde"],
    [/salvia|romero|albahaca|estrag[oó]n/, "Aromático"],
  ];
  const notaPill = (n) => {
    const k = norm(n);
    const acorde = (NOTA_ACORDE.find(([re]) => re.test(k)) || [, "Aromático"])[1];
    const c = colorAcorde(acorde);
    return `<span class="note" style="--c:${c};color:${textoSobre(c)}" title="${esc(acorde)}">${esc(n)}</span>`;
  };

  let artN = 0;
  function arte(p) {
    if (p.imagen) return `<img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy">`;
    const k = "a" + artN++;
    const c = p.color || colorAcorde(p.acordes[0][0]);
    const insp = p.insp.toUpperCase();
    const fs = Math.round(Math.min(40, 290 / (insp.length * 0.7)));
    const barras = p.acordes
      .map(([a, v], i) => {
        const col = colorAcorde(a);
        return `<rect x="0" y="${388 + i * 18}" width="${60 + v * 1.6}" height="16" fill="${col}"/><text x="10" y="${400 + i * 18}" fill="${textoSobre(col)}" font-size="11" letter-spacing=".5">${esc(a)}</text>`;
      })
      .join("");
    return `<svg class="art" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(p.nombre)}">
      <defs>
        <radialGradient id="${k}b" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${mezcla(c, "#ffffff", 0.08)}"/><stop offset=".55" stop-color="${mezcla(c, "#0A0A0B", 0.55)}"/><stop offset="1" stop-color="#0A0A0B"/></radialGradient>
        <linearGradient id="${k}l" x1="0" x2="1"><stop offset="0" stop-color="${mezcla(c, "#000000", 0.35)}"/><stop offset=".45" stop-color="${mezcla(c, "#ffffff", 0.25)}"/><stop offset="1" stop-color="${mezcla(c, "#000000", 0.45)}"/></linearGradient>
        <linearGradient id="${k}g" x1="0" x2="1"><stop offset="0" stop-color="#8d7146"/><stop offset=".5" stop-color="#F3E2BE"/><stop offset="1" stop-color="#8d7146"/></linearGradient>
      </defs>
      <rect width="400" height="500" fill="url(#${k}b)"/>
      <text x="200" y="78" text-anchor="middle" fill="rgba(255,255,255,.8)" font-size="12" letter-spacing="3" font-family="General Sans, sans-serif">DIRECCIÓN OLFATIVA</text>
      <text x="200" y="${96 + fs * 0.8}" text-anchor="middle" fill="#fff" font-size="${fs}" font-weight="500" letter-spacing="1">${esc(insp)}</text>
      <text x="200" y="${120 + fs}" text-anchor="middle" fill="rgba(237,220,185,.85)" font-size="11" letter-spacing="4" font-family="General Sans, sans-serif">${esc((p.marca ? p.marca + " · " : "") + p.genero).toUpperCase()}</text>
      <g transform="translate(40 40) scale(.8)">
      <ellipse cx="200" cy="432" rx="108" ry="12" fill="rgba(0,0,0,.55)"/>
      <rect x="176" y="168" width="48" height="40" rx="5" fill="url(#${k}g)"/>
      <rect x="186" y="206" width="28" height="18" fill="${mezcla(c, "#ffffff", 0.5)}" opacity=".6"/>
      <rect x="128" y="222" width="144" height="208" rx="20" fill="url(#${k}l)" stroke="rgba(255,255,255,.35)"/>
      <rect x="128" y="222" width="144" height="208" rx="20" fill="rgba(255,255,255,.04)"/>
      <rect x="140" y="232" width="14" height="186" rx="7" fill="rgba(255,255,255,.22)"/>
      <rect x="158" y="300" width="84" height="56" rx="3" fill="rgba(10,10,11,.55)" stroke="rgba(216,188,138,.6)" stroke-width=".8"/>
      <text x="200" y="324" text-anchor="middle" fill="#EDDCB9" font-size="12" font-style="italic">${esc(p.nombre.length > 14 ? p.nombre.split(" ")[0] : p.nombre)}</text>
      <text x="200" y="342" text-anchor="middle" fill="rgba(237,220,185,.7)" font-size="7" letter-spacing="2" font-family="General Sans, sans-serif">EAU DE PARFUM</text>
      </g>
      ${barras}
    </svg>`.replace(/\s{2,}/g, " ");
  }

  // Frascos de un kit (siluetas con altura según el tamaño)
  function frascosKit(k) {
    const n = k.espacios.length;
    const ancho = 70;
    const items = k.espacios
      .map((e, i) => {
        const prop = e.propositos?.[0] && propById[e.propositos[0]];
        const paleta = ["#1E88FF", "#FF2E93", "#E8A317", "#17B890", "#9B51E0", "#FF5A36"];
        const col = prop ? prop.color : k.mismoAroma ? "#E8A317" : paleta[i % paleta.length];
        const h = 40 + mlNum(e.tamano) * 0.75;
        const x = 20 + i * (ancho + 18);
        const y = 140 - h;
        return `<g><rect x="${x + ancho / 2 - 9}" y="${y - 16}" width="18" height="16" rx="3" fill="#C9A866"/>
          <rect x="${x}" y="${y}" width="${ancho}" height="${h}" rx="12" fill="${col}" fill-opacity=".85" stroke="rgba(255,255,255,.4)"/>
          <rect x="${x + 8}" y="${y + 8}" width="8" height="${h - 16}" rx="4" fill="rgba(255,255,255,.3)"/>
          <text x="${x + ancho / 2}" y="${y + h / 2 + 5}" text-anchor="middle" font-size="13" font-weight="600" fill="${textoSobre(col.length === 7 ? col : "#888888")}" font-family="General Sans, sans-serif">${e.tamano}</text></g>`;
      })
      .join("");
    return `<svg class="kit-art" viewBox="0 0 ${40 + n * ancho + (n - 1) * 18} 150" aria-hidden="true">${items}<rect x="10" y="141" width="${20 + n * ancho + (n - 1) * 18}" height="3" rx="1.5" fill="rgba(216,188,138,.35)"/></svg>`;
  }

  // ---------- Textos de la tienda ----------
  $$("[data-tienda]").forEach((el) => (el.textContent = TIENDA[el.dataset.tienda]));
  document.title = `${TIENDA.nombre} · Catálogo de perfumes`;
  $("#hero-eyebrow").textContent = `${TIENDA.subtitulo} · ${TIENDA.ciudad}`;
  $("#stat-total").textContent = PERFUMES.length;
  $("#stat-prop").textContent = PROPOSITOS.length;
  $("#stat-desde").textContent = plata(DESDE);
  $("#benefit-precios").textContent = PRESENTACIONES.map((ml) => `${ml} ${plata(precioDe(ml))}`).join(" · ");
  $("#year").textContent = new Date().getFullYear();
  $("#contact-line").textContent = [TIENDA.correo, TIENDA.whatsappVisible].filter(Boolean).join(" · ");
  $$("[data-wa]").forEach((a) => (a.href = wa(mensajes[a.dataset.wa])));

  // Perfume destacado en la portada
  const estrella = PERFUMES.find((p) => p.destacado) || PERFUMES[0];
  $("#hero-visual").innerHTML = arte(estrella) + `<span class="hero-visual-cap"><small>Favorito de la casa</small><span>${esc(estrella.nombre)}</span></span>`;
  $("#hero-visual").addEventListener("click", () => abrirDetalle(estrella.id));

  const barra = $("#topbar");
  const alScroll = () => barra.classList.toggle("solid", scrollY > 40);
  addEventListener("scroll", alScroll, { passive: true });
  alScroll();

  // ---------- Tarjetas de propósito ----------
  $("#prop-grid").innerHTML =
    PROPOSITOS.map((p, i) => {
      const n = PERFUMES.filter((x) => x.propositos.includes(p.id)).length;
      return `<button class="prop" style="--c:${p.color}66" data-prop="${p.id}">
        <svg class="prop-ico"><use href="#p-${p.id}"/></svg>
        <span class="prop-n">${String(i + 1).padStart(2, "0")} · ${n} perfumes</span>
        <span class="prop-when">${esc(p.momento || "")}</span>
        <h3>${esc(p.nombre)}</h3>
        <p>${esc(p.descripcion)}</p>
        <span class="go">Ver perfumes <svg class="ico"><use href="#i-arrow"/></svg></span>
      </button>`;
    }).join("") +
    `<button class="prop all" data-prop="">
      <svg class="prop-ico"><use href="#p-todo"/></svg>
      <span><h3>Ver todo el catálogo</h3>
      <p>¿Aún no sabes? Explora las ${PERFUMES.length} fragancias y filtra a tu gusto.</p></span>
      <span class="go">Explorar <svg class="ico"><use href="#i-arrow"/></svg></span>
    </button>`;

  function elegirProposito(id, irAlCatalogo = true) {
    estado.filtros.proposito = new Set(id ? [id] : []);
    estado.limite = POR_PAGINA;
    pintar();
    if (irAlCatalogo) $("#catalogo").scrollIntoView({ behavior: "smooth" });
  }
  $("#prop-grid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-prop]");
    if (b) elegirProposito(b.dataset.prop);
  });

  // ---------- Precios por tamaño ----------
  const mejorMl = PRESENTACIONES.reduce((a, b) => (porMl(b) < porMl(a) ? b : a));
  $("#price-grid").innerHTML =
    PRESENTACIONES.map((ml, i) => {
      const prev = PRESENTACIONES[i - 1];
      const extra = prev ? `+${mlNum(ml) - mlNum(prev)} ml por solo ${plata(precioDe(ml) - precioDe(prev))} más` : "Perfecto para probar o llevar en el bolso";
      return `<div class="price ${ml === mejorMl ? "best" : ""}">
        ${ml === mejorMl ? '<span class="price-tag">Mejor precio por ml</span>' : ""}
        <span class="price-ml">${ml}</span>
        <strong class="price-n">${plata(precioDe(ml))}</strong>
        <span class="price-per">${plata(porMl(ml))} por ml</span>
        <span class="price-extra">${extra}</span>
      </div>`;
    }).join("") +
    `<a class="price kits-link" href="#kits">
      <svg class="ico-lg"><use href="#i-gift"/></svg>
      <span class="price-ml">¿Llevas más de uno?</span>
      <strong class="price-n small">Arma un kit</strong>
      <span class="price-extra">y ahorra hasta <b id="price-max"></b></span>
      <span class="go">Ver kits <svg class="ico"><use href="#i-arrow"/></svg></span>
    </a>`;

  // ---------- Tarjetas de kits ----------
  function pintarKits() {
    const vig = promoVigente();
    const items = (k) =>
      k.espacios.every((e) => /^Aroma \d/.test(e.titulo))
        ? `<li><span>${k.espacios.length} × ${k.espacios[0].tamano}</span>Elige tus ${k.espacios.length} aromas favoritos</li>`
        : k.espacios.map((e) => `<li><span>${e.tamano}</span>${esc(e.titulo)}</li>`).join("");
    // Beneficio a la vista: barra "por separado" contra barra "en kit" y el pedazo que te ahorras
    const porFrasco = (k) => {
      if (!vig) return "";
      const antes = antesKit(k);
      const ahora = precioKit(k);
      const pct = Math.round((ahora / antes) * 100);
      const t = tamanoUnico(k);
      const unidad = ahora / k.espacios.length;
      return `<div class="kit-compare">
        <div class="kc-row"><span class="kc-l">Por separado</span><div class="kc-bar"><i class="kc-full"></i></div><span class="kc-v">${plata(antes)}</span></div>
        <div class="kc-row"><span class="kc-l">En kit</span><div class="kc-bar"><i class="kc-kit" style="width:${pct}%"></i><i class="kc-save" style="width:${100 - pct}%"></i></div><span class="kc-v gold">${plata(ahora)}</span></div>
        <p class="kc-save-l"><i></i>Te ahorras <b>${plata(antes - ahora)}</b></p>
        ${t ? `<p class="kc-unit">Cada frasco de ${t}: <b>${plata(unidad)}</b> <s>${plata(precioDe(t))}</s></p>` : ""}
      </div>`;
    };
    // Escalera: el descuento sube con el tamaño
    $("#kit-ladder").hidden = !vig;
    if (vig) {
      const maxPct = Math.max(...KITS_VITRINA.map(pctKit));
      $("#kit-ladder").innerHTML =
        `<p class="kl-title">Sube de tamaño y <b>ahorra más</b></p><div class="kl-steps">` +
        KITS_VITRINA.map(
          (k, i) => `${i ? '<svg class="kl-arrow"><use href="#i-arrow"/></svg>' : ""}
          <div class="kl-step ${k.destacado ? "on" : ""}">
            <span class="kl-pct">-${pctKit(k)}%</span>
            <span class="kl-bar"><i style="height:${Math.round((pctKit(k) / maxPct) * 100)}%"></i></span>
            <span class="kl-name">${esc(k.nombre)}</span>
            <span class="kl-size">${k.espacios.length} × ${tamanoUnico(k) || ""}</span>
          </div>`
        ).join("") +
        `</div>`;
    }
    $("#kit-grid").innerHTML = KITS_VITRINA.map((k, i) => {
      const cupos = PROMO.cupos?.[k.id];
      return `<article class="kit ${k.destacado ? "featured" : ""}" style="--step:${i}">
        <div class="kit-top">
          <span class="kit-tag">${esc(k.etiqueta || "")}</span>
          ${vig ? `<span class="kit-pct">-${pctKit(k)}%</span>` : ""}
        </div>
        <div class="kit-visual">${frascosKit(k)}</div>
        <h3 class="kit-name">${esc(k.nombre)}</h3>
        <p class="kit-frase">${esc(k.frase)}</p>
        <p class="kit-desc">${esc(k.descripcion)}</p>
        <ul class="kit-items">${items(k)}</ul>
        ${porFrasco(k)}
        <div class="kit-price">
          ${vig ? `<s>${plata(antesKit(k))}</s>` : ""}
          <strong>${plata(precioKit(k))}</strong>
          ${vig ? `<span class="kit-save">Ahorras ${plata(ahorroKit(k))}</span>` : ""}
        </div>
        ${vig ? `<p class="kit-timer"><svg class="ico"><use href="#i-clock"/></svg>Termina en <b data-count="corto"></b></p>` : ""}
        ${vig && cupos ? `<p class="kit-cupos">Quedan ${cupos} kits a este precio</p>` : ""}
        <button class="btn-gold full" data-kit="${k.id}">Armar mi kit <svg class="ico"><use href="#i-arrow"/></svg></button>
      </article>`;
    }).join("");

    // Huella Fera (60 ml + 30 ml del mismo aroma), fuera de la escalera
    $("#kit-extra").hidden = !HUELLA;
    if (HUELLA)
      $("#kit-extra").innerHTML = `
        <div class="kit-extra-art">${frascosKit(HUELLA)}</div>
        <div class="kit-extra-body">
          <p class="eyebrow">¿Ya tienes tu favorito?</p>
          <h3 class="kit-name">${esc(HUELLA.nombre)}</h3>
          <p class="kit-frase">${esc(HUELLA.frase)}</p>
          <p class="kit-desc">${esc(HUELLA.descripcion)}</p>
        </div>
        <div class="kit-extra-buy">
          <div class="kit-price">
            ${vig ? `<s>${plata(antesKit(HUELLA))}</s>` : ""}
            <strong>${plata(precioKit(HUELLA))}</strong>
            ${vig ? `<span class="kit-save">Ahorras ${plata(ahorroKit(HUELLA))}</span>` : ""}
          </div>
          <button class="btn-gold" data-kit="${HUELLA.id}">Elegir mi aroma <svg class="ico"><use href="#i-arrow"/></svg></button>
        </div>`;
    const max = Math.max(...KITS.map(ahorroKit));
    $("#kits-max-pct").textContent = `${Math.max(...KITS_VITRINA.map(pctKit))} %`;
    $("#promo-max").textContent = $("#price-max").textContent = plata(max);
    $("#promo-bar").hidden = !vig;
    document.body.classList.toggle("has-promo", vig);
    $("#kits-countdown").hidden = !vig;
    $("#promo-title").textContent = PROMO.titulo;
    if (vig) $("#kits-countdown-l").textContent = `${PROMO.titulo} hasta el ${fechaFin()}`;
  }
  $$("#kit-grid, #kit-extra").forEach((el) =>
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-kit]");
      if (b) abrirKit(b.dataset.kit);
    })
  );

  // Cuenta regresiva (se actualiza cada segundo)
  let vigenteAntes = promoVigente();
  function tic() {
    const vig = promoVigente();
    if (vig !== vigenteAntes) {
      vigenteAntes = vig;
      pintarKits();
      pintarSeleccion();
    }
    if (!vig) return;
    const r = restante();
    const urgente = r.ms < 864e5;
    const corto = r.d ? `${r.d}d ${dos(r.h)}h ${dos(r.m)}m` : `${dos(r.h)}h ${dos(r.m)}m ${dos(r.s)}s`;
    $("#promo-count").textContent = urgente ? `¡Último día! ${corto}` : corto;
    $("#promo-bar").classList.toggle("urgent", urgente);
    $$("[data-count=corto]").forEach((el) => (el.textContent = corto));
    $("#kits-count").innerHTML = [["d", "días"], ["h", "horas"], ["m", "min"], ["s", "seg"]]
      .map(([k, l]) => `<span><b>${dos(r[k])}</b><small>${l}</small></span>`)
      .join("");
    $("#kits-countdown").classList.toggle("urgent", urgente);
    const kt = $("#kb-timer span");
    if (kt) kt.textContent = `Precio especial termina en ${corto}`;
  }

  // ---------- Píldoras rápidas de propósito ----------
  $("#pills").innerHTML =
    `<button class="pill" data-pill=""><svg><use href="#p-todo"/></svg>Todos</button>` +
    PROPOSITOS.map((p) => `<button class="pill" data-pill="${p.id}"><svg><use href="#p-${p.id}"/></svg>${esc(p.corto)}</button>`).join("");
  $("#pills").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pill]");
    if (!b) return;
    const id = b.dataset.pill;
    const set = estado.filtros.proposito;
    elegirProposito(set.size === 1 && set.has(id) ? "" : id, false);
  });

  // ---------- Estado del catálogo ----------
  const estado = {
    filtros: { proposito: new Set(), genero: new Set(), categoria: new Set(), familia: new Set(), inspiracion: new Set() },
    q: "",
    orden: "destacados",
    limite: POR_PAGINA,
  };

  // ---------- Filtros desplegables ----------
  const unicos = (k) => [...new Set(PERFUMES.map((p) => p[k]))].sort((a, b) => a.localeCompare(b, "es"));
  const FILTROS = [
    { k: "proposito", nombre: "Propósito", opciones: PROPOSITOS.map((p) => [p.id, p.nombre]) },
    { k: "genero", nombre: "Género", opciones: ["Mujer", "Hombre", "Unisex"].map((g) => [g, g]) },
    { k: "categoria", nombre: "Categoría", opciones: unicos("categoria").map((c) => [c, c === "Árabe" ? "Árabes" : c]) },
    { k: "familia", nombre: "Familia olfativa", opciones: unicos("familia").map((f) => [f, f]) },
    { k: "inspiracion", nombre: "Inspiración", opciones: unicos("inspiracion").map((f) => [f, f]) },
  ];
  $("#filters").innerHTML = FILTROS.map(
    (f) => `<div class="dd" data-dd="${f.k}">
      <button class="dd-btn" type="button">${f.nombre}<span class="badge" hidden></span><svg class="ico"><use href="#i-chev"/></svg></button>
      <div class="dd-menu">${f.opciones.map(([v, t]) => `<label><input type="checkbox" value="${esc(v)}">${esc(t)}</label>`).join("")}</div>
    </div>`
  ).join("");
  $("#filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".dd-btn");
    if (!btn) return;
    const dd = btn.parentElement;
    const abierto = dd.classList.contains("open");
    $$(".dd.open").forEach((d) => d.classList.remove("open"));
    if (!abierto) dd.classList.add("open");
  });
  $("#filters").addEventListener("change", (e) => {
    const k = e.target.closest("[data-dd]").dataset.dd;
    const set = estado.filtros[k];
    e.target.checked ? set.add(e.target.value) : set.delete(e.target.value);
    estado.limite = POR_PAGINA;
    pintar();
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dd")) $$(".dd.open").forEach((d) => d.classList.remove("open"));
  });

  $("#q").addEventListener("input", (e) => {
    estado.q = norm(e.target.value.trim());
    estado.limite = POR_PAGINA;
    pintar();
  });
  $("#sort").addEventListener("change", (e) => {
    estado.orden = e.target.value;
    pintar();
  });
  const limpiar = () => {
    Object.values(estado.filtros).forEach((s) => s.clear());
    estado.q = "";
    $("#q").value = "";
    estado.limite = POR_PAGINA;
    pintar();
  };
  $("#clear").addEventListener("click", limpiar);
  $("#clear2").addEventListener("click", limpiar);
  $("#more").addEventListener("click", () => {
    estado.limite += POR_PAGINA;
    pintar();
  });

  // ---------- Filtrar y ordenar ----------
  function filtrados() {
    const { proposito, genero, categoria, familia, inspiracion } = estado.filtros;
    let lista = PERFUMES.filter(
      (p) =>
        (!proposito.size || p.propositos.some((x) => proposito.has(x))) &&
        (!genero.size || genero.has(p.genero)) &&
        (!categoria.size || categoria.has(p.categoria)) &&
        (!familia.size || familia.has(p.familia)) &&
        (!inspiracion.size || inspiracion.has(p.inspiracion)) &&
        (!estado.q || norm(`${p.codigo} ${p.codigo.replace("-", "")} ${p.nombre} ${p.inspiracion} ${p.familia}`).includes(estado.q))
    );
    const cmp = {
      destacados: (a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || a.orden - b.orden,
      codigo: (a, b) => a.codigo.localeCompare(b.codigo),
      az: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
      za: (a, b) => b.nombre.localeCompare(a.nombre, "es"),
      insp: (a, b) => a.inspiracion.localeCompare(b.inspiracion, "es"),
    }[estado.orden];
    return lista.sort(cmp);
  }

  // ---------- Pintar catálogo ----------
  function tarjeta(p, i) {
    const enSel = seleccion.has(p.id);
    return `<article class="card" style="animation-delay:${(i % POR_PAGINA) * 50}ms">
      <button class="card-img" data-ver="${p.id}" aria-label="Ver detalle de ${esc(p.nombre)}">
        ${arte(p)}
        <span class="card-tags">${p.destacado ? '<span class="tag gold">Favorito</span>' : ""}</span>
        <span class="see">Ver detalle</span>
      </button>
      <button class="round ${enSel ? "on" : ""}" data-sel="${p.id}" aria-label="${enSel ? "Quitar de" : "Agregar a"} mi pedido">
        <svg class="ico"><use href="#i-${enSel ? "check" : "plus"}"/></svg>
      </button>
      <div class="card-body">
        <div class="card-top"><p class="fam">${esc(p.familia)}</p><span class="code">${esc(p.codigo)}</span></div>
        <h3 class="card-name"><button data-ver="${p.id}">${esc(p.nombre)}</button></h3>
        <p class="insp">Inspirado en ${esc(p.inspiracion.toUpperCase())}</p>
        <div class="card-props" title="${esc(p.propositos.map((x) => propById[x].nombre).join(" · "))}">
          ${p.propositos.map((x) => `<svg><use href="#p-${x}"/></svg>`).join("")}
        </div>
        <p class="card-price"><small>Desde</small> ${plata(Math.min(...p.presentaciones.map(precioDe)))}</p>
        <div class="card-foot-line"></div>
        <div class="card-foot"><button class="quote" data-ver="${p.id}">Ver tamaños y pedir</button></div>
      </div>
    </article>`;
  }

  function pintar() {
    const lista = filtrados();
    const visibles = lista.slice(0, estado.limite);
    $("#grid").innerHTML = visibles.map(tarjeta).join("");
    $("#empty").hidden = lista.length > 0;
    $("#count-n").textContent = lista.length;
    $("#count-t").textContent = PERFUMES.length;
    $("#more-wrap").hidden = lista.length <= estado.limite;
    $("#more-l").textContent = `Mostrando ${visibles.length} de ${lista.length}`;

    const activos = Object.values(estado.filtros).reduce((n, s) => n + s.size, 0) + (estado.q ? 1 : 0);
    $("#clear").hidden = !activos;

    // Encabezado según el propósito
    const props = estado.filtros.proposito;
    if (props.size === 1) {
      const p = propById[[...props][0]];
      $("#catalog-title").innerHTML = `<em>${esc(p.nombre)}</em>`;
      $("#catalog-desc").textContent = p.descripcion;
    } else {
      $("#catalog-title").textContent = props.size ? "Tu selección de momentos" : "Todas las fragancias";
      $("#catalog-desc").textContent = "Explora nuestro catálogo completo o filtra por el momento que quieres vivir.";
    }

    // Sincronizar píldoras y casillas
    $$("[data-pill]").forEach((b) => b.classList.toggle("on", b.dataset.pill ? props.has(b.dataset.pill) : !props.size));
    $$("[data-dd]").forEach((dd) => {
      const set = estado.filtros[dd.dataset.dd];
      $$("input", dd).forEach((i) => (i.checked = set.has(i.value)));
      const badge = $(".badge", dd);
      badge.hidden = !set.size;
      badge.textContent = set.size;
    });

    // Recordar el propósito en la dirección (para compartir el enlace)
    const url = new URL(location.href);
    props.size === 1 ? url.searchParams.set("proposito", [...props][0]) : url.searchParams.delete("proposito");
    try { history.replaceState(null, "", url); } catch (e) {}
  }

  $("#grid").addEventListener("click", (e) => {
    const sel = e.target.closest("[data-sel]");
    if (sel) return alternarSeleccion(sel.dataset.sel);
    const ver = e.target.closest("[data-ver]");
    if (ver) abrirDetalle(ver.dataset.ver);
  });

  // ---------- Mi pedido ----------
  function alternarSeleccion(id, ml) {
    if (seleccion.has(id) && !ml) seleccion.delete(id);
    else seleccion.set(id, ml || seleccion.get(id) || MAYOR);
    guardarPedido();
    pintarSeleccion();
    pintar();
  }

  // Encaja perfumes sueltos del pedido en los espacios de un kit (mismo tamaño y compatibles)
  function encajar(k) {
    const usados = new Set();
    return k.espacios.map((e) => {
      const hit = [...seleccion].find(([id, ml]) => !usados.has(id) && ml === e.tamano && cabeEn(perfumeById[id], e));
      if (!hit) return null;
      usados.add(hit[0]);
      return hit[0];
    });
  }

  // Sugerencia para subir el ticket dentro del pedido
  function sugerencia() {
    if (promoVigente()) {
      const opciones = KITS.filter((k) => !k.mismoAroma)
        .map((k) => ({ k, items: encajar(k) }))
        .map((o) => ({ ...o, n: o.items.filter(Boolean).length, faltan: o.items.filter((x) => !x).length }))
        .filter((o) => o.n > 0 && o.faltan <= 1)
        .sort((a, b) => a.faltan - b.faltan || ahorroKit(b.k) - ahorroKit(a.k));
      const o = opciones[0];
      if (o && !o.faltan)
        return { texto: `¡Ya tienes lo necesario para el kit <b>${esc(o.k.nombre)}</b>! Conviértelo y ahorra <b>${plata(ahorroKit(o.k))}</b>.`, boton: "Convertir en kit", accion: () => convertirEnKit(o.k, o.items) };
      if (o)
        return { texto: `Te falta <b>1 perfume</b> para el kit <b>${esc(o.k.nombre)}</b> y ahorrar <b>${plata(ahorroKit(o.k))}</b>.`, boton: "Completar kit", accion: () => { abrirPanel(false); abrirKit(o.k.id, o.items, true); } };
      // Un perfume de 60 ml suelto: ofrecer el mismo aroma en 30 ml como Huella Fera
      const sesenta = HUELLA && [...seleccion].find(([, ml]) => ml === HUELLA.espacios[0].tamano);
      if (sesenta) {
        const [id, ml] = sesenta;
        const extra = precioKit(HUELLA) - precioDe(ml);
        return {
          texto: `Lleva <b>${esc(perfumeById[id].nombre)}</b> también en ${HUELLA.espacios[1].tamano} de bolsillo por solo <b>${plata(extra)}</b> más: es el kit <b>${esc(HUELLA.nombre)}</b> y ahorras <b>${plata(ahorroKit(HUELLA))}</b>.`,
          boton: `Sí, quiero ${HUELLA.nombre}`,
          accion: () => convertirEnKit(HUELLA, HUELLA.espacios.map(() => id)),
        };
      }
    }
    const chico = [...seleccion].find(([, ml]) => ml !== MAYOR);
    if (chico) {
      const [id, ml] = chico;
      const sig = PRESENTACIONES[PRESENTACIONES.indexOf(ml) + 1];
      return {
        texto: `Pasa <b>${esc(perfumeById[id].nombre)}</b> a ${sig} por solo <b>${plata(precioDe(sig) - precioDe(ml))}</b> más.`,
        boton: `Cambiar a ${sig}`,
        accion: () => alternarSeleccion(id, sig),
      };
    }
    return null;
  }
  let accionSugerida = null;

  function convertirEnKit(k, items) {
    items.forEach((id) => seleccion.delete(id));
    kitsPedido.push({ kit: k.id, items });
    guardarPedido();
    pintarSeleccion();
    pintar();
  }

  function pintarSeleccion() {
    const n = seleccion.size + kitsPedido.length;
    const total = totalPedido();
    $("#selbar").hidden = !n;
    $("#sel-n").textContent = n;
    $("#sel-l").textContent = `${n} ${n === 1 ? "producto" : "productos"} · ${plata(total)}`;
    $("#sel-wa").href = $("#drawer-wa").href = wa(mensajePedido());
    $("#drawer-total").textContent = plata(total);

    const kitsHtml = kitsPedido
      .map((kp, i) => {
        const k = kitById[kp.kit];
        return `<li class="kit-line">
          <div class="thumb kit-thumb">${frascosKit(k)}</div>
          <div><span class="code">KIT</span><h5>${esc(k.nombre)}</h5>
            <p>${[...new Set(kp.items)].map((id) => esc(perfumeById[id].codigo)).join(" · ")}</p>
            <p class="line-price">${plata(precioKit(k))}${ahorroKit(k) ? ` <span class="kit-save sm">Ahorras ${plata(ahorroKit(k))}</span>` : ""}</p>
          </div>
          <button class="rm" data-rmkit="${i}" aria-label="Quitar kit"><svg class="ico"><use href="#i-trash"/></svg></button>
        </li>`;
      })
      .join("");
    const perfumesHtml = [...seleccion]
      .map(([id, ml]) => {
        const p = perfumeById[id];
        return `<li>
          <div class="thumb">${arte(p)}</div>
          <div><span class="code">${esc(p.codigo)}</span><h5>${esc(p.nombre)}</h5><p>Inspirado en ${esc(p.inspiracion)}</p>
            <select data-ml="${id}" aria-label="Tamaño">${p.presentaciones.map((x) => `<option value="${x}" ${x === ml ? "selected" : ""}>${x} · ${plata(precioDe(x))}</option>`).join("")}</select>
          </div>
          <button class="rm" data-rm="${id}" aria-label="Quitar"><svg class="ico"><use href="#i-trash"/></svg></button>
        </li>`;
      })
      .join("");
    $("#drawer-list").innerHTML = n ? kitsHtml + perfumesHtml : `<li style="display:block;color:var(--dim);border:0">Aún no has agregado perfumes.</li>`;

    const s = n ? sugerencia() : null;
    accionSugerida = s?.accion || null;
    $("#drawer-nudge").hidden = !s;
    if (s) $("#drawer-nudge").innerHTML = `<p>${s.texto}</p><button class="btn-outline btn-sm" id="nudge-go">${esc(s.boton)}</button>`;
    if (abiertoId) actualizarBotonAgregar();
  }
  const abrirPanel = (abrir) => {
    $("#drawer").classList.toggle("open", abrir);
    $("#drawer").setAttribute("aria-hidden", !abrir);
    $("#drawer-back").hidden = !abrir;
    document.body.classList.toggle("lock", abrir);
  };
  $("#sel-open").addEventListener("click", () => abrirPanel(true));
  $("#drawer-x").addEventListener("click", () => abrirPanel(false));
  $("#drawer-back").addEventListener("click", () => abrirPanel(false));
  $("#drawer-list").addEventListener("change", (e) => {
    const id = e.target.dataset.ml;
    if (id) alternarSeleccion(id, e.target.value);
  });
  $("#drawer-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rm]");
    if (b) return alternarSeleccion(b.dataset.rm);
    const k = e.target.closest("[data-rmkit]");
    if (k) {
      kitsPedido.splice(+k.dataset.rmkit, 1);
      guardarPedido();
      pintarSeleccion();
    }
  });
  $("#drawer-nudge").addEventListener("click", (e) => {
    if (e.target.closest("#nudge-go") && accionSugerida) accionSugerida();
  });
  $("#drawer-clear").addEventListener("click", () => {
    seleccion.clear();
    kitsPedido = [];
    guardarPedido();
    pintarSeleccion();
    pintar();
    abrirPanel(false);
  });

  // ---------- Ventana de detalle ----------
  let abiertoId = null;
  let mlElegido = null;
  const modal = $("#modal");

  function actualizarBotonAgregar() {
    const en = seleccion.has(abiertoId);
    const b = $("#m-add");
    b.classList.toggle("on", en);
    b.innerHTML = `<svg class="ico"><use href="#i-${en ? "check" : "plus"}"/></svg><span>${en ? "En mi pedido" : "Agregar al pedido"}</span>`;
    $("#m-wa").href = wa(mensajePerfume(perfumeById[abiertoId], mlElegido));
  }

  function abrirDetalle(id) {
    const p = perfumeById[id];
    abiertoId = id;
    mlElegido = seleccion.get(id) || MAYOR;
    $("#m-img").innerHTML = arte(p);
    $("#m-img svg")?.setAttribute("preserveAspectRatio", "xMidYMid meet");
    $("#m-name").textContent = p.nombre;
    $("#m-code").textContent = p.codigo;
    $("#m-insp").innerHTML = `Inspirado en <b>${esc(p.inspiracion.toUpperCase())}</b>`;
    $("#m-chips").innerHTML = [p.genero, p.categoria, p.familia, p.destacado ? "Favorito" : ""].filter(Boolean).map((c) => `<span class="chip">${esc(c)}</span>`).join("");
    $("#m-props").innerHTML = p.propositos
      .map((x) => `<button data-mprop="${x}"><svg><use href="#p-${x}"/></svg>${esc(propById[x].nombre)}</button>`)
      .join("");
    $("#m-scale").innerHTML = escala(p);
    $("#m-notes").innerHTML = [["Salida", p.notas.salida], ["Corazón", p.notas.corazon], ["Fondo", p.notas.fondo]]
      .map(([t, v]) => `<dt>${t}</dt><dd>${v.split(",").map((n) => notaPill(n.trim())).join("")}</dd>`)
      .join("");
    // Kits en los que cabe este perfume
    const kits = KITS.map((k) => ({
      k,
      i: k.mismoAroma ? (k.espacios.every((e) => cabeEn(p, e)) ? 0 : -1) : k.espacios.findIndex((e) => cabeEn(p, e)),
    }))
      .filter((o) => o.i >= 0)
      .sort((a, b) => (b.k.mismoAroma ? 1 : 0) - (a.k.mismoAroma ? 1 : 0));
    const detalleKit = (k, i) =>
      k.mismoAroma
        ? `Este aroma en ${k.espacios.map((e) => e.tamano).join(" + ")}`
        : /^Aroma \d/.test(k.espacios[i].titulo)
          ? `Combo de ${k.espacios.length} × ${k.espacios[i].tamano} con este aroma`
          : `${esc(k.espacios[i].titulo)} · ${k.espacios[i].tamano}`;
    $("#m-kits").innerHTML = kits.length
      ? `<p class="label">Úsalo en un kit y ahorra</p><div class="m-kit-list">${kits
          .map(({ k, i }) => `<button class="${k.mismoAroma ? "huella" : ""}" data-kitstart="${k.id}" data-slot="${i}"><span><b>${esc(k.nombre)}</b><small>${detalleKit(k, i)}</small></span><span class="m-kit-p">${plata(precioKit(k))}${ahorroKit(k) ? `<small>-${pctKit(k)}% · ahorras ${plata(ahorroKit(k))}</small>` : ""}</span></button>`)
          .join("")}</div>`
      : "";
    pintarTallas();
    actualizarBotonAgregar();
    modal.hidden = false;
    document.body.classList.add("lock");
    $(".modal-body").scrollTop = 0;
    $(".modal-box").scrollTop = 0;
    $(".modal-x").focus();
  }
  function pintarTallas() {
    const p = perfumeById[abiertoId];
    $("#m-sizes").innerHTML = p.presentaciones
      .map((x) => `<button class="size ${x === mlElegido ? "on" : ""}" data-ml="${x}"><span>${x}</span><small>${plata(precioDe(x))}</small>${x === mejorMl ? '<em class="size-best">Mejor precio</em>' : ""}</button>`)
      .join("");
    $("#m-price").textContent = plata(precioDe(mlElegido));
    $("#m-ml").textContent = `${mlElegido} · ${plata(porMl(mlElegido))} por ml`;
    const sig = p.presentaciones[p.presentaciones.indexOf(mlElegido) + 1];
    $("#m-hint").innerHTML = sig
      ? `<button class="upsell" data-ml="${sig}">💡 Por solo <b>${plata(precioDe(sig) - precioDe(mlElegido))}</b> más llévate <b>${sig}</b> (+${mlNum(sig) - mlNum(mlElegido)} ml)</button>`
      : `✔ Elegiste el tamaño con el mejor precio por ml.`;
  }
  function cerrarDetalle() {
    modal.hidden = true;
    abiertoId = null;
    if (!$("#drawer").classList.contains("open")) document.body.classList.remove("lock");
  }
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) return cerrarDetalle();
    const talla = e.target.closest("[data-ml]");
    if (talla) {
      mlElegido = talla.dataset.ml;
      if (seleccion.has(abiertoId)) alternarSeleccion(abiertoId, mlElegido);
      pintarTallas();
      actualizarBotonAgregar();
      return;
    }
    const prop = e.target.closest("[data-mprop]");
    if (prop) {
      cerrarDetalle();
      return elegirProposito(prop.dataset.mprop);
    }
    const kit = e.target.closest("[data-kitstart]");
    if (kit) {
      const k = kitById[kit.dataset.kitstart];
      const items = k.espacios.map(() => (k.mismoAroma ? abiertoId : null));
      items[+kit.dataset.slot] = abiertoId;
      cerrarDetalle();
      abrirKit(k.id, items);
    }
  });
  $("#m-add").addEventListener("click", () => {
    seleccion.has(abiertoId) ? alternarSeleccion(abiertoId) : alternarSeleccion(abiertoId, mlElegido);
    actualizarBotonAgregar();
  });

  // ---------- Armador de kit ----------
  const kitm = $("#kitm");
  let kitActual = null; // { id, items, reemplaza }

  // desdePedido: los perfumes sueltos del pedido que se usan en el kit se reemplazan por el kit
  function abrirKit(id, items, desdePedido = false) {
    const k = kitById[id];
    kitActual = { id, items: items ? [...items] : k.espacios.map(() => null), reemplaza: desdePedido ? items.filter(Boolean) : [] };
    $("#kb-name").textContent = k.nombre;
    $("#kb-frase").textContent = `${k.frase} ${k.descripcion}`;
    $("#kb-timer").hidden = !promoVigente();
    pintarKit();
    tic();
    kitm.hidden = false;
    document.body.classList.add("lock");
    $(".kitm-box").scrollTop = 0;
  }
  function pintarKit() {
    const k = kitById[kitActual.id];
    const opciones = (lista, sel) =>
      ["Diseñador", "Árabe"]
        .map((cat) => {
          const ops = lista.filter((x) => x.categoria === cat);
          return ops.length
            ? `<optgroup label="${cat === "Árabe" ? "Árabes" : cat}">${ops.map((x) => `<option value="${x.id}" ${x.id === sel ? "selected" : ""}>${esc(x.codigo)} · ${esc(x.nombre)} — ${esc(x.insp)}</option>`).join("")}</optgroup>`
            : "";
        })
        .join("");
    const espacio = (num, titulo, tamano, sel, lista, slot) => {
      const p = sel && perfumeById[sel];
      return `<li class="kb-slot ${p ? "ok" : ""}">
        <div class="kb-thumb">${p ? arte(p) : `<span>${num}</span>`}</div>
        <div class="kb-body">
          <p class="kb-t"><b>${esc(titulo)}</b> · ${tamano}</p>
          <select data-slot="${slot}" aria-label="${esc(titulo)}"><option value="">Elige tu aroma…</option>${opciones(lista, sel)}</select>
          ${p ? `<p class="kb-insp">Inspirado en ${esc(p.inspiracion)}</p>` : ""}
        </div>
      </li>`;
    };
    // Kit de un solo aroma: una sola elección para todos los frascos
    $("#kb-slots").innerHTML = k.mismoAroma
      ? espacio("1", "Tu aroma", k.espacios.map((e) => e.tamano).join(" + "), kitActual.items[0],
          PERFUMES.filter((p) => k.espacios.every((e) => cabeEn(p, e))).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")), "all")
      : k.espacios.map((e, i) => espacio(i + 1, e.titulo, e.tamano, kitActual.items[i], elegibles(e), i)).join("");
    const faltan = k.mismoAroma ? (kitActual.items[0] ? 0 : 1) : kitActual.items.filter((x) => !x).length;
    const vig = promoVigente();
    $("#kb-antes").textContent = vig ? plata(antesKit(k)) : "";
    $("#kb-precio").textContent = plata(precioKit(k));
    $("#kb-ahorro").textContent = vig ? `Ahorras ${plata(ahorroKit(k))}` : "";
    $("#kb-ahorro").hidden = !vig;
    $("#kb-faltan").innerHTML = faltan
      ? `Elige ${faltan === 1 ? "1 aroma más" : `${faltan} aromas más`} para completar tu kit`
      : `<b>¡Kit completo!</b> ${vig ? `Te ahorras ${plata(ahorroKit(k))}.` : ""}`;
    $("#kb-faltan").classList.toggle("ok", !faltan);
    $("#kb-wa").classList.toggle("off", !!faltan);
    $("#kb-add").classList.toggle("off", !!faltan);
    $("#kb-wa").href = faltan ? "#" : wa(mensajeKit(k, kitActual.items));
  }
  function cerrarKit() {
    kitm.hidden = true;
    kitActual = null;
    if (!$("#drawer").classList.contains("open")) document.body.classList.remove("lock");
  }
  const marcarFaltante = () => {
    const vacio = $$("#kb-slots select").find((s) => !s.value);
    if (vacio) {
      vacio.closest(".kb-slot").classList.remove("shake");
      void vacio.offsetWidth;
      vacio.closest(".kb-slot").classList.add("shake");
      vacio.focus();
    }
  };
  kitm.addEventListener("click", (e) => {
    if (e.target.closest("[data-kclose]")) cerrarKit();
  });
  kitm.addEventListener("change", (e) => {
    const i = e.target.dataset.slot;
    if (i === undefined) return;
    if (i === "all") kitActual.items = kitActual.items.map(() => e.target.value || null);
    else kitActual.items[+i] = e.target.value || null;
    pintarKit();
  });
  $("#kb-wa").addEventListener("click", (e) => {
    if (kitActual.items.some((x) => !x)) {
      e.preventDefault();
      marcarFaltante();
    }
  });
  $("#kb-add").addEventListener("click", () => {
    if (kitActual.items.some((x) => !x)) return marcarFaltante();
    kitActual.reemplaza.filter((id) => kitActual.items.includes(id)).forEach((id) => seleccion.delete(id));
    kitsPedido.push({ kit: kitActual.id, items: [...kitActual.items] });
    guardarPedido();
    pintarSeleccion();
    pintar();
    cerrarKit();
    abrirPanel(true);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!kitm.hidden) cerrarKit();
    else if (!modal.hidden) cerrarDetalle();
    else if ($("#drawer").classList.contains("open")) abrirPanel(false);
  });

  // ---------- Inicio ----------
  const inicial = new URLSearchParams(location.search).get("proposito");
  if (inicial && propById[inicial]) estado.filtros.proposito.add(inicial);
  pintarKits();
  pintarSeleccion();
  pintar();
  tic();
  setInterval(tic, 1000);
})();
