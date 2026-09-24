// ==UserScript==
// @name         Cosmos Enhanced for wBlock
// @namespace    https://github.com/zyxingdev/script
// @version      1.0.1
// @description  增强小宇宙网页端：音频和高清图片下载、ListenNotes 搜索、播放器倍速调节
// @author       zyxingdev (based on LGiki/cosmos-enhanced)
// @updateURL    https://raw.githubusercontent.com/zyxingdev/script/main/Scripts/cosmos-enhanced-wblock.user.js
// @downloadURL  https://raw.githubusercontent.com/zyxingdev/script/main/Scripts/cosmos-enhanced-wblock.user.js
// @homepageURL  https://github.com/zyxingdev/script
// @match        https://www.xiaoyuzhoufm.com/episode/*
// @match        https://www.xiaoyuzhoufm.com/podcast/*
// @run-at       document-idle
// @grant        none
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
  const download = (url, name) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = cleanName(name);
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  const search = keyword => window.open(`https://www.listennotes.com/search/?q=${encodeURIComponent(keyword)}`, '_blank', 'noopener');
  const addStyle = () => {
    if (document.querySelector('#cosmos-enhanced-style')) return;
    const style = document.createElement('style');
    style.id = 'cosmos-enhanced-style';
    style.textContent = `
      .cosmos-enhanced-container{display:flex;flex-direction:column;gap:8px;margin:12px 0;padding:0;border:0;background:transparent;color:inherit;font-size:14px}
      .cosmos-enhanced-buttons-container{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
      .cosmos-enhanced-container button,.cosmos-enhanced-container summary{font:inherit;cursor:pointer}
      .cosmos-button{color:#24292f!important;-webkit-text-fill-color:#24292f!important;border:1px solid #b6bec8;border-radius:6px;background:#fff!important;padding:6px 10px;line-height:1.4;opacity:1;text-shadow:none;box-shadow:0 1px 2px rgba(0,0,0,.08)}
      .cosmos-button:hover,.cosmos-dropdown-item:hover{background:#f1f5f9!important}
      .cosmos-dropdown{position:relative}.cosmos-dropdown summary{list-style:none}.cosmos-dropdown summary::-webkit-details-marker{display:none}
      .cosmos-dropdown-menu{position:absolute;z-index:9999;top:calc(100% + 4px);left:0;min-width:180px;max-height:50vh;overflow:auto;padding:4px;border:1px solid #b6bec8;border-radius:6px;background:#fff;color:#24292f;box-shadow:0 4px 14px rgba(0,0,0,.18)}
      .cosmos-dropdown-item{display:block;width:100%;color:#24292f!important;-webkit-text-fill-color:#24292f!important;border:0;background:transparent!important;text-align:left;padding:7px 9px;border-radius:4px;line-height:1.4;opacity:1;text-shadow:none}
      #playback-rate-controller{display:inline-flex;align-items:center;gap:4px;margin-left:10px;font-size:13px}
      #playback-rate-controller button{border:0;background:transparent;color:inherit;cursor:pointer;padding:2px 5px}
      #playback-rate{min-width:3.2em;text-align:center;cursor:pointer}
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
    items.forEach(item => menu.appendChild(button(item.label, () => { details.open = false; item.action(); })));
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
    const ep = episodeName(), pod = podcastName();
    if (audio?.src && ep && pod) {
      const url = parseUrl(audio.src);
      const ext = url?.pathname.match(/\.(mp3|m4a|wav|ogg|flac|ape|aac|aiff|wma|webm)$/i)?.[0];
      if (ext) downloads.appendChild(button('🎵 下载单集音频', () => download(audio.src, `${ep} - ${pod}${ext}`)));
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
    if (!audio) { currentAudio = null; return; }
    const holder = audio.previousElementSibling;
    if (!holder) return;
    if (currentAudio === audio && holder.querySelector('#playback-rate-controller')) return;
    document.querySelector('#playback-rate-controller')?.remove();
    currentAudio = audio;
    const control = document.createElement('div'); control.id = 'playback-rate-controller';
    const adjust = amount => { const rate = Math.round((audio.playbackRate + amount) * 10) / 10; if (rate >= .1 && rate <= 16) audio.playbackRate = rate; };
    const minus = document.createElement('button'); minus.textContent = '−'; minus.title = '降低倍速'; minus.onclick = () => adjust(-.1);
    const display = document.createElement('span'); display.id = 'playback-rate'; display.title = '双击重置，滚轮调整';
    const update = () => { display.textContent = `${audio.playbackRate.toFixed(1)}x`; }; update();
    audio.addEventListener('ratechange', update);
    display.ondblclick = () => { audio.playbackRate = 1; };
    display.onwheel = event => { event.preventDefault(); adjust(event.deltaY < 0 ? .1 : -.1); };
    const plus = document.createElement('button'); plus.textContent = '+'; plus.title = '提高倍速'; plus.onclick = () => adjust(.1);
    control.append(minus, display, plus); holder.appendChild(control);
  };
  let scheduled = false;
  const refresh = () => {
    scheduled = false;
    addStyle();
    document.querySelector('.cosmos-enhanced-container')?.remove();
    if (isEpisode()) enhanceEpisode(); else if (isPodcast()) enhancePodcast();
    addPlaybackRate();
  };
  const scheduleRefresh = () => {
    if (scheduled) return;
    scheduled = true; requestAnimationFrame(refresh);
  };
  const observer = new MutationObserver(() => scheduleRefresh());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  let lastUrl = location.href;
  window.setInterval(() => { if (location.href !== lastUrl) { lastUrl = location.href; scheduleRefresh(); } }, 800);
  document.addEventListener('click', event => {
    document.querySelectorAll('.cosmos-dropdown[open]').forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('.cosmos-dropdown[open]').forEach(menu => { menu.open = false; menu.querySelector('summary')?.focus(); });
  });
  refresh();
})();
