const blockedItemText = [
  "会员购",
  "个性装扮"
];

const blockedUriText = [
  "bilibili://mall",
  "/mall/",
  "mall/home",
  "f_source=shop",
  "from=myservice"
];

const blockedKeys = new Set([
  "answer",
  "live_tip",
  "vip_section",
  "vip_section_v2",
  "modular_vip_section"
]);

function includesAny(value, patterns) {
  if (typeof value !== "string") return false;
  return patterns.some((pattern) => value.includes(pattern));
}

function shouldDropItem(item) {
  if (!item || typeof item !== "object") return false;

  const textFields = [
    item.title,
    item.name,
    item.subtitle,
    item.desc,
    item.uri,
    item.url
  ];

  if (textFields.some((value) => includesAny(value, blockedItemText))) {
    return true;
  }

  if ([item.uri, item.url].some((value) => includesAny(value, blockedUriText))) {
    return true;
  }

  return item.id === 622;
}

function clean(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => !shouldDropItem(item))
      .map(clean)
      .filter((item) => {
        if (!item || typeof item !== "object") return true;
        return !(Array.isArray(item.items) && item.items.length === 0);
      });
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  for (const key of Object.keys(value)) {
    if (blockedKeys.has(key)) {
      delete value[key];
      continue;
    }
    value[key] = clean(value[key]);
  }

  if (value.vip && value.vip.status === 0) {
    value.vip = {
      ...value.vip,
      status: 1,
      type: 2,
      due_date: 9005270400000,
      role: 15
    };
  }

  if (Object.prototype.hasOwnProperty.call(value, "vip_type")) {
    value.vip_type = 2;
  }

  return value;
}

try {
  const body = JSON.parse($response.body || "{}");
  if (body.data) body.data = clean(body.data);
  $done({ body: JSON.stringify(body) });
} catch (error) {
  $done({});
}
