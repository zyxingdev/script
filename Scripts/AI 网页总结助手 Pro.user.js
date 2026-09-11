// ==UserScript==
// @name         AI 网页总结助手 Pro
// @namespace    https://github.com/cyx0118/ai_summary_helper-pro
// @version      2.2.0
// @description  一键总结网页，侧栏显示，快捷输出，多语言，Q&A问答，导出，深色浅色模式
// @author       超级小忍者
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      api.openai.com
// @connect      api.deepseek.com
// @connect      *
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/576238/AI%20%E7%BD%91%E9%A1%B5%E6%80%BB%E7%BB%93%E5%8A%A9%E6%89%8B%20Pro.user.js
// @updateURL https://update.greasyfork.org/scripts/576238/AI%20%E7%BD%91%E9%A1%B5%E6%80%BB%E7%BB%93%E5%8A%A9%E6%89%8B%20Pro.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const DEFAULT_CONFIG = {
        shortcutKey: 'q', useCtrl: true, useShift: false, useAlt: false,
        apiKey: '', apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
        modelName: 'deepseek-chat', maxContentLength: 8000,
        summaryLanguage: 'zh-CN', summaryLength: 'medium', summaryTone: 'neutral',
        sidebarWidth: 440, enableStreaming: true, theme: 'system',
        systemPrompt: '你是一个网页内容分析助手。直接输出总结内容，不要添加任何客套话、问候语或引言。直接用 Markdown 格式输出结构化总结。',
    };

    const LANG_OPTIONS = [
        { value: 'zh-CN', label: '中文' }, { value: 'en', label: 'English' },
        { value: 'ja', label: '日本語' }, { value: 'ko', label: '한국어' },
        { value: 'fr', label: 'Français' }, { value: 'de', label: 'Deutsch' },
        { value: 'es', label: 'Español' }, { value: 'ru', label: 'Русский' },
        { value: 'auto', label: '与原文相同' },
    ];
    const LENGTH_OPTIONS = [
        { value: 'brief', label: '简洁', tokens: 300 },
        { value: 'medium', label: '中等', tokens: 800 },
        { value: 'detailed', label: '详细', tokens: 2000 },
    ];
    const TONE_OPTIONS = [
        { value: 'neutral', label: '中性客观' }, { value: 'professional', label: '专业严谨' },
        { value: 'casual', label: '轻松通俗' }, { value: 'academic', label: '学术风格' },
        { value: 'child', label: '小学生能懂' }, { value: 'humorous', label: '幽默风格' },
        { value: 'bullet', label: '要点列举' },
    ];

    function getConfig() {
        const s = GM_getValue('ai_summary_config', null);
        if (!s) return { ...DEFAULT_CONFIG };
        try { return { ...DEFAULT_CONFIG, ...JSON.parse(s) }; } catch { return { ...DEFAULT_CONFIG }; }
    }
    function saveConfig(c) { GM_setValue('ai_summary_config', JSON.stringify(c)); }
    function getLangLabel(c) { const f = LANG_OPTIONS.find(l => l.value === c); return f ? f.label : c; }
    function getLengthInfo(v) { return LENGTH_OPTIONS.find(l => l.value === v) || LENGTH_OPTIONS[1]; }
    function getToneLabel(v) { const f = TONE_OPTIONS.find(t => t.value === v); return f ? f.label : '中性客观'; }

    // ===================== 主题管理 =====================
    function getEffectiveTheme() {
        const cfg = getConfig();
        if (cfg.theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return cfg.theme;
    }

    function applyTheme() {
        const t = getEffectiveTheme();
        document.documentElement.setAttribute('ai-theme', t);
    }

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (getConfig().theme === 'system') applyTheme();
    });

    // ===================== 样式 =====================
    GM_addStyle(`
        /* ===== 主题变量 ===== */
        :root, [ai-theme="light"] {
            --ai-bg: rgba(255,255,255,.72);
            --ai-bg-solid: #fff;
            --ai-bg-card: rgba(248,249,250,.85);
            --ai-bg-input: rgba(255,255,255,.9);
            --ai-bg-header: rgba(250,251,252,.6);
            --ai-bg-hover: rgba(241,243,244,.9);
            --ai-bg-btn: rgba(241,243,244,.8);
            --ai-border: rgba(232,234,237,.8);
            --ai-border-light: rgba(255,255,255,.5);
            --ai-border-card: rgba(255,255,255,.4);
            --ai-border-input: rgba(218,220,224,.8);
            --ai-text: #202124;
            --ai-text-heading: #1a1a2e;
            --ai-text-secondary: #5f6368;
            --ai-text-muted: #80868b;
            --ai-text-label: #3c4043;
            --ai-overlay: rgba(0,0,0,.3);
            --ai-shadow: 0 20px 60px rgba(0,0,0,.25);
            --ai-shadow-sidebar: -4px 0 24px rgba(0,0,0,.15);
            --ai-error-bg: rgba(252,232,230,.9);
            --ai-error-border: rgba(245,198,203,.8);
            --ai-error-text: #c62828;
            --ai-privacy-bg: rgba(255,248,225,.8);
            --ai-privacy-border: rgba(255,224,130,.5);
            --ai-toast-bg: rgba(50,50,50,.9);
            --ai-chat-user-bg: rgba(102,126,234,.12);
            --ai-chat-user-border: rgba(102,126,234,.2);
            --ai-chat-ai-bg: rgba(248,249,250,.85);
            --ai-chat-ai-border: rgba(255,255,255,.4);
            --ai-scroll-thumb: rgba(0,0,0,.15);
            --ai-scroll-track: transparent;
        }
        [ai-theme="dark"] {
            --ai-bg: rgba(30,30,35,.82);
            --ai-bg-solid: #1e1e23;
            --ai-bg-card: rgba(40,42,50,.85);
            --ai-bg-input: rgba(45,47,55,.9);
            --ai-bg-header: rgba(35,37,45,.7);
            --ai-bg-hover: rgba(55,57,68,.9);
            --ai-bg-btn: rgba(50,52,62,.8);
            --ai-border: rgba(60,62,72,.8);
            --ai-border-light: rgba(50,52,60,.5);
            --ai-border-card: rgba(60,62,72,.6);
            --ai-border-input: rgba(70,72,82,.8);
            --ai-text: #e0e0e0;
            --ai-text-heading: #f0f0f0;
            --ai-text-secondary: #aaa;
            --ai-text-muted: #888;
            --ai-text-label: #ccc;
            --ai-overlay: rgba(0,0,0,.55);
            --ai-shadow: 0 20px 60px rgba(0,0,0,.5);
            --ai-shadow-sidebar: -4px 0 24px rgba(0,0,0,.4);
            --ai-error-bg: rgba(60,30,30,.85);
            --ai-error-border: rgba(100,50,50,.6);
            --ai-error-text: #ff8a80;
            --ai-privacy-bg: rgba(50,45,30,.7);
            --ai-privacy-border: rgba(100,80,40,.5);
            --ai-toast-bg: rgba(40,40,45,.95);
            --ai-chat-user-bg: rgba(102,126,234,.18);
            --ai-chat-user-border: rgba(102,126,234,.3);
            --ai-chat-ai-bg: rgba(40,42,50,.85);
            --ai-chat-ai-border: rgba(60,62,72,.5);
            --ai-scroll-thumb: rgba(255,255,255,.15);
            --ai-scroll-track: transparent;
        }

        /* 滚动条 */
        #ai-summary-sidebar ::-webkit-scrollbar { width: 6px; }
        #ai-summary-sidebar ::-webkit-scrollbar-thumb { background: var(--ai-scroll-thumb); border-radius: 3px; }
        #ai-summary-sidebar ::-webkit-scrollbar-track { background: var(--ai-scroll-track); }

        /* ===== 浮动按钮 ===== */
        #ai-summary-settings-btn{position:fixed;bottom:20px;right:20px;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;cursor:pointer;font-size:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(102,126,234,.4);z-index:999998;transition:transform .2s,box-shadow .2s,right .35s cubic-bezier(.4,0,.2,1);user-select:none}
        #ai-summary-settings-btn:hover{transform:scale(1.1);box-shadow:0 6px 20px rgba(102,126,234,.6)}
        #ai-summary-settings-btn.sidebar-open{right:460px}

        /* ===== 侧栏 ===== */
        #ai-summary-sidebar{position:fixed;top:0;right:0;height:100vh;z-index:999999;display:flex;flex-direction:column;background:var(--ai-bg);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);border-left:1px solid var(--ai-border-light);box-shadow:var(--ai-shadow-sidebar);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;transform:translateX(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);color:var(--ai-text)}
        #ai-summary-sidebar.open{transform:translateX(0)}
        #ai-summary-sidebar-resize{position:absolute;top:0;left:-4px;width:8px;height:100%;cursor:col-resize;z-index:10}
        #ai-summary-sidebar-resize:hover,#ai-summary-sidebar-resize.dragging{background:rgba(102,126,234,.3)}

        .ai-sb-header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--ai-border);flex-shrink:0;background:var(--ai-bg-header)}
        .ai-sb-header h2{margin:0;font-size:16px;font-weight:600;color:var(--ai-text-heading);display:flex;align-items:center;gap:8px}
        .ai-sb-header-actions{display:flex;align-items:center;gap:4px}
        .ai-sb-btn{width:30px;height:30px;border-radius:50%;border:none;background:var(--ai-bg-btn);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:background .2s;color:var(--ai-text-secondary)}
        .ai-sb-btn:hover{background:var(--ai-bg-hover)}

        .ai-sb-info{padding:10px 20px;border-bottom:1px solid var(--ai-border);flex-shrink:0}
        .ai-sb-info .pt{font-size:13px;font-weight:600;color:var(--ai-text-label);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ai-sb-info .pu{font-size:10px;color:var(--ai-text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}

        .ai-sb-tabs{display:flex;border-bottom:1px solid var(--ai-border);flex-shrink:0}
        .ai-sb-tab{flex:1;padding:10px 0;text-align:center;font-size:13px;font-weight:500;color:var(--ai-text-secondary);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;background:none;border-top:none;border-left:none;border-right:none}
        .ai-sb-tab:hover{color:var(--ai-text-heading);background:rgba(102,126,234,.04)}
        .ai-sb-tab.active{color:#667eea;border-bottom-color:#667eea;font-weight:600}

        .ai-sb-body{padding:16px 20px;overflow-y:auto;flex:1}
        .ai-sb-footer{padding:10px 20px;border-top:1px solid var(--ai-border);display:flex;gap:8px;justify-content:flex-end;flex-shrink:0;background:var(--ai-bg-header)}

        .ai-sb-content{background:var(--ai-bg-card);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid var(--ai-border-card);border-radius:10px;padding:16px;font-size:14px;line-height:1.8;color:var(--ai-text);word-break:break-word}
        .ai-sb-content strong,.ai-sb-content b{color:var(--ai-text-heading)}
        .ai-sb-content h1,.ai-sb-content h2,.ai-sb-content h3{margin:14px 0 6px 0;color:var(--ai-text-heading)}
        .ai-sb-content h1{font-size:18px}.ai-sb-content h2{font-size:16px}.ai-sb-content h3{font-size:15px}
        .ai-sb-content ul,.ai-sb-content ol{margin:6px 0;padding-left:18px}
        .ai-sb-content li{margin:3px 0}
        .ai-sb-content code{background:rgba(100,100,120,.2);padding:1px 5px;border-radius:4px;font-size:13px}
        .ai-sb-content blockquote{border-left:3px solid #667eea;margin:8px 0;padding:4px 14px;color:var(--ai-text-secondary)}

        .ai-stream-cursor::after{content:'\u2588';animation:ai-blink 1s step-end infinite;color:#667eea}
        @keyframes ai-blink{50%{opacity:0}}

        .ai-sb-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;gap:16px}
        .ai-sb-spinner{width:36px;height:36px;border:3px solid var(--ai-border);border-top-color:#667eea;border-radius:50%;animation:ai-spin .8s linear infinite}
        @keyframes ai-spin{to{transform:rotate(360deg)}}
        .ai-sb-loading-text{font-size:13px;color:var(--ai-text-secondary)}

        .ai-sb-error{background:var(--ai-error-bg);backdrop-filter:blur(8px);border:1px solid var(--ai-error-border);border-radius:10px;padding:14px 16px;color:var(--ai-error-text);font-size:13px;line-height:1.6}

        .ai-btn{padding:7px 14px;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
        .ai-btn-primary{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;box-shadow:0 2px 8px rgba(102,126,234,.3)}
        .ai-btn-primary:hover{box-shadow:0 4px 12px rgba(102,126,234,.5);transform:translateY(-1px)}
        .ai-btn-secondary{background:var(--ai-bg-btn);color:var(--ai-text-secondary)}
        .ai-btn-ghost{background:var(--ai-bg);color:var(--ai-text-secondary);border:1px solid var(--ai-border-input)}
        .ai-btn-ghost:hover{background:var(--ai-bg-hover)}

        .ai-chat-msgs{display:flex;flex-direction:column;gap:12px}
        .ai-chat-msg{padding:12px 14px;border-radius:10px;font-size:13px;line-height:1.7;word-break:break-word}
        .ai-chat-msg.user{background:var(--ai-chat-user-bg);border:1px solid var(--ai-chat-user-border);align-self:flex-end;max-width:85%;color:var(--ai-text)}
        .ai-chat-msg.assistant{background:var(--ai-chat-ai-bg);border:1px solid var(--ai-chat-ai-border);align-self:flex-start;max-width:95%;color:var(--ai-text)}
        .ai-chat-input-area{display:flex;gap:8px;padding:10px 0 0;border-top:1px solid var(--ai-border);margin-top:12px}
        .ai-chat-input{flex:1;padding:8px 12px;border:1px solid var(--ai-border-input);border-radius:8px;font-size:13px;outline:none;background:var(--ai-bg-input);color:var(--ai-text);font-family:inherit;resize:none;min-height:36px;max-height:100px}
        .ai-chat-input:focus{border-color:#667eea;box-shadow:0 0 0 2px rgba(102,126,234,.1)}
        .ai-chat-send{padding:8px 14px;border-radius:8px;border:none;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:13px;cursor:pointer;font-weight:600;align-self:flex-end}

        /* ===== 设置面板 ===== */
        .ai-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:var(--ai-overlay);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:1000000;display:flex;align-items:center;justify-content:center;animation:ai-fi .2s ease}
        @keyframes ai-fi{from{opacity:0}to{opacity:1}}
        .ai-panel{background:var(--ai-bg);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);border:1px solid var(--ai-border-light);border-radius:16px;box-shadow:var(--ai-shadow);max-width:600px;width:92vw;max-height:88vh;display:flex;flex-direction:column;animation:ai-su .3s ease;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:var(--ai-text)}
        @keyframes ai-su{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
        .ai-panel-header{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid var(--ai-border)}
        .ai-panel-header h2{margin:0;font-size:18px;font-weight:600;color:var(--ai-text-heading);display:flex;align-items:center;gap:8px}
        .ai-panel-close{width:34px;height:34px;border-radius:50%;border:none;background:var(--ai-bg-btn);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;color:var(--ai-text-secondary)}
        .ai-panel-close:hover{background:var(--ai-bg-hover)}
        .ai-panel-body{padding:22px 24px;overflow-y:auto;flex:1}

        .ai-fg{margin-bottom:16px}
        .ai-fg label{display:block;font-size:13px;font-weight:600;color:var(--ai-text-label);margin-bottom:5px}
        .ai-fg .desc{font-size:11px;color:var(--ai-text-muted);margin-bottom:6px}
        .ai-fg input[type="text"],.ai-fg input[type="password"],.ai-fg select,.ai-fg textarea{width:100%;padding:9px 12px;border:1px solid var(--ai-border-input);border-radius:8px;font-size:13px;color:var(--ai-text);outline:none;transition:border-color .2s,box-shadow .2s;box-sizing:border-box;background:var(--ai-bg-input);font-family:inherit}
        .ai-fg input:focus,.ai-fg select:focus,.ai-fg textarea:focus{border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,.15)}
        .ai-fg textarea{resize:vertical;min-height:70px;line-height:1.5}
        .ai-fg .shortcut-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .ai-fg .mod-check{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--ai-text-secondary);cursor:pointer}
        .ai-fg .mod-check input{width:15px;height:15px;accent-color:#667eea}
        .ai-fg .key-input{width:70px!important;text-align:center;text-transform:uppercase;font-weight:600;font-size:15px;letter-spacing:2px}
        .ai-fg .shortcut-preview{font-size:12px;color:#667eea;font-weight:500;padding:3px 8px;background:rgba(102,126,234,.12);border-radius:6px}
        .ai-btn-group{display:flex;gap:10px;justify-content:flex-end;padding-top:6px}
        .ai-divider{height:1px;background:var(--ai-border);margin:14px 0}
        .ai-privacy{background:var(--ai-privacy-bg);border:1px solid var(--ai-privacy-border);border-radius:8px;padding:10px 14px;font-size:11px;color:var(--ai-text-secondary);line-height:1.5;margin-bottom:14px}
        .ai-privacy strong{color:#e65100}

        .ai-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--ai-toast-bg);backdrop-filter:blur(12px);color:#fff;padding:10px 24px;border-radius:8px;font-size:13px;z-index:1000001;animation:ai-toast-in .3s ease;box-shadow:0 4px 12px rgba(0,0,0,.3)}
        @keyframes ai-toast-in{from{transform:translateX(-50%) translateY(-20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}

        /* 主题切换按钮 */
        .ai-theme-btn{font-size:16px;line-height:1}
        .ai-theme-btn[data-theme="light"]::after{content:'\u2600\uFE0F'}
        .ai-theme-btn[data-theme="dark"]::after{content:'\uD83C\uDF19'}
        .ai-theme-btn[data-theme="system"]::after{content:'\uD83D\uDCA1'}
    `);

    function showToast(m,d){const e=document.querySelector('.ai-toast');if(e)e.remove();const t=document.createElement('div');t.className='ai-toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),d||2000)}
    function getShortcutText(c){const p=[];if(c.useCtrl)p.push('Ctrl');if(c.useShift)p.push('Shift');if(c.useAlt)p.push('Alt');p.push(c.shortcutKey.toUpperCase());return p.join(' + ')}
    function esc(s){return s.replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"')}
    function md(text){let h=text.replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>');h=h.replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>');h=h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');h=h.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>');h=h.replace(/^\- (.+)$/gm,'<li>$1</li>').replace(/^\* (.+)$/gm,'<li>$1</li>');h=h.replace(/(<li>.*<\/li>\n?)+/g,'<ul>$&</ul>').replace(/^\d+\. (.+)$/gm,'<li>$1</li>');h=h.replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');return h}

    // ===================== 内容提取 =====================
    function extractContent(){const sels=['article','[itemprop="articleBody"]','[data-testid="article-body"]','main','[role="main"]','.post-content','.article-content','.entry-content','.article-body','.post-body','.story-body','.markdown-body','.content-body','.page-content','.text-content','#content','#main-content','#article-content','.post','.article','.story'];let el=null;for(const s of sels){for(const c of document.querySelectorAll(s)){if(c.innerText.trim().length>200){el=c;break}}if(el)break}if(!el)el=document.body;const cl=el.cloneNode(true);['script','style','nav','header','footer','iframe','noscript','.ad','.ads','.advertisement','.ad-container','[class*="ad-"]','.sidebar','.side-bar','.widget','.widget-area','.comment','.comments','.comment-section','#comments','.social-share','.share-buttons','.related-posts','.related-articles','.navigation','.nav','.menu','.breadcrumb','.breadcrumbs','.cookie-banner','.cookie-notice','.popup','.modal','[role="banner"]','[role="navigation"]','[role="complementary"]','[aria-hidden="true"]','.sr-only','.visually-hidden','.newsletter','.subscribe','.signup','.paywall'].forEach(s=>{try{cl.querySelectorAll(s).forEach(e=>e.remove())}catch(x){}});let t=cl.innerText||cl.textContent||'';return t.replace(/\s+/g,' ').replace(/\n\s*\n/g,'\n').trim()}

    // ===================== API =====================
    function buildSummaryPrompt(content,config){const url=location.href,title=document.title;const tc=content.substring(0,config.maxContentLength);const lang=config.summaryLanguage==='auto'?'':`请使用${getLangLabel(config.summaryLanguage)}回答。`;const tone=getToneLabel(config.summaryTone);const lenMap={brief:'用3句话高度概括核心内容。',medium:'用结构化格式总结，包含主题概述、3-5个关键要点、核心观点、简要评价。',detailed:'进行全面深入的总结分析，包含：主题概述、详细要点分析、核心观点与建议、数据/案例提取、优缺点评价。'};return{system:config.systemPrompt,user:`${lang}请以"${tone}"的语气，${lenMap[config.summaryLength]||lenMap.medium}\n\n网页标题：${title}\n网页地址：${url}\n\n---\n${tc}`,maxTokens:getLengthInfo(config.summaryLength).tokens||800}}
    function buildQAPrompt(content,config,ch){const tc=content.substring(0,config.maxContentLength);const lang=config.summaryLanguage==='auto'?'':`请使用${getLangLabel(config.summaryLanguage)}回答。`;const msgs=[{role:'system',content:`你是一个网页内容问答助手。基于以下网页内容回答用户问题。如果问题与网页内容无关，请说明。${lang}\n\n【网页内容】\n${tc}`}];ch.forEach(m=>msgs.push(m));return{messages:msgs,maxTokens:1500}}

    function simulateStream(text,onChunk,onDone,speed){const chars=text.split('');let idx=0;const interval=speed||12;function tick(){idx=Math.min(idx+Math.ceil(chars.length/60),chars.length);onChunk(chars.slice(0,idx).join(''));if(idx>=chars.length){onDone(text);return}setTimeout(tick,interval)}tick()}

    function callAPI(requestBody,config,onChunk,onDone,onErr){delete requestBody.stream;GM_xmlhttpRequest({method:'POST',url:config.apiEndpoint,headers:{'Content-Type':'application/json','Authorization':'Bearer '+config.apiKey},data:JSON.stringify(requestBody),timeout:120000,onload:function(resp){let result='';try{const text=resp.responseText||'';if(text.indexOf('data:')!==-1&&text.indexOf('"choices"')!==-1){const lines=text.split('\n');for(const line of lines){const tr=line.trim();if(!tr||!tr.startsWith('data:'))continue;const ds=tr.substring(5).trim();if(ds==='[DONE]')continue;try{const d=JSON.parse(ds);const delta=d.choices&&d.choices[0]&&d.choices[0].delta;if(delta&&delta.content)result+=delta.content}catch(e){}}if(result){if(config.enableStreaming)simulateStream(result,onChunk,onDone,10);else onDone(result);return}}const d=JSON.parse(text);if(d.choices&&d.choices[0]){result=d.choices[0].message?d.choices[0].message.content:(d.choices[0].text||'');if(config.enableStreaming&&result.length>20)simulateStream(result,onChunk,onDone,10);else onDone(result)}else if(d.error)onErr(new Error(d.error.message||JSON.stringify(d.error)));else onErr(new Error('API 返回格式异常'))}catch(e){if(result)onDone(result);else onErr(new Error('解析响应失败'))}},onerror:function(){onErr(new Error('网络请求失败'))},ontimeout:function(){onErr(new Error('请求超时'))}})}

    // ===================== 侧栏 =====================
    let sidebar=null,summaryCache=null,chatHistory=[];

    function closeSidebar(){if(sidebar){sidebar.classList.remove('open');const b=document.getElementById('ai-summary-settings-btn');if(b)b.classList.remove('sidebar-open')}}
    function openSidebar(){if(sidebar){sidebar.classList.add('open');const b=document.getElementById('ai-summary-settings-btn');if(b)b.classList.add('sidebar-open');return}createSidebar()}

    function cycleTheme(){
        const cfg=getConfig();
        const order=['light','dark','system'];
        const idx=order.indexOf(cfg.theme);
        cfg.theme=order[(idx+1)%3];
        saveConfig(cfg);
        applyTheme();
        // 更新按钮
        const btn=document.getElementById('ai-theme-toggle');
        if(btn)btn.setAttribute('data-theme',cfg.theme);
        const map={light:'浅色',dark:'深色',system:'跟随系统'};
        showToast(`🎨 主题：${map[cfg.theme]}`);
    }

    function createSidebar(){const config=getConfig();applyTheme();const el=document.createElement('div');el.id='ai-summary-sidebar';el.style.width=config.sidebarWidth+'px';el.innerHTML=`
        <div id="ai-summary-sidebar-resize"></div>
        <div class="ai-sb-header">
            <h2>🤖 AI 助手</h2>
            <div class="ai-sb-header-actions">
                <button class="ai-sb-btn ai-theme-btn" id="ai-theme-toggle" data-theme="${config.theme}" title="切换主题"></button>
                <button class="ai-sb-btn" id="ai-sb-refresh" title="重新总结">🔄</button>
                <button class="ai-sb-btn" id="ai-sb-close" title="关闭">✕</button>
            </div>
        </div>
        <div class="ai-sb-info"><div class="pt">${esc(document.title)}</div><div class="pu">${esc(location.href)}</div></div>
        <div class="ai-sb-tabs"><button class="ai-sb-tab active" data-mode="summary">📝 总结</button><button class="ai-sb-tab" data-mode="qa">💬 问答</button></div>
        <div class="ai-sb-body" id="ai-sb-content"></div>
        <div class="ai-sb-footer" id="ai-sb-footer" style="display:none"><button class="ai-btn ai-btn-ghost" id="ai-fb-md">📄 MD</button><button class="ai-btn ai-btn-ghost" id="ai-fb-pdf">🖨 PDF</button><button class="ai-btn ai-btn-ghost" id="ai-fb-copy">📋 复制</button></div>
    `;document.body.appendChild(el);sidebar=el;requestAnimationFrame(()=>{el.classList.add('open');const b=document.getElementById('ai-summary-settings-btn');if(b)b.classList.add('sidebar-open')});document.getElementById('ai-sb-close').onclick=closeSidebar;document.getElementById('ai-sb-refresh').onclick=()=>{summaryCache=null;runSummary()};document.getElementById('ai-fb-copy').onclick=()=>{copyResult()};document.getElementById('ai-fb-md').onclick=()=>{exportMD()};document.getElementById('ai-fb-pdf').onclick=()=>{exportPDF()};document.getElementById('ai-theme-toggle').onclick=cycleTheme;el.querySelectorAll('.ai-sb-tab').forEach(tab=>{tab.onclick=()=>{el.querySelectorAll('.ai-sb-tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');if(tab.dataset.mode==='summary')runSummary();else showQA()}});setupResize(el);runSummary()}

    function runSummary(){const area=document.getElementById('ai-sb-content'),footer=document.getElementById('ai-sb-footer');if(!area)return;const config=getConfig();const ck=`${location.href}_${config.summaryLength}_${config.summaryLanguage}_${config.summaryTone}`;if(summaryCache&&summaryCache.ck===ck){displayResult(summaryCache.result,area,footer);return}area.innerHTML='<div class="ai-sb-loading"><div class="ai-sb-spinner"></div><div class="ai-sb-loading-text">正在分析网页内容...</div></div>';if(footer)footer.style.display='none';const content=extractContent();if(!content||content.length<50){area.innerHTML='<div class="ai-sb-error">⚠️ 无法提取到足够的网页内容</div>';return}const prompt=buildSummaryPrompt(content,config);const reqBody={model:config.modelName,messages:[{role:'system',content:prompt.system},{role:'user',content:prompt.user}],temperature:0.3,max_tokens:prompt.maxTokens};if(config.enableStreaming){area.innerHTML='<div class="ai-sb-content"><span class="ai-stream-cursor" id="ai-stream-el"></span></div>';callAPI(reqBody,config,(text)=>{const s=document.getElementById('ai-stream-el');if(s)s.innerHTML=md(text)},(result)=>{summaryCache={ck,result};displayResult(result,area,footer)},(err)=>{area.innerHTML=`<div class="ai-sb-error">❌ ${esc(err.message)}</div>`})}else{callAPI(reqBody,config,()=>{},(result)=>{summaryCache={ck,result};displayResult(result,area,footer)},(err)=>{area.innerHTML=`<div class="ai-sb-error">❌ ${esc(err.message)}</div>`})}}

    function displayResult(result,area,footer){area.innerHTML=`<div class="ai-sb-content">${md(result)}</div>`;if(footer)footer.style.display='flex';sidebar._result=result}

    function showQA(){const area=document.getElementById('ai-sb-content'),footer=document.getElementById('ai-sb-footer');if(!area)return;if(footer)footer.style.display='none';chatHistory=[];area.innerHTML=`<div class="ai-chat-msgs" id="ai-chat-msgs"><div class="ai-chat-msg assistant">👋 基于当前网页内容向我提问吧！</div></div><div class="ai-chat-input-area"><textarea class="ai-chat-input" id="ai-chat-input" placeholder="输入问题，Enter 发送..." rows="1"></textarea><button class="ai-chat-send" id="ai-chat-send">发送</button></div>`;const input=document.getElementById('ai-chat-input');const doSend=()=>{const q=input.value.trim();if(!q)return;input.value='';input.style.height='auto';sendQA(q)};document.getElementById('ai-chat-send').onclick=doSend;input.onkeydown=(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();doSend()}};input.oninput=()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,100)+'px'}}

    function sendQA(question){const msgsEl=document.getElementById('ai-chat-msgs');if(!msgsEl)return;const config=getConfig();msgsEl.innerHTML+=`<div class="ai-chat-msg user">${esc(question)}</div>`;chatHistory.push({role:'user',content:question});const aDiv=document.createElement('div');aDiv.className='ai-chat-msg assistant';aDiv.textContent='思考中...';msgsEl.appendChild(aDiv);msgsEl.scrollTop=msgsEl.scrollHeight;const content=extractContent();const prompt=buildQAPrompt(content,config,chatHistory);const reqBody={model:config.modelName,messages:prompt.messages,temperature:0.3,max_tokens:prompt.maxTokens};callAPI(reqBody,config,(text)=>{aDiv.innerHTML=md(text);msgsEl.scrollTop=msgsEl.scrollHeight},(result)=>{aDiv.innerHTML=md(result);chatHistory.push({role:'assistant',content:result});msgsEl.scrollTop=msgsEl.scrollHeight},(err)=>{aDiv.textContent='❌'+err.message})}

    function copyResult(){const t=sidebar._result||'';if(!t){showToast('没有可复制的内容');return}navigator.clipboard.writeText(t).then(()=>showToast('✅ 已复制')).catch(()=>{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();showToast('✅ 已复制')})}
    function exportMD(){const t=sidebar._result||'';if(!t){showToast('没有可导出的内容');return}const b=new Blob([t],{type:'text/markdown;charset=utf-8'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`summary-${document.title.replace(/[^\w\u4e00-\u9fff]/g,'_').substring(0,50)}.md`;a.click();URL.revokeObjectURL(u);showToast('✅ Markdown 已下载')}
    function exportPDF(){const t=sidebar._result||'';if(!t){showToast('没有可导出的内容');return}const h=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>总结</title><style>body{font-family:-apple-system,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.8;color:#202124}h1,h2,h3{color:#1a1a2e}blockquote{border-left:3px solid #667eea;padding:4px 14px;color:#5f6368;margin:8px 0}code{background:#f1f3f4;padding:1px 5px;border-radius:4px;font-size:13px}.meta{color:#80868b;font-size:12px;margin-bottom:20px}</style></head><body><h1>📄 网页总结</h1><div class="meta">来源：${esc(document.title)}<br>URL：${esc(location.href)}<br>时间：${new Date().toLocaleString()}</div><hr>${md(t)}</body></html>`;const w=window.open('','_blank');w.document.write(h);w.document.close();setTimeout(()=>w.print(),500);showToast('✅ 已打开打印窗口')}

    function setupResize(el){const h=document.getElementById('ai-summary-sidebar-resize');if(!h)return;h.onmousedown=(e)=>{e.preventDefault();const sx=e.clientX,sw=el.offsetWidth;h.classList.add('dragging');const mv=(e)=>{el.style.width=Math.min(Math.max(sx-e.clientX+sw,320),800)+'px'};const up=()=>{h.classList.remove('dragging');document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);const c=getConfig();c.sidebarWidth=el.offsetWidth;saveConfig(c)};document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)}}

    // ===================== 设置面板 =====================
    function createSettings(){const config=getConfig();document.querySelectorAll('.ai-overlay').forEach(e=>e.remove());const ov=document.createElement('div');ov.className='ai-overlay';ov.innerHTML=`
        <div class="ai-panel">
            <div class="ai-panel-header"><h2>⚙️ AI 助手设置</h2><button class="ai-panel-close" id="ai-set-close">✕</button></div>
            <div class="ai-panel-body">
                <div class="ai-privacy"><strong>🔒 隐私声明：</strong>网页内容将发送至您配置的 AI API 服务器处理。插件不收集/存储数据，配置保存在本地浏览器。</div>
                <div class="ai-fg"><label>🔑 API Key</label><div class="desc">支持 OpenAI / DeepSeek / Claude 等兼容接口</div><input type="password" id="s-key" value="${esc(config.apiKey)}" placeholder="sk-xxxxxxxx" /></div>
                <div class="ai-fg"><label>🌐 API 端点</label><input type="text" id="s-endpoint" value="${esc(config.apiEndpoint)}" /></div>
                <div class="ai-fg"><label>🤖 模型</label><select id="s-model">${['deepseek-chat','deepseek-v4-flash','deepseek-reasoner','gpt-4o','gpt-4o-mini','gpt-4-turbo','gpt-3.5-turbo','claude-3-5-sonnet-20241022'].map(m=>`<option value="${m}" ${config.modelName===m?'selected':''}>${m}</option>`).join('')}<option value="custom" ${!['deepseek-chat','deepseek-v4-flash','deepseek-reasoner','gpt-4o','gpt-4o-mini','gpt-4-turbo','gpt-3.5-turbo','claude-3-5-sonnet-20241022'].includes(config.modelName)?'selected':''}>自定义</option></select></div>
                <div class="ai-fg" id="s-custom-grp" style="display:none"><label>自定义模型名</label><input type="text" id="s-custom" value="${esc(config.modelName)}" /></div>
                <div class="ai-fg"><label>📏 最大内容长度</label><input type="text" id="s-maxlen" value="${config.maxContentLength}" /></div>
                <div class="ai-fg"><label>⚡ 流式输出</label><div class="desc">模拟逐字显示，减少等待感</div><label class="mod-check"><input type="checkbox" id="s-stream" ${config.enableStreaming?'checked':''} /> 启用</label></div>
                <div class="ai-divider"></div>
                <div class="ai-fg"><label>🎨 主题外观</label><div class="desc">切换深色/浅色模式，或跟随系统</div><select id="s-theme"><option value="light" ${config.theme==='light'?'selected':''}>☀️ 浅色</option><option value="dark" ${config.theme==='dark'?'selected':''}>🌙 深色</option><option value="system" ${config.theme==='system'?'selected':''}>💡 跟随系统</option></select></div>
                <div class="ai-fg"><label>🌍 总结语言</label><select id="s-lang">${LANG_OPTIONS.map(l=>`<option value="${l.value}" ${config.summaryLanguage===l.value?'selected':''}>${l.label}</option>`).join('')}</select></div>
                <div class="ai-fg"><label>📏 总结长度</label><select id="s-length">${LENGTH_OPTIONS.map(l=>`<option value="${l.value}" ${config.summaryLength===l.value?'selected':''}>${l.label}</option>`).join('')}</select></div>
                <div class="ai-fg"><label>🎨 语气风格</label><select id="s-tone">${TONE_OPTIONS.map(t=>`<option value="${t.value}" ${config.summaryTone===t.value?'selected':''}>${t.label}</option>`).join('')}</select></div>
                <div class="ai-divider"></div>
                <div class="ai-fg"><label>📝 系统提示词</label><div class="desc">自定义 AI 角色和行为</div><textarea id="s-prompt" rows="3">${esc(config.systemPrompt)}</textarea><div style="margin-top:4px"><button class="ai-btn ai-btn-secondary" id="s-reset-prompt" style="font-size:11px;padding:3px 10px">恢复默认</button></div></div>
                <div class="ai-divider"></div>
                <div class="ai-fg"><label>⌨️ 快捷键</label><div class="shortcut-row"><label class="mod-check"><input type="checkbox" id="s-ctrl" ${config.useCtrl?'checked':''} /> Ctrl</label><label class="mod-check"><input type="checkbox" id="s-shift" ${config.useShift?'checked':''} /> Shift</label><label class="mod-check"><input type="checkbox" id="s-alt" ${config.useAlt?'checked':''} /> Alt</label><span style="color:var(--ai-text-secondary)">+</span><input type="text" class="key-input" id="s-key-input" value="${config.shortcutKey.toUpperCase()}" maxlength="1" /></div><div style="margin-top:6px"><span class="shortcut-preview" id="s-preview">${getShortcutText(config)}</span></div></div>
                <div class="ai-btn-group"><button class="ai-btn ai-btn-secondary" id="s-reset">恢复默认</button><button class="ai-btn ai-btn-primary" id="s-save">💾 保存</button></div>
            </div>
        </div>
    `;document.body.appendChild(ov);document.getElementById('ai-set-close').onclick=()=>ov.remove();ov.onclick=(e)=>{if(e.target===ov)ov.remove()};const ms=document.getElementById('s-model');const cg=document.getElementById('s-custom-grp');if(ms.value==='custom')cg.style.display='block';ms.onchange=()=>{cg.style.display=ms.value==='custom'?'block':'none'};document.getElementById('s-reset-prompt').onclick=()=>{document.getElementById('s-prompt').value=DEFAULT_CONFIG.systemPrompt;showToast('✅ 已恢复默认提示词')};const up=()=>{const c={useCtrl:document.getElementById('s-ctrl').checked,useShift:document.getElementById('s-shift').checked,useAlt:document.getElementById('s-alt').checked,shortcutKey:document.getElementById('s-key-input').value||'Q'};document.getElementById('s-preview').textContent=getShortcutText(c)};['s-ctrl','s-shift','s-alt','s-key-input'].forEach(id=>{document.getElementById(id).addEventListener('input',up);document.getElementById(id).addEventListener('change',up)});document.getElementById('s-key-input').addEventListener('input',(e)=>{e.target.value=e.target.value.replace(/[^a-zA-Z]/g,'').substring(0,1)});document.getElementById('s-reset').onclick=()=>{if(confirm('确定恢复所有设置为默认值吗？')){saveConfig(DEFAULT_CONFIG);ov.remove();applyTheme();showToast('✅ 已恢复默认');setTimeout(()=>createSettings(),300)}};document.getElementById('s-save').onclick=()=>{const nc={apiKey:document.getElementById('s-key').value.trim(),apiEndpoint:document.getElementById('s-endpoint').value.trim(),modelName:ms.value==='custom'?document.getElementById('s-custom').value.trim():ms.value,maxContentLength:parseInt(document.getElementById('s-maxlen').value)||8000,enableStreaming:document.getElementById('s-stream').checked,theme:document.getElementById('s-theme').value,summaryLanguage:document.getElementById('s-lang').value,summaryLength:document.getElementById('s-length').value,summaryTone:document.getElementById('s-tone').value,systemPrompt:document.getElementById('s-prompt').value.trim()||DEFAULT_CONFIG.systemPrompt,shortcutKey:(document.getElementById('s-key-input').value||'q').toLowerCase(),useCtrl:document.getElementById('s-ctrl').checked,useShift:document.getElementById('s-shift').checked,useAlt:document.getElementById('s-alt').checked,sidebarWidth:config.sidebarWidth};if(!nc.apiKey){showToast('⚠️ 请输入 API Key');return}if(!nc.apiEndpoint){showToast('⚠️ 请输入 API 端点');return}saveConfig(nc);ov.remove();summaryCache=null;applyTheme();showToast('✅ 已保存，快捷键：'+getShortcutText(nc))}}

    // ===================== 初始化 =====================
    const FLOATING_BTN_VISIBLE_KEY = 'ai_summary_floating_btn_visible';
    function isFloatingBtnVisible(){return GM_getValue(FLOATING_BTN_VISIBLE_KEY,true)!==false}
    function setFloatingBtnVisible(visible){
        GM_setValue(FLOATING_BTN_VISIBLE_KEY,visible);
        const b=document.getElementById('ai-summary-settings-btn');
        if(visible){if(!b)createBtn();}
        else if(b)b.remove();
    }
    function createBtn(){
        if(!isFloatingBtnVisible()||document.getElementById('ai-summary-settings-btn'))return;
        const b=document.createElement('button');
        b.id='ai-summary-settings-btn';
        b.title='AI 助手设置（右键隐藏）';
        b.textContent='⚙️';
        document.body.appendChild(b);
        b.onclick=()=>createSettings();
        b.oncontextmenu=(e)=>{e.preventDefault();setFloatingBtnVisible(false);showToast('已隐藏设置按钮，可从油猴菜单恢复')};
    }

    function regShortcut(){document.addEventListener('keydown',(e)=>{const c=getConfig();const km=e.key.toLowerCase()===c.shortcutKey.toLowerCase();const cm=c.useCtrl?(e.ctrlKey||e.metaKey):(!e.ctrlKey&&!e.metaKey);const sm=c.useShift?e.shiftKey:!e.shiftKey;const am=c.useAlt?e.altKey:!e.altKey;if(km&&cm&&sm&&am){const tag=e.target.tagName.toLowerCase();if(tag==='input'||tag==='textarea'||tag==='select'||e.target.isContentEditable)return;e.preventDefault();e.stopPropagation();if(sidebar&&sidebar.classList.contains('open'))closeSidebar();else{if(!c.apiKey){showToast('⚠️ 请先设置 API Key');createSettings();return}openSidebar()}}if(e.key==='Escape')closeSidebar()})}

    GM_registerMenuCommand('⚙️ 设置',()=>createSettings());
    GM_registerMenuCommand('👁 显示/隐藏悬浮设置按钮',()=>{const visible=!isFloatingBtnVisible();setFloatingBtnVisible(visible);showToast(visible?'✅ 已显示设置按钮':'已隐藏设置按钮')});
    GM_registerMenuCommand('🤖 总结当前页面',()=>{const c=getConfig();if(!c.apiKey){showToast('⚠️ 请先设置 API Key');createSettings();return}openSidebar()});

    function init(){applyTheme();createBtn();regShortcut();console.log('[AI 助手] 已加载，快捷键：'+getShortcutText(getConfig()))}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();