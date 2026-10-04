import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'generated_qrs');

async function generateAllQRs(count = 1500) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Generating ${count} QR codes in: ${outputDir}...`);

  for (let i = 1; i <= count; i++) {
    const pad = String(i).padStart(4, '0');
    const ticketId = `NUV-KHL-${pad}`;
    const filename = `Pass_${pad}.png`;
    const filePath = path.join(outputDir, filename);

    await QRCode.toFile(filePath, ticketId, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 512,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    if (i % 250 === 0 || i === count) {
      console.log(`Generated ${i}/${count} QR codes...`);
    }
  }

  console.log(`✅ All ${count} QR codes successfully generated in:`);
  console.log(`📁 ${outputDir}`);
}

const countArg = parseInt(process.argv[2], 10) || 1500;
generateAllQRs(countArg).catch(console.error);
