> Beta. Some things may not work as described yet.

# API reference

Base URL: https://api.sealedin.ai. The API is OpenAI and Anthropic compatible. The same routes for machines: [openapi.json](/openapi.json). [Get a key](/index.md).

## Authentication

Send the key as `Authorization: Bearer KEY`, or as `x-api-key: KEY` on the Anthropic route. Checking the gateway, reading the catalog and buying a key need no key. On the two purchase routes a key is optional: with it the payment tops that key up. The key is a secret: never log it or put it in a URL.

## Endpoints

| Route | Key | Purpose |
|---|---|---|
| `GET /v1/quote` | no | Intel-signed TDX quote binding the enclave's key |
| `GET /v1/tls` | no | The enclave key's endorsement of the TLS certificate |
| `GET /v1/catalog` | no | Models, prices and payment terms, signed by the enclave key |
| `POST /v1/keys/buy` | optional | Buy a key, or top one up, over x402 |
| `POST /v1/keys/recover` | no | Get the key of an x402 purchase again |
| `POST /v1/keys/claim` | optional | Claim the key of a Solana Pay transfer |
| `POST /v1/chat/completions` | yes | Chat completion in the OpenAI format |
| `POST /v1/messages` | yes | Message in the Anthropic format |
| `GET /v1/models` | yes | Model list in the OpenAI format |
| `GET /key/info` | yes | The calling key's own spend and budget |

## Check the gateway

### GET /v1/quote

Returns `quote`, the TDX quote in base64, `pubkey`, the enclave's Ed25519 public key in hex, bound into the quote's report data, and `event_log`, the boot event log behind RTMR3.

```bash
curl https://api.sealedin.ai/v1/quote
```

### GET /v1/tls

Returns `spki_sha256`, `not_after`, `pubkey` and `signature`. Compare `spki_sha256` with the SHA-256 of the public key of the certificate you are connected to. A mismatch means TLS does not end inside the enclave: send no prompt and no payment.

### GET /v1/catalog

Returns `models`, each with `id`, `input_usd_per_mtok` and `output_usd_per_mtok`, and the payment terms `pay_to`, `asset`, `networks` and `fee_payer`. The reply is signed by the same `pubkey`.

```bash
curl https://api.sealedin.ai/v1/catalog
```

## Buy a key

### POST /v1/keys/buy

Body: `{"amount_usd": 20}`, from 20 to 100, at most six decimals. Without a payment the reply is 402 with an x402 `exact` challenge in the `PAYMENT-REQUIRED` header, base64 JSON. Repeat the request with the signed transaction in the `PAYMENT-SIGNATURE` header. The gateway pays the network fee. With an existing key as bearer the amount is added to that key and the reply carries no key.

The 200 reply holds `key`, `alias`, `max_budget_usd`, `rpm_limit`, `models` and `transaction`. Credits are USD 1:1 with the USDC paid, not refundable, not withdrawable and not transferable. The transaction layout is in [skill.md](/skill.md).

```bash
curl -i https://api.sealedin.ai/v1/keys/buy \
  -H "Content-Type: application/json" \
  -d '{"amount_usd": 20}'
```

| Status | Meaning |
|---|---|
| 200 | Settled and credited |
| 400 | Bad amount, or a malformed payment header or transaction |
| 401 | A top-up's bearer is unknown or blocked. Nothing was paid |
| 402 | No payment yet, or a refused one. `PAYMENT-RESPONSE.errorReason` names a refusal; `settlement_pending` means the transaction left and may still land, so do not pay again |
| 409 | The transaction is settled or in flight. No key: recover it |
| 413 | The body is too large |
| 429 | Too many attempts |
| 502 | Settled, but the key could not be issued: recover it |
| 503 | Settlement unavailable. Nothing was charged |

### POST /v1/keys/recover

Body: `{"transaction", "payer", "timestamp", "signature"}`. The wallet signs the bytes `sealedin-key-recover-v1`, one NUL, the 64 raw bytes of the transaction signature and the timestamp as 8 big-endian bytes. The timestamp must be within two minutes of now and a proof works once. The reply is the same key, or for a top-up the amount credited.

| Status | Meaning |
|---|---|
| 200 | The same key, or for a top-up the amount credited |
| 400 | Malformed request |
| 401 | The proof does not verify |
| 404 | The transaction is not on chain at confirmed commitment |
| 409 | The recovery could not stand, for example a revoked key |
| 429 | Too many attempts |
| 503 | The chain cannot be read |

### POST /v1/keys/claim

For people paying from a wallet by QR or link. Body: `{"code": "..."}`, the 32-byte code in base58. The transfer carries a reference, the SHA-256 of `sealedin-pay-reference-v1`, one NUL and the code, as a base58 address. Whoever holds the code can take the key. With an existing key as bearer the payment is a top-up.

| Status | Meaning |
|---|---|
| 200 | Paid and credited |
| 202 | Nothing found yet: keep polling, see `Retry-After` |
| 400 | Bad code. Final |
| 401 | A bad bearer |
| 409 | Final. `reason` is `below_minimum`, `revoked`, `credited_elsewhere` or `target_gone` |
| 429 | Keep polling, see `Retry-After` |
| 502 | Keep polling |
| 503 | Keep polling, see `Retry-After` |

## Call a model

### POST /v1/chat/completions

The OpenAI chat format. Use `stream: true` and allow 10 minutes per call. `n` above 1 is refused. Fields outside the OpenAI chat format are removed. Model ids and prices are on the [models page](/models.md).

```bash
curl -N https://api.sealedin.ai/v1/chat/completions \
  -H "Authorization: Bearer $SEALEDIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "chutes/zai-org/GLM-5.2-TEE", "stream": true, "messages": [{"role": "user", "content": "Say hello."}]}'
```

| Status | Meaning |
|---|---|
| 200 | The completion, or a server-sent event stream when `stream` is true |
| 400 | A malformed request, or `budget_exceeded`: the key cannot cover the worst case of this request. Lower `max_tokens`, shorten the prompt or top up |
| 401 | Missing, unknown or blocked key |
| 413 | The body is over 32 MiB |
| 429 | Rate limit, or more than 10 requests running on the key. See `Retry-After` |
| 503 | No capacity, or no verified upstream instance for the model |

### POST /v1/messages

The Anthropic format. Send `anthropic-version: 2023-06-01`. Use `stream: true` and allow 10 minutes per call. The status codes are those of `/v1/chat/completions`.

```bash
curl -N https://api.sealedin.ai/v1/messages \
  -H "x-api-key: $SEALEDIN_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model": "chutes/zai-org/GLM-5.2-TEE", "max_tokens": 1024, "stream": true, "messages": [{"role": "user", "content": "Say hello."}]}'
```

### GET /v1/models

The models the key may call, in the OpenAI format. 401 for a missing, unknown or blocked key. `/v1/catalog` gives the same list with prices and needs no key.

### GET /key/info

The calling key's own info, including `spend` and `max_budget` in USD. 401 for an unknown or blocked key.

```bash
curl https://api.sealedin.ai/key/info \
  -H "Authorization: Bearer $SEALEDIN_KEY"
```

## Limits

- Allow 10 minutes per call. A model can reason for a minute or more before the first chunk. A client that gives up early may still be charged for the whole reply.
- A request body is at most 32 MiB.
- At most 10 requests run on one key at a time.
- A purchase is 20 to 100 USD.

## More

- [Claude Code, Cursor and other clients](/claude-code.md)
- [For agents](/agents.md) and the one-file procedure in [skill.md](/skill.md)
- [What is verified, and what is not](/trust.md)
- [Support](/support.md)
