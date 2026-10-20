# PresentaAI Académico — MVP para Netlify

Primera versión funcional preparada para Netlify.

## Incluye
- Interfaz en español.
- Carga de DOCX y recepción de PDF.
- Lectura local de texto DOCX con Mammoth.
- Detección inicial de encabezados.
- Propuesta de láminas.
- Editor de títulos, cuerpo y cita.
- Conservación del formato al modificar solo el texto.
- Selector de fuente y tamaño.
- Agregar láminas.
- Exportación PDF básica.
- Panel preparado para trazabilidad.

## Importante
Esta versión NO afirma tener IA conectada. No inventa autores. La lectura PDF completa, trazabilidad por fragmentos, generación real con IA, imágenes, autenticación, persistencia, PPTX y editor drag/resize son la siguiente fase.

## Netlify
1. Sube este proyecto a GitHub.
2. En Netlify: Add new project > Import an existing project.
3. Selecciona el repositorio.
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Deploy.

También puedes ejecutar:
`npm install`
`npm run dev`

## Seguridad
Nunca pongas claves reales en el frontend. Usa variables de entorno y Netlify Functions.
