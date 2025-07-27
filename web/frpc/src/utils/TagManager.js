/**
 * Tag Management Utility
 * Handles tag operations, filtering, and management
 */
export class TagManager {

    /**
     * Get all unique tags from sites with counts
     * @param {Array} sites - Array of site objects
     * @returns {Array} Array of tag objects {name, count}
     */
    static getAllTags(sites) {
        const tagCounts = new Map();
        
        sites.forEach(site => {
            if (site.tags && Array.isArray(site.tags)) {
                site.tags.forEach(tag => {
                    const normalizedTag = this.normalizeTag(tag);
                    if (normalizedTag) {
                        tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
                    }
                });
            }
        });

        // Add predefined tags with 0 count if not present
        TagManager.PREDEFINED_TAGS.forEach(tag => {
            if (!tagCounts.has(tag)) {
                tagCounts.set(tag, 0);
            }
        });

        return Array.from(tagCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => {
                // Sort by count (descending), then by name (ascending)
                if (a.count !== b.count) {
                    return b.count - a.count;
                }
                return a.name.localeCompare(b.name);
            });
    }

    /**
     * Filter sites by selected tags
     * @param {Array} sites - Array of site objects
     * @param {Array} selectedTags - Array of selected tag names
     * @param {string} logic - Filter logic: 'OR' or 'AND' (default: 'OR')
     * @returns {Array} Filtered sites
     */
    static filterSitesByTags(sites, selectedTags = [], logic = 'OR') {
        if (!selectedTags || selectedTags.length === 0) {
            return sites;
        }

        const normalizedSelectedTags = selectedTags.map(tag => this.normalizeTag(tag)).filter(tag => tag);

        return sites.filter(site => {
            if (!site.tags || !Array.isArray(site.tags)) {
                return false;
            }

            const normalizedSiteTags = site.tags.map(tag => this.normalizeTag(tag)).filter(tag => tag);

            if (logic === 'AND') {
                // All selected tags must be present
                return normalizedSelectedTags.every(selectedTag => 
                    normalizedSiteTags.includes(selectedTag)
                );
            } else {
                // At least one selected tag must be present (OR logic)
                return normalizedSelectedTags.some(selectedTag => 
                    normalizedSiteTags.includes(selectedTag)
                );
            }
        });
    }

    /**
     * Add tag to site
     * @param {Object} site - Site object
     * @param {string} tag - Tag to add
     * @returns {boolean} True if tag was added
     */
    static addTagToSite(site, tag) {
        const normalizedTag = this.normalizeTag(tag);
        if (!normalizedTag) {
            return false;
        }

        if (!site.tags) {
            site.tags = [];
        }

        const normalizedSiteTags = site.tags.map(t => this.normalizeTag(t));
        if (!normalizedSiteTags.includes(normalizedTag)) {
            site.tags.push(normalizedTag);
            return true;
        }

        return false;
    }

    /**
     * Remove tag from site
     * @param {Object} site - Site object
     * @param {string} tag - Tag to remove
     * @returns {boolean} True if tag was removed
     */
    static removeTagFromSite(site, tag) {
        const normalizedTag = this.normalizeTag(tag);
        if (!normalizedTag || !site.tags) {
            return false;
        }

        const initialLength = site.tags.length;
        site.tags = site.tags.filter(t => this.normalizeTag(t) !== normalizedTag);
        
        return site.tags.length < initialLength;
    }

    /**
     * Toggle tag on site
     * @param {Object} site - Site object
     * @param {string} tag - Tag to toggle
     * @returns {boolean} True if tag is now present, false if removed
     */
    static toggleTagOnSite(site, tag) {
        const normalizedTag = this.normalizeTag(tag);
        if (!normalizedTag) {
            return false;
        }

        if (!site.tags) {
            site.tags = [];
        }

        const normalizedSiteTags = site.tags.map(t => this.normalizeTag(t));
        if (normalizedSiteTags.includes(normalizedTag)) {
            this.removeTagFromSite(site, tag);
            return false;
        } else {
            this.addTagToSite(site, tag);
            return true;
        }
    }

    /**
     * Normalize tag string (trim, remove duplicates, etc.)
     * @param {string} tag - Raw tag string
     * @returns {string} Normalized tag
     */
    static normalizeTag(tag) {
        if (typeof tag !== 'string') {
            return '';
        }
        
        return tag.trim();
    }

    /**
     * Parse tags from string (comma or space separated)
     * @param {string} tagString - String containing tags
     * @returns {Array} Array of normalized tags
     */
    static parseTagString(tagString) {
        if (typeof tagString !== 'string') {
            return [];
        }

        return tagString
            .split(/[,\s]+/)
            .map(tag => this.normalizeTag(tag))
            .filter(tag => tag.length > 0);
    }

    /**
     * Convert tags array to string
     * @param {Array} tags - Array of tags
     * @param {string} separator - Separator (default: ',')
     * @returns {string} Formatted tag string
     */
    static tagsToString(tags, separator = ',') {
        if (!Array.isArray(tags)) {
            return '';
        }

        return tags
            .map(tag => this.normalizeTag(tag))
            .filter(tag => tag.length > 0)
            .join(separator + ' ');
    }

