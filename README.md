# proxy-routing

Personal routing on top of airport subscriptions: one rule list per exit, published for mihomo and for clients without GEOSITE, and a FlClash override script that regroups an airport's nodes by region. It adds no nodes.

## Files

- `rules/`: one list per exit, the single source for every client. Each list names MetaCubeX geosite categories where one exists and lists domains by hand where none does.
- `flclash.js`: the FlClash override script. It builds the region groups and matches `rules/` ahead of the geosite and GeoIP fallbacks.
- `portable.mjs`: expands each `GEOSITE` line in `rules/` into the category's domains, for clients without GEOSITE. `.github/workflows/portable.yml` runs it on every push that changes `rules/` and daily, and publishes the result to the `portable` branch.

## Lists

Lists match in this order; the first list that claims a domain decides its exit.

| List | Exit |
| --- | --- |
| `direct` | connect directly |
| `reject` | block |
| `tw` | Taiwan |
| `jp` | Japan |
| `noncn` | outside mainland China, Hong Kong, Macao and Taiwan |
| `proxy` | any region |

Each list is published at two URLs:

| URL | Contents | Read by |
| --- | --- | --- |
| `https://raw.githubusercontent.com/mcdp-adk/proxy-routing/main/rules/<list>.list` | `GEOSITE` and domain rules | mihomo clients such as FlClash |
| `https://raw.githubusercontent.com/mcdp-adk/proxy-routing/portable/<list>.list` | `DOMAIN`, `DOMAIN-SUFFIX` and `DOMAIN-KEYWORD` rules only | Loon, Surge, Shadowrocket, Stash and mihomo as they are; Quantumult X, sing-box and Egern through a converter |

Subscribe to the lists in the order above, each pointed at the matching exit.

## Changing routing

Add a `GEOSITE,<category>` or `DOMAIN-SUFFIX,<domain>` line to the list of the exit the traffic needs. Clients on the `main` URLs pick it up on their next rule update, clients on the `portable` URLs once the workflow has published.
