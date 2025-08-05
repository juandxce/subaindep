# Scraper de Subastas INDEP

Este script de Node.js extrae automáticamente todos los anuncios de "Bienes inmuebles" de la página de subastas del INDEP.

## 🚀 Cómo Ejecutar

### Requisitos Previos
- Node.js instalado
- Conexión a internet

### Instalación de Dependencias
```bash
npm install puppeteer
```

### Ejecutar el Script
```bash
node scrape_indep.js
```

## 📋 Qué Hace el Script

1. **Navega** a la página de subastas: `https://subastasenlinea.indep.gob.mx/Electronica/Pages/ListadoBienes.aspx?Tipo=1`
2. **Selecciona automáticamente** la categoría "Bienes inmuebles"
3. **Aplica el filtro** haciendo clic en el botón de búsqueda
4. **Extrae todos los datos** de cada anuncio:
   - Imagen del bien
   - Número de lote
   - Descripción
   - Monto de salida
   - Oferta actual
   - Ubicación
   - Entidad
   - Tipo de bien
   - Transferente
   - Número de visitas
   - Número de ofertas
5. **Guarda los datos** en un archivo JSON con fecha actual

## 📁 Archivos Generados

- **Ubicación**: `/history/listings_YYYY-MM-DD.json`
- **Formato**: JSON con todos los anuncios extraídos
- **Ejemplo**: `listings_2025-08-05.json`

## ⏱️ Tiempo de Ejecución

- **Duración**: Aproximadamente 2-3 minutos
- **Páginas procesadas**: 22 páginas
- **Anuncios extraídos**: 218 bienes inmuebles

## 📊 Datos Extraídos

Cada anuncio incluye:
- `img`: URL de la imagen del bien
- `lote`: Número de lote
- `descripcion`: Descripción del bien
- `montoSalida`: Monto de salida
- `ofertaActual`: Oferta actual (si existe)
- `ubicacion`: Ubicación del bien
- `entidad`: Entidad federativa
- `tipoBien`: Tipo de bien inmueble
- `transferente`: Entidad transferente
- `visitas`: Número de visitas
- `ofertas`: Número de ofertas

## 🔧 Configuración

El script incluye:
- Timeouts extendidos para navegación lenta
- Argumentos de navegador optimizados
- Manejo de errores robusto
- Esperas automáticas para carga de contenido

## 📝 Notas

- El script procesa solo la categoría "Bienes inmuebles"
- Los datos se guardan con la fecha actual en el nombre del archivo
- Se crea automáticamente la carpeta `/history` si no existe
- El navegador se ejecuta en modo headless (sin interfaz gráfica)