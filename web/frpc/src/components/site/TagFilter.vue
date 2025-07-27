<template>
    <div class="tag-filter">
        <el-card class="filter-card">
            <div slot="header" class="filter-header">
                <span class="filter-title">
                    <i class="el-icon-collection-tag"></i>
                    标签筛选
                </span>
                <div class="filter-controls">
                    <span class="filter-stats">
                        已选择 {{ selectedTags.length }} 个标签
                        <span v-if="selectedTags.length > 0">
                            | 匹配 {{ matchedCount }} 个站点
                        </span>
                    </span>
                    <el-button
                        size="mini"
                        type="text"
                        @click="clearAllFilters"
                        v-if="selectedTags.length > 0"
                    >
                        清除全部
                    </el-button>
                </div>
            </div>

            <!-- Filter Mode Toggle -->
            <div class="filter-mode">
                <el-radio-group
                    v-model="filterMode"
                    size="small"
                    @change="handleModeChange"
                >
                    <el-radio-button label="OR">包含任一标签</el-radio-button>
                    <el-radio-button label="AND">包含全部标签</el-radio-button>
                </el-radio-group>
            </div>

            <!-- Selected Tags Display -->
            <div class="selected-tags-section" v-if="selectedTags.length > 0">
                <div class="section-title">已选择的标签:</div>
                <div class="selected-tags">
                    <el-tag
                        v-for="tag in selectedTags"
                        :key="tag"
                        type="primary"
                        closable
                        @close="removeTag(tag)"
                        class="selected-tag"
                    >
                        {{ tag }}
                    </el-tag>
                </div>
            </div>

            <!-- Available Tags -->
            <div class="available-tags-section">
                <div class="section-title">可用标签:</div>
                
                <!-- Tag Categories -->
                <div class="tag-categories">
                    <!-- Popular Tags -->
                    <div class="tag-category" v-if="popularTags.length > 0">
                        <div class="category-title">常用标签</div>
                        <div class="tag-list">
                            <el-button
                                v-for="tag in popularTags"
                                :key="tag.name"
                                size="mini"
                                :type="isTagSelected(tag.name) ? 'primary' : 'info'"
                                :class="{ 'tag-selected': isTagSelected(tag.name) }"
                                @click="toggleTag(tag.name)"
                                class="tag-button"
                            >
                                {{ tag.name }}
                                <span class="tag-count">({{ tag.count }})</span>
                            </el-button>
                        </div>
                    </div>

                    <!-- Device Type Tags -->
                    <div class="tag-category" v-if="deviceTypeTags.length > 0">
                        <div class="category-title">设备类型</div>
                        <div class="tag-list">
                            <el-button
                                v-for="tag in deviceTypeTags"
                                :key="tag.name"
                                size="mini"
                                :type="isTagSelected(tag.name) ? 'primary' : 'success'"
                                :class="{ 'tag-selected': isTagSelected(tag.name) }"
                                @click="toggleTag(tag.name)"
                                class="tag-button"
                            >
                                {{ tag.name }}
                                <span class="tag-count">({{ tag.count }})</span>
                            </el-button>
                        </div>
                    </div>

                    <!-- Location Tags -->
                    <div class="tag-category" v-if="locationTags.length > 0">
                        <div class="category-title">地区位置</div>
                        <div class="tag-list">
                            <el-button
                                v-for="tag in locationTags"
                                :key="tag.name"
                                size="mini"
                                :type="isTagSelected(tag.name) ? 'primary' : 'warning'"
                                :class="{ 'tag-selected': isTagSelected(tag.name) }"
                                @click="toggleTag(tag.name)"
                                class="tag-button"
                            >
                                {{ tag.name }}
                                <span class="tag-count">({{ tag.count }})</span>
                            </el-button>
                        </div>
                    </div>

                    <!-- Status Tags -->
                    <div class="tag-category" v-if="statusTags.length > 0">
                        <div class="category-title">状态标签</div>
                        <div class="tag-list">
                            <el-button
                                v-for="tag in statusTags"
                                :key="tag.name"
                                size="mini"
                                :type="isTagSelected(tag.name) ? 'primary' : 'info'"
                                :class="{ 'tag-selected': isTagSelected(tag.name) }"
                                @click="toggleTag(tag.name)"
                                class="tag-button"
                            >
                                {{ tag.name }}
                                <span class="tag-count">({{ tag.count }})</span>
                            </el-button>
                        </div>
                    </div>

                    <!-- Other Tags -->
                    <div class="tag-category" v-if="otherTags.length > 0">
                        <div class="category-title">其他标签</div>
                        <div class="tag-list">
                            <el-button
                                v-for="tag in otherTags"
                                :key="tag.name"
                                size="mini"
                                :type="isTagSelected(tag.name) ? 'primary' : ''"
                                :class="{ 'tag-selected': isTagSelected(tag.name) }"
                                @click="toggleTag(tag.name)"
                                class="tag-button"
                            >
                                {{ tag.name }}
                                <span class="tag-count">({{ tag.count }})</span>
                            </el-button>
                        </div>
                    </div>

                    <!-- No Tags Available -->
                    <div class="no-tags" v-if="availableTags.length === 0">
                        <i class="el-icon-info"></i>
                        暂无可用标签
                    </div>
                </div>
            </div>

            <!-- Quick Filter Presets -->
            <div class="quick-filters" v-if="quickFilterPresets.length > 0">
                <div class="section-title">快速筛选:</div>
                <div class="preset-buttons">
                    <el-button
                        v-for="preset in quickFilterPresets"
                        :key="preset.name"
                        size="small"
                        type="text"
                        @click="applyPreset(preset)"
                        class="preset-button"
                    >
                        {{ preset.name }}
                    </el-button>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script>
