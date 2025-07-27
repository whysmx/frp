<template>
    <div class="site-edit-form">
        <el-form
            ref="siteForm"
            :model="formData"
            :rules="formRules"
            label-width="100px"
            label-position="left"
        >
            <!-- Site Code -->
            <el-form-item label="站点编号" prop="siteCode">
                <el-input
                    v-model="formData.siteCode"
                    placeholder="请输入站点编号"
                    :disabled="isEditing"
                />
                <div class="field-hint" v-if="!isEditing">
                    站点编号用于标识站点，建议使用有意义的编码
                </div>
            </el-form-item>

            <!-- Site Name -->
            <el-form-item label="站点名称" prop="siteName">
                <el-input
                    v-model="formData.siteName"
                    placeholder="请输入站点名称"
                />
                <div class="field-hint">
                    站点的显示名称，便于识别和管理
                </div>
            </el-form-item>

            <!-- MAC Address (Read-only when editing) -->
            <el-form-item label="MAC地址" prop="macAddress">
                <el-input
                    v-model="formData.macAddress"
                    placeholder="请输入MAC地址"
                    :disabled="isEditing"
                />
                <div class="field-hint">
                    <span v-if="isEditing" class="warning-text">
                        <i class="el-icon-warning"></i>
                        MAC地址是唯一标识符，不能修改
                    </span>
                    <span v-else>
                        MAC地址作为设备唯一标识符，将用作STCP密钥
                    </span>
                </div>
            </el-form-item>

            <!-- Password -->
            <el-form-item label="密码" prop="password">
                <el-input
                    v-model="formData.password"
                    type="password"
                    placeholder="请输入设备访问密码"
                    show-password
                />
                <div class="field-hint">
                    设备访问密码，可选填
                </div>
            </el-form-item>

            <!-- Tags -->
            <el-form-item label="标签" prop="tags">
                <div class="tags-editor">
                    <!-- Existing Tags -->
                    <div class="selected-tags" v-if="formData.tags.length > 0">
                        <el-tag
                            v-for="tag in formData.tags"
                            :key="tag"
                            closable
                            size="medium"
                            @close="removeTag(tag)"
                            class="tag-item"
                        >
                            {{ tag }}
                        </el-tag>
                    </div>

                    <!-- Available Tags -->
                    <div class="available-tags">
                        <div class="tags-section-title">可选标签:</div>
                        <div class="tag-buttons">
                            <el-button
                                v-for="tag in availableTags"
                                :key="tag.name"
                                size="mini"
                                :type="isTagSelected(tag.name) ? 'primary' : ''"
                                @click="toggleTag(tag.name)"
                                class="tag-button"
                            >
                                {{ tag.name }}
                                <span class="tag-count" v-if="tag.count > 0">({{ tag.count }})</span>
                            </el-button>
                        </div>
                    </div>

                    <!-- Add Custom Tag -->
                    <div class="add-custom-tag">
                        <el-input
                            v-model="newTagInput"
                            placeholder="输入新标签"
                            size="small"
                            style="width: 150px"
                            @keyup.enter.native="addCustomTag"
                        />
                        <el-button
                            size="small"
                            type="primary"
                            @click="addCustomTag"
                            :disabled="!newTagInput.trim()"
                        >
                            添加
                        </el-button>
                    </div>
                </div>
            </el-form-item>

            <!-- Configuration Summary (Edit Mode) -->
            <el-form-item label="配置信息" v-if="isEditing && site.configs">
                <div class="config-summary">
                    <div class="summary-title">当前代理配置:</div>
                    <div class="config-list">
                        <div
                            v-for="config in site.configs"
                            :key="config.name"
                            class="config-item"
                        >
                            <span class="config-name">{{ config.name }}</span>
                            <span class="config-ports">
                                {{ extractPort(config.name) }} → {{ config.bind_port }}
                            </span>
                        </div>
                    </div>
                    <div class="config-hint">
                        如需修改代理配置，请在站点列表中点击"配置"按钮
                    </div>
                </div>
            </el-form-item>
        </el-form>

        <!-- Form Actions -->
        <div class="form-actions">
            <el-button @click="$emit('cancel')">
                取消
            </el-button>
            <el-button
                type="primary"
                @click="handleSave"
                :loading="saving"
            >
                保存
            </el-button>
        </div>
    </div>
