import { Injectable } from '@nestjs/common';
import * as zlib from 'zlib';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export type ExcelCellValue = string | number | boolean | null | undefined;

export interface ExcelReportOptions {
  sheetName: string;
  columns: ExcelColumn[];
  rows: Record<string, ExcelCellValue>[];
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

@Injectable()
export class ExcelExportService {
  /**
   * Genera un buffer de archivo .xlsx válido compatible con Excel 2016+ y LibreOffice Calc 7.0+.
   * La primera fila lleva los encabezados en negrita (style 1).
   * La hoja se nombra con el nombre especificado (máx 31 caracteres).
   */
  generateXlsx(options: ExcelReportOptions): Buffer {
    const { sheetName, columns, rows } = options;
    const sanitizedSheetName = this.sanitizeSheetName(sheetName);

    const sheetXml = this.buildSheetXml(columns, rows);
    const workbookXml = this.buildWorkbookXml(sanitizedSheetName);
    const workbookRelsXml = this.buildWorkbookRelsXml();
    const stylesXml = this.buildStylesXml();
    const contentTypesXml = this.buildContentTypesXml();
    const relsXml = this.buildRelsXml();

    const files = [
      { name: '[Content_Types].xml', content: contentTypesXml },
      { name: '_rels/.rels', content: relsXml },
      { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
      { name: 'xl/workbook.xml', content: workbookXml },
      { name: 'xl/styles.xml', content: stylesXml },
      { name: 'xl/worksheets/sheet1.xml', content: sheetXml },
    ];

    return this.buildZip(files);
  }

  private sanitizeSheetName(name: string): string {
    const cleaned = name.replace(/[:\\/?*[\]]/g, '').trim();
    return cleaned.slice(0, 31) || 'Reporte';
  }

  private escapeXml(unsafe: ExcelCellValue): string {
    if (unsafe === null || unsafe === undefined) return '';
    const str = String(unsafe);
    return str.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '&':
          return '&amp;';
        case "'":
          return '&apos;';
        case '"':
          return '&quot;';
        default:
          return c;
      }
    });
  }

  private getColumnLetter(colIndex: number): string {
    let name = '';
    let num = colIndex;
    while (num >= 0) {
      name = String.fromCharCode((num % 26) + 65) + name;
      num = Math.floor(num / 26) - 1;
    }
    return name;
  }

  private buildContentTypesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
  }

  private buildRelsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  }

  private buildWorkbookRelsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  }

  private buildWorkbookXml(sheetName: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews>
    <workbookView xWindow="0" yWindow="0" windowWidth="20480" windowHeight="10240"/>
  </bookViews>
  <sheets>
    <sheet name="${this.escapeXml(sheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
  }

  private buildStylesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font>
      <sz val="11"/>
      <name val="Calibri"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <name val="Calibri"/>
    </font>
  </fonts>
  <fills count="2">
    <fill>
      <patternFill patternType="none"/>
    </fill>
    <fill>
      <patternFill patternType="gray125"/>
    </fill>
  </fills>
  <borders count="1">
    <border>
      <left/>
      <right/>
      <top/>
      <bottom/>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  </cellXfs>
