/**
 * Doomsday Snapshot Generator
 * 
 * Phase 3 Master Plan requirement:
 * Generate static HTML snapshot for R2 fallback when primary services fail.
 * 
 * Run this script after deployment to ensure R2 has a fresh snapshot.
 * 
 * Usage:
 *   node scripts/generate-doomsday-snapshot.js <tenant-slug>
 */

import { writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';

const TENANT_SLUG = process.argv[2] || 'demo';
const OUTPUT_DIR = './build/doomsday';
const OUTPUT_FILE = `${OUTPUT_DIR}/${TENANT_SLUG}.html`;

async function generateSnapshot() {
  console.log(`[Doomsday] Generating snapshot for ${TENANT_SLUG}...`);
  
  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });
  
  // Fetch the live site and save as HTML
  try {
    const response = await fetch(`https://${TENANT_SLUG}.diner-saas.com`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Write to file
    writeFileSync(OUTPUT_FILE, html, 'utf-8');
    
    console.log(`[Doomsday] Snapshot saved to ${OUTPUT_FILE}`);
    console.log(`[Doomsday] Upload to R2: wrangler r2 object put diner-assets/fallback/${TENANT_SLUG}.html --file=${OUTPUT_FILE}`);
    
    return html;
  } catch (error) {
    console.error(`[Doomsday] Snapshot generation failed:`, error);
    process.exit(1);
  }
}

generateSnapshot();
