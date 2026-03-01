import fs from 'fs';
import path from 'path';

export const createZipArchive = async (files) => {
  const { createWriteStream } = await import('stream');
  const { pipeline } = await import('stream/promises');
  const { Archive } = await import('archiver');

  const chunks = [];

  return new Promise((resolve, reject) => {
    const archive = new Archive({ zlib: { level: 9 } });

    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', (err) => reject(err));

    for (const file of files) {
      const fileName = path.basename(file.outputPath);
      archive.file(file.outputPath, { name: fileName });
    }

    archive.finalize();
  });
};

export const createZipFromPaths = async (filePaths, outputName = 'archive.zip') => {
  const { Archive } = await import('archiver');
  
  const chunks = [];

  return new Promise((resolve, reject) => {
    const archive = new Archive({ zlib: { level: 9 } });

    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', (err) => reject(err));

    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        const fileName = path.basename(filePath);
        archive.file(filePath, { name: fileName });
      }
    }

    archive.finalize();
  });
};
