# Contents declared.

## What we can see

Metadata: key, model, token counts, request size and timing. Billing needs it. In normal operation we have no software path to the content of your prompts.

## What is verified

An enclave is sealed hardware that can prove what code it runs. The terms below use that word.

- TLS terminates inside our Intel TDX enclave, and the enclave endorses the certificate.

- The gateway has no administrative route reachable from outside, and its master key is derived inside the enclave.

- The gateway checks the CPU attestation, the GPU attestation and the key binding of each upstream instance before using it, rechecks every 15 minutes, and encrypts each request to that instance.

- Prices come from a catalog signed by the enclave.

## What is not verified yet

- The source is not public yet, so a stranger cannot reproduce the measurement. That is the next release.

- The check of the upstream cannot prove which weights ran, or what the upstream did with the prompt.

## Security model

We rely on TEEs: Intel TDX for the gateway, GPU enclaves for the models. As long as they are not broken, your prompts and responses stay private. They are opened only inside those TEEs. The upstream today is Chutes.

## Out of scope

Physical attacks on the hardware, side channels and compromise of the hardware vendors.

