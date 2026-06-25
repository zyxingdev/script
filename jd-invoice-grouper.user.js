// ==UserScript==
// @name         京东发票按销售方归类
// @namespace    local.jd.invoice.grouper
// @version      0.7.0
// @description  自动读取“我的发票”，按销售方和发票号码凑单并导出 CSV
// @match        https://myivc.jd.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const LIST_URL = "https://myivc.jd.com/fpzz/index.action";
  const ELIGIBLE_AMOUNT = 100;
  const REQUEST_DELAY_MS = 250;
  const MAX_PAGES = 100;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function parseHtml(text) {
    return new DOMParser().parseFromString(text, "text/html");
  }

  async function fetchHtml(url, options = {}) {
    const response = await fetch(url, {
      credentials: "include",
      redirect: "follow",
      ...options,
    });
    if (!response.ok) {
      throw new Error(`请求失败：HTTP ${response.status}`);
    }
    if (response.url.includes("passport.jd.com")) {
      throw new Error("京东登录状态已失效，请重新登录后再运行");
    }
    return response.text();
  }

  async function getXmlText(url) {
    const xmlUrl = new URL(url);
    if (xmlUrl.protocol === "http:") xmlUrl.protocol = "https:";
    const response = await fetch(xmlUrl.href, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`XML 请求失败：HTTP ${response.status}`);
    }
    return response.text();
  }

  function extractOrders(doc) {
    const links = [...doc.querySelectorAll('a[href*="/fpzz/ivcLand.action"]')];
    return links.flatMap((link) => {
      const detailUrl = new URL(link.getAttribute("href"), LIST_URL).href;
      const orderId = new URL(detailUrl).searchParams.get("orderId");
      if (!orderId) return [];

      const section = link.closest("tbody") || link.closest("table") || link.parentElement;
      const productLink = section?.querySelector('a[href*="item.jd.com"]');
      const productUrl = productLink ? new URL(productLink.getAttribute("href"), LIST_URL).href : "";
      const sku = productUrl.match(/\/(\d+)\.html/)?.[1] || "";
      const sectionText = section?.textContent.replace(/\s+/g, " ").trim() || "";
      const canReissue = [...(section?.querySelectorAll("a") || [])]
        .some((action) => action.textContent.trim() === "换开申请");
      return [{
        orderId,
        detailUrl,
        sku,
        productUrl,
        product: productLink?.textContent.trim() || "",
        orderTime: sectionText.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)?.[0] || "",
        canReissue,
      }];
    });
  }

  async function getListPage(page) {
    const body = new URLSearchParams({ page: String(page) });
    const html = await fetchHtml(LIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
    });
    return extractOrders(parseHtml(html));
  }

  async function collectOrders(report, startDate, endDate) {
    const orders = new Map();
    const seenListOrders = new Set();
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      report(`读取列表第 ${page} 页（按订单日期筛选）…`);
      const pageOrders = await getListPage(page);
      if (!pageOrders.length) break;

      let newListOrders = 0;
      for (const order of pageOrders) {
        if (!seenListOrders.has(order.orderId)) {
          seenListOrders.add(order.orderId);
          newListOrders += 1;
        }
        if (!order.canReissue) continue;
        const orderDate = order.orderTime.slice(0, 10);
        if ((startDate && (!orderDate || orderDate < startDate))
          || (endDate && (!orderDate || orderDate > endDate))) {
          continue;
        }
        if (!orders.has(order.orderId)) {
          orders.set(order.orderId, order);
        }
      }

      // 京东发票列表按下单时间倒序；进入开始日期之前的数据后无需再请求后续页。
      const pageDates = pageOrders.map((order) => order.orderTime.slice(0, 10)).filter(Boolean);
      if (startDate && pageDates.some((date) => date < startDate)) break;

      if (!newListOrders) break;
      await sleep(REQUEST_DELAY_MS);
    }

    if (!orders.size) {
      throw new Error(startDate || endDate
        ? "指定日期范围内没有带换开申请的发票订单"
        : "没有找到带换开申请的发票订单");
    }
    return [...orders.values()];
  }

  function findXmlLinks(doc) {
    return [...new Set([...doc.querySelectorAll("a[href]")]
      .filter((link) => /XML/i.test(link.textContent) || /\.xml(?:\?|$)/i.test(link.href))
      .map((link) => new URL(link.getAttribute("href"), LIST_URL).href))];
  }

  function findXmlLinksInFrame(url) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement("iframe");
      iframe.hidden = true;
      let finished = false;

      const finish = (callback) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        iframe.remove();
        callback();
      };
      const timeout = setTimeout(() => {
        finish(() => reject(new Error("发票详情页加载超时")));
      }, 20000);

      iframe.addEventListener("load", () => {
        setTimeout(() => {
          try {
            const frameUrl = iframe.contentWindow.location.href;
            if (frameUrl.includes("passport.jd.com")) {
              finish(() => reject(new Error("京东登录状态已失效，请重新登录后再运行")));
              return;
            }
            const links = findXmlLinks(iframe.contentDocument);
            finish(() => resolve(links));
          } catch {
            finish(() => reject(new Error("无法读取发票详情页，请确认登录状态")));
          }
        }, 1000);
      }, { once: true });

      iframe.src = url;
      document.body.append(iframe);
    });
  }

  function xmlValue(doc, names) {
    const wanted = new Set(names.map((name) => name.replace(/[^a-z0-9]/gi, "").toLowerCase()));
    for (const element of doc.getElementsByTagName("*")) {
      const name = (element.localName || element.tagName).replace(/[^a-z0-9]/gi, "").toLowerCase();
      if (wanted.has(name) && element.textContent.trim()) return element.textContent.trim();
    }
    return "";
  }

  function parseInvoiceXml(text, order) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("XML 格式无法解析");

    const seller = xmlValue(doc, ["SellerName"]);
    const totalText = xmlValue(doc, [
      "TotalTax-includedAmount",
      "TotalTaxIncludedAmount",
      "TotaltaxIncludedAmount",
    ]);
    const withoutTax = Number(xmlValue(doc, ["TotalAmWithoutTax"]).replace(/,/g, "")) || 0;
    const tax = Number(xmlValue(doc, ["TotalTaxAm"]).replace(/,/g, "")) || 0;
    const amount = Number(totalText.replace(/,/g, "")) || withoutTax + tax;
    if (!seller) throw new Error("XML 中未找到销售方");
    if (!Number.isFinite(amount)) throw new Error("XML 中未找到有效金额");

    return {
      ...order,
      seller,
      amount,
      invoiceNo: xmlValue(doc, ["InvoiceNumber", "EIid"]),
      issueTime: xmlValue(doc, ["IssueTime", "RequestTime"]),
      itemName: xmlValue(doc, ["ItemName"]) || order.product,
    };
  }

  async function inspectOrder(order) {
    const detailHtml = await fetchHtml(order.detailUrl);
    let xmlLinks = findXmlLinks(parseHtml(detailHtml));
    if (!xmlLinks.length) {
      xmlLinks = await findXmlLinksInFrame(order.detailUrl);
    }
    if (!xmlLinks.length) {
      return { records: [], error: "该发票没有 XML 下载链接" };
    }

    const records = [];
    const errors = [];
    for (const xmlUrl of xmlLinks) {
      try {
        records.push(parseInvoiceXml(await getXmlText(xmlUrl), order));
      } catch (error) {
        errors.push(error.message);
      }
      await sleep(REQUEST_DELAY_MS);
    }
    return { records, error: errors.join("；") };
  }

  function findMinimalCombination(orders) {
    const sorted = orders
      .map((order) => ({ ...order, cents: Math.round(order.total * 100) }))
      .sort((a, b) => b.cents - a.cents);
    const target = ELIGIBLE_AMOUNT * 100;
    let size = 0;
    let largestSum = 0;
    while (size < sorted.length && largestSum < target) {
      largestSum += sorted[size].cents;
      size += 1;
    }
    if (largestSum < target) return null;

    let best = sorted.slice(0, size);
    let bestTotal = best.reduce((sum, order) => sum + order.cents, 0);
    const chosen = [];
    let visited = 0;

    function search(start, sum) {
      if (visited++ > 150000 || sum >= bestTotal) return;
      const remainingSlots = size - chosen.length;
      if (!remainingSlots) {
        if (sum >= target && sum < bestTotal) {
          best = [...chosen];
          bestTotal = sum;
        }
        return;
      }
      if (sorted.length - start < remainingSlots) return;
      const maximum = sorted.slice(start, start + remainingSlots)
        .reduce((total, order) => total + order.cents, sum);
      if (maximum < target) return;

      for (let index = start; index <= sorted.length - remainingSlots; index += 1) {
        chosen.push(sorted[index]);
        search(index + 1, sum + sorted[index].cents);
        chosen.pop();
      }
    }
    search(0, 0);
    return best;
  }

  function buildBatches(records) {
    const sellerOrders = new Map();
    for (const record of records) {
      const key = `${record.seller}\u0000${record.orderId}`;
      if (!sellerOrders.has(key)) {
        sellerOrders.set(key, { seller: record.seller, orderId: record.orderId, total: 0, records: [] });
      }
      const order = sellerOrders.get(key);
      order.total += record.amount;
      order.records.push(record);
    }

    const candidatesBySeller = new Map();
    const excluded = [];
    for (const order of sellerOrders.values()) {
      if (order.total >= ELIGIBLE_AMOUNT) {
        excluded.push(order);
        continue;
      }
      if (!candidatesBySeller.has(order.seller)) candidatesBySeller.set(order.seller, []);
      candidatesBySeller.get(order.seller).push(order);
    }

    const groups = [];
    const leftovers = [];
    candidatesBySeller.forEach((orders, seller) => {
      let remaining = [...orders];
      let batch = 1;
      while (remaining.reduce((sum, order) => sum + order.total, 0) >= ELIGIBLE_AMOUNT) {
        const selected = findMinimalCombination(remaining);
        if (!selected) break;
        const selectedIds = new Set(selected.map((order) => order.orderId));
        groups.push({
          seller,
          batch,
          total: selected.reduce((sum, order) => sum + order.total, 0),
          records: selected.flatMap((order) => order.records),
        });
        remaining = remaining.filter((order) => !selectedIds.has(order.orderId));
        batch += 1;
      }
      leftovers.push(...remaining);
    });

    return {
      groups,
      excluded,
      leftovers,
    };
  }

  function el(tag, properties = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(properties)) {
      if (key === "className") node.className = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }
    for (const child of children) node.append(child);
    return node;
  }

  function renderResults(container, groups, unresolved, excluded, leftovers) {
    container.replaceChildren();
    container.append(el("p", {
      className: "jdig-note",
      text: `生成 ${groups.length} 组推荐；排除 ${excluded.length} 个单笔满 100 元订单；剩余 ${leftovers.length} 个订单暂时无法凑满。`,
    }));
    const table = el("table", { className: "jdig-table" });
    table.append(el("thead", {}, [el("tr", {}, [
      el("th", { text: "销售方" }),
      el("th", { text: "组次" }),
      el("th", { text: "含税合计" }),
      el("th", { text: "发票数" }),
      el("th", { text: "抽奖门槛" }),
      el("th", { text: "发票号码（点击跳商品）" }),
    ])]));

    const tbody = el("tbody");
    for (const group of groups) {
      const invoiceCell = el("td");
      group.records.forEach((record, index) => {
        const invoiceNo = record.invoiceNo || record.orderId;
        if (index) invoiceCell.append("、");
        invoiceCell.append(el("a", {
          text: invoiceNo,
          href: record.productUrl || (record.sku ? `https://item.jd.com/${record.sku}.html` : record.detailUrl),
          target: "_blank",
          rel: "noopener noreferrer",
          title: `${record.itemName || record.product || ""}（订单 ${record.orderId}）`,
        }));
      });
      tbody.append(el("tr", { className: "jdig-eligible" }, [
        el("td", { text: group.seller }),
        el("td", { text: `第 ${group.batch} 组` }),
        el("td", { text: `¥${group.total.toFixed(2)}` }),
        el("td", { text: String(group.records.length) }),
        el("td", { text: "已满 100 元" }),
        invoiceCell,
      ]));
    }
    table.append(tbody);
    container.append(table);

    if (unresolved.length) {
      container.append(el("p", {
        className: "jdig-warning",
        text: `${unresolved.length} 个订单无法自动解析：${unresolved.map((item) => `${item.order.orderId}（${item.error || "未知原因"}）`).join("、")}`,
      }));
    }
  }

  function csvEscape(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function downloadCsv(groups, unresolved, dateRange) {
    const rows = [["是否满100元", "销售方", "组次", "含税合计", "发票数", "发票号码", "商品链接", "订单号", "订单日期", "开票时间", "商品"]];
    for (const group of groups) {
      rows.push([
        group.total >= ELIGIBLE_AMOUNT ? "是" : "否",
        group.seller,
        group.batch,
        group.total.toFixed(2),
        group.records.length,
        group.records.map((record) => record.invoiceNo || record.orderId).filter(Boolean).join(" | "),
        group.records.map((record) => record.productUrl || (record.sku ? `https://item.jd.com/${record.sku}.html` : "")).filter(Boolean).join(" | "),
        [...new Set(group.records.map((record) => record.orderId))].join(" | "),
        group.records.map((record) => record.orderTime).filter(Boolean).join(" | "),
        group.records.map((record) => record.issueTime).filter(Boolean).join(" | "),
        group.records.map((record) => record.itemName).filter(Boolean).join(" | "),
      ]);
    }
    for (const item of unresolved) {
      rows.push(["未知", "无法自动解析", "", "", "1", "", item.order.productUrl, item.order.orderId, item.order.orderTime, "", item.order.product]);
    }

    const csv = `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\r\n")}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const rangeLabel = dateRange.startDate || dateRange.endDate
      ? `${dateRange.startDate || "最早"}_${dateRange.endDate || "最新"}`
      : "全部日期";
    link.download = `京东发票归类-${rangeLabel}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function createUi() {
    const trigger = el("button", { id: "jdig-trigger", text: "归类发票" });
    const overlay = el("div", { id: "jdig-overlay" });
    const panel = el("section", { id: "jdig-panel" });
    const title = el("h2", { text: "京东发票按销售方归类" });
    const close = el("button", { id: "jdig-close", text: "×", title: "关闭" });
    const startDate = el("input", { id: "jdig-start-date", type: "date" });
    const endDate = el("input", { id: "jdig-end-date", type: "date" });
    const startButton = el("button", { id: "jdig-start", text: "开始归类" });
    const filters = el("div", { id: "jdig-filters" }, [
      el("label", { for: "jdig-start-date", text: "订单开始日期" }),
      startDate,
      el("label", { for: "jdig-end-date", text: "订单结束日期" }),
      endDate,
      startButton,
      el("span", { className: "jdig-hint", text: "日期留空表示不限制，包含起止当天" }),
    ]);
    const progress = el("p", { id: "jdig-progress", text: "准备开始" });
    const results = el("div", { id: "jdig-results" });
    const exportButton = el("button", { id: "jdig-export", text: "导出 CSV" });
    exportButton.disabled = true;

    panel.append(title, close, filters, progress, results, exportButton);
    overlay.append(panel);
    document.body.append(trigger, overlay);

    trigger.addEventListener("click", () => {
      overlay.classList.add("jdig-open");
    });
    close.addEventListener("click", () => overlay.classList.remove("jdig-open"));
    startButton.addEventListener("click", run);

    async function run() {
      const dateRange = { startDate: startDate.value, endDate: endDate.value };
      if (dateRange.startDate && dateRange.endDate && dateRange.startDate > dateRange.endDate) {
        progress.textContent = "失败：开始日期不能晚于结束日期";
        return;
      }

      startButton.disabled = true;
      exportButton.disabled = true;
      results.replaceChildren();
      try {
        const orders = await collectOrders(
          (message) => { progress.textContent = message; },
          dateRange.startDate,
          dateRange.endDate,
        );
        progress.textContent = `日期范围内找到 ${orders.length} 个订单，开始解析…`;
        const records = [];
        const unresolved = [];
        for (let index = 0; index < orders.length; index += 1) {
          const order = orders[index];
          progress.textContent = `解析发票 ${index + 1}/${orders.length}…`;
          try {
            const result = await inspectOrder(order);
            records.push(...result.records);
            if (!result.records.length || result.error) unresolved.push({ order, error: result.error });
          } catch (error) {
            unresolved.push({ order, error: error.message });
          }
          await sleep(REQUEST_DELAY_MS);
        }

        const grouped = buildBatches(records);
        const groups = grouped.groups;
        renderResults(results, groups, unresolved, grouped.excluded, grouped.leftovers);
        const rangeText = `${dateRange.startDate || "最早"} 至 ${dateRange.endDate || "最新"}`;
        progress.textContent = `完成：${rangeText}，生成 ${groups.length} 组最少笔数组合，已排除 ${grouped.excluded.length} 个达标订单`;
        exportButton.disabled = false;
        exportButton.onclick = () => downloadCsv(groups, unresolved, dateRange);
      } catch (error) {
        progress.textContent = `失败：${error.message}`;
      } finally {
        startButton.disabled = false;
      }
    }
  }

  const style = document.createElement("style");
  style.textContent = `
    #jdig-trigger { position: fixed; right: 24px; top: 45%; z-index: 99998; padding: 10px 16px; border: 0; border-radius: 6px; color: #fff; background: #e1251b; cursor: pointer; box-shadow: 0 2px 10px #999; }
    #jdig-overlay { display: none; position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,.45); }
    #jdig-overlay.jdig-open { display: block; }
    #jdig-panel { position: absolute; inset: 6%; overflow: auto; padding: 24px; border-radius: 8px; background: #fff; color: #222; }
    #jdig-panel h2 { margin: 0 48px 14px 0; font-size: 20px; }
    #jdig-close { position: absolute; right: 20px; top: 14px; border: 0; background: transparent; font-size: 30px; cursor: pointer; }
    #jdig-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 0 0 14px; padding: 12px; background: #f7f7f7; }
    #jdig-filters input { padding: 6px; }
    #jdig-start { padding: 7px 14px; border: 0; border-radius: 4px; color: #fff; background: #e1251b; cursor: pointer; }
    #jdig-start:disabled { opacity: .6; cursor: wait; }
    .jdig-hint { color: #777; }
    #jdig-export { margin-top: 16px; padding: 8px 16px; }
    .jdig-table { width: 100%; border-collapse: collapse; table-layout: auto; }
    .jdig-table th, .jdig-table td { padding: 8px; border: 1px solid #ddd; text-align: left; vertical-align: top; word-break: break-all; }
    .jdig-table th { background: #f5f5f5; }
    .jdig-table tr.jdig-eligible { background: #eaf7e8; font-weight: 600; }
    .jdig-note { padding: 10px; color: #245b23; background: #eaf7e8; }
    .jdig-warning { padding: 10px; color: #9a6700; background: #fff8c5; }
  `;
  document.head.append(style);
  createUi();
})();
