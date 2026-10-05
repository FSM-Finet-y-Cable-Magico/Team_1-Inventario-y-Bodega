import { construirPdfReporte, fechaLegible } from './pdf-reporte';

// CU-93: el PDF se arma a mano, así que se comprueba la estructura que un visor
// necesita y los elementos que exige el CU (encabezado corporativo, filtros,
// fecha/hora, usuario, tabla con bordes y filas alternadas).

const FECHA = new Date(2026, 8, 29, 15, 4, 5); // 29/09/2026 15:04:05

function pdfDePrueba(filas: Record<string, any>[]) {
  return construirPdfReporte({
    empresa: 'Finet',
    titulo: 'Reporte de stock por bodega',
    filtros: [
      { etiqueta: 'Empresa', valor: 'Finet' },
      { etiqueta: 'Bodega', valor: 'Bodega Central' },
    ],
    generadoPor: 'Admin Finet QA',
    fecha: FECHA,
    columnas: [
      { titulo: 'Bodega', campo: 'bodega' },
      { titulo: 'Tipo de equipo', campo: 'tipo_equipo' },
      { titulo: 'En bodega', campo: 'en_bodega' },
    ],
    filas,
  }).toString('latin1');
}

describe('construirPdfReporte (CU-93)', () => {
  const filas = [
    { bodega: 'Bodega Central', tipo_equipo: 'ONT Huawei', en_bodega: 12 },
    { bodega: 'Bodega Central', tipo_equipo: 'Decodificador', en_bodega: 4 },
  ];
  const pdf = pdfDePrueba(filas);

  it('genera un PDF válido: cabecera, catálogo, página y marca de fin', () => {
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('/Type /Catalog');
    expect(pdf).toContain('/Type /Page ');
    expect(pdf).toContain('xref');
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('los offsets del xref apuntan al inicio real de cada objeto', () => {
    const inicio = Number(pdf.slice(pdf.lastIndexOf('startxref') + 9).trim().split('\n')[0]);
    expect(pdf.slice(inicio, inicio + 4)).toBe('xref');

    const tabla = pdf.slice(inicio).split('\n').slice(2);
    tabla
      .filter((linea) => / 00000 n $/.test(linea))
      .forEach((linea, indice) => {
        const offset = Number(linea.slice(0, 10));
        expect(pdf.slice(offset, offset + 20)).toContain(`${indice + 1} 0 obj`);
      });
  });

  it('incluye el encabezado corporativo completo que pide el CU', () => {
    expect(pdf).toContain('(Finet) Tj'); // nombre de la empresa
    expect(pdf).toContain('(F) Tj'); // logo: recuadro con la inicial
    expect(pdf).toContain('(Reporte de stock por bodega) Tj');
    expect(pdf).toContain('Empresa: Finet');
    expect(pdf).toContain('Bodega: Bodega Central');
    expect(pdf).toContain('29/09/2026 15:04:05');
    expect(pdf).toContain('Admin Finet QA');
  });

  it('dibuja la tabla con bordes y filas alternadas', () => {
    // `re S` traza los bordes; `re f` rellena la cabecera y las filas impares.
    expect(pdf).toContain('re S');
    expect(pdf).toContain('0.94 0.94 0.94 rg');
    expect(pdf).toContain('(Tipo de equipo) Tj');
    expect(pdf).toContain('(ONT Huawei) Tj');
    expect(pdf).toContain('(12) Tj');
  });

  it('lleva metadatos del documento y XMP para los lectores', () => {
    expect(pdf).toContain('/Type /Metadata');
    expect(pdf).toContain('<dc:title>');
    expect(pdf).toContain('/Title (Reporte de stock por bodega)');
    expect(pdf).toContain('/CreationDate (D:20260929150405');
    expect(pdf).toContain('/Info ');
  });

  it('un reporte sin filas igual genera el PDF, con el aviso en la tabla', () => {
    const vacio = pdfDePrueba([]);
    expect(vacio).toContain('El reporte no tiene filas para los filtros aplicados.');
    expect(vacio).toContain('0 fila\\(s\\)');
  });

  it('pagina cuando las filas no caben en una página y numera cada una', () => {
    const muchas = Array.from({ length: 60 }, (_, i) => ({
      bodega: 'Bodega Central',
      tipo_equipo: `Tipo ${i}`,
      en_bodega: i,
    }));
    const largo = pdfDePrueba(muchas);
    expect(largo).toContain('/Count 3');
    expect(largo).toContain('Página 1 de 3');
    expect(largo).toContain('Página 3 de 3');
  });

  it('recorta el texto que no cabe en su columna y escapa los paréntesis', () => {
    const conTextoLargo = pdfDePrueba([
      {
        bodega: 'Bodega (principal) con un nombre larguísimo que no cabe en la columna asignada',
        tipo_equipo: 'ONT',
        en_bodega: 1,
      },
    ]);
    expect(conTextoLargo).toContain('\\(principal\\)');
    expect(conTextoLargo).toContain('...');
  });
});

describe('fechaLegible (CU-93)', () => {
  it('usa el formato DD/MM/YYYY HH:MM:SS', () => {
    expect(fechaLegible(new Date(2026, 0, 5, 9, 7, 3))).toBe(
      '05/01/2026 09:07:03',
    );
  });
});
