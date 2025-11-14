import { Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';

export interface ElementStateStyles {
  hover?: Record<string, string>;
  focus?: Record<string, string>;
  active?: Record<string, string>;
  disabled?: Record<string, string>;
}

export interface ExtractedElement {
  tag: string;
  classes: string[];
  id?: string;
  styles: Record<string, string>;
  computedStyles: Record<string, string>;
  stateStyles?: ElementStateStyles;
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

  async extract(siteName?: string, designsPath?: string): Promise<ExtractedData> {
    // Extract all elements
    await this.extractElements();

    // Save intermediate: extracted elements
    if (siteName && designsPath) {
      await this.saveExtractedElements(siteName, designsPath);
    }

    // Extract element states
    await this.extractElementStates();

    // Save intermediate: element states
    if (siteName && designsPath) {
      await this.saveElementStates(siteName, designsPath);
    }

    // Extract library patterns
    await this.extractLibraryPatterns();

    // Save intermediate: library patterns
    if (siteName && designsPath) {
      await this.saveLibraryPatterns(siteName, designsPath);
    }

    // Extract DOM structure patterns
    await this.extractDOMStructurePatterns();

    // Save intermediate: DOM structure patterns
    if (siteName && designsPath) {
      await this.saveDOMPatterns(siteName, designsPath);
    }

    // Save intermediate: extracted tokens
    if (siteName && designsPath) {
      await this.saveExtractedTokens(siteName, designsPath);
    }

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

  private async extractElementStates(): Promise<void> {
    // Get interactive elements (buttons, links, inputs, etc.)
    const interactiveSelectors = 'button, a, input, select, textarea, [role="button"], [tabindex]';
    const interactiveElements = await this.page.$$(interactiveSelectors);

    for (const element of interactiveElements) {
      try {
        const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
        const isDisabled = await element.evaluate((el) => (el as HTMLElement).hasAttribute('disabled'));

        const stateStyles: ElementStateStyles = {};

        // Extract hover state
        try {
          await element.hover();
          await this.page.waitForTimeout(100); // Wait for CSS transitions
          const hoverStyles = await element.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            const styles: Record<string, string> = {};
            const colorProps = ['color', 'background-color', 'border-color'];
            for (const prop of colorProps) {
              styles[prop] = computed.getPropertyValue(prop);
            }
            return styles;
          });
          if (Object.keys(hoverStyles).length > 0) {
            stateStyles.hover = hoverStyles;
            // Extract colors from hover state
            this.extractColors(hoverStyles);
          }
        } catch (e) {
          // Element might not be hoverable, continue
        }

        // Extract focus state
        try {
          await element.focus();
          await this.page.waitForTimeout(100);
          const focusStyles = await element.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            const styles: Record<string, string> = {};
            const focusProps = ['outline', 'outline-color', 'outline-width', 'outline-style', 'border-color', 'box-shadow'];
            for (const prop of focusProps) {
              const value = computed.getPropertyValue(prop);
              if (value && value !== 'none' && value !== '0px') {
                styles[prop] = value;
              }
            }
            return styles;
          });
          if (Object.keys(focusStyles).length > 0) {
            stateStyles.focus = focusStyles;
            this.extractColors(focusStyles);
          }
        } catch (e) {
          // Element might not be focusable, continue
        }

        // Extract active state (for buttons and links)
        if (tagName === 'button' || tagName === 'a') {
          try {
            await element.click({ force: true });
            await this.page.waitForTimeout(100);
            const activeStyles = await element.evaluate((el) => {
              const computed = window.getComputedStyle(el);
              const styles: Record<string, string> = {};
              const colorProps = ['color', 'background-color', 'border-color'];
              for (const prop of colorProps) {
                styles[prop] = computed.getPropertyValue(prop);
              }
              return styles;
            });
            if (Object.keys(activeStyles).length > 0) {
              stateStyles.active = activeStyles;
              this.extractColors(activeStyles);
            }
            // Reset by clicking elsewhere
            await this.page.click('body', { position: { x: 0, y: 0 } });
          } catch (e) {
            // Element might not be clickable, continue
          }
        }

        // Extract disabled state
        if (isDisabled) {
          try {
            const disabledStyles = await element.evaluate((el) => {
              const computed = window.getComputedStyle(el);
              const styles: Record<string, string> = {};
              const disabledProps = ['color', 'background-color', 'border-color', 'opacity', 'cursor'];
              for (const prop of disabledProps) {
                styles[prop] = computed.getPropertyValue(prop);
              }
              return styles;
            });
            if (Object.keys(disabledStyles).length > 0) {
              stateStyles.disabled = disabledStyles;
              this.extractColors(disabledStyles);
            }
          } catch (e) {
            // Continue
          }
        }

        // Update the corresponding element in extractedData
        if (Object.keys(stateStyles).length > 0) {
          const elementIndex = this.extractedData.elements.findIndex((el) => {
            // Try to match by tag and position
            return el.tag === tagName;
          });
          if (elementIndex >= 0) {
            this.extractedData.elements[elementIndex].stateStyles = stateStyles;
          }
        }
      } catch (e) {
        // Continue with next element if this one fails
        continue;
      }
    }
  }

  private async extractDOMStructurePatterns(): Promise<void> {
    // Analyze DOM structure to detect component patterns
    const structurePatterns = await this.page.evaluate(() => {
      const patterns: string[] = [];

      // Check for card patterns (container with header, body, footer)
      const cards = Array.from(document.querySelectorAll('[class*="card"], .card, [class*="Card"]'));
      if (cards.length > 0) {
        const hasCardStructure = cards.some((card) => {
          const hasHeader = card.querySelector('[class*="header"], .header, [class*="Header"], h1, h2, h3, h4, h5, h6');
          const hasBody = card.querySelector('[class*="body"], .body, [class*="Body"], p, div');
          return hasHeader || hasBody;
        });
        if (hasCardStructure && !patterns.includes('card-structure')) {
          patterns.push('card-structure');
        }
      }

      // Check for form patterns (form with labels and inputs)
      const forms = Array.from(document.querySelectorAll('form'));
      if (forms.length > 0) {
        const hasFormStructure = forms.some((form) => {
          const hasLabel = form.querySelector('label');
          const hasInput = form.querySelector('input, select, textarea');
          return hasLabel && hasInput;
        });
        if (hasFormStructure && !patterns.includes('form-structure')) {
          patterns.push('form-structure');
        }
      }

      // Check for navigation patterns (nav with links)
      const navs = Array.from(document.querySelectorAll('nav, [role="navigation"]'));
      if (navs.length > 0) {
        const hasNavStructure = navs.some((nav) => {
          const links = nav.querySelectorAll('a, [role="link"]');
          return links.length > 0;
        });
        if (hasNavStructure && !patterns.includes('navigation-structure')) {
          patterns.push('navigation-structure');
        }
      }

      // Check for button groups (multiple buttons together)
      const buttonGroups = Array.from(document.querySelectorAll('[class*="button-group"], [class*="btn-group"], .button-group, .btn-group'));
      if (buttonGroups.length > 0) {
        const hasButtons = buttonGroups.some((group) => {
          const buttons = group.querySelectorAll('button, [role="button"], a[class*="btn"]');
          return buttons.length > 1;
        });
        if (hasButtons && !patterns.includes('button-group-structure')) {
          patterns.push('button-group-structure');
        }
      }

      // Check for modal/dialog patterns
      const modals = Array.from(document.querySelectorAll('[class*="modal"], [class*="dialog"], [role="dialog"]'));
      if (modals.length > 0) {
        if (!patterns.includes('modal-structure')) {
          patterns.push('modal-structure');
        }
      }

      // Check for list patterns (ul/ol with list items)
      const lists = Array.from(document.querySelectorAll('ul, ol, [role="list"]'));
      if (lists.length > 0) {
        const hasListItems = lists.some((list) => {
          const items = list.querySelectorAll('li, [role="listitem"]');
          return items.length > 0;
        });
        if (hasListItems && !patterns.includes('list-structure')) {
          patterns.push('list-structure');
        }
      }

      return patterns;
    });

    // Add structure patterns to library patterns if not already present
    for (const pattern of structurePatterns) {
      if (!this.extractedData.libraryPatterns.includes(pattern)) {
        this.extractedData.libraryPatterns.push(pattern);
      }
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

  private async saveExtractedElements(siteName: string, designsPath: string): Promise<void> {
    const siteDir = path.join(designsPath, siteName);
    await fs.mkdir(siteDir, { recursive: true });
    const filePath = path.join(siteDir, 'stage-elements.json');
    await fs.writeFile(filePath, JSON.stringify(this.extractedData.elements, null, 2), 'utf-8');
  }

  private async saveElementStates(siteName: string, designsPath: string): Promise<void> {
    const siteDir = path.join(designsPath, siteName);
    await fs.mkdir(siteDir, { recursive: true });
    const filePath = path.join(siteDir, 'stage-element-states.json');
    const elementStates = this.extractedData.elements
      .filter((el) => el.stateStyles && Object.keys(el.stateStyles).length > 0)
      .map((el) => ({
        tag: el.tag,
        classes: el.classes,
        id: el.id,
        stateStyles: el.stateStyles,
      }));
    await fs.writeFile(filePath, JSON.stringify(elementStates, null, 2), 'utf-8');
  }

  private async saveLibraryPatterns(siteName: string, designsPath: string): Promise<void> {
    const siteDir = path.join(designsPath, siteName);
    await fs.mkdir(siteDir, { recursive: true });
    const filePath = path.join(siteDir, 'stage-library-patterns.json');
    await fs.writeFile(filePath, JSON.stringify(this.extractedData.libraryPatterns, null, 2), 'utf-8');
  }

  private async saveDOMPatterns(siteName: string, designsPath: string): Promise<void> {
    const siteDir = path.join(designsPath, siteName);
    await fs.mkdir(siteDir, { recursive: true });
    const filePath = path.join(siteDir, 'stage-dom-patterns.json');
    // Extract DOM patterns from library patterns (structure patterns)
    const domPatterns = this.extractedData.libraryPatterns.filter((pattern) =>
      pattern.includes('-structure')
    );
    await fs.writeFile(filePath, JSON.stringify(domPatterns, null, 2), 'utf-8');
  }

  private async saveExtractedTokens(siteName: string, designsPath: string): Promise<void> {
    const siteDir = path.join(designsPath, siteName);
    await fs.mkdir(siteDir, { recursive: true });
    const filePath = path.join(siteDir, 'stage-tokens.json');
    const tokens = {
      colors: Array.from(this.extractedData.colors),
      fonts: Array.from(this.extractedData.fonts),
      spacing: Array.from(this.extractedData.spacing),
      borderRadius: Array.from(this.extractedData.borderRadius),
      boxShadow: Array.from(this.extractedData.boxShadow),
      transitions: Array.from(this.extractedData.transitions),
    };
    await fs.writeFile(filePath, JSON.stringify(tokens, null, 2), 'utf-8');
  }
}

