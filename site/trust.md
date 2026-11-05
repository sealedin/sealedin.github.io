> Beta. Some things may not work as described yet.

# Contents declared.

How SealedIn checks attested LLM inference: what we can see, what is verified, and what is not.

## Two checks. One endpoint.

You talk to one endpoint. It is an enclave that checks other enclaves. An enclave is sealed hardware that can prove what code it runs.

Your client checks the gateway (TDX quote and TLS endorsement). The gateway, in an Intel TDX enclave, checks each GPU enclave that runs a model (CPU and GPU attestation, key binding).

1. You check the gateway. GET /v1/quote returns an Intel-signed TDX quote that binds the enclave's key and measures its code. GET /v1/tls is that key's endorsement of the TLS certificate. Compare it with the certificate you are connected to: TLS ends inside the enclave, not at a proxy in front of it.

2. The gateway checks the GPUs. Before it uses a model instance, it verifies the CPU attestation, the GPU attestation and the key binding, then rechecks every 15 minutes and encrypts each request to that instance. This runs inside the code you measured in the first check. Your prompt is encrypted on the way and opened only inside those two enclaves.

## What we can see

Spend and balance per key. That is what billing needs from us. Model, token counts and timing are recorded inside the enclave and no route exposes them, per request or per prompt. Our hosting provider sees your IP address and the size and timing of encrypted traffic. Payments are public on Solana.

## What is verified

- [The source is open](https://github.com/sealedin): anyone can rebuild the image and compare its measurement with the one the enclave reports.

- TLS terminates inside our Intel TDX enclave, and the enclave endorses the certificate.

- The gateway has no administrative route reachable from outside, and its master key is derived inside the enclave.

- The gateway checks the CPU attestation, the GPU attestation and the key binding of each upstream instance before using it, rechecks every 15 minutes, and encrypts each request to that instance.

- Prices come from a catalog signed by the enclave.

## What cannot be verified

- The check of the upstream cannot prove which weights ran, or what the upstream did with the prompt.

## Security model

We rely on TEEs: Intel TDX for the gateway, GPU enclaves for the models. As long as they are not broken, your prompts and responses stay private. They are opened only inside those TEEs. The upstream today is Chutes.

## Out of scope

Physical attacks on the hardware, side channels and compromise of the hardware vendors.

