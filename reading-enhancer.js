// ==UserScript==
// @name         网页阅读体验增强器
// @namespace    https://github.com/reading-enhancer
// @version      1.0.0
// @description  提升网页阅读体验的综合工具 - 支持字体调整、夜间模式、护眼模式、书签笔记、广告过滤等功能
// @author       ReadingEnhancer Team
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-start
// @license      MIT
// @homepageURL  https://github.com/reading-enhancer/userscript
// @supportURL   https://github.com/reading-enhancer/userscript/issues
// @updateURL    https://github.com/reading-enhancer/userscript/raw/main/reading-enhancer.user.js
// @downloadURL  https://github.com/reading-enhancer/userscript/raw/main/reading-enhancer.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 核心配置和常量 ====================
    const CONFIG = {
        version: '1.0.0',
        storageKey: 'reading_enhancer_config',
        bookmarksKey: 'reading_enhancer_bookmarks',
        notesKey: 'reading_enhancer_notes',
        defaultSettings: {
            // 字体设置
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 16,
            fontWeight: 400,
            letterSpacing: 0,
            wordSpacing: 0,
            lineHeight: 1.6,
            paragraphSpacing: 16,
            
            // 颜色和背景
            backgroundColor: '#ffffff',
            textColor: '#333333',
            linkColor: '#0066cc',
            selectionColor: '#b3d4fc',
            opacity: 1,
            
            // 布局设置
            maxWidth: 800,
            contentAlign: 'center',
            leftMargin: 20,
            rightMargin: 20,
            
            // 阅读模式
            darkMode: false,
            eyeCareMode: false,
            focusMode: false,
            autoNightMode: false,
            
            // 功能开关
            enableBookmarks: true,
            enableNotes: true,
            enableAdBlock: true,
            enableLazyLoad: true,
            
            // 性能设置
            enableAnimations: true,
            enableAutoScroll: false,
            scrollSpeed: 1,
            
            // 快捷键
            togglePanelKey: 'F2',
            toggleDarkModeKey: 'F3',
            toggleFocusModeKey: 'F4'
        }
    };

    // ==================== 工具函数 ====================
    const Utils = {
        // 获取或设置配置
        getConfig: () => {
            try {
                const stored = GM_getValue(CONFIG.storageKey, '');
                return stored ? JSON.parse(stored) : CONFIG.defaultSettings;
            } catch (e) {
                console.warn('读取配置失败，使用默认设置:', e);
                return CONFIG.defaultSettings;
            }
        },

        setConfig: (config) => {
            try {
                GM_setValue(CONFIG.storageKey, JSON.stringify(config));
                return true;
            } catch (e) {
                console.error('保存配置失败:', e);
                return false;
            }
        },

        // DOM操作
        createElement: (tag, className, innerHTML) => {
            const el = document.createElement(tag);
            if (className) el.className = className;
            if (innerHTML) el.innerHTML = innerHTML;
            return el;
        },

        // 防抖函数
        debounce: (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // 节流函数
        throttle: (func, limit) => {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        // 生成唯一ID
        generateId: () => '_' + Math.random().toString(36).substr(2, 9),

        // 颜色处理
        hexToRgb: (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },

        // 获取对比色
        getContrastColor: (hexColor) => {
            const rgb = Utils.hexToRgb(hexColor);
            if (!rgb) return '#000000';
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            return brightness > 128 ? '#000000' : '#ffffff';
        }
    };

    // ==================== 样式管理器 ====================
    const StyleManager = {
        styleElement: null,

        init: () => {
            StyleManager.styleElement = document.createElement('style');
            StyleManager.styleElement.id = 'reading-enhancer-styles';
            document.head.appendChild(StyleManager.styleElement);
            StyleManager.loadBaseStyles();
        },

        loadBaseStyles: () => {
            const baseCSS = `
                /* 阅读增强器基础样式 */
                .reading-enhancer-hidden {
                    display: none !important;
                }

                .reading-enhancer-panel {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 320px;
                    max-height: 80vh;
                    background: #ffffff;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    z-index: 10000;
                    font-family: system-ui, -apple-system, sans-serif;
                    font-size: 14px;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }

                .reading-enhancer-panel.dark {
                    background: #2d2d2d;
                    border-color: #404040;
                    color: #ffffff;
                }

                .reading-enhancer-header {
                    padding: 15px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-weight: 600;
                }

                .reading-enhancer-panel.dark .reading-enhancer-header {
                    background: #1a1a1a;
                    border-color: #404040;
                }

                .reading-enhancer-content {
                    max-height: 60vh;
                    overflow-y: auto;
                    padding: 0;
                }

                .reading-enhancer-tab {
                    display: flex;
                    border-bottom: 1px solid #e0e0e0;
                }

                .reading-enhancer-tab-button {
                    flex: 1;
                    padding: 10px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 12px;
                    transition: background-color 0.2s;
                }

                .reading-enhancer-tab-button:hover {
                    background: #f0f0f0;
                }

                .reading-enhancer-tab-button.active {
                    background: #007bff;
                    color: white;
                }

                .reading-enhancer-section {
                    padding: 15px;
                    border-bottom: 1px solid #f0f0f0;
                }

                .reading-enhancer-control-group {
                    margin-bottom: 15px;
                }

                .reading-enhancer-label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 500;
                    font-size: 12px;
                    color: #666;
                }

                .reading-enhancer-input {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 13px;
                }

                .reading-enhancer-range {
                    width: 100%;
                    margin: 5px 0;
                }

                .reading-enhancer-button {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    margin: 2px;
                    transition: background-color 0.2s;
                }

                .reading-enhancer-button:hover {
                    background: #0056b3;
                }

                .reading-enhancer-button.secondary {
                    background: #6c757d;
                }

                .reading-enhancer-button.danger {
                    background: #dc3545;
                }

                .reading-enhancer-toggle {
                    position: relative;
                    width: 50px;
                    height: 24px;
                    background: #ccc;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .reading-enhancer-toggle.active {
                    background: #007bff;
                }

                .reading-enhancer-toggle::after {
                    content: '';
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 20px;
                    height: 20px;
                    background: white;
                    border-radius: 50%;
                    transition: transform 0.2s;
                }

                .reading-enhancer-toggle.active::after {
                    transform: translateX(26px);
                }

                .reading-enhancer-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                }

                .reading-enhancer-close:hover {
                    background: rgba(0,0,0,0.1);
                }

                .reading-enhancer-floating-button {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    width: 56px;
                    height: 56px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,123,255,0.3);
                    z-index: 9999;
                    transition: all 0.3s ease;
                    font-size: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .reading-enhancer-floating-button:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 16px rgba(0,123,255,0.4);
                }

                /* 专注模式样式 */
                .reading-enhancer-focus-mode {
                    background: #000000 !important;
                }

                .reading-enhancer-focus-mode * {
                    max-width: none !important;
                }

                /* 阅读区域样式 */
                .reading-enhancer-content-area {
                    transition: all 0.3s ease;
                }

                /* 夜间模式样式 */
                .reading-enhancer-dark-mode {
                    filter: invert(1) hue-rotate(180deg);
                }

                .reading-enhancer-dark-mode img,
                .reading-enhancer-dark-mode video,
                .reading-enhancer-dark-mode iframe,
                .reading-enhancer-dark-mode svg {
                    filter: invert(1) hue-rotate(180deg);
                }

                /* 护眼模式样式 */
                .reading-enhancer-eye-care {
                    filter: sepia(10%) saturate(120%) brightness(110%);
                }

                /* 选中文本样式 */
                ::selection {
                    background-color: var(--selection-color, #b3d4fc);
                }

                /* 滚动条样式 */
                .reading-enhancer-content::-webkit-scrollbar {
                    width: 6px;
                }

                .reading-enhancer-content::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }

                .reading-enhancer-content::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 3px;
                }

                .reading-enhancer-content::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
            `;
            GM_addStyle(baseCSS);
        },

        updateStyles: (config) => {
            const css = `
                body {
                    font-family: ${config.fontFamily} !important;
                    font-size: ${config.fontSize}px !important;
                    font-weight: ${config.fontWeight} !important;
                    letter-spacing: ${config.letterSpacing}px !important;
                    word-spacing: ${config.wordSpacing}px !important;
                    line-height: ${config.lineHeight} !important;
                    background-color: ${config.backgroundColor} !important;
                    color: ${config.textColor} !important;
                    opacity: ${config.opacity} !important;
                }

                .reading-enhancer-content-area {
                    max-width: ${config.maxWidth}px !important;
                    margin: 0 auto !important;
                    padding-left: ${config.leftMargin}px !important;
                    padding-right: ${config.rightMargin}px !important;
                    text-align: ${config.contentAlign} !important;
                }

                p {
                    margin-bottom: ${config.paragraphSpacing}px !important;
                }

                a {
                    color: ${config.linkColor} !important;
                }

                :root {
                    --selection-color: ${config.selectionColor};
                }
            `;

            if (StyleManager.styleElement) {
                StyleManager.styleElement.textContent = css;
            }
        }
    };

    // ==================== 书签管理器 ====================
    const BookmarkManager = {
        bookmarks: [],

        init: () => {
            BookmarkManager.loadBookmarks();
        },

        loadBookmarks: () => {
            try {
                const stored = GM_getValue(CONFIG.bookmarksKey, '[]');
                BookmarkManager.bookmarks = JSON.parse(stored);
            } catch (e) {
                console.error('加载书签失败:', e);
                BookmarkManager.bookmarks = [];
            }
        },

        saveBookmarks: () => {
            try {
                GM_setValue(CONFIG.bookmarksKey, JSON.stringify(BookmarkManager.bookmarks));
                return true;
            } catch (e) {
                console.error('保存书签失败:', e);
                return false;
            }
        },

        addBookmark: (title, url, description = '') => {
            const bookmark = {
                id: Utils.generateId(),
                title: title || document.title,
                url: url || window.location.href,
                description,
                timestamp: Date.now(),
                tags: []
            };

            BookmarkManager.bookmarks.unshift(bookmark);
            BookmarkManager.saveBookmarks();
            return bookmark;
        },

        removeBookmark: (id) => {
            BookmarkManager.bookmarks = BookmarkManager.bookmarks.filter(b => b.id !== id);
            BookmarkManager.saveBookmarks();
        },

        searchBookmarks: (query) => {
            const lowercaseQuery = query.toLowerCase();
            return BookmarkManager.bookmarks.filter(bookmark =>
                bookmark.title.toLowerCase().includes(lowercaseQuery) ||
                bookmark.description.toLowerCase().includes(lowercaseQuery) ||
                bookmark.url.toLowerCase().includes(lowercaseQuery)
            );
        }
    };

    // ==================== 笔记管理器 ====================
    const NotesManager = {
        notes: [],

        init: () => {
            NotesManager.loadNotes();
            NotesManager.setupTextSelection();
        },

        loadNotes: () => {
            try {
                const stored = GM_getValue(CONFIG.notesKey, '[]');
                NotesManager.notes = JSON.parse(stored);
            } catch (e) {
                console.error('加载笔记失败:', e);
                NotesManager.notes = [];
            }
        },

        saveNotes: () => {
            try {
                GM_setValue(CONFIG.notesKey, JSON.stringify(NotesManager.notes));
                return true;
            } catch (e) {
                console.error('保存笔记失败:', e);
                return false;
            }
        },

        addNote: (content, selectedText = '', position = null) => {
            const note = {
                id: Utils.generateId(),
                content,
                selectedText,
                position,
                url: window.location.href,
                timestamp: Date.now(),
                tags: []
            };

            NotesManager.notes.unshift(note);
            NotesManager.saveNotes();
            return note;
        },

        removeNote: (id) => {
            NotesManager.notes = NotesManager.notes.filter(n => n.id !== id);
            NotesManager.saveNotes();
        },

        setupTextSelection: () => {
            document.addEventListener('mouseup', (e) => {
                const selection = window.getSelection();
                if (selection.toString().trim().length > 0) {
                    NotesManager.showNotePrompt(selection);
                }
            });
        },

        showNotePrompt: (selection) => {
            const selectedText = selection.toString().trim();
            if (selectedText.length < 3) return;

            // 创建快速笔记按钮
            const button = Utils.createElement('button', 'reading-enhancer-note-button', '📝');
            button.style.cssText = `
                position: absolute;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 12px;
                cursor: pointer;
                z-index: 10001;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            `;

            // 获取选中文本的位置
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            button.style.left = rect.left + 'px';
            button.style.top = (rect.bottom + window.scrollY + 5) + 'px';

            document.body.appendChild(button);

            button.addEventListener('click', () => {
                const noteContent = prompt('添加笔记:', selectedText);
                if (noteContent) {
                    NotesManager.addNote(noteContent, selectedText, {
                        x: rect.left,
                        y: rect.top
                    });
                    GM_notification('笔记已保存', '', '', () => {});
                }
                button.remove();
            });

            // 3秒后自动移除按钮
            setTimeout(() => {
                if (button.parentNode) {
                    button.remove();
                }
            }, 3000);
        }
    };

    // ==================== 广告拦截器 ====================
    const AdBlocker = {
        adSelectors: [
            '[class*="ad-"]',
            '[class*="ads-"]',
            '[id*="ad-"]',
            '[id*="ads-"]',
            '.advertisement',
            '.google-ads',
            '.banner-ad',
            '.popup-ad',
            '[data-ad]',
            'iframe[src*="googlesyndication"]',
            'iframe[src*="doubleclick"]',
            '.ad-container',
            '.ads-container'
        ],

        popupSelectors: [
            '.modal',
            '.popup',
            '.overlay',
            '[class*="popup"]',
            '[class*="modal"]',
            '[id*="popup"]',
            '[id*="modal"]'
        ],

        init: () => {
            AdBlocker.removeAds();
            AdBlocker.blockPopups();
            AdBlocker.setupMutationObserver();
        },

        removeAds: () => {
            AdBlocker.adSelectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        el.style.display = 'none';
                        el.classList.add('reading-enhancer-hidden');
                    });
                } catch (e) {
                    // 忽略无效选择器错误
                }
            });
        },

        blockPopups: () => {
            // 阻止弹窗
            window.addEventListener('beforeunload', (e) => {
                // 阻止某些恶意弹窗
                e.preventDefault();
            });

            // 移除已存在的弹窗
            AdBlocker.popupSelectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        // 检查是否是广告相关的弹窗
                        if (el.textContent.toLowerCase().includes('ad') ||
                            el.textContent.toLowerCase().includes('advertisement')) {
                            el.style.display = 'none';
                        }
                    });
                } catch (e) {
                    // 忽略错误
                }
            });
        },

        setupMutationObserver: () => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            AdBlocker.checkAndRemoveAd(node);
                        }
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },

        checkAndRemoveAd: (element) => {
            AdBlocker.adSelectors.forEach(selector => {
                try {
                    if (element.matches && element.matches(selector)) {
                        element.style.display = 'none';
                    }
                    // 检查子元素
                    const childAds = element.querySelectorAll(selector);
                    childAds.forEach(ad => ad.style.display = 'none');
                } catch (e) {
                    // 忽略错误
                }
            });
        }
    };

    // ==================== 性能优化器 ====================
    const PerformanceOptimizer = {
        init: () => {
            PerformanceOptimizer.setupLazyLoading();
            PerformanceOptimizer.optimizeImages();
            PerformanceOptimizer.disableAutoplay();
        },

        setupLazyLoading: () => {
            const images = document.querySelectorAll('img[src]');
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.originalSrc) {
                            img.src = img.dataset.originalSrc;
                            img.removeAttribute('data-original-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            });

            images.forEach(img => {
                if (img.getBoundingClientRect().top > window.innerHeight) {
                    img.dataset.originalSrc = img.src;
                    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNjY2MiLz48L3N2Zz4=';
                    imageObserver.observe(img);
                }
            });
        },

        optimizeImages: () => {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                img.loading = 'lazy';
                img.decoding = 'async';
            });
        },

        disableAutoplay: () => {
            const videos = document.querySelectorAll('video[autoplay]');
            videos.forEach(video => {
                video.removeAttribute('autoplay');
                video.pause();
            });

            const audios = document.querySelectorAll('audio[autoplay]');
            audios.forEach(audio => {
                audio.removeAttribute('autoplay');
                audio.pause();
            });
        }
    };

    // ==================== 用户界面管理器 ====================
    const UIManager = {
        panel: null,
        floatingButton: null,
        currentTab: 'font',
        isVisible: false,

        init: () => {
            UIManager.createFloatingButton();
            UIManager.createPanel();
            UIManager.setupKeyboardShortcuts();
        },

        createFloatingButton: () => {
            UIManager.floatingButton = Utils.createElement('button', 'reading-enhancer-floating-button', '📖');
            UIManager.floatingButton.title = '阅读增强器 (F2)';
            UIManager.floatingButton.addEventListener('click', UIManager.togglePanel);
            document.body.appendChild(UIManager.floatingButton);
        },

        createPanel: () => {
            UIManager.panel = Utils.createElement('div', 'reading-enhancer-panel reading-enhancer-hidden');
            
            const header = Utils.createElement('div', 'reading-enhancer-header', `
                <span>阅读增强器 v${CONFIG.version}</span>
                <button class="reading-enhancer-close">×</button>
            `);

            const tabButtons = Utils.createElement('div', 'reading-enhancer-tab', `
                <button class="reading-enhancer-tab-button active" data-tab="font">字体</button>
                <button class="reading-enhancer-tab-button" data-tab="theme">主题</button>
                <button class="reading-enhancer-tab-button" data-tab="layout">布局</button>
                <button class="reading-enhancer-tab-button" data-tab="tools">工具</button>
            `);

            const content = Utils.createElement('div', 'reading-enhancer-content');

            UIManager.panel.appendChild(header);
            UIManager.panel.appendChild(tabButtons);
            UIManager.panel.appendChild(content);

            document.body.appendChild(UIManager.panel);

            // 绑定事件
            header.querySelector('.reading-enhancer-close').addEventListener('click', UIManager.hidePanel);
            
            tabButtons.addEventListener('click', (e) => {
                if (e.target.classList.contains('reading-enhancer-tab-button')) {
                    UIManager.switchTab(e.target.dataset.tab);
                }
            });

            UIManager.renderTabContent();
        },

        togglePanel: () => {
            if (UIManager.isVisible) {
                UIManager.hidePanel();
            } else {
                UIManager.showPanel();
            }
        },

        showPanel: () => {
            UIManager.panel.classList.remove('reading-enhancer-hidden');
            UIManager.isVisible = true;
        },

        hidePanel: () => {
            UIManager.panel.classList.add('reading-enhancer-hidden');
            UIManager.isVisible = false;
        },

        switchTab: (tabName) => {
            // 更新标签按钮状态
            const buttons = UIManager.panel.querySelectorAll('.reading-enhancer-tab-button');
            buttons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabName);
            });

            UIManager.currentTab = tabName;
            UIManager.renderTabContent();
        },

        renderTabContent: () => {
            const content = UIManager.panel.querySelector('.reading-enhancer-content');
            const config = Utils.getConfig();

            switch (UIManager.currentTab) {
                case 'font':
                    content.innerHTML = UIManager.getFontTabContent(config);
                    UIManager.bindFontEvents();
                    break;
                case 'theme':
                    content.innerHTML = UIManager.getThemeTabContent(config);
                    UIManager.bindThemeEvents();
                    break;
                case 'layout':
                    content.innerHTML = UIManager.getLayoutTabContent(config);
                    UIManager.bindLayoutEvents();
                    break;
                case 'tools':
                    content.innerHTML = UIManager.getToolsTabContent(config);
                    UIManager.bindToolsEvents();
                    break;
            }
        },

        getFontTabContent: (config) => {
            return `
                <div class="reading-enhancer-section">
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">字体族</label>
                        <select class="reading-enhancer-input" id="fontFamily">
                            <option value="system-ui, -apple-system, sans-serif" ${config.fontFamily === 'system-ui, -apple-system, sans-serif' ? 'selected' : ''}>系统默认</option>
                            <option value="'Microsoft YaHei', sans-serif" ${config.fontFamily === "'Microsoft YaHei', sans-serif" ? 'selected' : ''}>微软雅黑</option>
                            <option value="'PingFang SC', sans-serif" ${config.fontFamily === "'PingFang SC', sans-serif" ? 'selected' : ''}>苹方</option>
                            <option value="'Source Han Sans', sans-serif" ${config.fontFamily === "'Source Han Sans', sans-serif" ? 'selected' : ''}>思源黑体</option>
                            <option value="Georgia, serif" ${config.fontFamily === 'Georgia, serif' ? 'selected' : ''}>Georgia</option>
                            <option value="'Times New Roman', serif" ${config.fontFamily === "'Times New Roman', serif" ? 'selected' : ''}>Times New Roman</option>
                        </select>
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">字体大小: <span id="fontSizeValue">${config.fontSize}px</span></label>
                        <input type="range" class="reading-enhancer-range" id="fontSize" min="10" max="30" value="${config.fontSize}">
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">字重: <span id="fontWeightValue">${config.fontWeight}</span></label>
                        <input type="range" class="reading-enhancer-range" id="fontWeight" min="100" max="900" step="100" value="${config.fontWeight}">
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">行高: <span id="lineHeightValue">${config.lineHeight}</span></label>
                        <input type="range" class="reading-enhancer-range" id="lineHeight" min="1.0" max="3.0" step="0.1" value="${config.lineHeight}">
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">字间距: <span id="letterSpacingValue">${config.letterSpacing}px</span></label>
                        <input type="range" class="reading-enhancer-range" id="letterSpacing" min="-2" max="5" step="0.5" value="${config.letterSpacing}">
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">段落间距: <span id="paragraphSpacingValue">${config.paragraphSpacing}px</span></label>
                        <input type="range" class="reading-enhancer-range" id="paragraphSpacing" min="0" max="40" value="${config.paragraphSpacing}">
                    </div>
                </div>
            `;
        },

        getThemeTabContent: (config) => {
            return `
                <div class="reading-enhancer-section">
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">背景颜色</label>
                        <input type="color" class="reading-enhancer-input" id="backgroundColor" value="${config.backgroundColor}">
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">文字颜色</label>
                        <input type="color" class="reading-enhancer-input" id="textColor" value="${config.textColor}">
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">链接颜色</label>
                        <input type="color" class="reading-enhancer-input" id="linkColor" value="${config.linkColor}">
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">选中文本颜色</label>
                        <input type="color" class="reading-enhancer-input" id="selectionColor" value="${config.selectionColor}">
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">透明度: <span id="opacityValue">${Math.round(config.opacity * 100)}%</span></label>
                        <input type="range" class="reading-enhancer-range" id="opacity" min="0.1" max="1.0" step="0.1" value="${config.opacity}">
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">主题模式</label>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <label>夜间模式</label>
                            <div class="reading-enhancer-toggle ${config.darkMode ? 'active' : ''}" id="darkModeToggle"></div>
                        </div>
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <label>护眼模式</label>
                            <div class="reading-enhancer-toggle ${config.eyeCareMode ? 'active' : ''}" id="eyeCareModeToggle"></div>
                        </div>
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <button class="reading-enhancer-button" id="presetLight">浅色主题</button>
                        <button class="reading-enhancer-button" id="presetDark">深色主题</button>
                        <button class="reading-enhancer-button" id="presetSepia">护眼主题</button>
                    </div>
                </div>
            `;
        },

        getLayoutTabContent: (config) => {
            return `
                <div class="reading-enhancer-section">
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">最大宽度: <span id="maxWidthValue">${config.maxWidth}px</span></label>
                        <input type="range" class="reading-enhancer-range" id="maxWidth" min="600" max="1200" value="${config.maxWidth}">
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">内容对齐</label>
                        <select class="reading-enhancer-input" id="contentAlign">
                            <option value="left" ${config.contentAlign === 'left' ? 'selected' : ''}>左对齐</option>
                            <option value="center" ${config.contentAlign === 'center' ? 'selected' : ''}>居中</option>
                            <option value="justify" ${config.contentAlign === 'justify' ? 'selected' : ''}>两端对齐</option>
                        </select>
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">左边距: <span id="leftMarginValue">${config.leftMargin}px</span></label>
                        <input type="range" class="reading-enhancer-range" id="leftMargin" min="0" max="100" value="${config.leftMargin}">
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <label class="reading-enhancer-label">右边距: <span id="rightMarginValue">${config.rightMargin}px</span></label>
                        <input type="range" class="reading-enhancer-range" id="rightMargin" min="0" max="100" value="${config.rightMargin}">
                    </div>
                    
                    <div class="reading-enhancer-control-group">
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <label>专注模式</label>
                            <div class="reading-enhancer-toggle ${config.focusMode ? 'active' : ''}" id="focusModeToggle"></div>
                        </div>
                    </div>
                </div>
            `;
        },

        getToolsTabContent: (config) => {
            return `
                <div class="reading-enhancer-section">
                    <h4>书签和笔记</h4>
                    <div class="reading-enhancer-control-group">
                        <button class="reading-enhancer-button" id="addBookmark">添加书签</button>
                        <button class="reading-enhancer-button" id="viewBookmarks">查看书签</button>
                        <button class="reading-enhancer-button" id="viewNotes">查看笔记</button>
                    </div>
                </div>
                
                <div class="reading-enhancer-section">
                    <h4>功能开关</h4>
                    <div class="reading-enhancer-control-group">
                        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                            <label>广告拦截</label>
                            <div class="reading-enhancer-toggle ${config.enableAdBlock ? 'active' : ''}" id="adBlockToggle"></div>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                            <label>懒加载</label>
                            <div class="reading-enhancer-toggle ${config.enableLazyLoad ? 'active' : ''}" id="lazyLoadToggle"></div>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <label>动画效果</label>
                            <div class="reading-enhancer-toggle ${config.enableAnimations ? 'active' : ''}" id="animationsToggle"></div>
                        </div>
                    </div>
                </div>
                
                <div class="reading-enhancer-section">
                    <h4>数据管理</h4>
                    <div class="reading-enhancer-control-group">
                        <button class="reading-enhancer-button" id="exportSettings">导出设置</button>
                        <button class="reading-enhancer-button secondary" id="importSettings">导入设置</button>
                        <button class="reading-enhancer-button danger" id="resetSettings">重置设置</button>
                    </div>
                </div>
                
                <div class="reading-enhancer-section">
                    <h4>统计信息</h4>
                    <div style="font-size: 12px; color: #666;">
                        <p>书签数量: ${BookmarkManager.bookmarks.length}</p>
                        <p>笔记数量: ${NotesManager.notes.length}</p>
                        <p>当前网址: ${window.location.hostname}</p>
                    </div>
                </div>
            `;
        },

        bindFontEvents: () => {
            const inputs = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paragraphSpacing'];
            
            inputs.forEach(inputId => {
                const input = document.getElementById(inputId);
                if (!input) return;

                input.addEventListener('input', Utils.debounce(() => {
                    const config = Utils.getConfig();
                    
                    if (input.type === 'range') {
                        config[inputId] = parseFloat(input.value);
                        // 更新显示值
                        const valueSpan = document.getElementById(inputId + 'Value');
                        if (valueSpan) {
                            const unit = inputId.includes('Spacing') || inputId === 'fontSize' ? 'px' : '';
                            valueSpan.textContent = input.value + unit;
                        }
                    } else {
                        config[inputId] = input.value;
                    }
                    
                    Utils.setConfig(config);
                    StyleManager.updateStyles(config);
                }, 300));
            });
        },

        bindThemeEvents: () => {
            const colorInputs = ['backgroundColor', 'textColor', 'linkColor', 'selectionColor'];
            
            colorInputs.forEach(inputId => {
                const input = document.getElementById(inputId);
                if (!input) return;

                input.addEventListener('input', Utils.debounce(() => {
                    const config = Utils.getConfig();
                    config[inputId] = input.value;
                    Utils.setConfig(config);
                    StyleManager.updateStyles(config);
                }, 300));
            });

            // 透明度滑块
            const opacityInput = document.getElementById('opacity');
            if (opacityInput) {
                opacityInput.addEventListener('input', Utils.debounce(() => {
                    const config = Utils.getConfig();
                    config.opacity = parseFloat(opacityInput.value);
                    document.getElementById('opacityValue').textContent = Math.round(config.opacity * 100) + '%';
                    Utils.setConfig(config);
                    StyleManager.updateStyles(config);
                }, 300));
            }

            // 模式切换
            const darkModeToggle = document.getElementById('darkModeToggle');
            if (darkModeToggle) {
                darkModeToggle.addEventListener('click', () => {
                    const config = Utils.getConfig();
                    config.darkMode = !config.darkMode;
                    darkModeToggle.classList.toggle('active', config.darkMode);
                    
                    if (config.darkMode) {
                        document.body.classList.add('reading-enhancer-dark-mode');
                        UIManager.panel.classList.add('dark');
                    } else {
                        document.body.classList.remove('reading-enhancer-dark-mode');
                        UIManager.panel.classList.remove('dark');
                    }
                    
                    Utils.setConfig(config);
                });
            }

            const eyeCareModeToggle = document.getElementById('eyeCareModeToggle');
            if (eyeCareModeToggle) {
                eyeCareModeToggle.addEventListener('click', () => {
                    const config = Utils.getConfig();
                    config.eyeCareMode = !config.eyeCareMode;
                    eyeCareModeToggle.classList.toggle('active', config.eyeCareMode);
                    
                    if (config.eyeCareMode) {
                        document.body.classList.add('reading-enhancer-eye-care');
                    } else {
                        document.body.classList.remove('reading-enhancer-eye-care');
                    }
                    
                    Utils.setConfig(config);
                });
            }

            // 预设主题
            document.getElementById('presetLight')?.addEventListener('click', () => {
                UIManager.applyPreset({
                    backgroundColor: '#ffffff',
                    textColor: '#333333',
                    linkColor: '#0066cc',
                    darkMode: false,
                    eyeCareMode: false
                });
            });

            document.getElementById('presetDark')?.addEventListener('click', () => {
                UIManager.applyPreset({
                    backgroundColor: '#1a1a1a',
                    textColor: '#e0e0e0',
                    linkColor: '#4dabf7',
                    darkMode: true,
                    eyeCareMode: false
                });
            });

            document.getElementById('presetSepia')?.addEventListener('click', () => {
                UIManager.applyPreset({
                    backgroundColor: '#f4f1e8',
                    textColor: '#5c4b37',
                    linkColor: '#8b4513',
                    darkMode: false,
                    eyeCareMode: true
                });
            });
        },

        bindLayoutEvents: () => {
            const inputs = ['maxWidth', 'leftMargin', 'rightMargin'];
            
            inputs.forEach(inputId => {
                const input = document.getElementById(inputId);
                if (!input) return;

                input.addEventListener('input', Utils.debounce(() => {
                    const config = Utils.getConfig();
                    config[inputId] = parseInt(input.value);
                    
                    const valueSpan = document.getElementById(inputId + 'Value');
                    if (valueSpan) {
                        valueSpan.textContent = input.value + 'px';
                    }
                    
                    Utils.setConfig(config);
                    StyleManager.updateStyles(config);
                }, 300));
            });

            // 内容对齐
            const contentAlignSelect = document.getElementById('contentAlign');
            if (contentAlignSelect) {
                contentAlignSelect.addEventListener('change', () => {
                    const config = Utils.getConfig();
                    config.contentAlign = contentAlignSelect.value;
                    Utils.setConfig(config);
                    StyleManager.updateStyles(config);
                });
            }

            // 专注模式
            const focusModeToggle = document.getElementById('focusModeToggle');
            if (focusModeToggle) {
                focusModeToggle.addEventListener('click', () => {
                    const config = Utils.getConfig();
                    config.focusMode = !config.focusMode;
                    focusModeToggle.classList.toggle('active', config.focusMode);
                    
                    if (config.focusMode) {
                        document.body.classList.add('reading-enhancer-focus-mode');
                        UIManager.hidePanel();
                    } else {
                        document.body.classList.remove('reading-enhancer-focus-mode');
                    }
                    
                    Utils.setConfig(config);
                });
            }
        },

        bindToolsEvents: () => {
            // 书签相关
            document.getElementById('addBookmark')?.addEventListener('click', () => {
                const title = prompt('书签标题:', document.title);
                if (title) {
                    BookmarkManager.addBookmark(title, window.location.href);
                    GM_notification('书签已添加', title, '', () => {});
                    UIManager.renderTabContent(); // 刷新统计信息
                }
            });

            document.getElementById('viewBookmarks')?.addEventListener('click', () => {
                UIManager.showBookmarksList();
            });

            document.getElementById('viewNotes')?.addEventListener('click', () => {
                UIManager.showNotesList();
            });

            // 功能开关
            const toggles = ['adBlock', 'lazyLoad', 'animations'];
            toggles.forEach(toggle => {
                const element = document.getElementById(toggle + 'Toggle');
                if (element) {
                    element.addEventListener('click', () => {
                        const config = Utils.getConfig();
                        const key = 'enable' + toggle.charAt(0).toUpperCase() + toggle.slice(1);
                        config[key] = !config[key];
                        element.classList.toggle('active', config[key]);
                        Utils.setConfig(config);
                        
                        // 根据设置应用功能
                        if (toggle === 'adBlock' && config[key]) {
                            AdBlocker.removeAds();
                        }
                    });
                }
            });

            // 数据管理
            document.getElementById('exportSettings')?.addEventListener('click', () => {
                UIManager.exportSettings();
            });

            document.getElementById('importSettings')?.addEventListener('click', () => {
                UIManager.importSettings();
            });

            document.getElementById('resetSettings')?.addEventListener('click', () => {
                if (confirm('确定要重置所有设置吗？此操作无法撤销。')) {
                    Utils.setConfig(CONFIG.defaultSettings);
                    StyleManager.updateStyles(CONFIG.defaultSettings);
                    UIManager.renderTabContent();
                    GM_notification('设置已重置', '所有设置已恢复默认值', '', () => {});
                }
            });
        },

        applyPreset: (preset) => {
            const config = Utils.getConfig();
            Object.assign(config, preset);
            Utils.setConfig(config);
            StyleManager.updateStyles(config);
            
            // 应用主题类
            if (preset.darkMode) {
                document.body.classList.add('reading-enhancer-dark-mode');
                UIManager.panel.classList.add('dark');
            } else {
                document.body.classList.remove('reading-enhancer-dark-mode');
                UIManager.panel.classList.remove('dark');
            }
            
            if (preset.eyeCareMode) {
                document.body.classList.add('reading-enhancer-eye-care');
            } else {
                document.body.classList.remove('reading-enhancer-eye-care');
            }
            
            UIManager.renderTabContent();
        },

        showBookmarksList: () => {
            const modal = Utils.createElement('div', 'reading-enhancer-modal');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10002;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            const content = Utils.createElement('div', 'reading-enhancer-modal-content');
            content.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 20px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            `;

            let bookmarksHtml = '<h3>我的书签</h3>';
            if (BookmarkManager.bookmarks.length === 0) {
                bookmarksHtml += '<p>暂无书签</p>';
            } else {
                bookmarksHtml += '<div class="bookmarks-list">';
                BookmarkManager.bookmarks.forEach(bookmark => {
                    const date = new Date(bookmark.timestamp).toLocaleString();
                    bookmarksHtml += `
                        <div class="bookmark-item" style="border-bottom: 1px solid #eee; padding: 10px 0;">
                            <h4><a href="${bookmark.url}" target="_blank">${bookmark.title}</a></h4>
                            <p style="color: #666; font-size: 12px;">${bookmark.url}</p>
                            <p style="color: #999; font-size: 11px;">${date}</p>
                            <button class="reading-enhancer-button danger" onclick="BookmarkManager.removeBookmark('${bookmark.id}'); this.closest('.bookmark-item').remove();">删除</button>
                        </div>
                    `;
                });
                bookmarksHtml += '</div>';
            }

            bookmarksHtml += '<button class="reading-enhancer-button" style="margin-top: 15px;" onclick="this.closest(\'.reading-enhancer-modal\').remove();">关闭</button>';

            content.innerHTML = bookmarksHtml;
            modal.appendChild(content);
            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        },

        showNotesList: () => {
            const modal = Utils.createElement('div', 'reading-enhancer-modal');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10002;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            const content = Utils.createElement('div', 'reading-enhancer-modal-content');
            content.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 20px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            `;

            let notesHtml = '<h3>我的笔记</h3>';
            if (NotesManager.notes.length === 0) {
                notesHtml += '<p>暂无笔记</p>';
            } else {
                notesHtml += '<div class="notes-list">';
                NotesManager.notes.forEach(note => {
                    const date = new Date(note.timestamp).toLocaleString();
                    notesHtml += `
                        <div class="note-item" style="border-bottom: 1px solid #eee; padding: 10px 0;">
                            <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                                <strong>选中文本:</strong> ${note.selectedText}
                            </div>
                            <div style="margin-bottom: 8px;">
                                <strong>笔记:</strong> ${note.content}
                            </div>
                            <p style="color: #666; font-size: 12px;">来源: ${note.url}</p>
                            <p style="color: #999; font-size: 11px;">${date}</p>
                            <button class="reading-enhancer-button danger" onclick="NotesManager.removeNote('${note.id}'); this.closest('.note-item').remove();">删除</button>
                        </div>
                    `;
                });
                notesHtml += '</div>';
            }

            notesHtml += '<button class="reading-enhancer-button" style="margin-top: 15px;" onclick="this.closest(\'.reading-enhancer-modal\').remove();">关闭</button>';

            content.innerHTML = notesHtml;
            modal.appendChild(content);
            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        },

        exportSettings: () => {
            const config = Utils.getConfig();
            const bookmarks = BookmarkManager.bookmarks;
            const notes = NotesManager.notes;
            
            const exportData = {
                version: CONFIG.version,
                timestamp: Date.now(),
                config,
                bookmarks,
                notes
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `reading-enhancer-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            GM_notification('导出成功', '设置已导出到文件', '', () => {});
        },

        importSettings: () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importData = JSON.parse(e.target.result);
                        
                        if (importData.config) {
                            Utils.setConfig(importData.config);
                            StyleManager.updateStyles(importData.config);
                        }
                        
                        if (importData.bookmarks) {
                            BookmarkManager.bookmarks = importData.bookmarks;
                            BookmarkManager.saveBookmarks();
                        }
                        
                        if (importData.notes) {
                            NotesManager.notes = importData.notes;
                            NotesManager.saveNotes();
                        }
                        
                        UIManager.renderTabContent();
                        GM_notification('导入成功', '设置已从文件导入', '', () => {});
                        
                    } catch (error) {
                        GM_notification('导入失败', '文件格式错误', '', () => {});
                    }
                };
                reader.readAsText(file);
            });
            
            input.click();
        },

        setupKeyboardShortcuts: () => {
            document.addEventListener('keydown', (e) => {
                if (e.code === 'F2') {
                    e.preventDefault();
                    UIManager.togglePanel();
                } else if (e.code === 'F3') {
                    e.preventDefault();
                    const config = Utils.getConfig();
                    config.darkMode = !config.darkMode;
                    Utils.setConfig(config);
                    
                    if (config.darkMode) {
                        document.body.classList.add('reading-enhancer-dark-mode');
                        UIManager.panel.classList.add('dark');
                    } else {
                        document.body.classList.remove('reading-enhancer-dark-mode');
                        UIManager.panel.classList.remove('dark');
                    }
                } else if (e.code === 'F4') {
                    e.preventDefault();
                    const config = Utils.getConfig();
                    config.focusMode = !config.focusMode;
                    Utils.setConfig(config);
                    
                    if (config.focusMode) {
                        document.body.classList.add('reading-enhancer-focus-mode');
                        UIManager.hidePanel();
                    } else {
                        document.body.classList.remove('reading-enhancer-focus-mode');
                    }
                }
            });
        }
    };

    // ==================== 主程序入口 ====================
    const ReadingEnhancer = {
        init: () => {
            // 等待DOM加载完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', ReadingEnhancer.start);
            } else {
                ReadingEnhancer.start();
            }
        },

        start: () => {
            try {
                // 初始化各个模块
                StyleManager.init();
                BookmarkManager.init();
                NotesManager.init();
                
                // 根据配置初始化功能
                const config = Utils.getConfig();
                
                if (config.enableAdBlock) {
                    AdBlocker.init();
                }
                
                if (config.enableLazyLoad) {
                    PerformanceOptimizer.init();
                }
                
                // 初始化UI
                UIManager.init();
                
                // 应用当前配置
                StyleManager.updateStyles(config);
                
                // 应用主题模式
                if (config.darkMode) {
                    document.body.classList.add('reading-enhancer-dark-mode');
                }
                
                if (config.eyeCareMode) {
                    document.body.classList.add('reading-enhancer-eye-care');
                }
                
                if (config.focusMode) {
                    document.body.classList.add('reading-enhancer-focus-mode');
                }
                
                // 设置内容区域
                ReadingEnhancer.setupContentArea();
                
                // 注册菜单命令
                ReadingEnhancer.registerMenuCommands();
                
                console.log('阅读增强器已启动 v' + CONFIG.version);
                
            } catch (error) {
                console.error('阅读增强器初始化失败:', error);
            }
        },

        setupContentArea: () => {
            // 尝试识别主要内容区域
            const contentSelectors = [
                'main',
                'article',
                '.content',
                '.post-content',
                '.article-content',
                '.entry-content',
                '#content',
                '.main-content'
            ];

            let contentArea = null;
            for (const selector of contentSelectors) {
                contentArea = document.querySelector(selector);
                if (contentArea) break;
            }

            // 如果没有找到特定的内容区域，使用body
            if (!contentArea) {
                contentArea = document.body;
            }

            contentArea.classList.add('reading-enhancer-content-area');
        },

        registerMenuCommands: () => {
            GM_registerMenuCommand('打开阅读增强器面板', () => {
                UIManager.showPanel();
            });

            GM_registerMenuCommand('切换夜间模式', () => {
                const config = Utils.getConfig();
                config.darkMode = !config.darkMode;
                Utils.setConfig(config);
                
                if (config.darkMode) {
                    document.body.classList.add('reading-enhancer-dark-mode');
                    UIManager.panel?.classList.add('dark');
                } else {
                    document.body.classList.remove('reading-enhancer-dark-mode');
                    UIManager.panel?.classList.remove('dark');
                }
            });

            GM_registerMenuCommand('切换专注模式', () => {
                const config = Utils.getConfig();
                config.focusMode = !config.focusMode;
                Utils.setConfig(config);
                
                if (config.focusMode) {
                    document.body.classList.add('reading-enhancer-focus-mode');
                    UIManager.hidePanel();
                } else {
                    document.body.classList.remove('reading-enhancer-focus-mode');
                }
            });

            GM_registerMenuCommand('添加书签', () => {
                const title = prompt('书签标题:', document.title);
                if (title) {
                    BookmarkManager.addBookmark(title, window.location.href);
                    GM_notification('书签已添加', title, '', () => {});
                }
            });

            GM_registerMenuCommand('导出设置', () => {
                UIManager.exportSettings();
            });

            GM_registerMenuCommand('重置所有设置', () => {
                if (confirm('确定要重置所有设置吗？此操作无法撤销。')) {
                    Utils.setConfig(CONFIG.defaultSettings);
                    StyleManager.updateStyles(CONFIG.defaultSettings);
                    GM_notification('设置已重置', '所有设置已恢复默认值', '', () => {});
                    location.reload();
                }
            });
        }
    };

    // ==================== 辅助功能 ====================
    
    // 自动夜间模式（根据时间）
    const AutoNightMode = {
        init: () => {
            const config = Utils.getConfig();
            if (config.autoNightMode) {
                AutoNightMode.checkTime();
                // 每分钟检查一次
                setInterval(AutoNightMode.checkTime, 60000);
            }
        },

        checkTime: () => {
            const now = new Date();
            const hour = now.getHours();
            const config = Utils.getConfig();
            
            // 晚上6点到早上6点启用夜间模式
            const shouldBeDark = hour >= 18 || hour < 6;
            
            if (shouldBeDark !== config.darkMode) {
                config.darkMode = shouldBeDark;
                Utils.setConfig(config);
                
                if (config.darkMode) {
                    document.body.classList.add('reading-enhancer-dark-mode');
                    UIManager.panel?.classList.add('dark');
                } else {
                    document.body.classList.remove('reading-enhancer-dark-mode');
                    UIManager.panel?.classList.remove('dark');
                }
            }
        }
    };

    // 阅读时间统计
    const ReadingStats = {
        startTime: null,
        totalTime: 0,
        isReading: false,

        init: () => {
            ReadingStats.startTime = Date.now();
            ReadingStats.setupVisibilityChange();
            ReadingStats.setupScrollDetection();
        },

        setupVisibilityChange: () => {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    ReadingStats.pauseReading();
                } else {
                    ReadingStats.resumeReading();
                }
            });
        },

        setupScrollDetection: () => {
            let scrollTimeout;
            window.addEventListener('scroll', () => {
                if (!ReadingStats.isReading) {
                    ReadingStats.resumeReading();
                }
                
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    ReadingStats.pauseReading();
                }, 3000); // 3秒无滚动则认为停止阅读
            });
        },

        resumeReading: () => {
            if (!ReadingStats.isReading) {
                ReadingStats.isReading = true;
                ReadingStats.startTime = Date.now();
            }
        },

        pauseReading: () => {
            if (ReadingStats.isReading) {
                ReadingStats.isReading = false;
                ReadingStats.totalTime += Date.now() - ReadingStats.startTime;
            }
        },

        getTotalTime: () => {
            let total = ReadingStats.totalTime;
            if (ReadingStats.isReading) {
                total += Date.now() - ReadingStats.startTime;
            }
            return Math.floor(total / 1000); // 返回秒数
        }
    };

    // 内容提取器（用于更好地识别正文内容）
    const ContentExtractor = {
        extract: () => {
            // 简单的正文提取算法
            const paragraphs = document.querySelectorAll('p');
            let maxScore = 0;
            let bestContainer = null;

            paragraphs.forEach(p => {
                const container = p.parentElement;
                const score = ContentExtractor.calculateScore(container);
                
                if (score > maxScore) {
                    maxScore = score;
                    bestContainer = container;
                }
            });

            return bestContainer;
        },

        calculateScore: (element) => {
            let score = 0;
            const text = element.textContent || '';
            
            // 文本长度得分
            score += Math.min(text.length / 100, 50);
            
            // 段落数量得分
            const paragraphs = element.querySelectorAll('p');
            score += paragraphs.length * 2;
            
            // 链接密度惩罚
            const links = element.querySelectorAll('a');
            const linkText = Array.from(links).reduce((sum, link) => sum + (link.textContent || '').length, 0);
            const textDensity = text.length > 0 ? linkText / text.length : 0;
            score -= textDensity * 20;
            
            // 类名和ID加分
            const className = element.className || '';
            const id = element.id || '';
            if (/content|article|post|main/.test(className + id)) {
                score += 10;
            }
            
            return score;
        }
    };

    // 智能滚动
    const SmartScroll = {
        init: () => {
            const config = Utils.getConfig();
            if (config.enableAutoScroll) {
                SmartScroll.setupAutoScroll();
            }
        },

        setupAutoScroll: () => {
            let isScrolling = false;
            let scrollSpeed = Utils.getConfig().scrollSpeed || 1;

            document.addEventListener('keydown', (e) => {
                if (e.code === 'Space' && e.ctrlKey) {
                    e.preventDefault();
                    isScrolling = !isScrolling;
                    
                    if (isScrolling) {
                        SmartScroll.startAutoScroll(scrollSpeed);
                    }
                }
            });
        },

        startAutoScroll: (speed) => {
            const scroll = () => {
                window.scrollBy(0, speed);
                
                if (window.scrollY + window.innerHeight >= document.body.scrollHeight) {
                    return; // 到达底部停止
                }
                
                setTimeout(scroll, 50);
            };
            
            scroll();
        }
    };

    // 全局错误处理
    window.addEventListener('error', (e) => {
        console.error('阅读增强器错误:', e.error);
    });

    // 启动应用
    ReadingEnhancer.init();
    
    // 启动辅助功能
    setTimeout(() => {
        AutoNightMode.init();
        ReadingStats.init();
        SmartScroll.init();
    }, 1000);

})();
