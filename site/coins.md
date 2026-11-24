> Beta. Some things may not work as described yet.

# [SealedIn](/index.md) Any coin aboard.

No USDC on Solana? Buy a key with Bitcoin, Monero, USDT on Tron or another coin from the list. No account. Choose 20 to 100 USD.

1. Pick a coin and an amount. You get an address and the amount to send, priced for one hour.

2. Send the coin from any wallet or exchange. Send less and the key is smaller, send more and it is larger. A later payment is priced when it arrives.

3. The key appears on this page once the payment confirms. Keep this page in this browser: it holds the secret that reads the key, for 7 days. Use the key like any other: [Claude Code, Cursor and other clients](/claude-code.md).

This page needs JavaScript to ask for an address. Without it, and for agents, the calls are below.

Read before you pay. This route is run by us, the operator, outside the enclave, so we see a key bought here. A key bought with USDC on Solana on [the home page](/index.md) is derived inside the enclave and no operator sees it. The coins pass through PayGate.to, a forwarder that sends them on to us and tells us of the payment; we credit what it reports. One order buys one new key and cannot top up a key you have. Pay each address once: a second payment to it is credited by hand, through [support](/support.md). A payment below the minimum shown for the coin is lost. Credits never expire and are not refundable, not withdrawable and not transferable.

## Without a browser

The service is at `https://pay.sealedin.ai`.

```
GET  /pay/coins                      coins on offer, each with the smallest payment that is forwarded, and the USD range
POST /pay/orders                     {"ticker": "xmr", "usd": 20} -> 201 {order, claim, address, amount, expires_at, status}
GET  /pay/orders/<order>             Authorization: Bearer <claim> -> {status: "pending"} or {status: "paid", credited_usd, key}
```

Keep `claim`: it is shown once and is the only way to read the key. Send `amount` of the coin to `address`, then ask for the order until `status` is `paid`.
