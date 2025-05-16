#!/usr/bin/env node

/**
 * Deploy static site to Digital Ocean Spaces (S3-compatible)
 * Node.js version - works without s3cmd or AWS CLI
 * 
 * Usage:
 *   node scripts/deploy-static.js
 * 
 * Requires environment variables:
 *   DO_SPACES_BUCKET
 *   DO_SPACES_ACCESS_KEY
 *   DO_SPACES_SECRET_KEY
 *   DO_SPACES_REGION (optional, defaults to nyc3)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Configuration
const SPACES_BUCKET = process.env.DO_SPACES_BUCKET;
const SPACES_ACCESS_KEY = process.env.DO_SPACES_ACCESS_KEY;
const SPACES_SECRET_KEY = process.env.DO_SPACES_SECRET_KEY;
const SPACES_REGION = process.env.DO_SPACES_REGION || 'nyc3';
const SPACES_ENDPOINT = process.env.DO_SPACES_ENDPOINT || `https://${SPACES_REGION}.digitaloceanspaces.com`;
const SOURCE_DIR = process.env.SOURCE_DIR || 'publish';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Validate configuration
if (!SPACES_BUCKET || !SPACES_ACCESS_KEY || !SPACES_SECRET_KEY) {
  log('❌ Error: Missing required environment variables', 'red');
  console.log('\nPlease set the following environment variables:');
  console.log('  DO_SPACES_BUCKET=your-space-name');
  console.log('  DO_SPACES_ACCESS_KEY=your-access-key');
  console.log('  DO_SPACES_SECRET_KEY=your-secret-key');
  console.log('  DO_SPACES_REGION=nyc3  # Optional, defaults to nyc3');
  console.log('\nOr add them to your .env file\n');
  process.exit(1);
}

// Check if source directory exists
if (!fs.existsSync(SOURCE_DIR)) {
  log(`❌ Error: Source directory '${SOURCE_DIR}' does not exist`, 'red');
  process.exit(1);
}

// AWS S3 signature v4 implementation
function signRequest(method, bucket, key, headers = {}) {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const date = dateStamp.slice(0, 8);
  
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(k => `${k.toLowerCase()}:${headers[k]}\n`)
    .join('');
  
  const signedHeaders = Object.keys(headers)
    .sort()
    .map(k => k.toLowerCase())
    .join(';');
  
  const canonicalRequest = [
    method,
    `/${bucket}/${key}`,
    '',
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD'
  ].join('\n');
  
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${date}/${SPACES_REGION}/s3/aws4_request`;
  const stringToSign = [
    algorithm,
    dateStamp,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');
  
  const kDate = crypto.createHmac('sha256', `AWS4${SPACES_SECRET_KEY}`).update(date).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(SPACES_REGION).digest();
  const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  
  const authorization = `${algorithm} Credential=${SPACES_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return {
    'Authorization': authorization,
    'x-amz-date': dateStamp,
    ...headers
  };
}

// Upload file to Spaces
function uploadFile(filePath, key) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);
    
    const headers = {
      'Content-Type': contentType,
      'x-amz-acl': 'public-read',
      'Content-Length': fileContent.length.toString(),
    };
    
    const signedHeaders = signRequest('PUT', SPACES_BUCKET, key, headers);
    
    const url = new URL(`${SPACES_ENDPOINT}/${SPACES_BUCKET}/${key}`);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'PUT',
      headers: signedHeaders,
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          reject(new Error(`Upload failed: ${res.statusCode} - ${data}`));
        });
      }
    });
    
    req.on('error', reject);
    req.write(fileContent);
    req.end();
  });
}

// Get MIME type from file extension
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
  };
  return types[ext] || 'application/octet-stream';
}

// Get all files recursively
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // Skip .git and other hidden/system files
    if (file.startsWith('.') && file !== '.') {
      return;
    }
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Main deployment function
async function deploy() {
  log('\n🚀 Starting deployment...', 'green');
  log(`  Bucket: ${SPACES_BUCKET}`, 'blue');
  log(`  Region: ${SPACES_REGION}`, 'blue');
  log(`  Endpoint: ${SPACES_ENDPOINT}`, 'blue');
  log(`  Source: ${SOURCE_DIR}\n`, 'blue');
  
  const files = getAllFiles(SOURCE_DIR);
  const totalFiles = files.length;
  let uploaded = 0;
  let failed = 0;
  
  log(`📤 Uploading ${totalFiles} files...\n`, 'yellow');
  
  for (const filePath of files) {
    const relativePath = path.relative(SOURCE_DIR, filePath);
    const key = relativePath.replace(/\\/g, '/'); // Normalize path separators
    
    try {
      await uploadFile(filePath, key);
      uploaded++;
      process.stdout.write(`\r✅ ${uploaded}/${totalFiles} - ${key}`);
    } catch (error) {
      failed++;
      log(`\n❌ Failed to upload ${key}: ${error.message}`, 'red');
    }
  }
  
  console.log('\n');
  
  if (failed === 0) {
    log(`✅ Deployment completed successfully!`, 'green');
    log(`   Uploaded: ${uploaded} files`, 'green');
  } else {
    log(`⚠️  Deployment completed with errors`, 'yellow');
    log(`   Uploaded: ${uploaded} files`, 'green');
    log(`   Failed: ${failed} files`, 'red');
  }
  
  log(`\n🌐 Your site should be available at:`, 'green');
  log(`   https://${SPACES_BUCKET}.${SPACES_REGION}.digitaloceanspaces.com\n`, 'blue');
}

// Run deployment
deploy().catch(error => {
  log(`\n❌ Deployment failed: ${error.message}`, 'red');
  process.exit(1);
});

