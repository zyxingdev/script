// ==UserScript==
// @name         收藏到就是学到
// @namespace    https://github.com/iamzifei/bookmark-is-learned
// @version      1.0.0-userscript
// @description  在 X/Twitter 收藏内容时自动生成 TLDR 摘要并下载 Markdown 归档
// @author       bookmark-is-learned contributors
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        GM_addStyle
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM.registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @connect      api.openai.com
// @connect      api.anthropic.com
// @connect      api.moonshot.cn
// @connect      open.bigmodel.cn
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_NAME = '收藏到就是学到';
  const MAX_VISIBLE_CARDS = 3;
  const MAX_HISTORY = 200;
  const DEFAULT_MODELS = {
    openai: 'gpt-4o-mini',
    claude: 'claude-sonnet-4-20250514',
    kimi: 'moonshot-v1-8k',
    zhipu: 'glm-4-flash',
  };
  const PROVIDER_DEFAULT_ENDPOINTS = {
    openai: 'https://api.openai.com/v1/chat/completions',
    claude: 'https://api.anthropic.com/v1/messages',
    kimi: 'https://api.moonshot.cn/v1/chat/completions',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  };
  const DEFAULT_SETTINGS = {
    provider: 'openai',
    apiKey: '',
    language: 'zh-CN',
    mdMode: 'tldr',
    model: '',
    baseUrl: '',
    autoDownloadMd: true,
    aiEnabled: true,
    theme: 'auto',
  };

  let cardContainer = null;
  let activeCards = [];
  let cardSeq = 0;
  let settings = loadSettings();
  let settingsPanel = null;

  GM_addStyle(getStyles());
  registerMenus();
  registerKeyboardShortcut();

  document.addEventListener('click', function (event) {
    const bookmarkBtn = findAncestorByTestId(event.target, 'bookmark');
    if (!bookmarkBtn) return;
    if (findAncestorByTestId(event.target, 'removeBookmark')) return;

    const article = bookmarkBtn.closest('article[data-testid="tweet"]');
    if (!article) return;

    const cardId = 'btl-' + (++cardSeq);
    createLoadingCard(cardId);
    processBookmark(article, cardId);
  }, true);

  function loadSettings() {
    return Object.assign({}, DEFAULT_SETTINGS, GM_getValue('settings', {}));
  }

  function saveSettings(next) {
    settings = Object.assign({}, settings, next);
    GM_setValue('settings', settings);
    applyThemeToContainer();
  }

  function registerMenus() {
    const registerMenuCommand = getMenuCommandRegistrar();
    if (!registerMenuCommand) return;
    registerMenuCommand(SCRIPT_NAME + ': 打开设置', openSettingsPanel);
    registerMenuCommand(SCRIPT_NAME + ': 查看历史记录', openHistoryPanel);
    registerMenuCommand(SCRIPT_NAME + ': 切换 AI 开关', function () {
      saveSettings({ aiEnabled: !settings.aiEnabled });
      notify('AI 摘要已' + (settings.aiEnabled ? '开启' : '关闭'));
    });
  }

  function getMenuCommandRegistrar() {
    if (typeof GM_registerMenuCommand === 'function') {
      return GM_registerMenuCommand;
    }
    if (typeof GM !== 'undefined' && typeof GM.registerMenuCommand === 'function') {
      return GM.registerMenuCommand.bind(GM);
    }
    return null;
  }

  function registerKeyboardShortcut() {
    document.addEventListener('keydown', function (event) {
      const key = (event.key || '').toLowerCase();
      if (event.shiftKey && event.altKey && key === 'b') {
        event.preventDefault();
        openSettingsPanel();
      }
    });
  }

  async function processBookmark(article, cardId) {
    try {
      await expandShowMore(article);
      const tweetData = extractTweetContent(article);
      const articleUrl = detectArticleUrl(article);
      const quotedTweetUrl = detectQuotedTweetUrl(article);

      const hasContent = tweetData.text || tweetData.cardText
        || tweetData.quotedText || tweetData.fallbackText;
      if (!hasContent && !articleUrl && !quotedTweetUrl) {
        updateCard(cardId, '未找到可总结的内容', true);
        return;
      }

      const result = await handleTLDRRequest(tweetData, articleUrl, quotedTweetUrl);
      await saveToHistory(tweetData, result.tldr, result.isArticle);

      if (settings.autoDownloadMd) {
        await saveMarkdownFile(
          tweetData,
          result.tldr,
          result.articleContent,
          result.quotedFullContent,
          result.isArticle,
          result.mode
        );
      }

      if (result.mode === 'raw') {
        updateCard(cardId, '已保存原文到 Markdown', false, tweetData.tweetUrl);
      } else {
        updateCard(cardId, result.tldr, false, tweetData.tweetUrl);
      }
    } catch (err) {
      updateCard(cardId, '处理出错: ' + err.message, true);
    }
  }

  async function handleTLDRRequest(tweetData, articleUrl, quotedTweetUrl) {
    let articleContent = null;
    if (articleUrl) {
      articleContent = await fetchPageContent(articleUrl);
    }

    let quotedFullContent = null;
    if (quotedTweetUrl && (tweetData.quotedText || '').length < 500) {
      quotedFullContent = await fetchPageContent(quotedTweetUrl);
    }

    const isArticle = !!(articleContent && articleContent.body);
    if (!settings.aiEnabled) {
      return { tldr: '', articleContent, quotedFullContent, isArticle, mode: 'raw' };
    }

    if (!settings.apiKey) {
      throw new Error('请先在油猴菜单中打开设置并填写 API Key');
    }

    const hasQuotedFull = !!(quotedFullContent && quotedFullContent.body);
    const prompt = buildPrompt(tweetData, articleContent, quotedFullContent, settings.language, isArticle, hasQuotedFull);
    const maxTokens = (isArticle || hasQuotedFull) ? 2000 : 1000;
    const endpoint = resolveApiEndpoint(settings.provider, settings.baseUrl);

    let tldr;
    switch (settings.provider) {
      case 'openai':
        tldr = await callOpenAICompatible(settings.apiKey, endpoint, settings.model || DEFAULT_MODELS.openai, prompt, maxTokens, 'OpenAI');
        break;
      case 'claude':
        tldr = await callClaude(settings.apiKey, endpoint, settings.model || DEFAULT_MODELS.claude, prompt, maxTokens);
        break;
      case 'kimi':
        tldr = await callOpenAICompatible(settings.apiKey, endpoint, settings.model || DEFAULT_MODELS.kimi, prompt, maxTokens, 'Kimi');
        break;
      case 'zhipu':
        tldr = await callOpenAICompatible(settings.apiKey, endpoint, settings.model || DEFAULT_MODELS.zhipu, prompt, maxTokens, '智谱');
        break;
      default:
        throw new Error('不支持的模型: ' + settings.provider);
    }

    return { tldr, articleContent, quotedFullContent, isArticle, mode: settings.mdMode };
  }

  function findAncestorByTestId(el, testId) {
    while (el && el !== document.body) {
      if (el.getAttribute && el.getAttribute('data-testid') === testId) return el;
      el = el.parentElement;
    }
    return null;
  }

  async function expandShowMore(article) {
    const links = article.querySelectorAll('[data-testid="tweet-text-show-more-link"]');
    if (links.length === 0) return;
    links.forEach((link) => link.click());
    await new Promise((resolve) => {
      const obs = new MutationObserver(() => {
        if (!article.querySelector('[data-testid="tweet-text-show-more-link"]')) {
          obs.disconnect();
          resolve();
        }
      });
      obs.observe(article, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); resolve(); }, 3000);
    });
  }

  function extractTweetContent(article) {
    const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
    const text = tweetTextEl ? tweetTextEl.innerText : '';
    const authorEl = article.querySelector('[data-testid="User-Name"]');
    const author = authorEl ? authorEl.innerText.split('\n')[0] : '';
    const quotedTweet = article.querySelector('[data-testid="quoteTweet"]');
    const quotedText = quotedTweet
      ? (quotedTweet.querySelector('[data-testid="tweetText"]')?.innerText || '') : '';
    const quotedAuthorEl = quotedTweet
      ? quotedTweet.querySelector('[data-testid="User-Name"]') : null;
    const quotedAuthor = quotedAuthorEl ? quotedAuthorEl.innerText.split('\n')[0] : '';
    const cardEl = article.querySelector('[data-testid="card.wrapper"]');
    const cardText = cardEl ? cardEl.innerText : '';
    const referencedUrls = collectReferencedUrls(article, quotedTweet);

    let fallbackText = '';
    if (!text && !cardText) {
      const h1s = article.querySelectorAll('h1');
      if (h1s.length >= 2) {
        const bodyContainer = h1s[0].parentElement;
        if (bodyContainer && bodyContainer.innerText.trim().length > 200) {
          const clone = bodyContainer.cloneNode(true);
          clone.querySelectorAll('[role="status"]').forEach((s) => s.remove());
          fallbackText = clone.innerText.trim();
        }
      }
      if (!fallbackText) {
        const clone = article.cloneNode(true);
        clone.querySelectorAll('[role="group"]').forEach((g) => g.remove());
        fallbackText = clone.innerText.trim();
      }
    }

    let tweetUrl = window.location.href;
    const allStatusLinks = article.querySelectorAll('a[href*="/status/"]');
    for (const link of allStatusLinks) {
      if (quotedTweet && quotedTweet.contains(link)) continue;
      if (link.querySelector('time')) {
        const href = link.getAttribute('href') || '';
        tweetUrl = href.startsWith('/') ? 'https://x.com' + href : (href || tweetUrl);
        break;
      }
    }

    const metrics = extractEngagementMetrics(article);
    return {
      text, author, quotedText, quotedAuthor, cardText, fallbackText,
      tweetUrl, url: window.location.href, metrics, referencedUrls,
    };
  }

  function collectReferencedUrls(article, quotedTweet) {
    const links = article.querySelectorAll('a[href]');
    const seen = new Set();
    const urls = [];
    for (const link of links) {
      if (quotedTweet && quotedTweet.contains(link)) continue;
      const hrefRaw = link.getAttribute('href') || link.href || '';
      const href = hrefRaw.startsWith('/') ? ('https://x.com' + hrefRaw) : hrefRaw;
      if (!href) continue;
      let parsed;
      try {
        parsed = new URL(href, window.location.origin);
      } catch (_) {
        continue;
      }
      const host = (parsed.hostname || '').toLowerCase();
      const path = parsed.pathname || '';
      if (host === 'x.com' || host === 'twitter.com' || host === 'www.twitter.com') {
        if (
          /^\/[^/]+\/status\/\d+/.test(path)
          || /^\/i\/(?:article|status|analytics)/.test(path)
          || /\/(?:photo|video)\//.test(path)
          || /^\/[^/]+$/.test(path)
        ) {
          continue;
        }
      }
      const normalized = parsed.toString();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      urls.push(normalized);
    }
    return urls;
  }

  function extractEngagementMetrics(article) {
    const metrics = { replies: '0', retweets: '0', likes: '0', views: '0' };
    const group = article.querySelector('[role="group"]');
    if (!group) return metrics;
    const testIds = { reply: 'replies', retweet: 'retweets', like: 'likes' };
    for (const tid in testIds) {
      const btn = group.querySelector('[data-testid="' + tid + '"]');
      if (btn) {
        const label = btn.getAttribute('aria-label') || '';
        const m = label.match(/([\d,]+)/);
        if (m) metrics[testIds[tid]] = m[1].replace(/,/g, '');
      }
    }
    const viewLink = article.querySelector('a[href*="/analytics"]');
    if (viewLink) {
      const viewLabel = viewLink.getAttribute('aria-label') || '';
      const vm = viewLabel.match(/([\d,]+)/);
      if (vm) metrics.views = vm[1].replace(/,/g, '');
    }
    return metrics;
  }

  function detectArticleUrl(article) {
    const links = article.querySelectorAll('a[href]');
    for (const link of links) {
      const href = link.href || link.getAttribute('href') || '';
      if (/\/(articles?)\//i.test(href)) {
        const cleanHref = href.replace(/\/(media|photo|video)\/.*$/, '');
        return cleanHref.startsWith('/') ? 'https://x.com' + cleanHref : cleanHref;
      }
    }
    return null;
  }

  function detectQuotedTweetUrl(article) {
    const qt = article.querySelector('[data-testid="quoteTweet"]');
    if (!qt) return null;
    const links = qt.querySelectorAll('a[href]');
    for (const link of links) {
      const href = link.href || link.getAttribute('href') || '';
      if (/\/status\/\d+/.test(href)) return href.startsWith('/') ? 'https://x.com' + href : href;
    }
    return null;
  }

  async function fetchPageContent(pageUrl) {
    try {
      const html = await gmRequest({
        method: 'GET',
        url: pageUrl,
        headers: { Accept: 'text/html' },
      });
      const doc = new DOMParser().parseFromString(html.responseText || '', 'text/html');
      const title = (doc.querySelector('title')?.textContent || '').replace(/\s*\/\s*X$/, '').trim();
      const description = doc.querySelector('meta[property="og:description"], meta[name="description"]')?.getAttribute('content') || '';
      if (description && description.length > 50) {
        return { title, body: description.slice(0, 15000) };
      }
    } catch (_) {
      // X is mostly client-rendered, so this can fail or return only metadata.
    }
    return null;
  }

  function buildPrompt(tweetData, articleContent, quotedFullContent, language, isArticle, hasQuotedFull) {
    const langMap = {
      'zh-CN': '简体中文',
      'zh-TW': '繁體中文',
      en: 'English',
      ja: '日本語',
      ko: '한국어',
    };
    const langName = langMap[language] || language;
    let userContent = '';

    if (isArticle) {
      userContent = 'Article: "' + articleContent.title + '"\n'
        + 'By ' + tweetData.author + '\n\n' + articleContent.body;
    } else if (tweetData.text) {
      userContent = 'Tweet by ' + tweetData.author + ':\n' + tweetData.text;
    } else if (tweetData.cardText) {
      userContent = 'Post by ' + tweetData.author + ':\n' + tweetData.cardText;
    } else if (tweetData.fallbackText) {
      userContent = 'Content by ' + tweetData.author + ':\n' + tweetData.fallbackText;
    }

    if (tweetData.referencedUrls && tweetData.referencedUrls.length > 0) {
      userContent += '\n\nReferenced links:\n' + tweetData.referencedUrls.map((u) => '- ' + u).join('\n');
    }

    if (hasQuotedFull) {
      const quotedBy = tweetData.quotedAuthor || 'another user';
      userContent += '\n\n--- Quoted / referenced post (by ' + quotedBy + ') ---\n' + quotedFullContent.body;
    } else if (tweetData.quotedText) {
      const qAuthor = tweetData.quotedAuthor || 'another user';
      userContent += '\n\nQuoted tweet (by ' + qAuthor + '):\n' + tweetData.quotedText;
    }

    if (!isArticle && tweetData.text && tweetData.cardText) {
      userContent += '\n\nAttached card:\n' + tweetData.cardText;
    }

    const factCheckBlock = '\n\n'
      + '--- FACT CHECK (MANDATORY) ---\n'
      + 'At the very end, add a fact-check section with this exact format:\n\n'
      + '**Fact Check**\n'
      + '- Identify the key factual claims in the content.\n'
      + '- For each claim, briefly note whether it is **verifiable**, **partially verifiable**, **opinion**, or **unverifiable**.\n'
      + '- End with an overall credibility line:\n'
      + '  Credibility: X/10 — one-sentence justification.\n'
      + '  (10 = fully verified facts with sources, 5 = mixed facts and opinions, 1 = misleading or fabricated)\n';

    let systemPrompt;
    if (isArticle) {
      systemPrompt = 'You are an expert content analyst. The user bookmarked an X Article (long-form post). '
        + 'Provide a thorough, high-value summary in ' + langName + '.\n\n'
        + 'Format:\n'
        + '**TLDR** — one sentence capturing the core thesis.\n\n'
        + '**Key Value Points**\n'
        + '- Extract 5-8 of the most valuable insights, actionable advice, data points, or frameworks from the article.\n'
        + '- Each point should be self-contained and useful even without reading the original.\n'
        + '- Use **bold** for key terms, names, numbers, and takeaways.\n\n'
        + '**Process / Steps** (only if the article is a tutorial, how-to, or guide)\n'
        + '- List the step-by-step process or methodology described in the article.\n'
        + '- Number each step and include specifics (tools, parameters, commands, etc.).\n'
        + '- Skip this section entirely if the content is not instructional.\n\n'
        + '**Why It Matters** — 1-2 sentences on the broader significance or who should care.\n'
        + factCheckBlock;
    } else if (hasQuotedFull) {
      systemPrompt = 'You are an expert content analyst. The user bookmarked a tweet that quotes/references a longer post. '
        + 'Provide a thorough summary of BOTH the tweet and the full quoted content in ' + langName + '.\n\n'
        + 'Format:\n'
        + '**TLDR** — one sentence on the overall message.\n\n'
        + '**Quoted Content Summary**\n'
        + '- Extract 5-8 key insights, value points, or actionable takeaways from the quoted long post.\n'
        + '- Use **bold** for important terms and data.\n\n'
        + '**Process / Steps** (only if the quoted post is a tutorial, how-to, or guide)\n'
        + '- List the step-by-step process described.\n'
        + '- Skip this section if the content is not instructional.\n\n'
        + '**Commenter\'s Take** — what did the bookmarked user add? Agreement, disagreement, extra context?\n'
        + factCheckBlock;
    } else {
      systemPrompt = 'You are an expert content analyst. The user bookmarked a tweet. '
        + 'Provide a valuable summary in ' + langName + '.\n\n'
        + 'Format:\n'
        + '**TLDR** — one sentence summary.\n\n'
        + '**Key Points**\n'
        + '- Extract 2-5 insights, claims, or actionable takeaways.\n'
        + '- For substantial content (threads, long tweets), extract more points with specific details.\n'
        + '- Use **bold** for key terms.\n\n'
        + '**Process / Steps** (only if the tweet describes a tutorial, method, or workflow)\n'
        + '- List numbered steps with specifics. Skip if not applicable.\n'
        + factCheckBlock;
    }

    return { system: systemPrompt, user: userContent };
  }

  function resolveApiEndpoint(provider, baseUrl) {
    if (!baseUrl) return PROVIDER_DEFAULT_ENDPOINTS[provider];
    const parsed = new URL(normalizeBaseUrl(baseUrl));
    const path = parsed.pathname.replace(/\/+$/, '');
    if (/\/v\d+\/(chat\/completions|messages)$/i.test(path)) {
      return parsed.origin + path;
    }
    const suffix = provider === 'claude' ? '/messages' : '/chat/completions';
    if (/\/v\d+$/i.test(path)) return parsed.origin + path + suffix;
    if (!path || path === '/') return parsed.origin + '/v1' + suffix;
    return parsed.origin + path + suffix;
  }

  function normalizeBaseUrl(value) {
    if (!value) return '';
    let input = value.trim();
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) {
      if (!/^https?:\/\//i.test(input)) throw new Error('Base URL 只支持 http/https');
    } else {
      input = 'https://' + input;
    }
    const url = new URL(input);
    const path = url.pathname.replace(/\/+$/, '');
    return url.origin + path;
  }

  async function callOpenAICompatible(apiKey, endpoint, promptModel, prompt, maxTokens, providerLabel) {
    const response = await gmRequest({
      method: 'POST',
      url: endpoint,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      data: JSON.stringify({
        model: promptModel,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });
    const data = parseJsonResponse(response, providerLabel);
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error(providerLabel + ' API 返回格式异常');
    }
    return data.choices[0].message.content;
  }

  async function callClaude(apiKey, endpoint, promptModel, prompt, maxTokens) {
    const response = await gmRequest({
      method: 'POST',
      url: endpoint,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      data: JSON.stringify({
        model: promptModel,
        max_tokens: maxTokens,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      }),
    });
    const data = parseJsonResponse(response, 'Claude');
    if (!data.content || !data.content[0]) throw new Error('Claude API 返回格式异常');
    return data.content[0].text;
  }

  function gmRequest(options) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest(Object.assign({}, options, {
        timeout: options.timeout || 120000,
        onload: (res) => {
          if (res.status >= 200 && res.status < 300) resolve(res);
          else reject(makeHttpError(res));
        },
        onerror: () => reject(new Error('网络请求失败')),
        ontimeout: () => reject(new Error('网络请求超时')),
      }));
    });
  }

  function makeHttpError(res) {
    let msg = '';
    try {
      const body = JSON.parse(res.responseText || '{}');
      msg = body.error && (body.error.message || body.error);
    } catch (_) {
      msg = res.responseText;
    }
    return new Error(msg || ('HTTP ' + res.status));
  }

  function parseJsonResponse(response, providerLabel) {
    try {
      return JSON.parse(response.responseText || '{}');
    } catch (_) {
      throw new Error(providerLabel + ' API 返回了非 JSON 内容');
    }
  }

  async function saveToHistory(tweetData, tldr, isArticle) {
    const history = GM_getValue('history', []);
    const previewSource = tweetData.text || tweetData.cardText
      || tweetData.quotedText || tweetData.fallbackText || '';
    let tweetPreview = previewSource.slice(0, 120);
    if (previewSource.length > 120) tweetPreview += '...';
    history.unshift({
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      timestamp: Date.now(),
      author: tweetData.author || '',
      tweetUrl: tweetData.tweetUrl || tweetData.url || '',
      tweetPreview,
      tldr,
      isArticle,
    });
    GM_setValue('history', history.slice(0, MAX_HISTORY));
  }

  async function saveMarkdownFile(tweetData, tldr, articleContent, quotedFullContent, isArticle, mode) {
    const markdown = buildMarkdownContent(tweetData, tldr, articleContent, quotedFullContent, isArticle, mode);
    const fileName = buildFileName(tweetData, articleContent, isArticle);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      if (typeof GM_download === 'function') {
        GM_download({
          url,
          name: 'bookmark-is-learned/' + fileName,
          saveAs: false,
          onload: () => setTimeout(() => URL.revokeObjectURL(url), 3000),
          onerror: () => fallbackDownload(url, fileName),
        });
      } else {
        fallbackDownload(url, fileName);
      }
    } catch (_) {
      fallbackDownload(url, fileName);
    }
  }

  function fallbackDownload(url, fileName) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 3000);
  }

  function stripArticleMetadataPrefix(body, title, author) {
    const lines = (body || '').split('\n');
    const cleanAuthor = (author || '').split('\n')[0].trim();
    const cleanTitle = (title || '').trim();
    let i = 0;
    const maxScan = Math.min(lines.length, 25);
    while (i < maxScan) {
      const line = lines[i].trim();
      if (!line) { i++; continue; }
      if (cleanTitle && line === cleanTitle) { i++; continue; }
      if (cleanAuthor && line === cleanAuthor) { i++; continue; }
      if (/^@\w+$/.test(line)) { i++; continue; }
      if (line === '·') { i++; continue; }
      if (/^\d{1,2}月\d{1,2}日$/.test(line)) { i++; continue; }
      if (/^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(line)) { i++; continue; }
      if (/^(Follow|回关|关注|Edited)$/i.test(line)) { i++; continue; }
      if (/^[\d,.]+[万亿KkMm]?$/.test(line)) { i++; continue; }
      break;
    }
    return lines.slice(i).join('\n').trim();
  }

  function escapeMarkdownLinkUrl(url) {
    return url.replace(/[()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  }

  function escapeMarkdownLinkText(text) {
    return text.replace(/[[\]]/g, '\\$&');
  }

  function buildMarkdownContent(tweetData, tldr, articleContent, quotedFullContent, isArticle, mode) {
    const author = tweetData.author || 'unknown';
    const tweetUrl = tweetData.tweetUrl || tweetData.url || '';
    const now = new Date();
    const dateStr = now.getFullYear() + '-'
      + String(now.getMonth() + 1).padStart(2, '0') + '-'
      + String(now.getDate()).padStart(2, '0') + ' '
      + String(now.getHours()).padStart(2, '0') + ':'
      + String(now.getMinutes()).padStart(2, '0');
    const lines = [];
    const title = isArticle && articleContent && articleContent.title ? articleContent.title : author;
    lines.push('# ' + title, '');
    lines.push('> **Author**: ' + author);
    lines.push('> **Source**: ' + tweetUrl);
    lines.push('> **Date**: ' + dateStr);
    const metrics = tweetData.metrics;
    if (metrics) {
      lines.push('> **Replies**: ' + (metrics.replies || '0')
        + ' · **Retweets**: ' + (metrics.retweets || '0')
        + ' · **Likes**: ' + (metrics.likes || '0')
        + ' · **Views**: ' + (metrics.views || '0'));
    }
    lines.push('', '---', '');
    if (mode !== 'raw') {
      lines.push('## TLDR', '', tldr, '', '---', '');
    }
    if (mode === 'original' || mode === 'raw') {
      lines.push('## Original Content', '');
      if (isArticle && articleContent) {
        const cleanBody = stripArticleMetadataPrefix(articleContent.body, articleContent.title, author);
        if (articleContent.title) lines.push('### ' + articleContent.title, '');
        lines.push(cleanBody);
      } else if (tweetData.text) {
        lines.push(tweetData.text);
      } else if (tweetData.cardText) {
        lines.push(tweetData.cardText);
      } else if (tweetData.fallbackText) {
        lines.push(stripArticleMetadataPrefix(tweetData.fallbackText, '', author));
      }
      lines.push('');
      const quotedBody = quotedFullContent && quotedFullContent.body
        ? quotedFullContent.body
        : (tweetData.quotedText || '');
      if (quotedBody) {
        const quotedBy = tweetData.quotedAuthor || 'unknown';
        lines.push('### Quoted Content (by ' + quotedBy + ')', '', quotedBody, '');
      }
      if (!isArticle && tweetData.text && tweetData.cardText) {
        lines.push('### Attached Card', '', tweetData.cardText, '');
      }
      if (tweetData.referencedUrls && tweetData.referencedUrls.length > 0) {
        lines.push('### Referenced Links', '');
        tweetData.referencedUrls.forEach((linkUrl) => {
          lines.push('- [' + escapeMarkdownLinkText(linkUrl) + '](' + escapeMarkdownLinkUrl(linkUrl) + ')');
        });
        lines.push('');
      }
    }
    return lines.join('\n');
  }

  function buildFileName(tweetData, articleContent, isArticle) {
    let handle = 'unknown';
    const tweetUrl = tweetData.tweetUrl || tweetData.url || '';
    try {
      const pathname = new URL(tweetUrl).pathname;
      const firstSegment = pathname.split('/')[1];
      if (firstSegment) handle = firstSegment;
    } catch (_) { /* use default */ }

    const title = isArticle && articleContent && articleContent.title
      ? articleContent.title
      : (tweetData.text || tweetData.cardText || tweetData.fallbackText || '');
    const safeHandle = sanitizeFilePart(handle).slice(0, 30) || 'unknown';
    let safeTitle = sanitizeFilePart(title.replace(/[\n\r]+/g, ' ')).slice(0, 50);
    if (title.length > 50) {
      const lastSpace = safeTitle.lastIndexOf(' ');
      if (lastSpace > 20) safeTitle = safeTitle.slice(0, lastSpace);
    }
    if (!safeTitle) safeTitle = 'untitled';
    const now = new Date();
    const timeStamp = now.getFullYear()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0')
      + '-' + String(now.getHours()).padStart(2, '0')
      + String(now.getMinutes()).padStart(2, '0')
      + String(now.getSeconds()).padStart(2, '0');
    return safeHandle + '-' + safeTitle + '-' + timeStamp + '.md';
  }

  function sanitizeFilePart(value) {
    return String(value || '')
      .replace(/[\x00-\x1f\x7f]/g, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/^\.+/, '')
      .trim();
  }

  function ensureContainer() {
    if (!cardContainer || !cardContainer.parentNode) {
      cardContainer = document.createElement('div');
      cardContainer.className = 'btl-card-container btl-' + settings.theme;
      document.body.appendChild(cardContainer);
    }
    return cardContainer;
  }

  function applyThemeToContainer() {
    if (!cardContainer) return;
    cardContainer.classList.remove('btl-auto', 'btl-light', 'btl-dark');
    cardContainer.classList.add('btl-' + settings.theme);
  }

  function createLoadingCard(cardId) {
    const container = ensureContainer();
    while (activeCards.length >= MAX_VISIBLE_CARDS) {
      dismissCard(activeCards[0].id);
    }
    const card = document.createElement('div');
    card.className = 'btl-tldr-card';
    card.dataset.cardId = cardId;
    const header = document.createElement('div');
    header.className = 'btl-card-header';
    const title = document.createElement('span');
    title.className = 'btl-card-title';
    const badge = document.createElement('span');
    badge.className = 'btl-card-title-icon';
    badge.textContent = '学';
    title.appendChild(badge);
    title.appendChild(document.createTextNode(SCRIPT_NAME));
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btl-card-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => dismissCard(cardId));
    header.appendChild(title);
    header.appendChild(closeBtn);
    const body = document.createElement('div');
    body.className = 'btl-card-body';
    const wrap = document.createElement('div');
    wrap.className = 'btl-loading';
    const spinner = document.createElement('div');
    spinner.className = 'btl-spinner';
    const loadText = document.createElement('span');
    loadText.textContent = settings.aiEnabled ? '正在生成摘要...' : '正在保存原文...';
    wrap.appendChild(spinner);
    wrap.appendChild(loadText);
    body.appendChild(wrap);
    card.appendChild(header);
    card.appendChild(body);
    container.appendChild(card);
    activeCards.push({ id: cardId, element: card, timerId: null });
  }

  function updateCard(cardId, content, isError, tweetUrl) {
    const info = activeCards.find((c) => c.id === cardId);
    if (!info) return;
    const card = info.element;
    if (isError) card.classList.add('btl-error');
    const body = card.querySelector('.btl-card-body');
    body.textContent = '';
    const contentEl = document.createElement('div');
    contentEl.className = 'btl-tldr-content';
    renderFormattedTLDR(contentEl, content || '');
    body.appendChild(contentEl);
    if (!isError && tweetUrl) {
      const linkWrap = document.createElement('div');
      linkWrap.className = 'btl-original-link';
      const a = document.createElement('a');
      a.href = tweetUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = '查看原帖 ↗';
      linkWrap.appendChild(a);
      body.appendChild(linkWrap);
    }
    info.timerId = setTimeout(() => dismissCard(cardId), 60000);
  }

  function dismissCard(cardId) {
    const idx = activeCards.findIndex((c) => c.id === cardId);
    if (idx === -1) return;
    const info = activeCards[idx];
    if (info.timerId) clearTimeout(info.timerId);
    info.element.classList.add('btl-fade-out');
    setTimeout(() => {
      if (info.element.parentNode) info.element.remove();
    }, 300);
    activeCards.splice(idx, 1);
  }

  function renderFormattedTLDR(container, text) {
    const lines = text.split('\n');
    let currentList = null;
    let currentListType = '';
    function flushList() {
      if (currentList) container.appendChild(currentList);
      currentList = null;
      currentListType = '';
    }
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { flushList(); continue; }
      const headingMatch = trimmed.match(/^\*\*(.+?)\*\*\s*[-:]?\s*$/);
      if (headingMatch) {
        flushList();
        const h = document.createElement('div');
        h.className = 'btl-section-heading';
        h.textContent = headingMatch[1];
        container.appendChild(h);
        continue;
      }
      const scoreMatch = trimmed.match(/^(Credibility|可信度|信頼度)\s*[:：]\s*(\d+)\s*\/\s*10/i);
      if (scoreMatch) {
        flushList();
        const sl = document.createElement('div');
        sl.className = 'btl-score-line';
        const score = parseInt(scoreMatch[2], 10);
        const cls = score >= 7 ? 'btl-score-high' : (score >= 4 ? 'btl-score-mid' : 'btl-score-low');
        const badge = document.createElement('span');
        badge.className = 'btl-score-badge ' + cls;
        badge.textContent = scoreMatch[2] + '/10';
        const justification = trimmed.slice(trimmed.indexOf('/10') + 3).replace(/^\s*[-—]\s*/, '');
        sl.appendChild(document.createTextNode(scoreMatch[1] + ': '));
        sl.appendChild(badge);
        if (justification) {
          const rest = document.createElement('span');
          rest.textContent = ' — ' + justification;
          sl.appendChild(rest);
        }
        container.appendChild(sl);
        continue;
      }
      const bulletMatch = trimmed.match(/^[-•*]\s+(.*)/);
      if (bulletMatch) {
        if (currentListType !== 'ul') {
          flushList();
          currentList = document.createElement('ul');
          currentListType = 'ul';
        }
        const li = document.createElement('li');
        renderInline(li, bulletMatch[1]);
        currentList.appendChild(li);
        continue;
      }
      const numMatch = trimmed.match(/^\d+[.)]\s+(.*)/);
      if (numMatch) {
        if (currentListType !== 'ol') {
          flushList();
          currentList = document.createElement('ol');
          currentListType = 'ol';
        }
        const li = document.createElement('li');
        renderInline(li, numMatch[1]);
        currentList.appendChild(li);
        continue;
      }
      flushList();
      const p = document.createElement('p');
      renderInline(p, trimmed);
      container.appendChild(p);
    }
    flushList();
  }

  function renderInline(el, text) {
    const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length === 0) {
      el.appendChild(document.createTextNode(text));
      return;
    }
    let cursor = 0;
    for (const m of matches) {
      if (m.index > cursor) el.appendChild(document.createTextNode(text.slice(cursor, m.index)));
      if (m[2]) {
        const s = document.createElement('strong');
        s.textContent = m[2];
        el.appendChild(s);
      } else if (m[3]) {
        const e = document.createElement('em');
        e.textContent = m[3];
        el.appendChild(e);
      }
      cursor = m.index + m[0].length;
    }
    if (cursor < text.length) el.appendChild(document.createTextNode(text.slice(cursor)));
  }

  function openSettingsPanel() {
    closePanel();
    settingsPanel = document.createElement('div');
    settingsPanel.className = 'btl-modal';
    settingsPanel.innerHTML = [
      '<div class="btl-panel btl-' + escapeAttr(settings.theme) + '">',
      '<div class="btl-panel-header"><strong>' + SCRIPT_NAME + '</strong><button class="btl-panel-close" type="button">×</button></div>',
      '<div class="btl-panel-body">',
      '<label>AI 模型<select id="btl-provider">',
      option('openai', 'OpenAI (GPT)', settings.provider),
      option('claude', 'Claude (Anthropic)', settings.provider),
      option('kimi', 'Kimi (月之暗面)', settings.provider),
      option('zhipu', '智谱 (GLM)', settings.provider),
      '</select></label>',
      '<label>API Key<input id="btl-apiKey" type="password" value="' + escapeAttr(settings.apiKey) + '" placeholder="输入你的 API Key"></label>',
      '<label>模型版本<input id="btl-model" type="text" value="' + escapeAttr(settings.model) + '" placeholder="留空使用默认模型"></label>',
      '<label>Base URL<input id="btl-baseUrl" type="text" value="' + escapeAttr(settings.baseUrl) + '" placeholder="例如 https://your-proxy.com/v1"></label>',
      '<div class="btl-grid">',
      '<label>摘要语言<select id="btl-language">',
      option('zh-CN', '简体中文', settings.language),
      option('zh-TW', '繁體中文', settings.language),
      option('en', 'English', settings.language),
      option('ja', '日本語', settings.language),
      option('ko', '한국어', settings.language),
      '</select></label>',
      '<label>保存模式<select id="btl-mdMode">',
      option('tldr', 'TLDR 摘要模式', settings.mdMode),
      option('original', '原文模式', settings.mdMode),
      '</select></label>',
      '<label>主题<select id="btl-theme">',
      option('auto', '跟随系统', settings.theme),
      option('light', '浅色', settings.theme),
      option('dark', '深色', settings.theme),
      '</select></label>',
      '</div>',
      '<label class="btl-check"><input id="btl-aiEnabled" type="checkbox"' + (settings.aiEnabled ? ' checked' : '') + '> 开启 AI 摘要和事实核查</label>',
      '<label class="btl-check"><input id="btl-autoDownloadMd" type="checkbox"' + (settings.autoDownloadMd ? ' checked' : '') + '> 自动下载 Markdown 文件</label>',
      '<p class="btl-note">油猴版会保存到浏览器下载目录；浏览器扩展版的 Native Helper 自定义文件夹和本地 Claude CLI 在油猴环境中不可用。</p>',
      '<div id="btl-panel-status" class="btl-panel-status"></div>',
      '</div>',
      '<div class="btl-panel-footer"><button id="btl-history" type="button">历史记录</button><button id="btl-save" type="button">保存设置</button></div>',
      '</div>',
    ].join('');
    document.documentElement.appendChild(settingsPanel);
    settingsPanel.querySelector('.btl-panel-close').addEventListener('click', closePanel);
    settingsPanel.querySelector('#btl-history').addEventListener('click', openHistoryPanel);
    settingsPanel.querySelector('#btl-save').addEventListener('click', savePanelSettings);
    settingsPanel.addEventListener('click', (event) => {
      if (event.target === settingsPanel) closePanel();
    });
  }

  function savePanelSettings() {
    try {
      const baseUrlInput = getPanelValue('#btl-baseUrl').trim();
      const normalizedBaseUrl = baseUrlInput ? normalizeBaseUrl(baseUrlInput) : '';
      saveSettings({
        provider: getPanelValue('#btl-provider'),
        apiKey: getPanelValue('#btl-apiKey').trim(),
        language: getPanelValue('#btl-language'),
        mdMode: getPanelValue('#btl-mdMode'),
        model: getPanelValue('#btl-model').trim(),
        baseUrl: normalizedBaseUrl,
        theme: getPanelValue('#btl-theme'),
        aiEnabled: settingsPanel.querySelector('#btl-aiEnabled').checked,
        autoDownloadMd: settingsPanel.querySelector('#btl-autoDownloadMd').checked,
      });
      settingsPanel.querySelector('#btl-panel-status').textContent = '设置已保存';
      notify('设置已保存');
      setTimeout(closePanel, 500);
    } catch (err) {
      settingsPanel.querySelector('#btl-panel-status').textContent = err.message;
    }
  }

  function getPanelValue(selector) {
    return settingsPanel.querySelector(selector).value;
  }

  function openHistoryPanel() {
    closePanel();
    const history = GM_getValue('history', []);
    settingsPanel = document.createElement('div');
    settingsPanel.className = 'btl-modal';
    const items = history.length ? history.map((item) => {
      return '<div class="btl-history-item">'
        + '<div class="btl-history-meta">' + escapeHtml(new Date(item.timestamp).toLocaleString()) + ' · ' + escapeHtml(item.author || 'unknown') + '</div>'
        + '<div class="btl-history-preview">' + escapeHtml(item.tweetPreview || '') + '</div>'
        + '<a href="' + escapeAttr(item.tweetUrl || '#') + '" target="_blank" rel="noopener noreferrer">查看原帖</a>'
        + '</div>';
    }).join('') : '<div class="btl-empty">还没有收藏记录</div>';
    settingsPanel.innerHTML = [
      '<div class="btl-panel btl-' + escapeAttr(settings.theme) + '">',
      '<div class="btl-panel-header"><strong>历史记录</strong><button class="btl-panel-close" type="button">×</button></div>',
      '<div class="btl-history-list">' + items + '</div>',
      '<div class="btl-panel-footer"><button id="btl-settings" type="button">设置</button><button id="btl-clear-history" type="button">清空历史</button></div>',
      '</div>',
    ].join('');
    document.documentElement.appendChild(settingsPanel);
    settingsPanel.querySelector('.btl-panel-close').addEventListener('click', closePanel);
    settingsPanel.querySelector('#btl-settings').addEventListener('click', openSettingsPanel);
    settingsPanel.querySelector('#btl-clear-history').addEventListener('click', function () {
      GM_setValue('history', []);
      openHistoryPanel();
    });
  }

  function closePanel() {
    if (settingsPanel && settingsPanel.parentNode) settingsPanel.remove();
    settingsPanel = null;
  }

  function option(value, label, current) {
    return '<option value="' + escapeAttr(value) + '"' + (value === current ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function notify(message) {
    if (typeof GM_notification === 'function') {
      GM_notification({ title: SCRIPT_NAME, text: message, timeout: 1800 });
      return;
    }
    console.log('[bookmark-is-learned]', message);
  }

  function getStyles() {
    return `
.btl-card-container {
  --btl-card-bg: #ffffff;
  --btl-card-shadow: 0 8px 32px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08);
  --btl-text: #0f1419;
  --btl-text-bold: #0f1419;
  --btl-text-secondary: #536471;
  --btl-border: #eff3f4;
  --btl-close-hover-bg: rgba(0, 0, 0, 0.06);
  --btl-score-bg: rgba(0, 0, 0, 0.03);
  --btl-heading-border: rgba(29, 155, 240, 0.15);
  --btl-scrollbar: rgba(0, 0, 0, 0.12);
  --btl-spinner-border: #eff3f4;
  --btl-score-high-bg: #d4edda;
  --btl-score-high-text: #155724;
  --btl-score-mid-bg: #fff3cd;
  --btl-score-mid-text: #856404;
  --btl-score-low-bg: #f8d7da;
  --btl-score-low-text: #721c24;
  position: fixed;
  bottom: 64px;
  right: 24px;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.btl-card-container.btl-dark {
  --btl-card-bg: #16181c;
  --btl-card-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  --btl-text: #e7e9ea;
  --btl-text-bold: #ffffff;
  --btl-text-secondary: #71767b;
  --btl-border: #2f3336;
  --btl-close-hover-bg: rgba(255, 255, 255, 0.08);
  --btl-score-bg: rgba(255, 255, 255, 0.05);
  --btl-heading-border: rgba(29, 155, 240, 0.25);
  --btl-scrollbar: rgba(255, 255, 255, 0.12);
  --btl-spinner-border: #2f3336;
  --btl-score-high-bg: #1e4620;
  --btl-score-high-text: #a3d9a5;
  --btl-score-mid-bg: #4a3c10;
  --btl-score-mid-text: #f0d060;
  --btl-score-low-bg: #4a1c1e;
  --btl-score-low-text: #f0a0a5;
}
@media (prefers-color-scheme: dark) {
  .btl-card-container.btl-auto {
    --btl-card-bg: #16181c;
    --btl-card-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    --btl-text: #e7e9ea;
    --btl-text-bold: #ffffff;
    --btl-text-secondary: #71767b;
    --btl-border: #2f3336;
    --btl-close-hover-bg: rgba(255, 255, 255, 0.08);
    --btl-score-bg: rgba(255, 255, 255, 0.05);
    --btl-heading-border: rgba(29, 155, 240, 0.25);
    --btl-scrollbar: rgba(255, 255, 255, 0.12);
    --btl-spinner-border: #2f3336;
    --btl-score-high-bg: #1e4620;
    --btl-score-high-text: #a3d9a5;
    --btl-score-mid-bg: #4a3c10;
    --btl-score-mid-text: #f0d060;
    --btl-score-low-bg: #4a1c1e;
    --btl-score-low-text: #f0a0a5;
  }
}
.btl-tldr-card {
  width: 420px;
  max-height: 55vh;
  background: var(--btl-card-bg);
  border-radius: 16px;
  box-shadow: var(--btl-card-shadow);
  overflow: hidden;
  pointer-events: auto;
  animation: btl-slide-in 0.3s ease-out;
}
.btl-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--btl-border);
}
.btl-card-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--btl-text);
  display: flex;
  align-items: center;
  gap: 6px;
}
.btl-card-title-icon {
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: #1d9bf0;
  color: #fff;
  font-size: 12px;
}
.btl-card-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--btl-text-secondary);
  padding: 2px 6px;
  border-radius: 50%;
  line-height: 1;
}
.btl-card-close:hover {
  background: var(--btl-close-hover-bg);
  color: var(--btl-text);
}
.btl-card-body {
  padding: 12px 14px;
  max-height: calc(55vh - 44px);
  overflow-y: auto;
}
.btl-card-body::-webkit-scrollbar { width: 5px; }
.btl-card-body::-webkit-scrollbar-thumb { background: var(--btl-scrollbar); border-radius: 3px; }
.btl-original-link {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--btl-border);
}
.btl-original-link a {
  font-size: 12px;
  color: #1d9bf0;
  text-decoration: none;
  font-weight: 500;
}
.btl-tldr-content {
  font-size: 13px;
  line-height: 1.65;
  color: var(--btl-text);
}
.btl-tldr-content p { margin: 0 0 8px 0; }
.btl-tldr-content p:last-child { margin-bottom: 0; }
.btl-tldr-content strong { font-weight: 700; color: var(--btl-text-bold); }
.btl-tldr-content em { font-style: italic; }
.btl-tldr-content ul { margin: 6px 0; padding-left: 18px; list-style-type: disc; }
.btl-tldr-content ol { margin: 6px 0; padding-left: 20px; }
.btl-tldr-content li { margin-bottom: 4px; padding-left: 2px; }
.btl-tldr-content li::marker { color: #1d9bf0; }
.btl-section-heading {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #1d9bf0;
  margin: 12px 0 4px 0;
  padding-bottom: 3px;
  border-bottom: 1px solid var(--btl-heading-border);
}
.btl-section-heading:first-child { margin-top: 0; }
.btl-score-line {
  margin: 10px 0 0 0;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--btl-score-bg);
  font-size: 12px;
  line-height: 1.5;
}
.btl-score-badge {
  display: inline-block;
  font-weight: 800;
  padding: 1px 7px;
  border-radius: 6px;
  font-size: 13px;
}
.btl-score-high { background: var(--btl-score-high-bg); color: var(--btl-score-high-text); }
.btl-score-mid { background: var(--btl-score-mid-bg); color: var(--btl-score-mid-text); }
.btl-score-low { background: var(--btl-score-low-bg); color: var(--btl-score-low-text); }
.btl-tldr-card.btl-error .btl-tldr-content { color: #f4212e; }
.btl-loading { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.btl-loading span { color: var(--btl-text-secondary); font-size: 13px; }
.btl-spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid var(--btl-spinner-border);
  border-top-color: #1d9bf0;
  border-radius: 50%;
  animation: btl-spin 0.7s linear infinite;
}
.btl-modal {
  position: fixed;
  inset: 0;
  z-index: 10002;
  background: rgba(0, 0, 0, 0.38);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.btl-panel {
  width: min(560px, calc(100vw - 28px));
  max-height: min(760px, calc(100vh - 28px));
  overflow: hidden;
  border-radius: 14px;
  background: #fff;
  color: #0f1419;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.32);
  display: flex;
  flex-direction: column;
}
.btl-panel.btl-dark {
  background: #16181c;
  color: #e7e9ea;
}
@media (prefers-color-scheme: dark) {
  .btl-panel.btl-auto { background: #16181c; color: #e7e9ea; }
}
.btl-panel-header,
.btl-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.18);
}
.btl-panel-footer {
  border-top: 1px solid rgba(128, 128, 128, 0.18);
  border-bottom: 0;
  gap: 10px;
  justify-content: flex-end;
}
.btl-panel-close {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font-size: 22px;
  cursor: pointer;
}
.btl-panel-body {
  padding: 16px;
  overflow-y: auto;
}
.btl-panel label {
  display: block;
  font-size: 13px;
  font-weight: 650;
  margin-bottom: 12px;
}
.btl-panel input[type="text"],
.btl-panel input[type="password"],
.btl-panel select {
  width: 100%;
  box-sizing: border-box;
  margin-top: 6px;
  padding: 9px 10px;
  border: 1px solid rgba(128, 128, 128, 0.32);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: 14px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.btl-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.btl-check {
  display: flex !important;
  align-items: center;
  gap: 8px;
}
.btl-check input { width: auto; }
.btl-note {
  margin: 6px 0 0;
  color: #536471;
  font-size: 12px;
  line-height: 1.55;
}
.btl-panel-footer button,
#btl-save {
  border: 0;
  border-radius: 8px;
  padding: 9px 14px;
  background: #1d9bf0;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
#btl-history,
#btl-settings,
#btl-clear-history {
  background: rgba(128, 128, 128, 0.16);
  color: inherit;
}
.btl-panel-status {
  min-height: 18px;
  color: #00a66a;
  font-size: 13px;
}
.btl-history-list {
  padding: 10px 16px;
  overflow-y: auto;
}
.btl-history-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(128, 128, 128, 0.18);
}
.btl-history-meta {
  color: #536471;
  font-size: 12px;
  margin-bottom: 6px;
}
.btl-history-preview {
  font-size: 14px;
  line-height: 1.45;
  margin-bottom: 6px;
}
.btl-history-item a {
  color: #1d9bf0;
  font-size: 13px;
  text-decoration: none;
}
.btl-empty {
  padding: 32px 0;
  text-align: center;
  color: #536471;
}
@media (max-width: 640px) {
  .btl-card-container {
    left: 12px;
    right: 12px;
    bottom: 64px;
  }
  .btl-tldr-card { width: 100%; }
  .btl-grid { grid-template-columns: 1fr; }
}
@keyframes btl-spin { to { transform: rotate(360deg); } }
@keyframes btl-slide-in {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.btl-fade-out { animation: btl-fade-out 0.3s ease-in forwards; }
@keyframes btl-fade-out {
  to { opacity: 0; transform: translateY(16px) scale(0.97); }
}`;
  }
})();
