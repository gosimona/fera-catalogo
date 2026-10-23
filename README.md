# FERA · Catálogo de perfumes

Catálogo web de FERA Perfumería fina. El cliente elige su perfume según el momento
(uso diario y oficina, seducción, eventos, deporte o regalo), ve el detalle de cada fragancia
y envía su selección por WhatsApp.

Sitio estático (HTML, CSS y JavaScript), sin compilación.

## Editar el catálogo

Todo se cambia en `js/perfumes.js`:

- `TIENDA`: nombre, WhatsApp y correo.
- `PROPOSITOS`: los momentos que se muestran al entrar.
- `PRESENTACIONES` y `PRECIOS`: tamaños (30, 60 y 100 ml) y su precio.
- `KITS`: la escalera de kits (Trío Instinto 10 %, Atracción Fera 15 %, Fera Indomable 20 %, Manada Fera 25 %) y Huella Fera (60 + 30 ml del mismo aroma), con su precio y qué perfume va en cada espacio.
- `PROMO`: fecha final del precio especial de kits (vacío = se renueva cada mes) y cupos, si son limitados.
- `ACORDES`: colores de la escala de acordes.
- `PERFUMES`: un perfume por línea con `P(código, nombre, inspiración, género, categoría, familia, propósitos, notas, acordes, destacado)`.
  El código (F-001, F-002…) es el código interno de estantería: es fijo y los perfumes nuevos toman el siguiente número libre.

Para poner fotos reales, guárdalas en `img/` y asígnalas al final de `js/perfumes.js`.

## Ver en local

```bash
npx http-server . -p 5174
```
