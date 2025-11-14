import { ComponentDefinition } from '../../types/design-system.js';
import { loadDesignSystem } from './design-system.handler.js';

/**
 * Get component definition by name from a design system
 */
export async function getComponent(siteName: string, componentName: string): Promise<ComponentDefinition> {
  const designSystem = await loadDesignSystem(siteName);
  
  if (!designSystem.component || !designSystem.component[componentName]) {
    throw new Error(`Component not found: ${componentName} in design system: ${siteName}`);
  }
  
  return designSystem.component[componentName];
}

/**
 * List all components in a design system
 */
export async function listComponents(siteName: string): Promise<string[]> {
  const designSystem = await loadDesignSystem(siteName);
  
  if (!designSystem.component) {
    return [];
  }
  
  return Object.keys(designSystem.component);
}

