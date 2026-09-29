/**
 * PDF de reportes (CU-93).
 *
 * Mismo criterio que CU-80: sin librerías externas (agregar una dependencia
 * requiere aprobación del jefe de grupo), así que el documento se arma con las
 * primitivas del formato. Aquí se suman las que CU-80 no necesitaba: relleno de
 * rectángulos (bandas del encabezado y filas alternadas) y trazado de líneas
 * (bordes de la tabla).
 *
 * ponytail: el "logo" es tipográfico — un recuadro con la inicial de la empresa
 * y su nombre. Incrustar un PNG exige un stream de imagen con su filtro; si el
 * jefe de grupo aprueba una librería (o entrega el logo en JPEG), se reemplaza
 * `dibujarLogo` sin tocar el resto.
 *
 * Sobre PDF/A-1b: el archivo declara su metadato XMP e identificación, pero NO
 * es un PDF/A conforme, porque esa norma exige incrustar las fuentes y un perfil
 * de color ICC, y las base-14 (Helvetica) no se incrustan. Abre sin problemas en
 * Acrobat Reader DC 2020+ y en cualquier lector estándar.
 */
import { ensamblarPdf, escaparTextoPdf, fechaPdf } from '../common/pdf-core';

const ANCHO_PAGINA = 842; // A4 horizontal: los reportes son anchos
const ALTO_PAGINA = 595;
const MARGEN = 32;
const ALTO_FILA = 18;
const ALTO_ENCABEZADO = 92;

// Anchos de carácter aproximados de Helvetica a 1 pt (suficiente para recortar).
const FACTOR_ANCHO = 0.52;

export interface ColumnaPdf {
  titulo: string;
  campo: string;
  // Peso relativo del ancho de la columna (por defecto 1).
  peso?: number;
}

export interface ReportePdf {
  empresa: string;
  titulo: string;
  filtros: { etiqueta: string; valor: string }[];
  generadoPor: string;
  fecha: Date;
  columnas: ColumnaPdf[];
  filas: Record<string, any>[];
}

