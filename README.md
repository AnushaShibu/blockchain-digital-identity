# Blockchain-Based Digital Identity System

A self-sovereign identity (SSI) mini project built on Ethereum - a Solidity smart contract plus a web dApp (HTML, Ethers.js, MetaMask).

**Privacy by design:** personal data never goes on the blockchain. The browser computes a keccak256 hash of the details or document, and only that hash is stored on-chain. The actual document stays with the holder.

## Roles

| Role | Who | What they can do |
|---|---|---|
| Admin | Account that deploys the contract | Add / remove trusted issuers |
| Issuer | College, bank, government office | Issue and revoke credentials for registered users |
| User (holder) | Any wallet | Register identity, view own credentials |
| Verifier | Anyone | Check a credential is genuine, unexpired and not revoked |

## Project structure

```
contracts/DigitalIdentity.sol   the smart contract
index.html                      the web app (single file)
compile.js                      compiles the contract (solc)
deploy.js                       deploys to a local chain
test.js                         automated contract tests
```

## How to run

```bash
npm install
npm test            # compiles and runs the contract tests
npm run chain       # terminal 1: starts a local blockchain (keep running)
npm run deploy       # terminal 2: deploys the contract, prints its address
npm run web          # terminal 3: serves the web app at http://localhost:8080
```

Then set up MetaMask:
1. Add a network - RPC: `http://127.0.0.1:8545`, Chain ID: `1337`, Symbol: `ETH`
2. Import an account using one of the private keys printed by `npm run chain` (Account 0 = Admin, Account 1 = Issuer, Account 2 = User)
3. Open http://localhost:8080, click **Connect MetaMask**, paste the deployed contract address, click **Load contract**

## How it works (quick demo)

1. **Admin** adds another account as a trusted Issuer.
2. **User** registers an identity - only a hash of their details goes on-chain.
3. **Issuer** issues a credential to that user (e.g. a Student ID), by hashing a document or text.
4. **Verifier** (anyone) checks the credential by ID - returns **AUTHENTIC** if the hash matches, isn't revoked, isn't expired, and the issuer is still trusted.
5. If the document is altered, revoked, or the issuer is removed, verification correctly returns **NOT VALID**.
6. Every action is logged as an on-chain event, viewable in the app's audit trail.

## Smart contract design

- `onlyAdmin` / `onlyIssuer` modifiers enforce access control.
- Credentials can have an optional expiry; `verifyCredential()` rejects revoked, expired, wrong-hash, or unknown credentials.
- Removing an issuer immediately invalidates every credential they issued.
- Only the original issuer can revoke a credential they issued.

## Tech stack

Solidity · Ethers.js v6 · MetaMask · Ganache (local Ethereum chain) · Node.js
