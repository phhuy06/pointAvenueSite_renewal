const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { globSync } = require('glob');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

// Cấu hình
const CONFIG = {
  DO: {
    BUCKET: process.env.DO_SPACES_BUCKET,
    REGION: process.env.DO_SPACES_REGION,
    ENDPOINT: process.env.DO_SPACES_ENDPOINT,
    ACCESS_KEY: process.env.DO_SPACES_ACCESS_KEY,
    SECRET_KEY: process.env.DO_SPACES_SECRET_KEY
  },
  // Chuyển thành mảng các Prefix
  OLD_PREFIXES: [
    'https://paathena-public-prod.s3-ap-southeast-1.amazonaws.com',
    'https://paathena-public-prod.s3.ap-southeast-1.amazonaws.com'
  ]
};

const s3Client = new S3Client({
  endpoint: CONFIG.DO.ENDPOINT,
  region: CONFIG.DO.REGION,
  credentials: {
    accessKeyId: CONFIG.DO.ACCESS_KEY,
    secretAccessKey: CONFIG.DO.SECRET_KEY,
  },
});

async function migrate() {
  console.log('🔍 Đang tìm kiếm URL hình ảnh trong codebase...');
  
  const files = globSync('**/*.{js,jsx,ts,tsx,html,css,json}', {
    ignore: 'node_modules/**',
    nodir: true,
  });

  const urlSet = new Set();
  
  // Tạo Regex từ mảng các prefix (Escape các dấu chấm để regex hiểu đúng)
  const escapedPrefixes = CONFIG.OLD_PREFIXES.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escapedPrefixes})/[^"']+\\.(png|jpg|jpeg|gif|svg|webp)`, 'g');

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(regex);
    if (matches) matches.forEach(url => urlSet.add(url));
  });

  const urls = Array.from(urlSet);
  console.log(`✅ Tìm thấy ${urls.length} ảnh cần chuyển hệ.`);

  for (let i = 0; i < urls.length; i++) {
    const fullUrl = urls[i];
    
    // Tìm và xóa prefix phù hợp để lấy key
    let key = '';
    for (const prefix of CONFIG.OLD_PREFIXES) {
      if (fullUrl.startsWith(prefix)) {
        key = fullUrl.replace(`${prefix}/`, '');
        break;
      }
    }
    
    console.log(`[${i + 1}/${urls.length}] ⏳ Đang xử lý: ${fullUrl}`);

    try {
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || getContentType(key);

      const uploadParams = {
        Bucket: CONFIG.DO.BUCKET,
        Key: key,
        Body: buffer,
        ACL: 'public-read',
        ContentType: contentType,
      };

      await s3Client.send(new PutObjectCommand(uploadParams));
      console.log(`   ✨ Upload thành công!`);

    } catch (err) {
      console.error(`   ❌ Thất bại [${key}]:`, err.message);
    }
  }
  
  console.log('\n🏁 Hoàn thành quá trình migration.');
}

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const map = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp'
  };
  return map[ext] || 'application/octet-stream';
}

migrate();