const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Constante que cambia cada 2 semanas - actualizar manualmente
const SUBASTA_ID = "1113";

// Función helper para esperar
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const url = 'https://subastasenlinea.indep.gob.mx/Electronica/Pages/ListadoBienes.aspx?Tipo=1';
  
  // Configurar el navegador con más opciones
  const browser = await puppeteer.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  
  const page = await browser.newPage();
  
  // Configurar el timeout de navegación a 120 segundos
  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(120000);
  
  console.log('Navegando a la página...');
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
  } catch (error) {
    console.log('Error en navegación inicial, intentando con domcontentloaded...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  }
  
  console.log('Esperando a que cargue la página...');
  await wait(5000);
  
  // Seleccionar la categoría "Bienes inmuebles"
  console.log('Seleccionando categoría "Bienes inmuebles"...');
  
  // Obtener todas las opciones disponibles para entender la estructura
  const options = await page.$$eval('option', opts => 
    opts.map(opt => ({
      text: opt.textContent.trim(),
      value: opt.value,
      selected: opt.selected
    }))
  );
  
  console.log('Opciones disponibles:', options);
  
  // Buscar la opción que contenga "inmuebles"
  const inmueblesOption = options.find(opt => 
    opt.text.toLowerCase().includes('inmuebles') || 
    opt.value.toLowerCase().includes('inmuebles')
  );
  
  if (inmueblesOption) {
    console.log(`Encontrada opción: ${inmueblesOption.text}`);
    
    // Intentar diferentes selectores para el select
    const selectSelectors = [
      'select[id*="categoria"]',
      'select[name*="categoria"]',
      'select[class*="categoria"]',
      'select[id*="Categoria"]',
      'select[name*="Categoria"]',
      'select[class*="Categoria"]',
      'select'
    ];
    
    let selectElement = null;
    let foundSelector = null;
    for (const selector of selectSelectors) {
      selectElement = await page.$(selector);
      if (selectElement) {
        console.log(`Encontrado selector: ${selector}`);
        foundSelector = selector;
        break;
      }
    }
    
    if (selectElement && foundSelector) {
      try {
        // Usar el método correcto para seleccionar la opción
        await page.select(foundSelector, inmueblesOption.value);
        console.log(`Categoría seleccionada: ${inmueblesOption.text}`);
        
        // Esperar a que se actualice la página después de la selección
        console.log('Esperando a que se actualice la página...');
        await wait(5000);
        
        // Intentar disparar el evento change manualmente
        console.log('Disparando evento change...');
        await page.evaluate((selector) => {
          const select = document.querySelector(selector);
          if (select) {
            const event = new Event('change', { bubbles: true });
            select.dispatchEvent(event);
          }
        }, foundSelector);
        
        // Esperar más tiempo para que se procese
        await wait(5000);
        
        // Verificar que la página se actualizó correctamente
        console.log('Verificando que la página se actualizó...');
        await page.waitForSelector('#divGrdListadoBienes', { timeout: 30000 });
        
        // Obtener información de la página actualizada
        const pageInfo = await page.$eval('.k-pager-info', el => el.textContent);
        console.log(`Información de página después del filtro: ${pageInfo}`);
        
        // Verificar que realmente se filtraron los datos
        const initialListings = await page.$$eval('#divGrdListadoBienes .k-grid-content tr', rows => rows.length);
        console.log(`Anuncios encontrados después del filtro: ${initialListings}`);
        
        // Verificar si los datos se filtraron correctamente
        if (pageInfo.includes('988')) {
          console.log('ADVERTENCIA: La página aún muestra 988 elementos. El filtro no se aplicó correctamente.');
          console.log('Intentando método alternativo...');
          
          // Intentar hacer clic en el botón de búsqueda si existe
          const searchButton = await page.$('input[type="submit"][value*="Buscar"], button[type="submit"], input[type="button"][value*="Buscar"]');
          if (searchButton) {
            console.log('Haciendo clic en botón de búsqueda...');
            await searchButton.click();
            await wait(5000);
            
            const newPageInfo = await page.$eval('.k-pager-info', el => el.textContent);
            console.log(`Información de página después de búsqueda: ${newPageInfo}`);
          }
        } else {
          console.log('Filtro aplicado correctamente.');
        }
        
      } catch (error) {
        console.log('Error al seleccionar categoría:', error.message);
        console.log('Continuando con todas las categorías...');
      }
    } else {
      console.log('No se encontró el selector de categoría. Continuando con todas las categorías...');
    }
  } else {
    console.log('No se encontró la opción "Bienes inmuebles". Continuando con todas las categorías...');
  }
  
  // Usar el selector correcto que encontré
  const tableSelector = '#divGrdListadoBienes';
  
  console.log(`Usando selector: ${tableSelector}`);
  
  let results = {};
  let pageIndex = 1;
  let itemIndex = 1;

  while (true) {
    console.log(`Procesando página ${pageIndex}...`);
    
    // Esperar a que cargue la tabla
    await page.waitForSelector(tableSelector, { timeout: 30000 });

    // Extraer los datos de los anuncios en la página actual
    const listings = await page.$$eval(`${tableSelector} .k-grid-content tr`, (rows, subastaId) => {
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 0) return null;
        
        // Extraer datos de las celdas según la estructura encontrada
        const data = {};
        
        // Foto (primera columna)
        const img = cells[0]?.querySelector('img')?.src || '';
        if (img) data.img = img;
        
        // Lote (segunda columna)
        const lote = cells[1]?.innerText.trim() || '';
        if (lote) data.lote = lote;
        
        // Descripción (tercera columna)
        const descripcion = cells[2]?.innerText.trim() || '';
        if (descripcion) data.descripcion = descripcion;
        
        // Monto de salida (cuarta columna)
        const montoSalida = cells[3]?.innerText.trim() || '';
        if (montoSalida) data.montoSalida = montoSalida;
        
        // Oferta actual (quinta columna)
        const ofertaActual = cells[4]?.innerText.trim() || '';
        if (ofertaActual) data.ofertaActual = ofertaActual;
        
        // Ubicación (sexta columna)
        const ubicacion = cells[5]?.innerText.trim() || '';
        if (ubicacion) data.ubicacion = ubicacion;
        
        // Entidad (séptima columna)
        const entidad = cells[6]?.innerText.trim() || '';
        if (entidad) data.entidad = entidad;
        
        // Tipo de bien (octava columna)
        const tipoBien = cells[7]?.innerText.trim() || '';
        if (tipoBien) data.tipoBien = tipoBien;
        
        // Transferente (novena columna)
        const transferente = cells[8]?.innerText.trim() || '';
        if (transferente) data.transferente = transferente;
        
        // Visitas (décima columna)
        const visitas = cells[9]?.innerText.trim() || '';
        if (visitas) data.visitas = visitas;
        
        // Ofertas (undécima columna)
        const ofertas = cells[10]?.innerText.trim() || '';
        if (ofertas) data.ofertas = ofertas;
        
        // URL del detalle del lote
        const loteId = cells[1]?.innerText.trim() || '';
        if (loteId) {
          data.url = `https://subastasenlinea.indep.gob.mx/Electronica/Pages/DetalleSubasta.aspx?SubastaID=${subastaId}&LoteID=${loteId}`;
        }
        
        return data;
      }).filter(item => item !== null);
    }, SUBASTA_ID);

    console.log(`Encontrados ${listings.length} anuncios en la página ${pageIndex}`);

    for (const listing of listings) {
      const key = `item_${itemIndex}`;
      results[key] = listing;
      itemIndex++;
    }

    // Buscar el botón de siguiente página usando el selector correcto
    const nextButton = await page.$('a[title="Ir a la página siguiente"]:not(.k-state-disabled)');
    
    if (nextButton) {
      console.log('Navegando a la siguiente página...');
      try {
        // Hacer clic en el botón y esperar a que cambie el contenido
        await nextButton.click();
        
        // Esperar a que cambie el contenido de la tabla
        await wait(3000);
        
        // Verificar si realmente cambió la página
        const currentPageInfo = await page.$eval('.k-pager-info', el => el.textContent);
        console.log(`Información de página actual: ${currentPageInfo}`);
        
        pageIndex++;
      } catch (error) {
        console.log('Error al navegar a la siguiente página:', error.message);
        break;
      }
    } else {
      console.log('No hay más páginas. Finalizando...');
      break;
    }
  }

  // Crear la carpeta /history si no existe
  const historyDir = path.join(process.cwd(), 'history');
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir);
  }

  // Guardar el archivo con solo la fecha actual
  const now = new Date();
  const dateString = now.toISOString().slice(0, 10); // Formato YYYY-MM-DD
  const filename = `listings_${dateString}.json`;
  const filepath = path.join(historyDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(results, null, 2), 'utf-8');

  console.log(`Archivo guardado en: ${filepath}`);
  console.log(`Total de anuncios extraídos: ${Object.keys(results).length}`);
  await browser.close();
})(); 