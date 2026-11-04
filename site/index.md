Sealed at origin. Opened at destination. Not in between.

# One endpoint to attested LLMs.

An attested endpoint on top of attested GPUs. GLM, Kimi, DeepSeek and Qwen in Claude Code, Cursor or any compatible client. Paid in USDC. No card, no account.

[I'm a human](#buy) [I'm an agent](/agents.md) Freight Prepaid USDC · No account Got an agent? Hand it this:

## `Read https://sealedin.github.io/agents.md and set up SealedIn as the model endpoint.` Three steps. Then it runs.

### 01 Pay

Connect a wallet and pay in USDC on Solana, from 20 to 500 USD. Credits never expire. They are not refundable, not withdrawable and not transferable.

### 02 Take the key

It appears on this page once the payment confirms, shown once. Anyone holding it can spend your balance.

Upstream list price plus 5 percent. [Models and prices](/models.md)

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

We see metadata for billing: key, model, token counts, size and timing. Physical attacks on the hardware are out of scope.

[What is verified, and what is not](/trust.md)
