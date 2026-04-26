import { readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const sourceDir = join('.output', 'chrome-mv3');
const outputPath = join('.output', 'meaningful-chrome-mv3.zip');
const fixedDosTime = 0;
const fixedDosDate = (1 << 5) | 1;

await stat(sourceDir);
await rm(outputPath, { force: true });

const files = await listFiles(sourceDir);
const records = [];
let offset = 0;
const localParts = [];

for (const filePath of files) {
  const data = await readFile(filePath);
  const name = toZipPath(relative(sourceDir, filePath));
  const encodedName = Buffer.from(name);
  const crc = crc32(data);

  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0x0800, 6);
  localHeader.writeUInt16LE(0, 8);
  localHeader.writeUInt16LE(fixedDosTime, 10);
  localHeader.writeUInt16LE(fixedDosDate, 12);
  localHeader.writeUInt32LE(crc, 14);
  localHeader.writeUInt32LE(data.length, 18);
  localHeader.writeUInt32LE(data.length, 22);
  localHeader.writeUInt16LE(encodedName.length, 26);
  localHeader.writeUInt16LE(0, 28);

  localParts.push(localHeader, encodedName, data);
  records.push({ name: encodedName, crc, size: data.length, offset });
  offset += localHeader.length + encodedName.length + data.length;
}

const centralParts = [];
let centralSize = 0;

for (const record of records) {
  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(0x0800, 8);
  centralHeader.writeUInt16LE(0, 10);
  centralHeader.writeUInt16LE(fixedDosTime, 12);
  centralHeader.writeUInt16LE(fixedDosDate, 14);
  centralHeader.writeUInt32LE(record.crc, 16);
  centralHeader.writeUInt32LE(record.size, 20);
  centralHeader.writeUInt32LE(record.size, 24);
  centralHeader.writeUInt16LE(record.name.length, 28);
  centralHeader.writeUInt16LE(0, 30);
  centralHeader.writeUInt16LE(0, 32);
  centralHeader.writeUInt16LE(0, 34);
  centralHeader.writeUInt16LE(0, 36);
  centralHeader.writeUInt32LE(0, 38);
  centralHeader.writeUInt32LE(record.offset, 42);

  centralParts.push(centralHeader, record.name);
  centralSize += centralHeader.length + record.name.length;
}

const endRecord = Buffer.alloc(22);
endRecord.writeUInt32LE(0x06054b50, 0);
endRecord.writeUInt16LE(0, 4);
endRecord.writeUInt16LE(0, 6);
endRecord.writeUInt16LE(records.length, 8);
endRecord.writeUInt16LE(records.length, 10);
endRecord.writeUInt32LE(centralSize, 12);
endRecord.writeUInt32LE(offset, 16);
endRecord.writeUInt16LE(0, 20);

await writeFile(outputPath, Buffer.concat([...localParts, ...centralParts, endRecord]));

console.log(`Packaged ${outputPath}`);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(
    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const entryPath = join(directory, entry.name);

        if (entry.isDirectory()) {
          return listFiles(entryPath);
        }

        return entry.isFile() ? [entryPath] : [];
      }),
  );

  return paths.flat();
}

function toZipPath(path) {
  return path.split(sep).join('/');
}

function crc32(data) {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