    /**
     * Get tag suggestions based on partial input
     * @param {string} partial - Partial tag input
     * @param {Array} existingTags - Existing tags in the system
     * @param {number} maxSuggestions - Maximum suggestions to return
     * @returns {Array} Array of suggested tags
     */
    static getTagSuggestions(partial, existingTags = [], maxSuggestions = 10) {
        const normalizedPartial = this.normalizeTag(partial).toLowerCase();
        if (!normalizedPartial) {
            return TagManager.PREDEFINED_TAGS.slice(0, maxSuggestions);
        }

        const suggestions = new Set();

        // Add predefined tags that match
        TagManager.PREDEFINED_TAGS.forEach(tag => {
            if (tag.toLowerCase().includes(normalizedPartial)) {
                suggestions.add(tag);
            }
        });

        // Add existing tags that match
        existingTags.forEach(tag => {
            const normalizedTag = this.normalizeTag(tag);
            if (normalizedTag.toLowerCase().includes(normalizedPartial)) {
                suggestions.add(normalizedTag);
            }
        });

        return Array.from(suggestions).slice(0, maxSuggestions);
    }

    /**
     * Validate tag name
     * @param {string} tag - Tag to validate
     * @returns {Object} Validation result {valid, message}
     */
    static validateTag(tag) {
        const normalizedTag = this.normalizeTag(tag);
        
        if (!normalizedTag) {
            return { valid: false, message: '标签不能为空' };
        }

        if (normalizedTag.length > 20) {
            return { valid: false, message: '标签长度不能超过20个字符' };
        }

        if (normalizedTag.includes('|')) {
            return { valid: false, message: '标签不能包含 | 字符' };
        }

        return { valid: true, message: '' };
    }

    /**
     * Get tag statistics
     * @param {Array} sites - Array of site objects
     * @returns {Object} Tag statistics
     */
    static getTagStatistics(sites) {
        const stats = {
            totalTags: 0,
            uniqueTags: 0,
            avgTagsPerSite: 0,
            sitesWithTags: 0,
            sitesWithoutTags: 0,
            mostPopularTags: [],
            categoryDistribution: {}
        };

        const tagCounts = new Map();
        let totalTagCount = 0;

        sites.forEach(site => {
            if (site.tags && Array.isArray(site.tags) && site.tags.length > 0) {
                stats.sitesWithTags++;
                totalTagCount += site.tags.length;
                
                site.tags.forEach(tag => {
                    const normalizedTag = this.normalizeTag(tag);
                    if (normalizedTag) {
                        tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
                    }
                });
            } else {
                stats.sitesWithoutTags++;
            }
        });

        stats.totalTags = totalTagCount;
        stats.uniqueTags = tagCounts.size;
        stats.avgTagsPerSite = sites.length > 0 ? (totalTagCount / sites.length).toFixed(2) : 0;

        // Most popular tags
        stats.mostPopularTags = Array.from(tagCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Category distribution
        Object.entries(TagManager.TAG_CATEGORIES).forEach(([category, categoryTags]) => {
            stats.categoryDistribution[category] = {
                total: 0,
                tags: categoryTags.map(tag => ({
                    name: tag,
                    count: tagCounts.get(tag) || 0
                }))
            };
            
            stats.categoryDistribution[category].total = stats.categoryDistribution[category].tags
                .reduce((sum, tag) => sum + tag.count, 0);
        });

        return stats;
    }

    /**
     * Clean up tags (remove empty, normalize, deduplicate)
     * @param {Array} tags - Array of tags to clean
     * @returns {Array} Cleaned tags array
     */
    static cleanTags(tags) {
        if (!Array.isArray(tags)) {
            return [];
        }

        const seen = new Set();
        return tags
            .map(tag => this.normalizeTag(tag))
            .filter(tag => {
                if (!tag || seen.has(tag)) {
                    return false;
                }
                seen.add(tag);
                return true;
            });
    }

    /**
     * Merge tags from multiple sources
     * @param {...Array} tagArrays - Multiple arrays of tags
     * @returns {Array} Merged and cleaned tags
     */
    static mergeTags() {
        const tagArrays = Array.prototype.slice.call(arguments);
        const allTags = [];
        
        tagArrays.forEach(arr => {
            if (Array.isArray(arr)) {
                allTags.push.apply(allTags, arr);
            }
        });
        
        return this.cleanTags(allTags);
    }
}

/**
 * Predefined tags for site classification
 */
TagManager.PREDEFINED_TAGS = [
    '辐射', '烟气', '水质', '噪声', '测试', '在线', 
    '核电', '太平岭', '苏州', '北京', '上海', '广州',
    '生产', '开发', '备用', '维护'
];

/**
 * Tag categories for organization
 */
TagManager.TAG_CATEGORIES = {
    deviceType: ['辐射', '烟气', '水质', '噪声'],
    location: ['太平岭', '苏州', '北京', '上海', '广州'],
    status: ['在线', '离线', '维护', '测试'],
    environment: ['生产', '开发', '备用']
};

export default TagManager;