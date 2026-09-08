import { construirPdf } from './pdf';

// CU-80: el PDF se arma a mano, así que la comprobación mira la estructura
// mínima que un visor necesita (cabecera, objetos, xref con offsets reales).
describe('construirPdf (CU-80)', () => {
  const pdf = construirPdf([
    { texto: 'Resumen de donación', negrita: true, tamano: 16 },
    { texto: 'Institución: Fundación Educación Técnica (acentos áéíóúñ)' },
    { texto: 'Paréntesis (prueba) y barra \\ invertida' },
  ]);
  const texto = pdf.toString('latin1');

  it('genera un PDF con cabecera, catálogo y marca de fin', () => {
    expect(texto.startsWith('%PDF-1.4')).toBe(true);
    expect(texto).toContain('/Type /Catalog');
    expect(texto).toContain('/Type /Page ');
    expect(texto.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('escapa los caracteres que delimitan cadenas en el formato', () => {
    expect(texto).toContain(
      'Par\xe9ntesis \\(prueba\\) y barra \\\\ invertida',
    );
  });

  it('la tabla xref apunta al inicio real de cada objeto', () => {
    const inicioXref = Number(/startxref\n(\d+)/.exec(texto)![1]);
    expect(texto.slice(inicioXref, inicioXref + 4)).toBe('xref');

    const entradas = [...texto.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) =>
      Number(m[1]),
    );
    expect(entradas.length).toBeGreaterThan(0);
    entradas.forEach((offset, i) => {
      expect(texto.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(
        `${i + 1} 0 obj`,
      );
    });
  });

  it('reparte las líneas en varias páginas cuando no caben en una', () => {
    const muchas = Array.from({ length: 100 }, (_, i) => ({
      texto: `línea ${i}`,
    }));
    const largo = construirPdf(muchas).toString('latin1');
    expect(/\/Count (\d+)/.exec(largo)![1]).not.toBe('1');
  });
});