</styleSheet>`;
  }

  private buildSheetXml(
    columns: ExcelColumn[],
    rows: Record<string, ExcelCellValue>[],
  ): string {
    let colsXml = '';
    if (columns.length > 0) {
      colsXml = '<cols>';
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        let width = col.width ?? Math.max(col.header.length + 4, 12);
        for (const row of rows.slice(0, 50)) {
          const val = row[col.key];
          if (val !== undefined && val !== null) {
            const len = String(val).length;
            if (len + 3 > width) width = Math.min(len + 3, 50);
          }
        }
        colsXml += `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`;
      }
      colsXml += '</cols>';
    }

    let sheetDataXml = '<sheetData>';

    // Fila 1: Encabezados en negrita (s="1")
    sheetDataXml += '<row r="1">';
    for (let c = 0; c < columns.length; c++) {
      const cellRef = `${this.getColumnLetter(c)}1`;
      const headerText = this.escapeXml(columns[c].header);
      sheetDataXml += `<c r="${cellRef}" t="inlineStr" s="1"><is><t>${headerText}</t></is></c>`;
    }
    sheetDataXml += '</row>';

    // Filas 2+: Datos
    for (let r = 0; r < rows.length; r++) {
      const rowNum = r + 2;
      const rowData = rows[r];
      sheetDataXml += `<row r="${rowNum}">`;

      for (let c = 0; c < columns.length; c++) {
        const col = columns[c];
        const cellRef = `${this.getColumnLetter(c)}${rowNum}`;
        const val = rowData[col.key];

        if (val === undefined || val === null) {
          sheetDataXml += `<c r="${cellRef}" t="inlineStr" s="0"><is><t>-</t></is></c>`;
        } else if (
          typeof val === 'number' &&
          !Number.isNaN(val) &&
          Number.isFinite(val)
        ) {
          sheetDataXml += `<c r="${cellRef}" s="0"><v>${val}</v></c>`;
        } else {
          const text = this.escapeXml(String(val));
          sheetDataXml += `<c r="${cellRef}" t="inlineStr" s="0"><is><t>${text}</t></is></c>`;
        }
      }

      sheetDataXml += '</row>';
    }

    sheetDataXml += '</sheetData>';

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${colsXml}
  ${sheetDataXml}
</worksheet>`;
  }

  private crc32(buf: Buffer): number {
    let c = 0 ^ -1;
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
    }
    return (c ^ -1) >>> 0;
  }

  private buildZip(
    files: { name: string; content: string | Buffer }[],
  ): Buffer {
    const localHeaders: Buffer[] = [];
    const centralHeaders: Buffer[] = [];
    let offset = 0;

    for (const file of files) {
      const nameBuf = Buffer.from(file.name, 'utf8');
      const uncompressedData = Buffer.isBuffer(file.content)
        ? file.content
        : Buffer.from(file.content, 'utf8');
      const compressedData = zlib.deflateRawSync(uncompressedData);
      const uncompressedSize = uncompressedData.length;
      const compressedSize = compressedData.length;
      const crc = this.crc32(uncompressedData);

      // Local file header (30 bytes + name length)
      const lh = Buffer.alloc(30 + nameBuf.length);
      lh.writeUInt32LE(0x04034b50, 0); // signature
      lh.writeUInt16LE(20, 4); // version needed: 2.0
      lh.writeUInt16LE(0, 6); // general purpose bit flags
      lh.writeUInt16LE(8, 8); // compression method: 8 (deflate)
      lh.writeUInt16LE(0, 10); // last mod file time
      lh.writeUInt16LE(0, 12); // last mod file date
      lh.writeUInt32LE(crc, 14); // crc-32
      lh.writeUInt32LE(compressedSize, 18);
      lh.writeUInt32LE(uncompressedSize, 22);
      lh.writeUInt16LE(nameBuf.length, 26);
      lh.writeUInt16LE(0, 28); // extra field length
      nameBuf.copy(lh, 30);

      localHeaders.push(lh, compressedData);

      // Central directory header (46 bytes + name length)
      const ch = Buffer.alloc(46 + nameBuf.length);
      ch.writeUInt32LE(0x02014b50, 0); // signature
      ch.writeUInt16LE(20, 4); // version made by
      ch.writeUInt16LE(20, 6); // version needed
      ch.writeUInt16LE(0, 8); // bit flags
      ch.writeUInt16LE(8, 10); // compression method (deflate)
      ch.writeUInt16LE(0, 12); // time
      ch.writeUInt16LE(0, 14); // date
      ch.writeUInt32LE(crc, 16); // crc-32
      ch.writeUInt32LE(compressedSize, 20);
      ch.writeUInt32LE(uncompressedSize, 24);
      ch.writeUInt16LE(nameBuf.length, 28);
      ch.writeUInt16LE(0, 30); // extra length
      ch.writeUInt16LE(0, 32); // comment length
      ch.writeUInt16LE(0, 34); // disk number start
      ch.writeUInt16LE(0, 36); // internal file attributes
      ch.writeUInt32LE(0, 38); // external file attributes
      ch.writeUInt32LE(offset, 42); // relative offset of local header
      nameBuf.copy(ch, 46);

      centralHeaders.push(ch);

      offset += lh.length + compressedData.length;
    }

    const cdOffset = offset;
    let cdSize = 0;
    for (const ch of centralHeaders) {
      cdSize += ch.length;
    }

    // End of central directory record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // signature
    eocd.writeUInt16LE(0, 4); // disk number
    eocd.writeUInt16LE(0, 6); // disk with central directory
    eocd.writeUInt16LE(files.length, 8); // total entries on this disk
    eocd.writeUInt16LE(files.length, 10); // total entries in central directory
    eocd.writeUInt32LE(cdSize, 12); // size of central directory
    eocd.writeUInt32LE(cdOffset, 16); // offset of central directory
    eocd.writeUInt16LE(0, 20); // comment length

    return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
  }
}
