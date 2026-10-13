const main = (config) => {
  const healthCheckUrl = "https://www.gstatic.com/generate_204";
  // One list per exit under rules/, matched in order: direct first so it can
  // override everything, then the stricter an exit, the earlier its list.
  // A policy is DIRECT, REJECT, PROXY, NONCN or a region code.
  const ruleSets = [
    ["direct", "DIRECT"],
    ["reject", "REJECT"],
    ["tw", "TW"],
    ["jp", "JP"],
    ["noncn", "NONCN"],
    ["proxy", "PROXY"],
  ];
  const ruleSetName = (list) => `proxy-routing-${list}`;
  const regions = [
    { code: "HK", label: "🇭🇰 香港", pattern: /(香港|HK|Hong|🇭🇰)/, tolerance: 50 },
    { code: "TW", label: "🇹🇼 台湾", pattern: /(台湾|TW|Taiwan)/, tolerance: 50 },
    { code: "JP", label: "🇯🇵 日本", pattern: /(日本|JP|Japan|🇯🇵)/, tolerance: 50, noncn: true },
    { code: "KR", label: "🇰🇷 韩国", pattern: /(韩国|KR|Korea|🇰🇷)/, tolerance: 50, noncn: true },
    { code: "SG", label: "🇸🇬 新加坡", pattern: /(新加坡|狮|獅|SG|Singapore|🇸🇬)/, tolerance: 50, noncn: true },
    { code: "US", label: "🇺🇸 美国", pattern: /(美国|US|States|American|🇺🇸)/, tolerance: 150, noncn: true },
  ];
  const informationNodePatterns = [
    /剩余流量|已用流量|套餐到期|到期时间|过期时间|下次重置/i,
    /官网|官址|网址|最新地址|订阅|客服|工单|邮箱|如遇问题|导航页/i,
    /邀请|返利|倒卖|贩卖/i,
    /\b(?:traffic|used|total|expire|email|panel)\b/i,
  ];
  const groupNames = {
    select: "🎯 节点选择",
    noncn: "🌏 非中国区",
    final: "🪞 兜底策略",
    allAuto: "🌐 全部 · 自动",
    allFallback: "🌐 全部 · 故障转移",
  };
  const autoName = (label) => `${label} · 自动`;
  const fallbackName = (label) => `${label} · 故障转移`;
  const isObject = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

  if (!isObject(config)) {
    throw new Error("proxy-routing: config is required");
  }
  if (!Array.isArray(config.proxies) || config.proxies.length === 0) {
    if (
      isObject(config["proxy-providers"]) &&
      Object.keys(config["proxy-providers"]).length > 0
    ) {
      throw new Error(
        "proxy-routing: config.proxies is required; this override only supports inline proxies, not proxy-providers",
      );
    }
    throw new Error("proxy-routing: config.proxies must be a non-empty array");
  }
  const existingRuleProviders = config["rule-providers"] ?? {};
  if (!isObject(existingRuleProviders)) {
    throw new Error("proxy-routing: config.rule-providers must be an object");
  }
  config.proxies.forEach((proxy, index) => {
    if (
      !isObject(proxy) ||
      typeof proxy.name !== "string" ||
      proxy.name.trim().length === 0
    ) {
      throw new Error(
        `proxy-routing: config.proxies[${index}].name must be a non-empty string`,
      );
    }
  });

  const usableProxyNames = config.proxies
    .map(({ name }) => name)
    .filter(
      (name) => !informationNodePatterns.some((pattern) => pattern.test(name)),
    );
  const automaticProxyNames = usableProxyNames.filter(
    (name) => !/实验性/.test(name),
  );
  if (automaticProxyNames.length === 0) {
    throw new Error(
      "proxy-routing: no proxy is left after removing information and experimental nodes",
    );
  }
  const populatedRegions = regions
    .map((region) => ({
      ...region,
      proxies: automaticProxyNames.filter((name) => region.pattern.test(name)),
    }))
    .filter(({ proxies }) => proxies.length > 0);
  const noncnRegions = populatedRegions.filter(({ noncn }) => noncn);

  // Rules aimed at a group that has no nodes fall back to 🎯 节点选择.
  const policyTargets = new Map([
    ["DIRECT", "DIRECT"],
    ["REJECT", "REJECT"],
    ["PROXY", groupNames.select],
    ["NONCN", noncnRegions.length > 0 ? groupNames.noncn : groupNames.select],
    ...regions.map(({ code }) => [code, groupNames.select]),
    ...populatedRegions.map(({ code, label }) => [code, label]),
  ]);
  const policyTarget = (policy) => {
    if (!policyTargets.has(policy)) {
      throw new Error(`proxy-routing: unknown rule-set policy: ${policy}`);
    }
    return policyTargets.get(policy);
  };

  config.rules = ruleSets
    .map(
      ([list, policy]) =>
        `RULE-SET,${ruleSetName(list)},${policyTarget(policy)}`,
    )
    .concat([
      "GEOSITE,private,DIRECT",
      "GEOIP,private,DIRECT,no-resolve",
      `GEOSITE,gfw,${groupNames.select}`,
      "GEOSITE,cn,DIRECT",
      "GEOIP,CN,DIRECT,no-resolve",
      `MATCH,${groupNames.final}`,
    ]);
  config["rule-providers"] = Object.fromEntries(
    Object.entries(existingRuleProviders)
      .filter(([name]) => !name.startsWith("proxy-routing-"))
      .concat(
        ruleSets.map(([list]) => [
          ruleSetName(list),
          {
            type: "http",
            behavior: "classical",
            format: "text",
            interval: 86400,
            proxy: groupNames.select,
            url: `https://raw.githubusercontent.com/mcdp-adk/proxy-routing/main/rules/${list}.list`,
          },
        ]),
      ),
  );
  config["proxy-groups"] = [
    {
      name: groupNames.select,
      type: "select",
      proxies: [
        groupNames.allAuto,
        groupNames.allFallback,
        ...populatedRegions.map(({ label }) => label),
      ],
    },
    ...(noncnRegions.length > 0
      ? [
          {
            name: groupNames.noncn,
            type: "select",
            proxies: noncnRegions.map(({ label }) => label),
          },
        ]
      : []),
    {
      name: groupNames.final,
      type: "select",
      proxies: [groupNames.select, "DIRECT"],
    },
    ...populatedRegions.map(({ label, proxies }) => ({
      name: label,
      type: "select",
      proxies: [autoName(label), fallbackName(label), ...proxies],
    })),
    {
      name: groupNames.allAuto,
      type: "url-test",
      proxies: automaticProxyNames,
      url: healthCheckUrl,
      interval: 300,
      tolerance: 50,
      hidden: true,
    },
    {
      name: groupNames.allFallback,
      type: "fallback",
      proxies: usableProxyNames,
      url: healthCheckUrl,
      interval: 180,
      hidden: true,
    },
    ...populatedRegions.flatMap(({ label, proxies, tolerance }) => [
      {
        name: autoName(label),
        type: "url-test",
        proxies,
        url: healthCheckUrl,
        interval: 300,
        tolerance,
        hidden: true,
      },
      {
        name: fallbackName(label),
        type: "fallback",
        proxies,
        url: healthCheckUrl,
        interval: 300,
        hidden: true,
      },
    ]),
  ];

  return config;
};
