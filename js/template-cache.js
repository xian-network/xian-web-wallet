// Template Cache Manager - Pre-fetches and caches templates for faster loading
class TemplateCache {
    constructor() {
        this.cache = new Map();
        this.preloadPromises = new Map();
    }

    // Pre-fetch templates that are likely to be used
    async preloadCommonTemplates() {
        const commonTemplates = [
            'templates/request-transaction.html',
            'templates/request-signature.html',
            'templates/request-token.html',
            'templates/wallet.html',
            'templates/settings.html'
        ];

        const preloadPromises = commonTemplates.map(template => 
            this.preloadTemplate(template)
        );

        try {
            await Promise.all(preloadPromises);
            console.log('Common templates preloaded successfully');
        } catch (error) {
            console.warn('Some templates failed to preload:', error);
        }
    }

    // Pre-load a specific template
    async preloadTemplate(templatePath) {
        if (this.cache.has(templatePath) || this.preloadPromises.has(templatePath)) {
            return this.getTemplate(templatePath);
        }

        const promise = this.fetchTemplate(templatePath);
        this.preloadPromises.set(templatePath, promise);

        try {
            const content = await promise;
            this.cache.set(templatePath, content);
            this.preloadPromises.delete(templatePath);
            return content;
        } catch (error) {
            this.preloadPromises.delete(templatePath);
            throw error;
        }
    }

    // Fetch template from server
    async fetchTemplate(templatePath) {
        try {
            const response = await fetch(templatePath);
            if (!response.ok) {
                throw new Error(`Failed to fetch template: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error fetching template ${templatePath}:`, error);
            throw error;
        }
    }

    // Get template from cache or fetch if not cached
    async getTemplate(templatePath) {
        // Return from cache if available
        if (this.cache.has(templatePath)) {
            return this.cache.get(templatePath);
        }

        // Return pending promise if currently loading
        if (this.preloadPromises.has(templatePath)) {
            return await this.preloadPromises.get(templatePath);
        }

        // Fetch and cache
        return await this.preloadTemplate(templatePath);
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
        this.preloadPromises.clear();
    }

    // Get cache statistics
    getCacheStats() {
        return {
            cached: this.cache.size,
            loading: this.preloadPromises.size,
            templates: Array.from(this.cache.keys())
        };
    }
}

// Global template cache instance
const templateCache = new TemplateCache();

// Initialize template cache when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        templateCache.preloadCommonTemplates();
    });
} else {
    templateCache.preloadCommonTemplates();
}