// Theme Manager for Markdown Viewer Extension
// Handles loading, applying, and managing themes

/**
 * Theme Manager Class
 * Manages theme loading, font resolution, and theme switching
 */
class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.fontConfig = null;
    this.registry = null;
    this.initialized = false;
  }

  /**
   * Initialize theme manager by loading font config and registry
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Load font config
      const configResponse = await fetch(chrome.runtime.getURL('themes/font-config.json'));
      this.fontConfig = await configResponse.json();
      
      // Load theme registry
      const registryResponse = await fetch(chrome.runtime.getURL('themes/registry.json'));
      this.registry = await registryResponse.json();
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize theme manager:', error);
      throw error;
    }
  }

  /**
   * Get font config for a given font name
   * @param {string} fontName - Font name (e.g., 'SimSun', 'Times New Roman')
   * @returns {string} Font fallback chain (CSS font-family string)
   */
  getFontFallback(fontName) {
    if (!this.fontConfig) {
      console.warn('Font config not loaded yet');
      return fontName;
    }
    
    const font = this.fontConfig.fonts[fontName];
    
    if (!font) {
      console.warn(`Font '${fontName}' not found in font-config.json, using as-is`);
      return fontName;
    }
    
    return font.webFallback;
  }

  /**
   * Build complete font family stack
   * @param {string} fontName - Font name
   * @returns {string} Complete CSS font-family string
   */
  buildFontFamily(fontName) {
    if (typeof fontName === 'string') {
      return this.getFontFallback(fontName);
    }
    
    // Fallback for unexpected input
    return fontName;
  }

  /**
   * Get DOCX font configuration for a given font name
   * @param {string} fontName - Font name
   * @returns {Object} Complete DOCX font object with ascii, eastAsia, hAnsi, cs properties
   */
  getDocxFont(fontName) {
    if (!this.fontConfig) {
      console.warn('Font config not loaded yet');
      return { ascii: fontName, eastAsia: fontName, hAnsi: fontName, cs: fontName };
    }
    
    const font = this.fontConfig.fonts[fontName];
    
    if (!font || !font.docx) {
      console.warn(`DOCX font config for '${fontName}' not found, using as-is`);
      return { ascii: fontName, eastAsia: fontName, hAnsi: fontName, cs: fontName };
    }
    
    const docxFont = font.docx;
    return {
      ascii: docxFont.ascii,
      eastAsia: docxFont.eastAsia,
      hAnsi: docxFont.ascii,
      cs: docxFont.ascii
    };
  }

  /**
   * Load a theme configuration from a JSON file
   * @param {string} themeId - Theme ID (e.g., 'default', 'academic')
   * @returns {Promise<Object>} Theme configuration object
   */
  async loadTheme(themeId) {
    // Ensure font fallbacks are loaded
    await this.initialize();
    
    try {
      const response = await fetch(chrome.runtime.getURL(`themes/presets/${themeId}.json`));
      
      if (!response.ok) {
        throw new Error(`Failed to load theme: ${themeId}`);
      }
      
      const theme = await response.json();
      this.currentTheme = theme;
      
      return theme;
    } catch (error) {
      console.error('Error loading theme:', error);
      throw error;
    }
  }

  /**
   * Load theme from chrome.storage
   * @returns {Promise<string>} Theme ID
   */
  async loadSelectedTheme() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['selectedTheme'], (result) => {
        resolve(result.selectedTheme || 'default');
      });
    });
  }

  /**
   * Save selected theme to chrome.storage
   * @param {string} themeId - Theme ID to save
   */
  async saveSelectedTheme(themeId) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ selectedTheme: themeId }, resolve);
    });
  }

  /**
   * Get current theme configuration
   * @returns {Object|null} Current theme object
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Convert point size to pixels (for CSS)
   * @param {string} ptSize - Size in points (e.g., '12pt')
   * @returns {string} Size in pixels (e.g., '16px')
   */
  ptToPx(ptSize) {
    const pt = parseFloat(ptSize);
    const px = pt * 4 / 3; // 1pt = 4/3 px (at 96 DPI)
    return `${px}px`;
  }

  /**
   * Convert point size to half-points (for DOCX)
   * @param {string} ptSize - Size in points (e.g., '12pt')
   * @returns {number} Size in half-points (e.g., 24)
   */
  ptToHalfPt(ptSize) {
    const pt = parseFloat(ptSize);
    return pt * 2;
  }

  /**
   * Convert point size to twips (for DOCX spacing)
   * @param {string} ptSize - Size in points (e.g., '13pt')
   * @returns {number} Size in twips (e.g., 260)
   */
  ptToTwips(ptSize) {
    const pt = parseFloat(ptSize);
    return Math.round(pt * 20); // 1pt = 20 twips
  }

  /**
   * Get all available themes from registry
   * @returns {Array<Object>} List of theme metadata
   */
  async getAvailableThemes() {
    await this.initialize();
    
    if (!this.registry) {
      return [];
    }
    
    // Load theme names and descriptions
    const themes = await Promise.all(
      this.registry.themes.map(async (themeInfo) => {
        try {
          const response = await fetch(
            chrome.runtime.getURL(`themes/presets/${themeInfo.file}`)
          );
          const theme = await response.json();
          
          return {
            id: theme.id,
            name: theme.name,
            name_en: theme.name_en,
            description: theme.description,
            description_en: theme.description_en,
            category: themeInfo.category,
            featured: themeInfo.featured || false
          };
        } catch (error) {
          console.error(`Failed to load theme metadata for ${themeInfo.id}:`, error);
          return null;
        }
      })
    );
    
    return themes.filter(t => t !== null);
  }

  /**
   * Get themes grouped by category
   * @returns {Object} Themes grouped by category
   */
  async getThemesByCategory() {
    await this.initialize();
    
    const themes = await this.getAvailableThemes();
    const grouped = {};
    
    // Initialize categories
    Object.keys(this.registry.categories).forEach(catId => {
      grouped[catId] = {
        ...this.registry.categories[catId],
        themes: []
      };
    });
    
    // Group themes
    themes.forEach(theme => {
      if (grouped[theme.category]) {
        grouped[theme.category].themes.push(theme);
      }
    });
    
    return grouped;
  }

  /**
   * Switch to a different theme
   * @param {string} themeId - Theme ID to switch to
   * @returns {Promise<Object>} The loaded theme
   */
  async switchTheme(themeId) {
    // Load the new theme
    const theme = await this.loadTheme(themeId);
    
    // Save selection
    await this.saveSelectedTheme(themeId);
    
    return theme;
  }
}

// Create and export singleton instance
const themeManager = new ThemeManager();

export default themeManager;
