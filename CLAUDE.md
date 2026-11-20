---
purpose: Conventions for agents working on the sealedin.ai static site
---

# sealedin.ai site

Plain HTML in `site/`, no build. 

## Rules

- A copy change goes into the HTML page and its `.md` twin together; `agents.html` and `agents.md` stay word for word the same; regenerate `llms-full.txt` by joining the twins.
- Same content for people and agents, nothing hidden for bots, no third-party scripts, styles or fonts, except the X conversion pixel (`rjb1j`) in the head of every page; its inline snippet is pinned by hash in the Content-Security-Policy, so changing the snippet means updating the hash. The second exception is Google Analytics 4 (`G-JYHPCD3WW9`): the Google tag in every head plus `assets/ga.js`, with `view_item`, `begin_checkout` and `purchase` sent from `assets/buy.js`. Events carry amounts and item names only, never the code, the key, a transaction signature or a payment reference.
- No em-dashes, no hard-wrapped prose.
- Commit as `agent@sealedin.ai` on `main`, hooks on, no attribution trailers. A push to `main` publishes the site.
