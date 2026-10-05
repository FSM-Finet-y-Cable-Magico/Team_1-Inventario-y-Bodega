/**
 * Ensamblado de un archivo PDF a partir de sus objetos (CU-80, CU-93).
 *
 * El backend no tiene librería de PDF y agregar una dependencia requiere
 * aprobación del jefe de grupo, así que los PDF se arman con las primitivas del
 * formato. Esta función es la parte común: numera los objetos, calcula los
 * offsets de la tabla de referencias cruzadas y cierra el archivo.
 *
 * Los objetos se escriben en latin1 (WinAnsiEncoding), que cubre los acentos
 * del español con las fuentes base-14.
 */
export function ensamblarPdf(
  objetos: string[],
  opciones: { idInfo?: number } = {},
): Buffer {
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objetos.forEach((cuerpo, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${cuerpo}\nendobj\n`;
  });

  const inicioXref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }
  const info = opciones.idInfo ? ` /Info ${opciones.idInfo} 0 R` : '';
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R${info} >>\nstartxref\n${inicioXref}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

// Los paréntesis y la barra invertida delimitan las cadenas del formato PDF.
export function escaparTextoPdf(texto: string): string {
  return texto
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

// D:YYYYMMDDHHmmSS+OO'oo' — formato de fecha del estándar PDF.
export function fechaPdf(fecha: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const desfase = -fecha.getTimezoneOffset();
  const signo = desfase >= 0 ? '+' : '-';
  const horas = p(Math.floor(Math.abs(desfase) / 60));
  const minutos = p(Math.abs(desfase) % 60);
  return (
    `D:${fecha.getFullYear()}${p(fecha.getMonth() + 1)}${p(fecha.getDate())}` +
    `${p(fecha.getHours())}${p(fecha.getMinutes())}${p(fecha.getSeconds())}` +
    `${signo}${horas}'${minutos}'`
  );
}
