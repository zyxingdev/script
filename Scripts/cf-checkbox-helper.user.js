// ==UserScript==
// @name         Cloudflare Checkbox Helper (best effort)
// @namespace    local.cf-checkbox-helper
// @version      1.0.0
// @description  Attempts one click on an accessible Cloudflare verification checkbox. Does not bypass verification.
// @match        https://challenges.cloudflare.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // Runs inside matching frames too. Keep @match restricted to the challenge host.
  const deadline = Date.now() + 30_000;
  let clicked = false;

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility === 'visible';
  }

  function findCheckbox(root) {
    for (const element of root.querySelectorAll('input[type="checkbox"], [role="checkbox"]')) {
      if (element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true') continue;
      if (element.checked || element.getAttribute('aria-checked') === 'true') continue;
      if (isVisible(element)) return element;
      // Styled checkboxes may hide the input while keeping its native label visible.
      if (element.matches('input[type="checkbox"]')) {
        for (const label of element.labels || []) {
          if (isVisible(label)) return label;
        }
      }
    }
    for (const element of root.querySelectorAll('*')) {
      if (!element.shadowRoot) continue;
      const checkbox = findCheckbox(element.shadowRoot);
      if (checkbox) return checkbox;
    }
    return null;
  }

  const timer = setInterval(() => {
    if (clicked || Date.now() >= deadline) {
      clearInterval(timer);
      if (!clicked) console.info('[CF Checkbox Helper] No accessible checkbox found within 30 seconds; manual verification may be required.');
      return;
    }
    const checkbox = findCheckbox(document);
    if (!checkbox) return;
    clicked = true;
    clearInterval(timer);
    checkbox.click();
    console.info('[CF Checkbox Helper] Attempted one click; this does not confirm verification success.');
  }, 750);
})();
