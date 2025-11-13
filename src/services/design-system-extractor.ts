import { Page } from 'playwright';

export interface ExtractedElement {
  tag: string;
  classes: string[];
  id?: string;
  styles: Record<string, string>;
  computedStyles: Record<string, string>;
  text?: string;
  attributes: Record<string, string>;
}

export interface ExtractedData {
  elements: ExtractedElement[];
  colors: Set<string>;
  fonts: Set<string>;
  spacing: Set<string>;
  borderRadius: Set<string>;
  boxShadow: Set<string>;
  transitions: Set<string>;
  libraryPatterns: string[];
}

export class DesignSystemExtractor {
  private page: Page;
  private maxElements: number;
  private extractedData: ExtractedData;

  constructor(page: Page, maxElements: number = 10000) {
    this.page = page;
    this.maxElements = maxElements;
    this.extractedData = {
      elements: [],
      colors: new Set(),
      fonts: new Set(),
      spacing: new Set(),
      borderRadius: new Set(),
      boxShadow: new Set(),
      transitions: new Set(),
      libraryPatterns: [],
    };
  }

  async extract(): Promise<ExtractedData> {
    // Extract all elements
    await this.extractElements();

    // Extract library patterns
    await this.extractLibraryPatterns();

    return this.extractedData;
  }

  private async extractElements(): Promise<void> {
    const elements = await this.page.$$eval('*', (nodes, maxElements) => {
      const result: ExtractedElement[] = [];
      const processed = new Set<Element>();

      for (const node of nodes) {
        if (result.length >= maxElements) break;
        if (processed.has(node)) continue;
        if (node.nodeType !== 1) continue; // ELEMENT_NODE = 1

        const element = node as HTMLElement;
        processed.add(element);

        // Get computed styles
        const computed = window.getComputedStyle(element);
        const computedStyles: Record<string, string> = {};
        for (let i = 0; i < computed.length; i++) {
          const prop = computed[i];
          computedStyles[prop] = computed.getPropertyValue(prop);
        }

        // Get inline styles
        const styles: Record<string, string> = {};
        if (element.style && element.style.length > 0) {
          for (let i = 0; i < element.style.length; i++) {
            const prop = element.style[i];
            styles[prop] = element.style.getPropertyValue(prop);
          }
        }

        // Get attributes
        const attributes: Record<string, string> = {};
        if (element.attributes) {
          for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            attributes[attr.name] = attr.value;
          }
        }

        result.push({
          tag: element.tagName.toLowerCase(),
          classes: Array.from(element.classList),
          id: element.id || undefined,
          styles,
          computedStyles,
          text: element.textContent?.trim().substring(0, 100) || undefined,
          attributes,
        });
      }

      return result;
    }, this.maxElements);

    this.extractedData.elements = elements;

    // Extract tokens from elements
    this.extractTokens();
  }

  private extractTokens(): void {
    for (const element of this.extractedData.elements) {
      // Extract colors
      this.extractColors(element.computedStyles);

      // Extract typography
      this.extractTypography(element.computedStyles);

      // Extract spacing
      this.extractSpacing(element.computedStyles);

      // Extract border radius
      this.extractBorderRadius(element.computedStyles);

      // Extract box shadow
      this.extractBoxShadow(element.computedStyles);

      // Extract transitions
      this.extractTransitions(element.computedStyles);
    }
  }

  private extractColors(styles: Record<string, string>): void {
    const colorProps = ['color', 'background-color', 'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'];
    for (const prop of colorProps) {
      const value = styles[prop];
      if (value && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') {
        this.extractedData.colors.add(value.trim());
      }
    }
  }

  private extractTypography(styles: Record<string, string>): void {
    const fontFamily = styles['font-family'];
    if (fontFamily) {
      this.extractedData.fonts.add(fontFamily.trim());
    }
  }

  private extractSpacing(styles: Record<string, string>): void {
    const spacingProps = ['margin', 'padding', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'gap', 'row-gap', 'column-gap'];
    for (const prop of spacingProps) {
      const value = styles[prop];
      if (value && value !== '0px' && value !== '0') {
        this.extractedData.spacing.add(value.trim());
      }
    }
  }

  private extractBorderRadius(styles: Record<string, string>): void {
    const borderRadius = styles['border-radius'];
    if (borderRadius && borderRadius !== '0px' && borderRadius !== '0') {
      this.extractedData.borderRadius.add(borderRadius.trim());
    }
  }

  private extractBoxShadow(styles: Record<string, string>): void {
    const boxShadow = styles['box-shadow'];
    if (boxShadow && boxShadow !== 'none') {
      this.extractedData.boxShadow.add(boxShadow.trim());
    }
  }

  private extractTransitions(styles: Record<string, string>): void {
    const transition = styles['transition'];
    const transitionProperty = styles['transition-property'];
    if (transition && transition !== 'none') {
      this.extractedData.transitions.add(transition.trim());
    }
    if (transitionProperty && transitionProperty !== 'none') {
      this.extractedData.transitions.add(transitionProperty.trim());
    }
  }

  private async extractLibraryPatterns(): Promise<void> {
    const patterns: string[] = [];

    // Check for Bootstrap
    if (this.extractedData.elements.some((el) => el.classes.some((cls) => cls.startsWith('btn-') || cls.startsWith('form-') || cls.startsWith('card-')))) {
      patterns.push('bootstrap');
    }

    // Check for Material-UI
    if (this.extractedData.elements.some((el) => el.classes.some((cls) => cls.startsWith('mdc-') || cls.startsWith('Mui')))) {
      patterns.push('material-ui');
    }

    // Check for shadcn/ui
    if (this.extractedData.elements.some((el) => el.attributes['data-radix'] || el.classes.some((cls) => cls.includes('radix')))) {
      patterns.push('shadcn-ui');
    }

    // Check for Tailwind CSS
    if (this.extractedData.elements.some((el) => el.classes.some((cls) => /^(bg|text|p|m|w|h|flex|grid)-/.test(cls)))) {
      patterns.push('tailwind');
    }

    this.extractedData.libraryPatterns = patterns;
  }
}

