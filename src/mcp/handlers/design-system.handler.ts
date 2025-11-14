import { promises as fs } from 'fs';
import path from 'path';
import { DesignSystem } from '../../types/design-system.js';
import logger from '../../utils/logger.js';

const DESIGNS_DIR = process.env.DESIGNS_DIR || './designs';

/**
 * Load design system by site name
 */
export async function loadDesignSystem(siteName: string): Promise<DesignSystem> {
  const designSystemPath = path.join(DESIGNS_DIR, siteName, 'design-system.json');
  
  try {
    const content = await fs.readFile(designSystemPath, 'utf-8');
    const designSystem: DesignSystem = JSON.parse(content);
    return designSystem;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Design system not found: ${siteName}`);
    }
    throw error;
  }
}

/**
 * Get design system metadata
 */
export async function getDesignSystemMetadata(siteName: string): Promise<DesignSystem['metadata']> {
  const designSystem = await loadDesignSystem(siteName);
  return designSystem.metadata;
}

/**
 * Get design tokens from design system
 */
export async function getDesignTokens(siteName: string): Promise<DesignSystem['global']> {
  const designSystem = await loadDesignSystem(siteName);
  return designSystem.global;
}

/**
 * Get patterns from design system (components)
 */
export async function getPatterns(siteName: string): Promise<DesignSystem['component'] | undefined> {
  const designSystem = await loadDesignSystem(siteName);
  return designSystem.component;
}

/**
 * List all available design systems
 */
export async function listDesignSystems(): Promise<string[]> {
  try {
    const entries = await fs.readdir(DESIGNS_DIR, { withFileTypes: true });
    const designSystems: string[] = [];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const designSystemPath = path.join(DESIGNS_DIR, entry.name, 'design-system.json');
        try {
          await fs.access(designSystemPath);
          designSystems.push(entry.name);
        } catch {
          // Directory exists but no design-system.json, skip
          logger.debug({ siteName: entry.name }, 'Directory found but no design-system.json');
        }
      }
    }
    
    return designSystems;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Designs directory doesn't exist yet, return empty array
      return [];
    }
    throw error;
  }
}

