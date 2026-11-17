---
name: sealedin-attested-llm
description: Sends LLM prompts through SealedIn, a gateway in an Intel TDX enclave in front of attested GPUs, with OpenAI and Anthropic compatible APIs. A key is bought with USDC on Solana over x402, no account. Fits tasks where a prompt should be opened only inside attested hardware. Covers checking the gateway, buying a key within the owner's limit, and calling a model.
---

# SealedIn: attested LLM calls, paid over x402

Version 1. Canonical copy: https://sealedin.ai/skill.md. Beta: some things may not work as described yet.

## Requires

- A Solana wallet that can sign an x402 V2 `exact` payment, holding USDC. The gateway pays the network fee, so the wallet needs no SOL.
- A spend limit set by the wallet's owner.

## Limits the owner sets

The amount to spend and the allowed models come from the owner. If none were given, stop and ask. A purchase is 20 to 100 USD and is not refundable, not withdrawable and not transferable. A price above the owner's limit is a stop, not a reason to look for a workaround.

## Steps

Base URL: https://api.sealedin.ai

1. Check the gateway. `GET /v1/quote` returns an Intel-signed TDX quote and the enclave's `pubkey`. `GET /v1/tls` returns `spki_sha256`, signed by that key: compare it with the SHA-256 of the public key of the TLS certificate you are connected to. A mismatch is a stop: send no prompt and no payment.
2. Read the prices. `GET /v1/catalog` needs no key and is signed by the same `pubkey`. It lists `models` with prices per million tokens, and `pay_to`, `asset`, `networks` and `fee_payer`.
3. Ask for the challenge. `POST /v1/keys/buy` with `{"amount_usd": 20}` answers 402 with a `PAYMENT-REQUIRED` header, base64 JSON.
4. Compare the challenge with the catalog: `payTo`, `asset`, `network` and `extra.feePayer` must match, and `amount` (USDC base units, 6 decimals) must be within the owner's limit. A mismatch is a stop.
5. Pay. Build a version 0 transaction: compute unit limit, compute unit price, one SPL `TransferChecked` of exactly the amount to the treasury's USDC token account, one Memo with a random nonce. The fee payer from the challenge is the first signer and its signature stays empty; the wallet signs second. Repeat the request with the payment in the `PAYMENT-SIGNATURE` header, base64 JSON: `{"x402Version": 2, "resource": {"url": ...}, "accepted": <the challenge entry>, "payload": {"transaction": "<base64>"}}`.
6. Take the key from the 200 reply: `key`, `alias`, `max_budget_usd`, `models`, `transaction`. The key is a secret: never log it or put it in a URL.
7. Call a model with streaming:

```bash
curl -N https://api.sealedin.ai/v1/chat/completions \
  -H "Authorization: Bearer $SEALEDIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "chutes/zai-org/GLM-5.2-TEE", "stream": true, "messages": [{"role": "user", "content": "Say hello."}]}'
```

`POST /v1/messages` takes the Anthropic format with `x-api-key` and `anthropic-version: 2023-06-01`.

## Afterwards

- Balance: `GET /key/info` with the key as bearer shows its spend and budget.
- Top-up: step 3 to 5 again with `Authorization: Bearer <key>` adds the amount to the same key.
- Lost key: `POST /v1/keys/recover` with `{"transaction", "payer", "timestamp", "signature"}` returns the same key. The wallet signs the bytes `sealedin-key-recover-v1`, one NUL, the 64 raw bytes of the transaction signature and the timestamp as 8 big-endian bytes.

## Errors

- 402 on the paid retry: `PAYMENT-RESPONSE.errorReason` names the reason. `settlement_pending` means the transaction left and may still land: do not pay again, recover it later.
- 409: the transaction is settled or in flight. Recover the key, do not pay again.
- 502 after payment: settled but no key yet. Recover it.
- 503: nothing was charged. Retry later.
- 400 `budget_exceeded` on a model call: lower `max_tokens`, shorten the prompt or top up.

Routes and status codes: https://sealedin.ai/openapi.json

## Calling

Allow 10 minutes per call. A model can reason for a minute or more before the first chunk. A client that gives up early may still be charged for the whole reply.

## Report a problem

info@sealedin.ai or https://github.com/sealedin/sealedin.github.io/issues. Never include a key or a prompt.

## What this does not establish

The checks show which code runs on the gateway and that TLS ends inside it. They do not show that a model's answer is correct, which weights ran, or what the upstream did with the prompt. Details: https://sealedin.ai/trust.md
