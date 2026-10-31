# FERA · Catálogo de perfumes

Catálogo web de FERA Perfumería fina. El cliente elige su perfume según el momento
(uso diario y oficina, seducción, eventos, deporte o regalo), ve el detalle de cada fragancia
y envía su selección por WhatsApp.

Sitio estático (HTML, CSS y JavaScript), sin compilación.

## Editar el catálogo

Todo se cambia en `js/perfumes.js`:

- `TIENDA`: nombre, WhatsApp y correo.
- `PROPOSITOS`: los momentos que se muestran al entrar.
- `PRESENTACIONES`, `PRECIOS`, `PRECIOS_REGULARES` y `DETALLE_TAMANO`: tamaños, precio de inauguración, precio regular tachado y detalle.
- `KITS`: Combos FERA: Trío Instinto (3 × 30 ml), Atracción Fera (3 × 60 ml) y Fera Indomable (2 × 100 ml), con su precio; el ahorro se calcula sobre `PRECIOS_REGULARES`.
- `PROMO`: fecha final del precio especial de kits (vacío = se renueva cada mes) y cupos, si son limitados.
- `ACORDES`: colores de la escala de acordes.
- `PERFUMES`: un perfume por línea con `P(código, nombre, inspiración, género, categoría, familia, propósitos, notas, acordes, destacado)`.
  El código F-ENP es la ubicación: Estante, Nivel (1 arriba) y Posición (0 a 9). Ejemplo: F-247 = estante 2, nivel 4, posición 7. Los perfumes nuevos toman el primer espacio libre de su grupo.

Para poner fotos reales, guárdalas en `img/` y asígnalas al final de `js/perfumes.js`.

## Ver en local

```bash
npx http-server . -p 5174
```
