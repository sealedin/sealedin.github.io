Sealed at origin. Opened at destination. Not in between.

# One endpoint to attested LLMs.

A private LLM API: one attested endpoint on top of attested GPUs, OpenAI and Anthropic compatible. GLM, Kimi, DeepSeek and Qwen in Claude Code, Cursor or any compatible client. Paid in USDC. No card, no account.

[I'm a human](#buy) [I'm an agent](/agents.md) Freight Prepaid USDC · No account Got an agent? Hand it this:

## `Read https://sealedin.ai/agents.md and set up SealedIn as the model endpoint.` Three steps. Then it runs.

### 01 Pay

Choose 20 to 500 USD and pay in USDC on Solana from a wallet: scan the QR or open the wallet link. Credits never expire. They are not refundable, not withdrawable and not transferable.

### 02 Take the key

Save the code shown with the payment. The key appears on this page once the payment confirms, shown once. The code recovers it. Anyone holding the code or the key can spend your balance.

[Models and prices](/models.md)

### 03 Run

Claude Code

```

export ANTHROPIC_BASE_URL=https://api.sealedin.ai
export ANTHROPIC_AUTH_TOKEN=$SEALEDIN_KEY
export ANTHROPIC_MODEL=chutes/zai-org/GLM-5.2-TEE
claude

```

## Not to be opened in transit.

Your request is encrypted all the way and opened only inside sealed hardware: first our gateway, then the GPU running the model.

We see spend per key, not your requests. The source is open, so you can check that.

[What is verified, and what is not](/trust.md)
