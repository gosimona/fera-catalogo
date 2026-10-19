# FERA · Catálogo de perfumes

Catálogo web de FERA Perfumería fina. El cliente elige su perfume según el momento
(uso diario y oficina, seducción, eventos, deporte o regalo), ve el detalle de cada fragancia
y envía su selección por WhatsApp.

Sitio estático (HTML, CSS y JavaScript), sin compilación.

## Editar el catálogo

Todo se cambia en `js/perfumes.js`:

- `TIENDA`: nombre, WhatsApp y correo.
- `PROPOSITOS`: los momentos que se muestran al entrar.
- `ACORDES`: colores de la escala de acordes.
- `PERFUMES`: un perfume por línea con `P(código, nombre, inspiración, género, categoría, familia, propósitos, notas, acordes, destacado)`.
  El código (F-001, F-002…) es el código interno de estantería: es fijo y los perfumes nuevos toman el siguiente número libre.

Para poner fotos reales, guárdalas en `img/` y asígnalas al final de `js/perfumes.js`.

## Ver en local

```bash
npx http-server . -p 5174
```