// DD/MM/YYYY HH:MM:SS, como pide el CU.
export function fechaLegible(fecha: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${p(fecha.getDate())}/${p(fecha.getMonth() + 1)}/${fecha.getFullYear()} ` +
    `${p(fecha.getHours())}:${p(fecha.getMinutes())}:${p(fecha.getSeconds())}`
  );
}

function texto(valor: any): string {
  if (valor === null || valor === undefined || valor === '') return '-';
  if (valor instanceof Date) return fechaLegible(valor);
  return String(valor);
}

// Recorta el texto que no cabe en el ancho de su columna (con puntos suspensivos).
function recortar(valor: string, ancho: number, tamano: number): string {
  const maximo = Math.max(1, Math.floor(ancho / (tamano * FACTOR_ANCHO)));
  if (valor.length <= maximo) return valor;
  // Tres puntos y no '…': el archivo se escribe en WinAnsi y ese carácter no existe ahí.
  return valor.slice(0, Math.max(1, maximo - 3)) + '...';
}

class Lienzo {
  private partes: string[] = [];

  rectangulo(x: number, y: number, ancho: number, alto: number, gris: number) {
    this.partes.push(
      `${gris} ${gris} ${gris} rg`,
      `${x} ${y} ${ancho} ${alto} re f`,
    );
  }

  borde(x: number, y: number, ancho: number, alto: number) {
    this.partes.push('0.6 0.6 0.6 RG', '0.5 w', `${x} ${y} ${ancho} ${alto} re S`);
  }

  linea(x1: number, y1: number, x2: number, y2: number) {
    this.partes.push(
      '0.6 0.6 0.6 RG',
      '0.5 w',
      `${x1} ${y1} m ${x2} ${y2} l S`,
    );
  }

  texto(
    valor: string,
    x: number,
    y: number,
    opciones: { tamano?: number; negrita?: boolean; gris?: number } = {},
  ) {
    const tamano = opciones.tamano ?? 9;
    const gris = opciones.gris ?? 0;
    this.partes.push(
      'BT',
      `${gris} ${gris} ${gris} rg`,
      `${opciones.negrita ? '/F2' : '/F1'} ${tamano} Tf`,
      `1 0 0 1 ${x} ${y} Tm`,
      `(${escaparTextoPdf(valor)}) Tj`,
      'ET',
    );
  }

  contenido(): string {
    return this.partes.join('\n');
  }
}

// Recuadro con la inicial de la empresa: el "logo corporativo" del encabezado.
function dibujarLogo(lienzo: Lienzo, x: number, y: number, empresa: string) {
  lienzo.rectangulo(x, y, 30, 30, 0.25);
  lienzo.texto(empresa.charAt(0).toUpperCase(), x + 9, y + 9, {
    tamano: 16,
    negrita: true,
    gris: 1,
  });
}

function dibujarEncabezado(lienzo: Lienzo, reporte: ReportePdf) {
  const anchoUtil = ANCHO_PAGINA - MARGEN * 2;
  const base = ALTO_PAGINA - MARGEN - ALTO_ENCABEZADO;

  lienzo.rectangulo(MARGEN, base, anchoUtil, ALTO_ENCABEZADO, 0.95);
  lienzo.borde(MARGEN, base, anchoUtil, ALTO_ENCABEZADO);
  dibujarLogo(lienzo, MARGEN + 10, base + ALTO_ENCABEZADO - 40, reporte.empresa);

  const x = MARGEN + 50;
  let y = base + ALTO_ENCABEZADO - 20;
  lienzo.texto(reporte.empresa, x, y, { tamano: 14, negrita: true });
  y -= 18;
  lienzo.texto(reporte.titulo, x, y, { tamano: 11, negrita: true });

  y -= 16;
  const filtros =
    reporte.filtros.length > 0
      ? reporte.filtros.map((f) => `${f.etiqueta}: ${f.valor}`).join(' · ')
      : 'Sin filtros aplicados';
  lienzo.texto(recortar(`Filtros — ${filtros}`, anchoUtil - 60, 8), x, y, {
    tamano: 8,
    gris: 0.3,
  });

  y -= 13;
  lienzo.texto(
    `Generado: ${fechaLegible(reporte.fecha)} · Usuario: ${reporte.generadoPor}`,
    x,
    y,
    { tamano: 8, gris: 0.3 },
  );
}

function anchosDeColumna(columnas: ColumnaPdf[]): number[] {
  const anchoUtil = ANCHO_PAGINA - MARGEN * 2;
  const total = columnas.reduce((suma, c) => suma + (c.peso ?? 1), 0);
  return columnas.map((c) => ((c.peso ?? 1) / total) * anchoUtil);
}

// Cabecera de la tabla; se repite en cada página. Devuelve la Y de la primera fila.
function dibujarCabeceraTabla(
  lienzo: Lienzo,
  columnas: ColumnaPdf[],
  anchos: number[],
  y: number,
): number {
  const anchoUtil = ANCHO_PAGINA - MARGEN * 2;
  lienzo.rectangulo(MARGEN, y, anchoUtil, ALTO_FILA, 0.85);
  lienzo.borde(MARGEN, y, anchoUtil, ALTO_FILA);
  let x = MARGEN;
  columnas.forEach((columna, i) => {
    lienzo.texto(recortar(columna.titulo, anchos[i] - 8, 8), x + 4, y + 5, {
      tamano: 8,
      negrita: true,
    });
    if (i > 0) lienzo.linea(x, y, x, y + ALTO_FILA);
    x += anchos[i];
  });
  return y - ALTO_FILA;
}

export function construirPdfReporte(reporte: ReportePdf): Buffer {
  const anchos = anchosDeColumna(reporte.columnas);
  const anchoUtil = ANCHO_PAGINA - MARGEN * 2;
  const yPrimeraFila = ALTO_PAGINA - MARGEN - ALTO_ENCABEZADO - 24 - ALTO_FILA;
  const filasPorPagina = Math.max(
    1,
    Math.floor((yPrimeraFila - MARGEN - 14) / ALTO_FILA),
  );

  // Una fila de aviso cuando el reporte no devolvió datos (el PDF igual se emite).
  const filas =
    reporte.filas.length > 0
      ? reporte.filas
      : [{ __vacio: 'El reporte no tiene filas para los filtros aplicados.' }];

  const paginas: Record<string, any>[][] = [];
  for (let i = 0; i < filas.length; i += filasPorPagina) {
    paginas.push(filas.slice(i, i + filasPorPagina));
  }

  const contenidos = paginas.map((filasPagina, indicePagina) => {
    const lienzo = new Lienzo();
    dibujarEncabezado(lienzo, reporte);

    let y = dibujarCabeceraTabla(
      lienzo,
      reporte.columnas,
      anchos,
      ALTO_PAGINA - MARGEN - ALTO_ENCABEZADO - 24,
    );

    filasPagina.forEach((fila, indice) => {
      const absoluto = indicePagina * filasPorPagina + indice;
      // Filas alternadas: la fila par va en blanco y la impar en gris claro.
      if (absoluto % 2 === 1) {
        lienzo.rectangulo(MARGEN, y, anchoUtil, ALTO_FILA, 0.94);
      }
      lienzo.borde(MARGEN, y, anchoUtil, ALTO_FILA);

      if (fila.__vacio) {
        lienzo.texto(String(fila.__vacio), MARGEN + 6, y + 5, { gris: 0.35 });
      } else {
        let x = MARGEN;
        reporte.columnas.forEach((columna, i) => {
          lienzo.texto(
            recortar(texto(fila[columna.campo]), anchos[i] - 8, 8),
            x + 4,
            y + 5,
            { tamano: 8 },
          );
          if (i > 0) lienzo.linea(x, y, x, y + ALTO_FILA);
          x += anchos[i];
        });
      }
      y -= ALTO_FILA;
    });

    lienzo.texto(
      `Página ${indicePagina + 1} de ${paginas.length} · ${reporte.filas.length} fila(s)`,
      MARGEN,
      MARGEN - 12,
      { tamano: 7, gris: 0.4 },
    );

    return lienzo.contenido();
  });

  // Numeración: 1 catálogo, 2 páginas, 3..(2+n) páginas, contenidos, fuentes,
  // metadatos XMP e /Info.
  const idPrimeraPagina = 3;
  const idPrimerContenido = idPrimeraPagina + paginas.length;
  const idFuenteNormal = idPrimerContenido + paginas.length;
  const idFuenteNegrita = idFuenteNormal + 1;
  const idMetadata = idFuenteNormal + 2;
  const idInfo = idFuenteNormal + 3;

  const objetos: string[] = [];
  objetos.push(`<< /Type /Catalog /Pages 2 0 R /Metadata ${idMetadata} 0 R >>`);
  objetos.push(
    `<< /Type /Pages /Kids [${paginas
      .map((_, i) => `${idPrimeraPagina + i} 0 R`)
      .join(' ')}] /Count ${paginas.length} >>`,
  );
  paginas.forEach((_, i) => {
    objetos.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ANCHO_PAGINA} ${ALTO_PAGINA}] ` +
        `/Resources << /Font << /F1 ${idFuenteNormal} 0 R /F2 ${idFuenteNegrita} 0 R >> >> ` +
        `/Contents ${idPrimerContenido + i} 0 R >>`,
    );
  });
  contenidos.forEach((contenido) => {
    const largo = Buffer.byteLength(contenido, 'latin1');
    objetos.push(`<< /Length ${largo} >>\nstream\n${contenido}\nendstream`);
  });
  objetos.push(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,
  );
  objetos.push(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,
  );

  const xmp =
    `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>\n` +
    `<x:xmpmeta xmlns:x="adobe:ns:meta/">\n` +
    ` <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n` +
    `  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">\n` +
    `   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${reporte.titulo}</rdf:li></rdf:Alt></dc:title>\n` +
    `   <dc:creator><rdf:Seq><rdf:li>${reporte.empresa}</rdf:li></rdf:Seq></dc:creator>\n` +
    `  </rdf:Description>\n` +
    ` </rdf:RDF>\n` +
    `</x:xmpmeta>\n<?xpacket end="w"?>`;
  objetos.push(
    `<< /Type /Metadata /Subtype /XML /Length ${Buffer.byteLength(xmp, 'latin1')} >>\n` +
      `stream\n${xmp}\nendstream`,
  );
  objetos.push(
    `<< /Title (${escaparTextoPdf(reporte.titulo)}) ` +
      `/Author (${escaparTextoPdf(reporte.generadoPor)}) ` +
      `/Subject (${escaparTextoPdf(`Reporte de ${reporte.empresa}`)}) ` +
      `/Producer (Inventario y Bodega) ` +
      `/CreationDate (${fechaPdf(reporte.fecha)}) >>`,
  );

  return ensamblarPdf(objetos, { idInfo });
}
