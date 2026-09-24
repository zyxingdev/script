// ==UserScript==
// @name         Cosmos Enhanced for wBlock
// @namespace    https://github.com/zyxingdev/script
// @version      1.0.0
// @description  增强小宇宙网页端：音频和高清图片下载、ListenNotes 搜索、播放器倍速调节
// @author       zyxingdev (based on LGiki/cosmos-enhanced)
// @updateURL    https://raw.githubusercontent.com/zyxingdev/script/main/Scripts/cosmos-enhanced-wblock.user.js
// @downloadURL  https://raw.githubusercontent.com/zyxingdev/script/main/Scripts/cosmos-enhanced-wblock.user.js
// @homepageURL  https://github.com/zyxingdev/script
// @match        https://www.xiaoyuzhoufm.com/episode/*
// @match        https://www.xiaoyuzhoufm.com/podcast/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      xyzcdn.net
// @connect      xmcdn.com
// @connect      audio.xiaoyuzhoufm.com
// ==/UserScript==

(() => {
  'use strict';

  const isEpisode = () => /^https?:\/\/(?:www\.)?xiaoyuzhoufm\.com\/episode\/[0-9a-zA-Z]{24}/.test(location.href);
  const isPodcast = () => /^https?:\/\/(?:www\.)?xiaoyuzhoufm\.com\/podcast\/[0-9a-zA-Z]{24}/.test(location.href);
  const cleanName = value => (value || '').replace(/[\\/?%*:|"<>]/g, '').trim() || 'cosmos-download';
  const parseUrl = value => { try { return new URL(value, location.href); } catch { return null; } };
  const getFullImageUrl = value => {
    const url = parseUrl(value);
    if (!url) return null;
    url.pathname = url.pathname.replace(/@(small|middle|large)$/, '');
    return url.href;
  };
  const imageExtension = value => {
    const url = parseUrl(value);
    const match = url?.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|heif)$/i);
    return match ? `.${match[1]}` : '.jpg';
  };
  const podcastName = () => {
    if (isPodcast()) {
      const meta = document.querySelector('meta[property="og:title"]');
      if (meta?.content) return meta.content;
    }
    return document.querySelector('.podcast-title .name')?.innerText
      || document.querySelector('.co-podcast-title .names')?.innerText
      || document.querySelector('.co-podcast-title .name')?.innerText
      || document.querySelector('meta[property="og:site_name"]')?.content
      || null;
  };
  const episodeName = () => {
    if (isEpisode()) {
      const meta = document.querySelector('meta[property="og:title"]');
      if (meta?.content) return meta.content;
    }
    return document.querySelector('h1.title')?.innerText || null;
  };
  const directDownload = (url, name) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = cleanName(name);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  const downloadAudio = (url, name, buttonEl) => {
    const target = parseUrl(url);
    if (!target || !/^https?:$/.test(target.protocol)) return;
    const chunkSize = 1024 * 1024;
    const showFailure = message => {
      buttonEl.disabled = false;
      buttonEl.textContent = '⚠ 音频下载失败，点击重试';
      buttonEl.title = message;
    };
    const requestChunk = start => new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject(new Error('wBlock 未提供 GM_xmlhttpRequest'));
        return;
      }
      GM_xmlhttpRequest({
        method: 'GET',
        url: target.href,
        headers: { Range: `bytes=${start}-${start + chunkSize - 1}` },
        responseType: 'arraybuffer',
        timeout: 60000,
        onload: response => {
          const data = response.response;
          const size = data instanceof Blob ? data.size : (data?.byteLength ?? 0);
          if (![200, 206].includes(response.status) || !size) {
            reject(new Error(`HTTP ${response.status || '未知'}，返回 ${size} 字节`));
            return;
          }
          resolve({ data, size, status: response.status, headers: response.responseHeaders || '' });
        },
        onerror: response => reject(new Error(response?.error || response?.statusText || `wBlock 请求失败${response?.status ? ` (HTTP ${response.status})` : ''}`)),
        ontimeout: () => reject(new Error('wBlock 请求超时')),
      });
    });
    const fetchAudio = async () => {
      const response = await fetch(target.href, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.blob();
    };
    const readAudio = async () => {
      const parts = [];
      let offset = 0;
      let total = null;
      while (true) {
        const chunk = await requestChunk(offset);
        parts.push(chunk.data);
        offset += chunk.size;
        if (chunk.status === 200) break;
        const range = chunk.headers.match(/content-range:\s*bytes\s+(\d+)-(\d+)\/(\d+)/i);
        if (!range || Number(range[1]) !== offset - chunk.size || Number(range[2]) + 1 !== offset) {
          throw new Error('音频服务器返回的分段范围无效');
        }
        total = Number(range[3]);
        buttonEl.textContent = `⏳ 正在下载音频 ${Math.min(100, Math.floor(offset / total * 100))}%`;
        if (offset >= total) break;
      }
      return new Blob(parts, { type: 'audio/mp4' });
    };
    buttonEl.disabled = true;
    buttonEl.textContent = '⏳ 正在下载音频…';
    (async () => {
      let blob;
      try {
        blob = await readAudio();
      } catch (gmError) {
        buttonEl.textContent = '⏳ 尝试浏览器下载…';
        try {
          blob = await fetchAudio();
        } catch (fetchError) {
          showFailure(`wBlock：${gmError.message}；浏览器：${fetchError.message}`);
          return;
        }
      }
      try {
        const objectUrl = URL.createObjectURL(blob);
        directDownload(objectUrl, `${cleanName(name)}${/\.[a-z0-9]{2,5}$/i.test(name) ? '' : '.m4a'}`);
        buttonEl.disabled = false;
        buttonEl.textContent = '🎵 音频已开始下载';
        buttonEl.title = `${(blob.size / 1024 / 1024).toFixed(1)} MB`;
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
      } catch (error) {
        showFailure(`保存音频失败：${error.message}`);
      }
    })();
  };
  const download = (url, name) => {
    if (!url) return;
    const target = parseUrl(url);
    if (!target || !/^https?:$/.test(target.protocol)) return;
    // Cross-origin <a download> is ignored by Safari. For images, use the page URL
    // as a native fallback; audio uses downloadAudio and the userscript request API.
    const opened = window.open(target.href, '_blank', 'noopener');
    if (!opened) location.href = target.href;
  };
  const search = keyword => window.open(`https://www.listennotes.com/search/?q=${encodeURIComponent(keyword)}`, '_blank', 'noopener');
  const addStyle = () => {
    if (document.querySelector('#cosmos-enhanced-style')) return;
    const style = document.createElement('style');
    style.id = 'cosmos-enhanced-style';
    style.textContent = `
      .cosmos-enhanced-container{display:flex;flex-direction:column;gap:8px;margin:12px 0;padding:0;border:0;background:transparent;color:inherit;font-size:14px;position:relative;z-index:2}
      .cosmos-enhanced-buttons-container{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
      .cosmos-enhanced-container button,.cosmos-enhanced-container summary{font:inherit;cursor:pointer;pointer-events:auto}
      .cosmos-enhanced-container .cosmos-button{color:#24292f!important;-webkit-text-fill-color:#24292f!important;border:1px solid #b6bec8;border-radius:6px;background:#fff!important;padding:6px 10px;line-height:1.4;opacity:1;text-shadow:none;box-shadow:0 1px 2px rgba(0,0,0,.08)}
      .cosmos-enhanced-container .cosmos-button:hover,.cosmos-dropdown-item:hover{background:#f1f5f9!important}
      .cosmos-dropdown{position:relative}.cosmos-dropdown summary{list-style:none}.cosmos-dropdown summary::-webkit-details-marker{display:none}
      .cosmos-dropdown-menu{position:absolute;z-index:9999;top:calc(100% + 4px);left:0;min-width:180px;max-height:50vh;overflow:auto;padding:4px;border:1px solid #b6bec8;border-radius:6px;background:#fff;color:#24292f;box-shadow:0 4px 14px rgba(0,0,0,.18)}
      .cosmos-dropdown-item{display:block;width:100%;color:#24292f!important;-webkit-text-fill-color:#24292f!important;border:0;background:transparent!important;text-align:left;padding:7px 9px;border-radius:4px;line-height:1.4;opacity:1;text-shadow:none;cursor:pointer;pointer-events:auto}
      #playback-rate-controller{display:inline-flex;align-items:center;gap:4px;margin:8px 0 0 10px;padding:4px 7px;border:1px solid #b6bec8;border-radius:6px;background:#fff;color:#24292f;font-size:13px;vertical-align:middle;position:relative;z-index:5}
      #playback-rate-controller button{border:0!important;background:transparent!important;color:#24292f!important;-webkit-text-fill-color:#24292f!important;cursor:pointer;padding:2px 5px;pointer-events:auto}
      #playback-rate{min-width:3.2em;text-align:center;cursor:pointer;color:#24292f!important;-webkit-text-fill-color:#24292f!important}
    `;
    (document.head || document.documentElement).appendChild(style);
  };
  const button = (label, action) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'cosmos-button'; el.textContent = label; el.addEventListener('click', action);
    return el;
  };
  const dropdown = (label, items) => {
    const details = document.createElement('details'); details.className = 'cosmos-dropdown';
    const summary = document.createElement('summary'); summary.className = 'cosmos-button'; summary.textContent = label;
    const menu = document.createElement('div'); menu.className = 'cosmos-dropdown-menu';
    items.forEach(item => {
      const menuItem = document.createElement('button');
      menuItem.type = 'button';
      menuItem.className = 'cosmos-dropdown-item';
      menuItem.textContent = item.label;
      menuItem.addEventListener('click', () => { details.open = false; item.action(); });
      menu.appendChild(menuItem);
    });
    details.append(summary, menu);
    details.addEventListener('toggle', () => {
      if (details.open) document.querySelectorAll('.cosmos-dropdown[open]').forEach(other => { if (other !== details) other.open = false; });
    });
    return details;
  };
  const coPodcasts = () => {
    const names = [...document.querySelectorAll('.co-podcast-title .names a, .co-podcast-title .name')];
    return [...document.querySelectorAll('.co-podcast-image')].map((img, i) => {
      const a = img.closest('a');
      return { img, name: img.alt?.trim() || img.getAttribute('aria-label') || a?.getAttribute('aria-label') || a?.title || a?.innerText?.trim() || names[i]?.innerText?.trim() || `播客 ${i + 1}` };
    });
  };
  const addPodcastCover = container => {
    if (isEpisode()) {
      const list = coPodcasts();
      if (list.length > 1) {
        container.appendChild(dropdown('🖼 下载播客封面', list.map(({ img, name }) => ({ label: name, action: () => download(getFullImageUrl(img.src), `${name}${imageExtension(img.src)}`) }))));
        return;
      }
    }
    const img = isEpisode()
      ? document.querySelector('.co-podcast-image, header .side-avatar')
      : document.querySelector('.avatar');
    if (!img) return;
    const name = img.alt?.trim() || podcastName();
    if (name) container.appendChild(button('🖼 下载播客封面', () => download(getFullImageUrl(img.src), `${name}${imageExtension(img.src)}`)));
  };
  const addSearchPodcast = container => {
    if (isEpisode()) {
      const list = coPodcasts();
      if (list.length > 1) {
        container.appendChild(dropdown('🔍 在 ListenNotes 搜索播客', list.map(({ name }) => ({ label: name, action: () => search(name) }))));
        return;
      }
    }
    const name = podcastName();
    if (name) container.appendChild(button('🔍 在 ListenNotes 搜索播客', () => search(name)));
  };
  const enhanceEpisode = () => {
    const header = document.querySelector('header');
    if (!header?.parentNode) return;
    const box = document.createElement('div'); box.className = 'cosmos-enhanced-container';
    const downloads = document.createElement('div'); downloads.className = 'cosmos-enhanced-buttons-container';
    const audio = document.querySelector('audio');
    const audioUrl = audio?.currentSrc || audio?.src
      || document.querySelector('meta[property="og:audio"]')?.content
      || document.querySelector('meta[property="og:audio:url"]')?.content;
    const ep = episodeName(), pod = podcastName();
    if (audioUrl) {
      const directAudioUrl = parseUrl(audioUrl)?.href;
      downloads.appendChild(button('🎵 下载单集音频', event => {
        const el = event.currentTarget;
        if (el.disabled) return;
        downloadAudio(directAudioUrl, `${ep || '小宇宙单集'} - ${pod || ''}`, el);
      }));
    }
    const cover = document.querySelector('header .avatar, header .episode-image');
    const coverUrl = cover && getFullImageUrl(cover.src);
    if (coverUrl && ep && pod) downloads.appendChild(button('🖼 下载单集封面', () => download(coverUrl, `${ep} - ${pod}${imageExtension(coverUrl)}`)));
    addPodcastCover(downloads); box.appendChild(downloads);
    const searches = document.createElement('div'); searches.className = 'cosmos-enhanced-buttons-container';
    addSearchPodcast(searches);
    if (ep) searches.appendChild(button('🔍 在 ListenNotes 搜索单集', () => search(ep)));
    box.appendChild(searches); header.parentNode.insertBefore(box, header.nextSibling);
  };
  const enhancePodcast = () => {
    const podcasters = document.querySelector('main .podcasters');
    if (!podcasters?.parentNode) return;
    const box = document.createElement('div'); box.className = 'cosmos-enhanced-container';
    const downloads = document.createElement('div'); downloads.className = 'cosmos-enhanced-buttons-container';
    addPodcastCover(downloads);
    const name = podcastName();
    if (name) {
      const tasks = [...document.querySelectorAll('.avatar-container img')].map(img => ({ url: getFullImageUrl(img.src), name: img.alt?.trim() })).filter(x => x.url);
      if (tasks.length) downloads.appendChild(button('🖼 下载主播头像', () => tasks.forEach(task => download(task.url, `${name} - ${task.name || '主播'}${imageExtension(task.url)}`))));
    }
    box.appendChild(downloads);
    const searches = document.createElement('div'); searches.className = 'cosmos-enhanced-buttons-container'; addSearchPodcast(searches); box.appendChild(searches);
    podcasters.parentNode.insertBefore(box, podcasters.nextSibling);
  };
  let currentAudio = null;
  const addPlaybackRate = () => {
    const audio = document.querySelector('audio');
    if (!audio) {
      document.querySelector('#playback-rate-controller')?.remove();
      currentAudio = null;
      return;
    }
    if (currentAudio === audio && document.querySelector('#playback-rate-controller')) return;
    document.querySelector('#playback-rate-controller')?.remove();
    currentAudio = audio;
    const control = document.createElement('div');
    control.id = 'playback-rate-controller';
    control.setAttribute('aria-label', '播放速度');
    const adjust = delta => {
      const next = Math.round((audio.playbackRate + delta) * 10) / 10;
      if (next >= 0.1 && next <= 16) audio.playbackRate = next;
    };
    const minus = document.createElement('button');
    minus.type = 'button'; minus.textContent = '−'; minus.title = '降低播放速度';
    minus.addEventListener('click', () => adjust(-0.1));
    const display = document.createElement('span');
    display.id = 'playback-rate';
    display.title = '双击重置为 1.0x，滚轮调整速度';
    const update = () => { display.textContent = `${audio.playbackRate.toFixed(1)}x`; };
    update();
    audio.addEventListener('ratechange', update);
    display.addEventListener('dblclick', () => { audio.playbackRate = 1; });
    display.addEventListener('wheel', event => {
      event.preventDefault();
      adjust(event.deltaY < 0 ? 0.1 : -0.1);
    }, { passive: false });
    const plus = document.createElement('button');
    plus.type = 'button'; plus.textContent = '+'; plus.title = '提高播放速度';
    plus.addEventListener('click', () => adjust(0.1));
    control.append(minus, display, plus);
    const host = audio.closest('[class*="player"], [class*="Player"], footer') || audio.parentElement;
    (host || document.body).appendChild(control);
  };
  let scheduled = false;
  let refreshTimer = 0;
  const refresh = () => {
    scheduled = false;
    refreshTimer = 0;
    addStyle();
    if (isEpisode() && !document.querySelector('.cosmos-enhanced-container')) enhanceEpisode();
    else if (isPodcast() && !document.querySelector('.cosmos-enhanced-container')) enhancePodcast();
    addPlaybackRate();
  };
  const scheduleRefresh = () => {
    if (scheduled) return;
    scheduled = true;
    refreshTimer = window.setTimeout(refresh, 180);
  };
  const observer = new MutationObserver(mutations => {
    const pageChanged = mutations.some(mutation => {
      const changed = [...mutation.addedNodes, ...mutation.removedNodes];
      return changed.some(node => node.nodeType === Node.ELEMENT_NODE
        && !node.closest?.('.cosmos-enhanced-container, #playback-rate-controller, #cosmos-enhanced-style')
        && !node.matches?.('.cosmos-enhanced-container, #playback-rate-controller, #cosmos-enhanced-style'));
    });
    if (pageChanged) scheduleRefresh();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  let lastUrl = location.href;
  window.setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      document.querySelector('.cosmos-enhanced-container')?.remove();
      currentAudio = null;
      scheduleRefresh();
    }
  }, 800);
  scheduleRefresh();
  document.addEventListener('click', event => {
    document.querySelectorAll('.cosmos-dropdown[open]').forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('.cosmos-dropdown[open]').forEach(menu => { menu.open = false; menu.querySelector('summary')?.focus(); });
  });
})();