</template>

<script>
import TagManager from '../../utils/TagManager.js';

export default {
    name: 'SiteEditForm',
    props: {
        site: {
            type: Object,
            default: () => ({})
        },
        allTags: {
            type: Array,
            default: () => []
        }
    },
    data() {
        return {
            formData: {
                siteCode: '',
                siteName: '',
                macAddress: '',
                password: '',
                tags: []
            },
            newTagInput: '',
            saving: false,
            formRules: {
                siteCode: [
                    { required: true, message: '请输入站点编号', trigger: 'blur' },
                    { min: 1, max: 50, message: '站点编号长度在 1 到 50 个字符', trigger: 'blur' }
                ],
                siteName: [
                    { required: true, message: '请输入站点名称', trigger: 'blur' },
                    { min: 1, max: 100, message: '站点名称长度在 1 到 100 个字符', trigger: 'blur' }
                ],
                macAddress: [
                    { required: true, message: '请输入MAC地址', trigger: 'blur' },
                    { 
                        pattern: /^[A-Fa-f0-9]{12}$/,
                        message: 'MAC地址格式不正确，应为12位十六进制字符',
                        trigger: 'blur'
                    }
                ]
            }
        };
    },
    computed: {
        /**
         * Check if this is editing an existing site
         */
        isEditing() {
            return this.site && this.site.macAddress;
        },

        /**
         * Get available tags (excluding already selected ones)
         */
        availableTags() {
            return this.allTags.filter(tag => !this.formData.tags.includes(tag.name));
        }
    },
    watch: {
        site: {
            immediate: true,
            handler(newSite) {
                this.initializeForm(newSite);
            }
        }
    },
    methods: {
        /**
         * Initialize form with site data
         */
        initializeForm(site) {
            if (site) {
                this.formData = {
                    siteCode: site.siteCode || '',
                    siteName: site.siteName || '',
                    macAddress: site.macAddress || '',
                    password: site.password || '',
                    tags: site.tags ? site.tags.slice() : []
                };
            } else {
                this.formData = {
                    siteCode: '',
                    siteName: '',
                    macAddress: '',
                    password: '',
                    tags: []
                };
            }
        },

        /**
         * Check if tag is selected
         */
        isTagSelected(tagName) {
            return this.formData.tags.includes(tagName);
        },

        /**
         * Toggle tag selection
         */
        toggleTag(tagName) {
            const index = this.formData.tags.indexOf(tagName);
            if (index > -1) {
                this.formData.tags.splice(index, 1);
            } else {
                this.formData.tags.push(tagName);
            }
        },

        /**
         * Remove tag
         */
        removeTag(tagName) {
            const index = this.formData.tags.indexOf(tagName);
            if (index > -1) {
                this.formData.tags.splice(index, 1);
            }
        },

        /**
         * Add custom tag
         */
        addCustomTag() {
            const tag = this.newTagInput.trim();
            if (!tag) return;

            const validation = TagManager.validateTag(tag);
            if (!validation.valid) {
                this.$message.error(validation.message);
                return;
            }

            if (!this.formData.tags.includes(tag)) {
                this.formData.tags.push(tag);
                this.newTagInput = '';
            } else {
                this.$message.warning('标签已存在');
            }
        },

        /**
         * Extract port from config name
         */
        extractPort(configName) {
            const parts = configName.split('-');
            if (parts.length >= 3) {
                const port = parseInt(parts[parts.length - 1]);
                return isNaN(port) ? 'N/A' : port;
            }
            return 'N/A';
        },

        /**
         * Handle form save
         */
        async handleSave() {
            try {
                // Validate form
                const valid = await this.$refs.siteForm.validate();
                if (!valid) return;

                this.saving = true;

                // Clean and validate tags
                this.formData.tags = TagManager.cleanTags(this.formData.tags);

                // Emit save event
                this.$emit('save', Object.assign({}, this.formData));

            } catch (error) {
                console.error('Form validation failed:', error);
                this.$message.error('表单验证失败');
            } finally {
                this.saving = false;
            }
        },

        /**
         * Validate MAC address format
         */
        validateMacAddress(rule, value, callback) {
            if (!value) {
                callback(new Error('请输入MAC地址'));
                return;
            }

            // Remove common separators and convert to uppercase
            const cleanMac = value.replace(/[:-]/g, '').toUpperCase();
            
            if (!/^[A-F0-9]{12}$/.test(cleanMac)) {
                callback(new Error('MAC地址格式不正确，应为12位十六进制字符'));
                return;
            }

            // Update the form data with cleaned MAC address
            this.formData.macAddress = cleanMac;
            callback();
        }
    }
};
</script>

