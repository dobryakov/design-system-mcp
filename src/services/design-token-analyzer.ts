import { ExtractedData } from './design-system-extractor.js';
import { DesignSystem, DesignToken } from '../types/design-system.js';
import logger from '../utils/logger.js';

export class DesignTokenAnalyzer {
  private colorSimilarityThreshold = 0.05; // 5% similarity threshold

  analyze(extractedData: ExtractedData, siteName: string): DesignSystem {
    logger.debug({ siteName }, 'Analyzing design tokens');

    // Consolidate colors
    const colors = this.consolidateColors(Array.from(extractedData.colors));

    // Consolidate spacing
    const spacing = this.consolidateSpacing(Array.from(extractedData.spacing));

    // Process typography
    const fonts = this.processFonts(Array.from(extractedData.fonts));

    // Process border radius
    const radius = this.processRadius(Array.from(extractedData.borderRadius));

    // Process shadows
    const shadows = this.processShadows(Array.from(extractedData.boxShadow));

    // Process transitions
    const transitions = this.processTransitions(Array.from(extractedData.transitions));

    // Build design system
    const designSystem: DesignSystem = {
      $schema: 'https://design-tokens.org/schema/v1.1.json',
      metadata: {
        name: siteName,
        version: '1.0.0',
        lastModified: new Date().toISOString(),
      },
      group: 'tokens',
      global: {
        color: colors,
        font: fonts,
        spacing: spacing,
        radius: radius,
        shadow: shadows,
        transition: transitions,
      },
    };

    // Add component definitions if library patterns detected
    if (extractedData.libraryPatterns.length > 0) {
      designSystem.component = this.extractComponents(extractedData);
    }

    return designSystem;
  }

  private consolidateColors(colors: string[]): Record<string, DesignToken> {
    const consolidated: Record<string, DesignToken> = {};
    const processed = new Set<string>();

    for (const color of colors) {
      if (processed.has(color)) continue;

      // Find similar colors
      const similarColors = [color];
      for (const otherColor of colors) {
        if (otherColor === color || processed.has(otherColor)) continue;
        if (this.areColorsSimilar(color, otherColor)) {
          similarColors.push(otherColor);
          processed.add(otherColor);
        }
      }

      processed.add(color);

      // Use the first color as the canonical value
      const canonicalColor = similarColors[0];
      const tokenName = this.generateColorTokenName(canonicalColor, Object.keys(consolidated).length);

      consolidated[tokenName] = {
        value: canonicalColor,
        type: this.getColorType(canonicalColor),
      };
    }

    return consolidated;
  }

  private areColorsSimilar(color1: string, color2: string): boolean {
    try {
      const rgb1 = this.colorToRgb(color1);
      const rgb2 = this.colorToRgb(color2);

      if (!rgb1 || !rgb2) return false;

      // Calculate Euclidean distance in RGB space
      const distance = Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) + Math.pow(rgb1.g - rgb2.g, 2) + Math.pow(rgb1.b - rgb2.b, 2)
      );

      // Normalize by max possible distance (sqrt(255^2 * 3))
      const maxDistance = Math.sqrt(255 * 255 * 3);
      const similarity = 1 - distance / maxDistance;

