# Contents declared.

## What we can see

Spend and balance per key. That is what billing needs from us. Model, token counts and timing are recorded inside the enclave and no route exposes them, per request or per prompt. Our hosting provider sees your IP address and the size and timing of encrypted traffic. Payments are public on Solana.

## What is verified

An enclave is sealed hardware that can prove what code it runs. The terms below use that word.

- The source is open: anyone can rebuild the image and compare its measurement with the one the enclave reports.

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

