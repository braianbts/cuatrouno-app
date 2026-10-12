# Panel admin (Cuatrouno)

React + Material UI. Se compila a `../admin/` (archivos estáticos que sirve Vercel en `/admin`).

```bash
npm install
npm run build   # genera ../admin — commitear el resultado
```

Para probar local: compilar y servir la raíz del repo (ej. `python3 -m http.server 5174` desde `cuatrouno-app/`) y abrir `/admin/`.
La vista previa del plan usa `/plan.html` y la conversión de HTML usa `/shared/plan-import.js`, por eso se prueba servido desde la raíz.
