const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const main = loadMain();

const expectedRules = [
  "RULE-SET,proxy-routing-personal-direct,DIRECT",
  "RULE-SET,proxy-routing-personal-proxy,🎯 节点选择",
  "RULE-SET,proxy-routing-personal-noncn,🌏 非中国区",
  "RULE-SET,proxy-routing-acl-banad,REJECT",
  "RULE-SET,proxy-routing-acl-ehgallery,🌏 非中国区",
  "RULE-SET,proxy-routing-acl-ai,🌏 非中国区",
  "RULE-SET,proxy-routing-acl-bahamut,🇹🇼 台湾",
  "GEOSITE,private,DIRECT",
  "GEOIP,private,DIRECT,no-resolve",
  "GEOSITE,gfw,🎯 节点选择",
  "GEOSITE,cn,DIRECT",
  "GEOIP,CN,DIRECT,no-resolve",
  "MATCH,🪞 兜底策略",
];

const expectedProviders = expectedRules
  .filter((rule) => rule.startsWith("RULE-SET,"))
  .map((rule) => rule.split(",")[1]);

describe("personal lists", () => {
  it("keeps the slimmed direct, proxy, and noncn files", () => {
    assert.equal(readList("direct.list"), "DOMAIN-SUFFIX,steamserver.net\n");
    assert.equal(
      readList("proxy.list"),
      [
        "DOMAIN-SUFFIX,bing.com",
        "DOMAIN-KEYWORD,notion",
        "DOMAIN-KEYWORD,pikpak",
        "",
      ].join("\n"),
    );
    assert.equal(
      readList("noncn.list"),
      [
        "DOMAIN-SUFFIX,unity.com",
        "DOMAIN-SUFFIX,unity3d.com",
        "DOMAIN-SUFFIX,gameuidatabase.com",
        "",
      ].join("\n"),
    );
  });

  it("removes reject.list", () => {
    assert.equal(
      fs.existsSync(path.join(root, "rules", "reject.list")),
      false,
    );
  });
});

describe("override e2e", () => {
  for (const [label, fixture] of [
    ["CN-grouped leftover", cnGroupedConfig()],
    ["EN-grouped leftover", enGroupedConfig()],
  ]) {
    it(`replaces ${label} rules with the personal stack`, () => {
      const output = main(structuredClone(fixture));
      assert.deepEqual(output.rules, expectedRules);
      assert.deepEqual(Object.keys(output["rule-providers"]).sort(), [
        ...expectedProviders,
      ].sort());
      assert.equal(
        output["rule-providers"]["proxy-routing-personal-direct"].url.endsWith(
          "/rules/direct.list",
        ),
        true,
      );
      assert.equal(
        output["proxy-groups"][0].name,
        "🎯 节点选择",
      );
      assert.equal(output["proxy-groups"][1].name, "🌏 非中国区");
      assert.deepEqual(output["proxy-groups"][2], {
        name: "🪞 兜底策略",
        type: "select",
        proxies: ["🎯 节点选择", "DIRECT"],
      });
      assert.equal(output["proxy-groups"][3].name, "🇭🇰 香港");
      assert.equal(
        output["proxy-groups"].some((group) =>
          /机场主选|游戏平台|兜底分流|Proxies|Steam|OpenAI|^Final$|「自定义」/.test(
            group.name,
          ),
        ),
        false,
      );
    });

    it(`is idempotent on ${label} output`, () => {
      const once = main(structuredClone(fixture));
      const twice = main(structuredClone(once));
      assert.deepEqual(twice.rules, once.rules);
      assert.deepEqual(twice["proxy-groups"], once["proxy-groups"]);
      assert.deepEqual(twice["rule-providers"], once["rule-providers"]);
    });
  }

  it("drops stale proxy-routing providers and keeps unrelated providers", () => {
    const once = main(structuredClone(cnGroupedConfig()));
    once["rule-providers"]["proxy-routing-acl-lan"] = {
      type: "http",
      behavior: "classical",
      format: "text",
      interval: 86400,
      proxy: "🎯 节点选择",
      url: "https://example.invalid/lan.list",
    };
    once["rule-providers"]["airport-extra"] = {
      type: "http",
      behavior: "classical",
      format: "text",
      interval: 86400,
      url: "https://example.invalid/airport.list",
    };
    const twice = main(once);
    assert.equal(
      Object.hasOwn(twice["rule-providers"], "proxy-routing-acl-lan"),
      false,
    );
    assert.equal(Object.hasOwn(twice["rule-providers"], "airport-extra"), true);
    assert.deepEqual(twice.rules, expectedRules);
  });

  it("drops leftover groups that rules no longer reference", () => {
    const output = main(structuredClone(cnGroupedConfig()));
    const names = output["proxy-groups"].map((group) => group.name);
    assert.equal(names.includes("机场主选"), false);
    assert.equal(names.includes("游戏平台"), false);
    assert.equal(names.includes("兜底分流"), false);
  });
});

function loadMain() {
  const source = fs.readFileSync(
    path.join(root, "flclash", "override.js"),
    "utf8",
  );
  return new Function(`${source}\nreturn main;`)();
}

function readList(name) {
  return fs.readFileSync(path.join(root, "rules", name), "utf8");
}

function node(name) {
  return { name, type: "ss" };
}

function cnGroupedConfig() {
  const proxies = [
    node("剩余流量：1 GB"),
    node("🇭🇰香港_01"),
    node("🇨🇳台湾_01"),
    node("🇯🇵日本_01"),
    node("🇸🇬新加坡_01"),
    node("🇰🇷韩国_01"),
    node("🇺🇸美国_01"),
  ];
  return {
    proxies,
    "proxy-groups": [
      {
        name: "机场主选",
        type: "select",
        proxies: ["🇭🇰香港_01"],
      },
      {
        name: "游戏平台",
        type: "select",
        proxies: ["机场主选", "DIRECT"],
      },
      {
        name: "兜底分流",
        type: "select",
        proxies: ["机场主选", "DIRECT"],
      },
    ],
    rules: [
      "DOMAIN-SUFFIX,steamcommunity.com,游戏平台",
      "DOMAIN-SUFFIX,google.com,谷歌服务",
      "GEOIP,CN,DIRECT",
      "MATCH,兜底分流",
    ],
  };
}

function enGroupedConfig() {
  const proxies = [
    node("Traffic: 1 GB | 150 GB"),
    node("🇭🇰 Hong Kong 1"),
    node("🇨🇳 Taiwan 1"),
    node("🇯🇵 Japan 1"),
    node("🇸🇬 Singapore 1"),
    node("🇰🇷 Korea 1"),
    node("🇺🇸 United States 1"),
  ];
  return {
    proxies,
    "proxy-groups": [
      {
        name: "Proxies",
        type: "select",
        proxies: ["🇭🇰 Hong Kong 1"],
      },
      {
        name: "Steam",
        type: "select",
        proxies: ["Proxies", "DIRECT"],
      },
      {
        name: "OpenAI",
        type: "select",
        proxies: ["Proxies"],
      },
      {
        name: "Final",
        type: "select",
        proxies: ["Proxies", "DIRECT"],
      },
    ],
    rules: [
      "DOMAIN-SUFFIX,steamcommunity.com,Steam",
      "DOMAIN-SUFFIX,openai.com,OpenAI",
      "GEOIP,CN,DIRECT",
      "MATCH,Final",
    ],
  };
}
