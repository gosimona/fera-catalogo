// Lógica del catálogo: propósitos, filtros, detalle, Mi selección y WhatsApp.
(() => {
  const POR_PAGINA = 24;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const propById = Object.fromEntries(PROPOSITOS.map((p) => [p.id, p]));

  PERFUMES.forEach((p, i) => {
    p.id = slug(p.nombre);
    p.orden = i;
    p.presentaciones = p.presentaciones || PRESENTACIONES;
    [p.insp, p.marca = ""] = p.inspiracion.split(" – ");
  });
  const perfumeById = Object.fromEntries(PERFUMES.map((p) => [p.id, p]));

  // ---------- Estado ----------
  const estado = {
    filtros: { proposito: new Set(), genero: new Set(), categoria: new Set(), familia: new Set(), inspiracion: new Set() },
    q: "",
    orden: "destacados",
    limite: POR_PAGINA,
  };
  let seleccion = new Map(); // id -> presentación
  try {
    const guardada = JSON.parse(localStorage.getItem("seleccion") || "[]");
    guardada.forEach(([id, ml]) => perfumeById[id] && seleccion.set(id, ml));
  } catch (e) {}
  const guardarSeleccion = () => {
    try { localStorage.setItem("seleccion", JSON.stringify([...seleccion])); } catch (e) {}
  };

  // ---------- WhatsApp ----------
  const wa = (texto) => `https://wa.me/${TIENDA.whatsapp}?text=${encodeURIComponent(texto)}`;
  const saludo = `Hola ${TIENDA.nombre} 👋\n`;
  const mensajes = {
    general: saludo + "Quiero cotizar perfumes:\n\n*PERFUME* - presentación (ml)\n\n*OBSERVACIONES*\n-",
    asesoria: saludo + "Quiero asesoría para elegir un perfume. ¿Me ayudan?",
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
    [/manzana|pera|fresa|frambuesa|mora|grosella|ciruela|cereza|mel[oó]n|melocot|durazno|kiwi|membrillo|lichi|granada|frutas|frutos|bayas|arandano/, "Frutal"],
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

  // ---------- Textos de la tienda ----------
  $$("[data-tienda]").forEach((el) => (el.textContent = TIENDA[el.dataset.tienda]));
  document.title = `${TIENDA.nombre} · Catálogo de perfumes`;
  $("#hero-eyebrow").textContent = `${TIENDA.subtitulo} · ${TIENDA.ciudad}`;
  $("#stat-total").textContent = PERFUMES.length;
  $("#stat-prop").textContent = PROPOSITOS.length;
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
        <h3>${esc(p.nombre)}</h3>
        <p>${esc(p.descripcion)}</p>
        <span class="go">Ver perfumes <svg class="ico"><use href="#i-arrow"/></svg></span>
      </button>`;
    }).join("") +
    `<button class="prop all" data-prop="">
      <svg class="prop-ico"><use href="#p-todo"/></svg>
      <span class="prop-n">${PERFUMES.length} perfumes</span>
      <h3>Ver todo el catálogo</h3>
      <p>¿Aún no sabes? Explora todas nuestras fragancias y filtra a tu gusto.</p>
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
        (!estado.q || norm(`${p.nombre} ${p.inspiracion} ${p.familia}`).includes(estado.q))
    );
    const cmp = {
      destacados: (a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || a.orden - b.orden,
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
      <button class="round ${enSel ? "on" : ""}" data-sel="${p.id}" aria-label="${enSel ? "Quitar de" : "Agregar a"} mi selección">
        <svg class="ico"><use href="#i-${enSel ? "check" : "plus"}"/></svg>
      </button>
      <div class="card-body">
        <p class="fam">${esc(p.familia)}</p>
        <h3 class="card-name"><button data-ver="${p.id}">${esc(p.nombre)}</button></h3>
        <p class="insp">Inspirado en ${esc(p.inspiracion.toUpperCase())}</p>
        <div class="card-props" title="${esc(p.propositos.map((x) => propById[x].nombre).join(" · "))}">
          ${p.propositos.map((x) => `<svg><use href="#p-${x}"/></svg>`).join("")}
        </div>
        <div class="card-foot-line"></div>
        <div class="card-foot"><a class="quote" href="${wa(mensajePerfume(p))}" target="_blank" rel="noopener">Cotizar</a></div>
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

  // ---------- Mi selección ----------
  function alternarSeleccion(id, ml) {
    if (seleccion.has(id) && !ml) seleccion.delete(id);
    else seleccion.set(id, ml || seleccion.get(id) || perfumeById[id].presentaciones.at(-1));
    guardarSeleccion();
    pintarSeleccion();
    pintar();
  }
  const mensajePerfume = (p, ml) =>
    `${saludo}Quiero el precio de este perfume:\n\n*${p.nombre}* (inspirado en ${p.inspiracion})${ml ? ` - ${ml}` : ""}\n\n¿Me ayudan?`;
  const mensajeSeleccion = () =>
    saludo +
    "Quiero cotizar estos perfumes:\n\n" +
    [...seleccion].map(([id, ml], i) => `${i + 1}. *${perfumeById[id].nombre}* (inspirado en ${perfumeById[id].inspiracion}) - ${ml}`).join("\n") +
    "\n\n*OBSERVACIONES*\n-";

  function pintarSeleccion() {
    const n = seleccion.size;
    $("#selbar").hidden = !n;
    $("#sel-n").textContent = n;
    $("#sel-l").textContent = `${n} ${n === 1 ? "perfume listo" : "perfumes listos"} para cotizar`;
    $("#sel-wa").href = $("#drawer-wa").href = wa(mensajeSeleccion());
    $("#drawer-list").innerHTML = n
      ? [...seleccion]
          .map(([id, ml]) => {
            const p = perfumeById[id];
            return `<li>
              <div class="thumb">${arte(p)}</div>
              <div><h5>${esc(p.nombre)}</h5><p>Inspirado en ${esc(p.inspiracion)}</p>
                <select data-ml="${id}" aria-label="Presentación">${p.presentaciones.map((x) => `<option ${x === ml ? "selected" : ""}>${x}</option>`).join("")}</select>
              </div>
              <button class="rm" data-rm="${id}" aria-label="Quitar"><svg class="ico"><use href="#i-trash"/></svg></button>
            </li>`;
          })
          .join("")
      : `<li style="display:block;color:var(--dim);border:0">Aún no has agregado perfumes.</li>`;
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
    if (b) alternarSeleccion(b.dataset.rm);
  });
  $("#drawer-clear").addEventListener("click", () => {
    seleccion.clear();
    guardarSeleccion();
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
    b.innerHTML = `<svg class="ico"><use href="#i-${en ? "check" : "plus"}"/></svg><span>${en ? "En mi selección" : "Agregar"}</span>`;
    $("#m-wa").href = wa(mensajePerfume(perfumeById[abiertoId], mlElegido));
  }

  function abrirDetalle(id) {
    const p = perfumeById[id];
    abiertoId = id;
    mlElegido = seleccion.get(id) || p.presentaciones.at(-1);
    $("#m-img").innerHTML = arte(p);
    $("#m-img svg")?.setAttribute("preserveAspectRatio", "xMidYMid meet");
    $("#m-name").textContent = p.nombre;
    $("#m-insp").innerHTML = `Inspirado en <b>${esc(p.inspiracion.toUpperCase())}</b>`;
    $("#m-chips").innerHTML = [p.genero, p.categoria, p.familia, p.destacado ? "Favorito" : ""].filter(Boolean).map((c) => `<span class="chip">${esc(c)}</span>`).join("");
    $("#m-props").innerHTML = p.propositos
      .map((x) => `<button data-mprop="${x}"><svg><use href="#p-${x}"/></svg>${esc(propById[x].nombre)}</button>`)
      .join("");
    $("#m-scale").innerHTML = escala(p);
    $("#m-notes").innerHTML = [["Salida", p.notas.salida], ["Corazón", p.notas.corazon], ["Fondo", p.notas.fondo]]
      .map(([t, v]) => `<dt>${t}</dt><dd>${v.split(",").map((n) => notaPill(n.trim())).join("")}</dd>`)
      .join("");
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
      .map((x, i) => `<button class="size ${x === mlElegido ? "on" : ""}" data-ml="${x}">${x}${i === p.presentaciones.length - 1 ? "<small>Más rendidor</small>" : ""}</button>`)
      .join("");
  }
  function cerrarDetalle() {
    modal.hidden = true;
    abiertoId = null;
    if (!$("#drawer").classList.contains("open")) document.body.classList.remove("lock");
  }
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) return cerrarDetalle();
    const talla = e.target.closest("#m-sizes [data-ml]");
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
  });
  $("#m-add").addEventListener("click", () => {
    seleccion.has(abiertoId) ? alternarSeleccion(abiertoId) : alternarSeleccion(abiertoId, mlElegido);
    actualizarBotonAgregar();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!modal.hidden) cerrarDetalle();
    else if ($("#drawer").classList.contains("open")) abrirPanel(false);
  });

  // ---------- Inicio ----------
  const inicial = new URLSearchParams(location.search).get("proposito");
  if (inicial && propById[inicial]) estado.filtros.proposito.add(inicial);
  pintarSeleccion();
  pintar();
})();
