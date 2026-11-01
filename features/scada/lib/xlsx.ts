'use client';

import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const xml = (value: string | number | boolean | null | undefined) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const columnName = (index: number) => {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
};

export function downloadXlsx(
  rows: (string | number | boolean | null | undefined)[][],
  filename: string,
  sheetName = 'Data',
) {
  const sheetRows = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((cell, cellIndex) => {
            const ref = `${columnName(cellIndex)}${rowIndex + 1}`;
            if (typeof cell === 'number' && Number.isFinite(cell))
              return `<c r="${ref}"><v>${cell}</v></c>`;
            if (typeof cell === 'boolean')
              return `<c r="${ref}" t="b"><v>${cell ? 1 : 0}</v></c>`;
            return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(cell)}</t></is></c>`;
          })
          .join('')}</row>`,
    )
    .join('');
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>',
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    ),
    'xl/workbook.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<sheets><sheet name="${xml(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>',
    ),
    'xl/styles.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Aptos"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf xfId="0"/></cellXfs></styleSheet>',
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
        sheetRows +
        '</sheetData></worksheet>',
    ),
  };
  const workbook = Uint8Array.from(zipSync(files)).buffer;
  const url = URL.createObjectURL(
    new Blob([workbook], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sharedStrings(files: Record<string, Uint8Array>) {
  const raw = files['xl/sharedStrings.xml'];
  if (!raw) return [];
  const doc = new DOMParser().parseFromString(strFromU8(raw), 'text/xml');
  return Array.from(doc.querySelectorAll('si')).map((item) =>
    Array.from(item.querySelectorAll('t'))
      .map((node) => node.textContent ?? '')
      .join(''),
  );
}

export async function readXlsx(file: File): Promise<string[][]> {
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const sheet = files['xl/worksheets/sheet1.xml'];
  if (!sheet) throw new Error('Không tìm thấy worksheet đầu tiên trong file.');
  const strings = sharedStrings(files);
  const doc = new DOMParser().parseFromString(strFromU8(sheet), 'text/xml');
  if (doc.querySelector('parsererror'))
    throw new Error('File Excel không hợp lệ.');
  return Array.from(doc.querySelectorAll('sheetData > row')).map((row) => {
    const values: string[] = [];
    for (const cell of Array.from(row.querySelectorAll(':scope > c'))) {
      const ref = cell.getAttribute('r') ?? 'A1';
      const letters = ref.match(/[A-Z]+/)?.[0] ?? 'A';
      let index = 0;
      for (const letter of letters)
        index = index * 26 + letter.charCodeAt(0) - 64;
      const type = cell.getAttribute('t');
      const raw = cell.querySelector('v')?.textContent ?? '';
      const value =
        type === 's'
          ? (strings[Number(raw)] ?? '')
          : type === 'inlineStr'
            ? Array.from(cell.querySelectorAll('t'))
                .map((node) => node.textContent ?? '')
                .join('')
            : raw;
      values[index - 1] = value;
    }
    return values.map((value) => value ?? '');
  });
}
