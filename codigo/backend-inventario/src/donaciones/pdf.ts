/**
 * Generador mínimo de PDF (CU-80).
 *
 * El backend no tiene librería de PDF y agregar una dependencia requiere
 * aprobación del jefe de grupo, así que el resumen de donación se arma con las
 * primitivas del formato: texto en Helvetica (fuente base-14, sin incrustar) y
 * codificación WinAnsi, que cubre los acentos del español.
 *
 * ponytail: cubre texto plano en A4 y nada más (sin imágenes, tablas ni saltos
 * de línea automáticos). Si el jefe aprueba pdfkit, se reemplaza este archivo
 * sin tocar el resto del módulo.
 */

import { ensamblarPdf, escaparTextoPdf } from '../common/pdf-core';

const ANCHO_PAGINA = 595; // A4 en puntos
const ALTO_PAGINA = 842;
const MARGEN = 56;
const INTERLINEADO = 16;
const LINEAS_POR_PAGINA = Math.floor((ALTO_PAGINA - MARGEN * 2) / INTERLINEADO);

// `mono` usa Courier: las columnas de una tabla solo cuadran con ancho fijo
export type LineaPdf = {
  texto: string;
  negrita?: boolean;
  tamano?: number;
  mono?: boolean;
};


function contenidoDePagina(lineas: LineaPdf[]): string {
  const partes: string[] = ['BT'];
  let y = ALTO_PAGINA - MARGEN;
  for (const linea of lineas) {
    const fuente = linea.mono
      ? linea.negrita
        ? '/F4'
        : '/F3'
      : linea.negrita
        ? '/F2'
        : '/F1';
    const tamano = linea.tamano ?? 11;
    partes.push(`${fuente} ${tamano} Tf`);
    partes.push(`1 0 0 1 ${MARGEN} ${y} Tm`);
    partes.push(`(${escaparTextoPdf(linea.texto)}) Tj`);
    y -= INTERLINEADO;
  }
  partes.push('ET');
  return partes.join('\n');
}

export function construirPdf(lineas: LineaPdf[]): Buffer {
  // Una página por cada bloque de líneas que entra en el alto útil
  const paginas: LineaPdf[][] = [];
  for (let i = 0; i < Math.max(lineas.length, 1); i += LINEAS_POR_PAGINA) {
    paginas.push(lineas.slice(i, i + LINEAS_POR_PAGINA));
  }

  // Numeración: 1 catálogo, 2 páginas, 3..(2+n) páginas, luego contenidos y fuentes
  const idPrimeraPagina = 3;
  const idPrimerContenido = idPrimeraPagina + paginas.length;
  const idFuenteNormal = idPrimerContenido + paginas.length;
  const idFuenteNegrita = idFuenteNormal + 1;
  const idFuenteMono = idFuenteNormal + 2;
  const idFuenteMonoNegrita = idFuenteNormal + 3;

  const objetos: string[] = [];
  objetos.push(`<< /Type /Catalog /Pages 2 0 R >>`);
  objetos.push(
    `<< /Type /Pages /Kids [${paginas
      .map((_, i) => `${idPrimeraPagina + i} 0 R`)
      .join(' ')}] /Count ${paginas.length} >>`,
  );
  paginas.forEach((_, i) => {
    objetos.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ANCHO_PAGINA} ${ALTO_PAGINA}] ` +
        `/Resources << /Font << /F1 ${idFuenteNormal} 0 R /F2 ${idFuenteNegrita} 0 R ` +
        `/F3 ${idFuenteMono} 0 R /F4 ${idFuenteMonoNegrita} 0 R >> >> ` +
        `/Contents ${idPrimerContenido + i} 0 R >>`,
    );
  });
  paginas.forEach((lineasPagina) => {
    const contenido = contenidoDePagina(lineasPagina);
    const largo = Buffer.byteLength(contenido, 'latin1');
    objetos.push(`<< /Length ${largo} >>\nstream\n${contenido}\nendstream`);
  });
  objetos.push(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,
  );
  objetos.push(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,
  );
  objetos.push(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>`,
  );
  objetos.push(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>`,
  );

  // Ensamblado con la tabla de referencias cruzadas (común a los PDF del sistema)
  return ensamblarPdf(objetos);
}