import TagManager from '../../utils/TagManager.js';

export default {
    name: 'TagFilter',
    props: {
        allTags: {
            type: Array,
            default: () => []
        },
        selectedTags: {
            type: Array,
            default: () => []
        },
        matchedCount: {
            type: Number,
            default: 0
        }
    },
    data() {
        return {
            filterMode: 'OR',
            quickFilterPresets: [
                { name: '在线设备', tags: ['在线'] },
                { name: '辐射监测', tags: ['辐射'] },
                { name: '苏州地区', tags: ['苏州'] },
                { name: '测试设备', tags: ['测试'] },
                { name: '生产环境', tags: ['生产', '在线'] }
            ]
        };
    },
    computed: {
        /**
         * Get available tags (not currently selected)
         */
        availableTags() {
            return this.allTags.filter(tag => !this.selectedTags.includes(tag.name));
        },

        /**
         * Get popular tags (top 5 by count)
         */
        popularTags() {
            return this.allTags
                .filter(tag => tag.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
        },

        /**
         * Get device type tags
         */
        deviceTypeTags() {
            const deviceTypes = TagManager.TAG_CATEGORIES.deviceType || [];
            return this.allTags.filter(tag => deviceTypes.includes(tag.name));
        },

        /**
         * Get location tags
         */
        locationTags() {
            const locations = TagManager.TAG_CATEGORIES.location || [];
            return this.allTags.filter(tag => locations.includes(tag.name));
        },

        /**
         * Get status tags
         */
        statusTags() {
            const statusList = TagManager.TAG_CATEGORIES.status || [];
            return this.allTags.filter(tag => statusList.includes(tag.name));
        },

        /**
         * Get other tags (not in predefined categories)
         */
        otherTags() {
            const categorizedTags = []
                .concat(TagManager.TAG_CATEGORIES.deviceType)
                .concat(TagManager.TAG_CATEGORIES.location)
                .concat(TagManager.TAG_CATEGORIES.status)
                .concat(TagManager.TAG_CATEGORIES.environment);
            
            return this.allTags.filter(tag => 
                !categorizedTags.includes(tag.name) && 
                !this.popularTags.some(popular => popular.name === tag.name)
            );
        }
    },
    methods: {
        /**
         * Check if tag is selected
         */
        isTagSelected(tagName) {
            return this.selectedTags.includes(tagName);
        },

        /**
         * Toggle tag selection
         */
        toggleTag(tagName) {
            let newSelectedTags;
            
            if (this.isTagSelected(tagName)) {
                newSelectedTags = this.selectedTags.filter(tag => tag !== tagName);
            } else {
                newSelectedTags = this.selectedTags.concat([tagName]);
            }
            
            this.$emit('tag-change', newSelectedTags);
        },

        /**
         * Remove specific tag
         */
        removeTag(tagName) {
            const newSelectedTags = this.selectedTags.filter(tag => tag !== tagName);
            this.$emit('tag-change', newSelectedTags);
        },

        /**
         * Clear all filters
         */
        clearAllFilters() {
            this.$emit('clear-filters');
        },

        /**
         * Handle filter mode change
         */
        handleModeChange(mode) {
            // Emit the current tags with new mode for refiltering
            this.$emit('tag-change', this.selectedTags, mode);
        },

        /**
         * Apply quick filter preset
         */
        applyPreset(preset) {
            // Check if all preset tags are available
            const availablePresetTags = preset.tags.filter(tag =>
                this.allTags.some(availableTag => availableTag.name === tag)
            );
            
            if (availablePresetTags.length > 0) {
                // Merge with existing selections or replace (depending on user preference)
                const combinedTags = this.selectedTags.concat(availablePresetTags);
                const newSelectedTags = Array.from(new Set(combinedTags));
                this.$emit('tag-change', newSelectedTags);
            } else {
                this.$message.warning(`预设"${preset.name}"中的标签在当前数据中不可用`);
            }
        },

        /**
         * Get tag category color
         */
        getTagCategoryColor(tagName) {
            if (TagManager.TAG_CATEGORIES.deviceType.includes(tagName)) return 'success';
            if (TagManager.TAG_CATEGORIES.location.includes(tagName)) return 'warning';
            if (TagManager.TAG_CATEGORIES.status.includes(tagName)) return 'info';
            if (TagManager.TAG_CATEGORIES.environment.includes(tagName)) return 'danger';
            return '';
        }
    }
};
</script>

<style scoped>
.tag-filter {
    margin-bottom: 20px;
}

.filter-card {
    border: 1px solid #E4E7ED;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.04);
}

.filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.filter-title {
    font-weight: 600;
    color: #303133;
}

.filter-title .el-icon-collection-tag {
    margin-right: 8px;
    color: #409EFF;
}

.filter-controls {
    display: flex;
    align-items: center;
    gap: 15px;
}

.filter-stats {
    font-size: 13px;
    color: #606266;
}

.filter-mode {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #F0F2F5;
}

.section-title {
    font-size: 14px;
    font-weight: 500;
    color: #606266;
    margin-bottom: 10px;
}

/* Selected Tags Section */
.selected-tags-section {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #F0F2F5;
}

.selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.selected-tag {
    margin: 0;
}

/* Available Tags Section */
.available-tags-section {
    margin-bottom: 20px;
}

.tag-categories {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.tag-category {
    background: #FAFBFC;
    border-radius: 6px;
    padding: 12px;
}

.category-title {
    font-size: 12px;
    font-weight: 600;
    color: #909399;
    text-transform: uppercase;
    margin-bottom: 8px;
    letter-spacing: 0.5px;
}

.tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.tag-button {
    margin: 0;
    transition: all 0.3s ease;
}

.tag-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.tag-button.tag-selected {
    font-weight: 600;
}

.tag-count {
    margin-left: 4px;
    opacity: 0.8;
    font-size: 11px;
}

.no-tags {
    text-align: center;
    color: #C0C4CC;
    padding: 20px;
    font-style: italic;
}

.no-tags .el-icon-info {
    font-size: 24px;
    display: block;
    margin-bottom: 8px;
}

/* Quick Filters */
.quick-filters {
    border-top: 1px solid #F0F2F5;
    padding-top: 15px;
}

.preset-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.preset-button {
    color: #409EFF;
    font-size: 12px;
    padding: 4px 8px;
}

.preset-button:hover {
    background-color: #ECF5FF;
    color: #409EFF;
}

/* Responsive Design */
@media (max-width: 768px) {
    .filter-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }
    
    .filter-controls {
        width: 100%;
        justify-content: space-between;
    }
    
    .tag-list {
        justify-content: center;
    }
    
    .preset-buttons {
        justify-content: center;
    }
    
    .selected-tags {
        justify-content: center;
    }
}

/* Animation */
.tag-button {
    animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Card content padding adjustment */
.filter-card /deep/ .el-card__body {
    padding: 15px 20px;
}

.filter-card /deep/ .el-card__header {
    padding: 15px 20px;
    background-color: #F8F9FA;
    border-bottom: 1px solid #E4E7ED;
}

/* Radio group styling */
.el-radio-group /deep/ .el-radio-button__inner {
    font-size: 12px;
    padding: 8px 12px;
}

.el-radio-group /deep/ .el-radio-button.is-active .el-radio-button__inner {
    background-color: #409EFF;
    border-color: #409EFF;
}
</style>