<style scoped>
.site-edit-form {
    padding: 20px 0;
}

.field-hint {
    font-size: 12px;
    color: #909399;
    margin-top: 5px;
    line-height: 1.4;
}

.warning-text {
    color: #E6A23C;
}

.warning-text .el-icon-warning {
    margin-right: 4px;
}

/* Tags Editor */
.tags-editor {
    border: 1px solid #DCDFE6;
    border-radius: 4px;
    padding: 15px;
    background: #FAFAFA;
}

.selected-tags {
    margin-bottom: 15px;
}

.selected-tags .tag-item {
    margin-right: 8px;
    margin-bottom: 8px;
}

.tags-section-title {
    font-size: 14px;
    color: #606266;
    margin-bottom: 10px;
    font-weight: 500;
}

.tag-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 15px;
}

.tag-button {
    margin: 0;
}

.tag-count {
    color: #909399;
    font-size: 11px;
    margin-left: 2px;
}

.add-custom-tag {
    display: flex;
    gap: 8px;
    align-items: center;
    padding-top: 10px;
    border-top: 1px solid #E4E7ED;
}

/* Configuration Summary */
.config-summary {
    border: 1px solid #E4E7ED;
    border-radius: 4px;
    padding: 15px;
    background: #F9F9F9;
}

.summary-title {
    font-weight: 500;
    color: #606266;
    margin-bottom: 10px;
}

.config-list {
    margin-bottom: 10px;
}

.config-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 0;
    border-bottom: 1px dotted #E4E7ED;
}

.config-item:last-child {
    border-bottom: none;
}

.config-name {
    font-family: monospace;
    font-size: 13px;
    color: #606266;
}

.config-ports {
    font-family: monospace;
    font-size: 13px;
    color: #409EFF;
    font-weight: 500;
}

.config-hint {
    font-size: 12px;
    color: #909399;
    font-style: italic;
}

/* Form Actions */
.form-actions {
    text-align: right;
    padding-top: 20px;
    border-top: 1px solid #E4E7ED;
    margin-top: 20px;
}

.form-actions .el-button {
    margin-left: 10px;
}

/* Responsive Design */
@media (max-width: 768px) {
    .site-edit-form {
        padding: 10px 0;
    }
    
    .tag-buttons {
        justify-content: flex-start;
    }
    
    .tag-button {
        font-size: 12px;
        padding: 4px 8px;
    }
    
    .add-custom-tag {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
    }
    
    .config-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
    }
    
    .form-actions {
        text-align: center;
    }
    
    .form-actions .el-button {
        margin: 0 5px;
    }
}

/* Form styling improvements */
.el-form-item /deep/ .el-form-item__label {
    font-weight: 500;
    color: #606266;
}

.el-form-item /deep/ .el-input__inner:focus {
    border-color: #409EFF;
}

.el-form-item /deep/ .el-input.is-disabled .el-input__inner {
    background-color: #F5F7FA;
    color: #C0C4CC;
}

/* Tag styling */
.el-tag.tag-item {
    background: #409EFF;
    color: white;
    border-color: #409EFF;
}

.el-tag.tag-item .el-tag__close {
    color: white;
}

.el-tag.tag-item .el-tag__close:hover {
    background-color: rgba(255, 255, 255, 0.2);
}
</style>