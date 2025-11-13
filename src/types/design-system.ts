/**
 * Design System types following design-tokens.org schema
 */

export interface DesignSystemMetadata {
  name: string;
  version: string;
  author?: string;
  description?: string;
  lastModified: string;
}

export interface DesignToken {
  value: string | number;
  type?: string;
  description?: string;
}

export interface DesignTokens {
  color?: Record<string, DesignToken | Record<string, DesignToken>>;
  font?: Record<string, DesignToken | Record<string, DesignToken>>;
  radius?: Record<string, DesignToken | Record<string, DesignToken>>;
  shadow?: Record<string, DesignToken | Record<string, DesignToken>>;
  spacing?: Record<string, DesignToken | Record<string, DesignToken>>;
  transition?: Record<string, DesignToken | Record<string, DesignToken>>;
}

export interface ComponentDefinition {
  base?: Record<string, DesignToken>;
  variant?: Record<string, Record<string, DesignToken>>;
  state?: Record<string, Record<string, DesignToken>>;
  size?: Record<string, Record<string, DesignToken>>;
}

export interface DesignSystem {
  $schema?: string;
  metadata: DesignSystemMetadata;
  group?: string;
  aliases?: Record<string, string>;
  global: DesignTokens;
  themes?: Record<string, DesignTokens>;
  component?: Record<string, ComponentDefinition>;
}

