# proxy-routing

Personal routing for FlClash and Loon on top of airport subscriptions. It regroups an airport's nodes by region and decides which exit each domain uses; it adds no nodes.

## Files

- `rules/`: one list per exit, shared by both clients. Each list names MetaCubeX geosite categories where one exists and lists domains by hand where none does.
- `flclash.js`: the FlClash override script. It builds the region groups and matches `rules/` ahead of the geosite and GeoIP fallbacks.
- `portable.mjs`: expands `rules/` into plain `DOMAIN`, `DOMAIN-SUFFIX` and `DOMAIN-KEYWORD` lists, which Loon, Surge, Shadowrocket, Stash and mihomo read as they are; Quantumult X, sing-box and Egern need a converter. `.github/workflows/portable.yml` runs it on every push that changes `rules/` and daily, and publishes the result to the `portable` branch.

## Exits

Lists match in this order; the first list that claims a domain decides its exit.

| List | FlClash | Loon |
| --- | --- | --- |
| `direct` | `DIRECT` | `DIRECT` |
| `reject` | `REJECT` | `REJECT` |
| `tw` | 🇹🇼 台湾 | `TW` |
| `jp` | 🇯🇵 日本 | `JP` |
| `noncn` | 🌏 非中国区 | `NonCN` |
| `proxy` | 🎯 节点选择 | `Proxy` |

FlClash reads `https://raw.githubusercontent.com/mcdp-adk/proxy-routing/main/rules/<list>.list`; Loon subscribes to `https://raw.githubusercontent.com/mcdp-adk/proxy-routing/portable/<list>.list` in the order above.

## Changing routing

Add a `GEOSITE,<category>` or `DOMAIN-SUFFIX,<domain>` line to the list of the exit the traffic needs. FlClash picks it up on its next rule update, Loon once the workflow has published.
