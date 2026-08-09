const main = (config) => {
  const healthCheckUrl = "https://www.gstatic.com/generate_204";
  const personalRules = [
    [
      "proxy-routing-personal-direct",
      "https://raw.githubusercontent.com/mcdp-adk/proxy-routing/main/rules/direct.list",
      "DIRECT",
    ],
    [
      "proxy-routing-personal-reject",
      "https://raw.githubusercontent.com/mcdp-adk/proxy-routing/main/rules/reject.list",
      "REJECT",
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
      "proxy-routing-acl-lan",
      "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list",
      "DIRECT",
    ],
    [
      "proxy-routing-acl-download",
      "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Download.list",
      "DIRECT",
    ],
    [
      "proxy-routing-acl-steamcn",
      "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/SteamCN.list",
      "DIRECT",
    ],
    [
      "proxy-routing-acl-gamedownload",
      "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/GameDownload.list",
      "DIRECT",
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
  const makeProjectNames = (suffix) => {
    const regions = new Map(
      regionDefinitions.map(([region]) => [
        region,
        `${regionLabels.get(region)}${suffix}`,
      ]),
    );
    const regionAutos = new Map(
      regionDefinitions.map(([region]) => [
        region,
        `${regionLabels.get(region)} · 自动${suffix}`,
      ]),
    );
    const regionFallbacks = new Map(
      regionDefinitions.map(([region]) => [
        region,
        `${regionLabels.get(region)} · 故障转移${suffix}`,
      ]),
    );
    return {
      select: `🎯 节点选择${suffix}`,
      noncn: `🌏 非中国区${suffix}`,
      allAuto: `🌐 全部 · 自动${suffix}`,
      allFallback: `🌐 全部 · 故障转移${suffix}`,
      regions,
      regionAutos,
      regionFallbacks,
    };
  };
  const projectNameModes = {
    base: makeProjectNames(""),
    custom: makeProjectNames("「自定义」"),
  };
  const projectNameList = (names) => [
    names.select,
    names.noncn,
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
  const allProjectProviderNames = new Set(
    activeDefinitions.map(([name]) => name),
  );
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
  const sameValue = (left, right) => {
    if (left === right) {
      return true;
    }
    if (Array.isArray(left) || Array.isArray(right)) {
      return (
        Array.isArray(left) &&
        Array.isArray(right) &&
        left.length === right.length &&
        left.every((value, index) => sameValue(value, right[index]))
      );
    }
    if (isPlainObject(left) || isPlainObject(right)) {
      if (!isPlainObject(left) || !isPlainObject(right)) {
        return false;
      }
      const leftKeys = Object.keys(left);
      const rightKeys = Object.keys(right);
      return (
        leftKeys.length === rightKeys.length &&
        leftKeys.every(
          (key) => hasOwn(right, key) && sameValue(left[key], right[key]),
        )
      );
    }
    return false;
  };
  const isProjectRule = (rule) => {
    if (typeof rule !== "string") {
      return false;
    }
    const parts = rule.split(",");
    return (
      parts[0] === "RULE-SET" &&
      typeof parts[1] === "string" &&
      allProjectProviderNames.has(parts[1])
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
  const installedProjectProviders = Object.keys(existingRuleProviders).filter(
    (name) => allProjectProviderNames.has(name),
  );

  const allFallbackProxies = usableProxyNames;
  const allAutoProxies = automaticProxyNames;
  if (allFallbackProxies.length === 0) {
    throw new Error("proxy-routing: ALL-FALLBACK requires at least one proxy");
  }
  if (allAutoProxies.length === 0) {
    throw new Error("proxy-routing: ALL-AUTO requires at least one proxy");
  }
  const providerNamesMatch =
    installedProjectProviders.length === allProjectProviderNames.size;
  const hasProjectState =
    installedProjectProviders.length > 0 || rulesBase.some(isProjectRule);
  let mode;
  if (!hasProjectState) {
    const conflictsWith = (names) =>
      projectNameList(names).filter(
        (name) =>
          airportGroupNames.has(name) ||
          proxyNameSet.has(name) ||
          builtinOutboundNames.has(name),
      );
    const baseConflicts = conflictsWith(projectNameModes.base);
    if (baseConflicts.length === 0) {
      mode = "base";
    } else if (conflictsWith(projectNameModes.custom).length === 0) {
      mode = "custom";
    } else {
      throw new Error(
        "proxy-routing: conflict; both base and custom project name families are occupied",
      );
    }
  } else {
    if (!providerNamesMatch) {
      throw new Error(
        "proxy-routing: conflict; project provider marker is partial, stale, or inconsistent",
      );
    }
    const providerTargets = activeDefinitions.map(([name]) => {
      const provider = existingRuleProviders[name];
      return isPlainObject(provider) && hasOwn(provider, "proxy")
        ? provider.proxy
        : null;
    });
    const commonProviderTarget = providerTargets[0];
    if (
      typeof commonProviderTarget !== "string" ||
      !providerTargets.every((target) => target === commonProviderTarget)
    ) {
      throw new Error(
        "proxy-routing: conflict; project provider download proxy targets are mixed or unknown",
      );
    }
    if (commonProviderTarget === projectNameModes.base.select) {
      mode = "base";
    } else if (commonProviderTarget === projectNameModes.custom.select) {
      mode = "custom";
    } else {
      throw new Error(
        "proxy-routing: conflict; project provider download proxy target is not a supported node selection group",
      );
    }
  }
  const projectNames = projectNameModes[mode];
  const projectGroupNames = new Set(projectNameList(projectNames));
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
  const expectedProjectRules = activeDefinitions.map(
    ([name, , policy]) =>
      `RULE-SET,${name},${policyTargets[policy] || policy}`,
  );
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

  const providerStructuresMatch =
    providerNamesMatch &&
    activeDefinitions.every(([name]) =>
      sameValue(existingRuleProviders[name], expectedProviderEntries.get(name)),
    );
  const projectGroupsHaveLayout =
    projectGroupsBase.length >= expectedProjectGroups.length;
  const airportGroupEnd = projectGroupsBase.length - hiddenGroups.length;
  const projectGroupsMatch =
    projectGroupsHaveLayout &&
    visibleGroups.every((group, index) =>
      sameValue(projectGroupsBase[index], group),
    ) &&
    hiddenGroups.every((group, index) =>
      sameValue(projectGroupsBase[airportGroupEnd + index], group),
    ) &&
    projectGroupsBase
      .slice(visibleGroups.length, airportGroupEnd)
      .every((group) => !projectGroupNames.has(group.name));
  const projectRulesMatch =
    rulesBase.length >= expectedProjectRules.length &&
    expectedProjectRules.every(
      (rule, index) => rulesBase[index] === rule,
    ) &&
    rulesBase
      .slice(expectedProjectRules.length)
      .every((rule) => !isProjectRule(rule));
  if (hasProjectState) {
    if (!providerStructuresMatch) {
      throw new Error(
        "proxy-routing: conflict; project provider structure is inconsistent",
      );
    }
    if (!projectGroupsMatch) {
      throw new Error(
        "proxy-routing: conflict; project proxy groups are missing, extra, or structurally inconsistent",
      );
    }
    if (!projectRulesMatch) {
      throw new Error(
        "proxy-routing: conflict; project RULE-SET rules are missing, extra, or structurally inconsistent",
      );
    }
  }

  const airportRules = hasProjectState
    ? rulesBase.slice(expectedProjectRules.length)
    : rulesBase;
  const nextRules = expectedProjectRules.concat(airportRules);
  const nextRuleProviders = Object.create(null);
  for (const [name, provider] of Object.entries(existingRuleProviders)) {
    if (!allProjectProviderNames.has(name)) {
      nextRuleProviders[name] = provider;
    }
  }
  for (const [name, provider] of expectedProviderEntries) {
    nextRuleProviders[name] = provider;
  }
  const retainedGroups = hasProjectState
    ? projectGroupsBase.slice(visibleGroups.length, airportGroupEnd)
    : projectGroupsBase;
  const nextProxyGroups = visibleGroups.concat(retainedGroups, hiddenGroups);

  config.rules = nextRules;
  config["rule-providers"] = nextRuleProviders;
  config["proxy-groups"] = nextProxyGroups;

  return config;
};
