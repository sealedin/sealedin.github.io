# Contents declared.

## What we can see

Metadata: key, model, token counts, request size and timing. Billing needs it. In normal operation we have no software path to the content of your prompts.

## What is verified

- TLS terminates inside our Intel TDX enclave, and the enclave endorses the certificate.

- The gateway has no administrative route reachable from outside, and its master key is derived inside the enclave.

- The gateway checks the CPU attestation, the GPU attestation and the key binding of each upstream instance before using it, rechecks every 15 minutes, and encrypts each request to that instance.

- Prices come from a catalog signed by the enclave.

## What is not verified yet

- The source is not public yet, so a stranger cannot reproduce the measurement. That is the next release.

- The check of the upstream cannot prove which weights ran, or what the upstream did with the prompt.

## How this fails

- Everything above rests on Intel TDX working as specified. It does not protect against someone with physical access to the server and root, as TEE.fail showed in 2025.

- Your prompt is decrypted inside the upstream's enclave, today always Chutes.

- Balances are not protected against a host restoring an old disk.

## Out of scope

Physical attacks on the hardware, side channels and compromise of the hardware vendors.

## Who runs this

Two operators. No company, no data processing agreement, no service level agreement and no invoice.
