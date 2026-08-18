const main = (config) => {
  const healthCheckUrl = "https://www.gstatic.com/generate_204";
  const personalRules = [
    [
      "proxy-routing-personal-direct",
      "https://raw.githubusercontent.com/mcdp-adk/proxy-routing/main/rules/direct.list",
      "DIRECT",
    ],
    [
      "proxy-routing-personal-proxy",
      "https://raw.githubusercontent.com/mcdp-adk/proxy-routing/main/rules/proxy.list",
      "PROXY",
    ],
    [
      "proxy-routing-personal-noncn",
      "https://raw.githubusercontent.com/mcdp-adk/proxy-routing/main/rules/noncn.list",
      "NONCN",
    ],
  ];
  const aclRules = [
    [
      "proxy-routing-acl-banad",
      "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list",
      "REJECT",
    ],
    [
      "proxy-routing-acl-ehgallery",
      "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/EHGallery.list",
      "NONCN",
    ],
    [
      "proxy-routing-acl-ai",
      "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/AI.list",
      "NONCN",
    ],
    [
      "proxy-routing-acl-bahamut",
      "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Bahamut.list",
      "TW",
    ],
  ];
  const informationNodePatterns = [
    /剩余流量|已用流量|套餐到期|到期时间|过期时间|下次重置/i,
    /官网|官址|网址|最新地址|订阅|客服|工单|邮箱|如遇问题|导航页/i,
    /邀请|返利|倒卖|贩卖/i,
    /\b(?:traffic|used|total|expire|email|panel)\b/i,
  ];
  const regionDefinitions = [
    ["HK", /(香港|HK|Hong|🇭🇰)/],
    ["TW", /(台湾|TW|Taiwan)/],
    ["JP", /(日本|JP|Japan|🇯🇵)/],
    ["KR", /(韩国|KR|Korea|🇰🇷)/],
    ["SG", /(新加坡|狮|獅|SG|Singapore|🇸🇬)/],
    ["US", /(美国|US|States|American|🇺🇸)/],
  ];
  const regionLabels = new Map([
    ["HK", "🇭🇰 香港"],
    ["TW", "🇹🇼 台湾"],
    ["JP", "🇯🇵 日本"],
    ["KR", "🇰🇷 韩国"],
    ["SG", "🇸🇬 新加坡"],
    ["US", "🇺🇸 美国"],
  ]);
  const makeProjectNames = () => {
    const regions = new Map(
      regionDefinitions.map(([region]) => [region, regionLabels.get(region)]),
    );
    const regionAutos = new Map(
      regionDefinitions.map(([region]) => [
        region,
        `${regionLabels.get(region)} · 自动`,
      ]),
    );
    const regionFallbacks = new Map(
      regionDefinitions.map(([region]) => [
        region,
        `${regionLabels.get(region)} · 故障转移`,
      ]),
    );
    return {
      select: "🎯 节点选择",
      noncn: "🌏 非中国区",
      final: "🪞 兜底策略",
      allAuto: "🌐 全部 · 自动",
      allFallback: "🌐 全部 · 故障转移",
      regions,
      regionAutos,
      regionFallbacks,
    };
  };
  const projectNameList = (names) => [
    names.select,
    names.noncn,
    names.final,
    names.allAuto,
    names.allFallback,
    ...regionDefinitions.flatMap(([region]) => [
      names.regions.get(region),
      names.regionAutos.get(region),
      names.regionFallbacks.get(region),
    ]),
  ];
  const supportedProxyTypes = new Set([
    "ss",
    "ssr",
    "socks5",
    "http",
    "snell",
    "vmess",
    "vless",
    "trojan",
    "hysteria",
    "hysteria2",
    "wireguard",
    "tuic",
    "ssh",
    "mieru",
    "anytls",
    "gost-relay",
  ]);
  const activeDefinitions = personalRules.concat(aclRules);
  const builtinOutboundNames = new Set([
    "DIRECT",
    "REJECT",
    "REJECT-DROP",
    "COMPATIBLE",
    "PASS",
    "PASS-RULE",
    "DNS",
  ]);
  const hasOwn = (object, property) =>
    Object.prototype.hasOwnProperty.call(object, property);
  const isPlainObject = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype === null) {
      return true;
    }
    const constructor = hasOwn(prototype, "constructor")
      ? prototype.constructor
      : null;
    return (
      Object.prototype.toString.call(value) === "[object Object]" &&
      typeof constructor === "function" &&
      Function.prototype.toString.call(constructor) ===
        Function.prototype.toString.call(Object)
    );
  };

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("proxy-routing: config is required");
  }

  if (!hasOwn(config, "proxies")) {
    if (hasOwn(config, "proxy-providers")) {
      throw new Error(
        "proxy-routing: config.proxies is required; this override only supports inline proxies, not proxy-providers",
      );
    }
    throw new Error("proxy-routing: config.proxies must be a non-empty array");
  }
  if (!Array.isArray(config.proxies) || config.proxies.length === 0) {
    throw new Error("proxy-routing: config.proxies must be a non-empty array");
  }

  const rulesBase = hasOwn(config, "rules") ? config.rules : [];
  if (!Array.isArray(rulesBase)) {
    throw new Error("proxy-routing: config.rules must be an array");
  }
  const projectGroupsBase = hasOwn(config, "proxy-groups")
    ? config["proxy-groups"]
    : [];
  if (!Array.isArray(projectGroupsBase)) {
    throw new Error("proxy-routing: config.proxy-groups must be an array");
  }
  const airportGroupNames = new Set();
  for (let index = 0; index < projectGroupsBase.length; index += 1) {
    const group = projectGroupsBase[index];
    if (!isPlainObject(group)) {
      throw new Error(
        `proxy-routing: config.proxy-groups[${index}] must be a plain object`,
      );
    }
    if (
      !hasOwn(group, "name") ||
      typeof group.name !== "string" ||
      group.name.trim().length === 0
    ) {
      throw new Error(
        `proxy-routing: config.proxy-groups[${index}].name must be a non-empty string`,
      );
    }
    if (builtinOutboundNames.has(group.name)) {
      throw new Error(
        `proxy-routing: proxy group name conflicts with a built-in outbound: ${group.name}`,
      );
    }
    if (airportGroupNames.has(group.name)) {
      throw new Error(
        `proxy-routing: duplicate proxy group name is not allowed: ${group.name}`,
      );
    }
    airportGroupNames.add(group.name);
  }
  const existingRuleProviders =
    hasOwn(config, "rule-providers") && config["rule-providers"] !== null
      ? config["rule-providers"]
      : {};
  if (!isPlainObject(existingRuleProviders)) {
    throw new Error("proxy-routing: config.rule-providers must be an object");
  }

  const proxyNames = [];
  const proxyNameSet = new Set();
  for (let index = 0; index < config.proxies.length; index += 1) {
    const proxy = config.proxies[index];
    if (!isPlainObject(proxy)) {
      throw new Error(
        `proxy-routing: config.proxies[${index}] must be a plain object`,
      );
    }
    if (typeof proxy.name !== "string" || proxy.name.trim().length === 0) {
      throw new Error(
        `proxy-routing: config.proxies[${index}].name must be a non-empty string`,
      );
    }
    if (proxyNameSet.has(proxy.name)) {
      throw new Error(
        `proxy-routing: duplicate proxy name is not allowed: ${proxy.name}`,
      );
    }
    if (typeof proxy.type !== "string" || proxy.type.trim().length === 0) {
      throw new Error(
        `proxy-routing: config.proxies[${index}].type must be a non-empty string`,
      );
    }
    if (!supportedProxyTypes.has(proxy.type)) {
      throw new Error(
        `proxy-routing: unsupported proxy type: ${proxy.type}`,
      );
    }
    if (
      builtinOutboundNames.has(proxy.name) ||
      airportGroupNames.has(proxy.name)
    ) {
      throw new Error(
        `proxy-routing: proxy name conflicts with a reserved group or reference name: ${proxy.name}`,
      );
    }
    proxyNames.push(proxy.name);
    proxyNameSet.add(proxy.name);
  }

  const usableProxyNames = proxyNames.filter(
    (proxyName) =>
      !informationNodePatterns.some((pattern) => pattern.test(proxyName)),
  );
  const automaticProxyNames = usableProxyNames.filter(
    (proxyName) => !/实验性/.test(proxyName),
  );
  const regionProxies = new Map(
    regionDefinitions.map(([name]) => [name, []]),
  );
  for (const proxyName of automaticProxyNames) {
    for (const [region, pattern] of regionDefinitions) {
      if (pattern.test(proxyName)) {
        regionProxies.get(region).push(proxyName);
      }
    }
  }
  const regions = regionDefinitions.map(([name]) => ({
    name,
    proxies: regionProxies.get(name),
  }));

  const allFallbackProxies = usableProxyNames;
  const allAutoProxies = automaticProxyNames;
  if (allFallbackProxies.length === 0) {
    throw new Error("proxy-routing: ALL-FALLBACK requires at least one proxy");
  }
  if (allAutoProxies.length === 0) {
    throw new Error("proxy-routing: ALL-AUTO requires at least one proxy");
  }
  const projectNames = makeProjectNames();
  const projectGroupNames = new Set(projectNameList(projectNames));
  const occupiedProjectNames = [...projectGroupNames].filter(
    (name) => proxyNameSet.has(name) || builtinOutboundNames.has(name),
  );
  if (occupiedProjectNames.length > 0) {
    throw new Error(
      `proxy-routing: conflict; reserved group name is occupied: ${occupiedProjectNames[0]}`,
    );
  }
  const expectedProviderEntries = new Map(
    activeDefinitions.map(([name, url]) => [
      name,
      {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        proxy: projectNames.select,
        url,
      },
    ]),
  );
  const policyTargets = {
    PROXY: projectNames.select,
    NONCN: projectNames.noncn,
    TW: projectNames.regions.get("TW"),
  };
  const expectedProjectRules = activeDefinitions
    .map(
      ([name, , policy]) =>
        `RULE-SET,${name},${policyTargets[policy] || policy}`,
    )
    .concat([
      "GEOSITE,private,DIRECT",
      "GEOIP,private,DIRECT,no-resolve",
      `GEOSITE,gfw,${projectNames.select}`,
      "GEOSITE,cn,DIRECT",
      "GEOIP,CN,DIRECT,no-resolve",
      `MATCH,${projectNames.final}`,
    ]);
  const visibleGroups = [
    {
      name: projectNames.select,
      type: "select",
      proxies: [
        projectNames.allAuto,
        projectNames.allFallback,
        ...regionDefinitions.map(([region]) => projectNames.regions.get(region)),
      ],
    },
    {
      name: projectNames.noncn,
      type: "select",
      proxies: ["JP", "KR", "SG", "US"].map((region) =>
        projectNames.regions.get(region),
      ),
    },
    {
      name: projectNames.final,
      type: "select",
      proxies: [projectNames.select, "DIRECT"],
    },
    ...regions.map(({ name, proxies }) => ({
      name: projectNames.regions.get(name),
      type: "select",
      proxies: [
        projectNames.regionAutos.get(name),
        projectNames.regionFallbacks.get(name),
        ...proxies,
      ],
    })),
  ];
  const hiddenGroups = [
    {
      name: projectNames.allAuto,
      type: "url-test",
      proxies: allAutoProxies,
      url: healthCheckUrl,
      interval: 300,
      tolerance: 50,
      hidden: true,
    },
    {
      name: projectNames.allFallback,
      type: "fallback",
      proxies: allFallbackProxies,
      url: healthCheckUrl,
      interval: 180,
      hidden: true,
    },
    ...regions.flatMap(({ name, proxies }) => [
      {
        name: projectNames.regionAutos.get(name),
        type: "url-test",
        proxies,
        url: healthCheckUrl,
        interval: 300,
        tolerance: name === "US" ? 150 : 50,
        hidden: true,
      },
      {
        name: projectNames.regionFallbacks.get(name),
        type: "fallback",
        proxies,
        url: healthCheckUrl,
        interval: 300,
        hidden: true,
      },
    ]),
  ];
  const expectedProjectGroups = visibleGroups.concat(hiddenGroups);
  const expectedProjectGroupNames = new Set(
    expectedProjectGroups.map(({ name }) => name),
  );
  if (expectedProjectGroupNames.size !== expectedProjectGroups.length) {
    throw new Error("proxy-routing: generated project group names are not unique");
  }

  const nextRuleProviders = Object.create(null);
  for (const [name, provider] of Object.entries(existingRuleProviders)) {
    if (name.startsWith("proxy-routing-")) {
      continue;
    }
    nextRuleProviders[name] = provider;
  }
  for (const [name, provider] of expectedProviderEntries) {
    nextRuleProviders[name] = provider;
  }

  config.rules = expectedProjectRules;
  config["rule-providers"] = nextRuleProviders;
  config["proxy-groups"] = expectedProjectGroups;

  return config;
};
