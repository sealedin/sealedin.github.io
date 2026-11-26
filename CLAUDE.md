---
purpose: Conventions for agents working on the sealedin.ai static site
---

# sealedin.ai site

Plain HTML in `site/`, no build. 

## Rules

- A copy change goes into the HTML page and its `.md` twin together; `agents.html` and `agents.md` stay word for word the same; regenerate `llms-full.txt` by joining the twins.
- Same content for people and agents, nothing hidden for bots, no third-party scripts, styles or fonts, except the X conversion pixel (`rjb1j`) in the head of every page; its inline snippet is pinned by hash in the Content-Security-Policy, so changing the snippet means updating the hash. `assets/buy.js` also sends the X conversion event `tw-rjb1j-rjwjl`, with no parameters, where it sends `begin_checkout`. The second exception is Google Analytics 4 (`G-JYHPCD3WW9`): the Google tag in every head plus `assets/ga.js`, with `view_item`, `begin_checkout` and `purchase` sent from `assets/buy.js`. `assets/ga.js` also configures Google Ads (`AW-18580038798`) on the same tag, so the `purchase` event is the Ads conversion; the Content-Security-Policy of every page lists the Ads hosts. Events carry amounts and item names only, never the code, the key, a transaction signature or a payment reference. On `bonus.html`, `assets/bonus.js` must stay the first script in the head: the bonus service (`bonus.sealedin.ai`, outside this repo) returns the visitor with `#result=...&key=...`, and the script removes the fragment before any tag reads the address. It sends `bonus_start`, `sign_up` (method `x`) and `bonus_refused` (reason) to Google Analytics, never the key.
- No em-dashes, no hard-wrapped prose.
- Commit as `agent@sealedin.ai` on `main`, hooks on, no attribution trailers. A push to `main` publishes the site.
