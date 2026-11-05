> Beta. Some things may not work as described yet.

# GLM, Kimi and DeepSeek in Claude Code

One base URL and one key. Get the key on the home page, then set it in your client. [Get a key](/index.md).

## Claude Code

Set these variables, using a model id from the list below, then start it.

```bash
export ANTHROPIC_BASE_URL=https://api.sealedin.ai
export ANTHROPIC_AUTH_TOKEN=$SEALEDIN_KEY
export ANTHROPIC_MODEL=chutes/zai-org/GLM-5.2-TEE
claude
```

## Cursor

Set these in Cursor, using a model id from the list below.

```text
Cursor Settings, Models:
OpenAI API Key: your SealedIn key
Override OpenAI Base URL: https://api.sealedin.ai/v1
Add model: chutes/zai-org/GLM-5.2-TEE
```

## Any OpenAI client

Point the client at https://api.sealedin.ai/v1 and use your key as the API key. The same request with curl:

```bash
curl https://api.sealedin.ai/v1/chat/completions \
  -H "Authorization: Bearer $SEALEDIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "chutes/zai-org/GLM-5.2-TEE", "messages": [{"role": "user", "content": "Say hello."}]}'
```

## Model ids

Use the exact id. Prices are on the [models page](/models.md). What is verified, and what is not, is on the [trust page](/trust.md).

- GLM-5.2: `chutes/zai-org/GLM-5.2-TEE`
- Kimi-K3: `chutes/moonshotai/Kimi-K3-TEE`
- DeepSeek-V4-Flash: `chutes/deepseek-ai/DeepSeek-V4-Flash-0731-TEE`
- Qwen3.5-397B: `chutes/Qwen/Qwen3.5-397B-A17B-TEE`
- Qwen3.8-27B: `chutes/Qwen/Qwen3.8-27B-TEE`