      return similarity >= 1 - this.colorSimilarityThreshold;
    } catch {
      return false;
    }
  }

  private colorToRgb(color: string): { r: number; g: number; b: number } | null {
    // Remove whitespace
    color = color.trim();

    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
        };
      } else if (hex.length === 6) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
        };
      }
    }

    // Handle rgb/rgba
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10),
      };
    }

    // Handle named colors (basic set)
    const namedColors: Record<string, { r: number; g: number; b: number }> = {
      black: { r: 0, g: 0, b: 0 },
      white: { r: 255, g: 255, b: 255 },
      red: { r: 255, g: 0, b: 0 },
      green: { r: 0, g: 128, b: 0 },
      blue: { r: 0, g: 0, b: 255 },
      yellow: { r: 255, g: 255, b: 0 },
      cyan: { r: 0, g: 255, b: 255 },
      magenta: { r: 255, g: 0, b: 255 },
    };

    if (namedColors[color.toLowerCase()]) {
      return namedColors[color.toLowerCase()];
    }

    return null;
  }

  private getColorType(color: string): string {
    if (color.startsWith('#')) return 'color';
    if (color.startsWith('rgb')) return 'color';
    return 'color';
  }

  private generateColorTokenName(color: string, index: number): string {
    const rgb = this.colorToRgb(color);
    if (rgb) {
      // Generate name based on color properties
      const brightness = (rgb.r + rgb.g + rgb.b) / 3;
      if (brightness < 85) return `color-dark-${index}`;
      if (brightness > 170) return `color-light-${index}`;
      return `color-${index}`;
    }
    return `color-${index}`;
  }

  private consolidateSpacing(spacingValues: string[]): Record<string, DesignToken> {
    const consolidated: Record<string, DesignToken> = {};
    const uniqueValues = Array.from(new Set(spacingValues));

    for (let i = 0; i < uniqueValues.length; i++) {
      const value = uniqueValues[i];
      const tokenName = `spacing-${i}`;
      consolidated[tokenName] = {
        value: value,
      };
    }

    return consolidated;
  }

  private processFonts(fonts: string[]): Record<string, DesignToken> {
    const consolidated: Record<string, DesignToken> = {};
    const uniqueFonts = Array.from(new Set(fonts));

    for (let i = 0; i < uniqueFonts.length; i++) {
      const font = uniqueFonts[i];
      // Extract first font family (before comma)
      const primaryFont = font.split(',')[0].trim().replace(/['"]/g, '');
      const tokenName = `font-family-${i}`;
      consolidated[tokenName] = {
        value: primaryFont,
      };
    }

    return consolidated;
  }

  private processRadius(radiusValues: string[]): Record<string, DesignToken> {
    const consolidated: Record<string, DesignToken> = {};
    const uniqueValues = Array.from(new Set(radiusValues));

    for (let i = 0; i < uniqueValues.length; i++) {
      const value = uniqueValues[i];
      const tokenName = `radius-${i}`;
      consolidated[tokenName] = {
        value: value,
      };
    }

    return consolidated;
  }

  private processShadows(shadowValues: string[]): Record<string, DesignToken> {
    const consolidated: Record<string, DesignToken> = {};
    const uniqueValues = Array.from(new Set(shadowValues));

    for (let i = 0; i < uniqueValues.length; i++) {
      const value = uniqueValues[i];
      const tokenName = `shadow-${i}`;
      consolidated[tokenName] = {
        value: value,
        type: 'dropShadow',
      };
    }

    return consolidated;
  }

  private processTransitions(transitionValues: string[]): Record<string, DesignToken> {
    const consolidated: Record<string, DesignToken> = {};
    const uniqueValues = Array.from(new Set(transitionValues));

    for (let i = 0; i < uniqueValues.length; i++) {
      const value = uniqueValues[i];
      const tokenName = `transition-${i}`;
      consolidated[tokenName] = {
        value: value,
      };
    }

    return consolidated;
  }

  private extractComponents(extractedData: ExtractedData): Record<string, any> {
    const components: Record<string, any> = {};

    // Extract button components
    const buttons = extractedData.elements.filter(
      (el) => el.tag === 'button' || el.classes.some((cls) => cls.includes('btn') || cls.includes('button'))
    );

    if (buttons.length > 0) {
      components['button'] = this.extractComponentDefinition(buttons[0]);
    }

    // Extract input components
    const inputs = extractedData.elements.filter((el) => el.tag === 'input' || el.tag === 'textarea');

    if (inputs.length > 0) {
      components['input'] = this.extractComponentDefinition(inputs[0]);
    }

    return components;
  }

  private extractComponentDefinition(_element: any): any {
    return {
      base: {
        // Extract base styles from computed styles
        // This is a simplified version - in production, you'd extract more properties
      },
    };
  }
}

