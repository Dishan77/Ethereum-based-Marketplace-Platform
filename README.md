## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
# KALA — Artisans Marketplace

KALA is a polished, user-friendly decentralized marketplace that helps artisans list and sell handcrafted items on a local Ethereum development node (Anvil). This repo contains a React frontend, a Solidity smart contract, and convenience scripts to run a full local development environment using Foundry.

Key features
- List items for sale with an on-chain record (price, seller, owner, sold flag)
- Purchase items using MetaMask and local Anvil node
- Local-first dev setup with an automated script to start Anvil and deploy the contract

Getting started (local development)

Prerequisites
- Node.js and npm
- Foundry (forge, cast, anvil) installed and on PATH
# KALA — Ethereum-based Artisan Marketplace

KALA is a local-development-first decentralized marketplace for artisan items. It includes a Solidity smart contract (Marketplace), a React frontend, and helper scripts that automate running a local chain (Anvil) and deploying the contract using Foundry (forge).

This README documents the project layout, how the pieces work together, exact commands to run the project, debugging tips, and suggested next improvements.

--

**Table of contents**

- Project overview
- Architecture & data flow
- Files & directories (what matters)
- Run & deploy (quick start + manual steps)
- Frontend details
- Smart contract details (`Marketplace.sol`)
- Deployment artifacts and where to look
- Demo flow (list / buy / transfer)
- Troubleshooting
- Future improvements

--

**Status**: Local development ready. Contract compiled and example broadcast artifacts exist in `out/` and `broadcast/`.

## Project overview

This repository contains:

- `src/Marketplace.sol` — Solidity contract implementing listing, purchase, and transfer of items.
- `script/Deploy.s.sol` — Foundry deployment script used by `forge script`.
- `scripts/setup_local.sh` — Convenience script that starts Anvil (if not running), runs the Foundry deploy script with `--broadcast`, extracts the deployed address, and writes `.env.local` for the frontend.
- React frontend in `src/` (`src/App.js`, `src/App.css`) with static assets in `public/`.
- `broadcast/` and `out/` — Foundry broadcast JSONs and compiled artifacts.

The frontend connects to the contract address from `REACT_APP_CONTRACT_ADDRESS` (in `.env.local`) and an RPC URL from `REACT_APP_RPC_URL`.

## Architecture & data flow

- Local node: Anvil serves an Ethereum JSON-RPC at `http://127.0.0.1:8545` (chainId `31337`).
- Deployment: Foundry `forge script` (using `script/Deploy.s.sol`) deploys `Marketplace` and writes broadcasts in `broadcast/` and compiled artifacts in `out/`.
- Frontend: React app (ethers.js) uses a Web3 provider (MetaMask) to sign transactions and optionally falls back to the RPC URL for read-only calls.
- Wallet: MetaMask is connected to the local Anvil network. The user imports an Anvil-provided private key to sign transactions.

## Files & directories (key ones)

- `src/Marketplace.sol` — Contract source.
- `script/Deploy.s.sol` — Deployment script for Foundry.
- `scripts/setup_local.sh` — Shell helper to start Anvil + deploy + write `.env.local`.
- `out/` — Compiled contract artifacts (ABI, bytecode) produced by `forge build`.
- `broadcast/` — JSON files produced by `forge script --broadcast` containing the transaction and deployed address for each run.
- `public/` — Static assets (logo, images, favicon) used by the frontend.
- `src/App.js` — Main React application (connects to MetaMask, lists items, buys items, transfers ownership).
- `src/App.css` — Custom styles and animations used by the UI.
- `.env.local` — Local environment file created by the setup script; contains at least `REACT_APP_CONTRACT_ADDRESS` and `REACT_APP_RPC_URL`.

## Quick Start (recommended)

Prerequisites

- Node.js (v16+) and npm
- Foundry (install via `curl -L https://foundry.paradigm.xyz | bash` and run `foundryup`) so that `forge`, `anvil`, and `cast` are available on PATH
- MetaMask browser extension

From the project root, run:

```zsh
# 1) Install frontend dependencies
npm install

# 2) Start local chain and deploy contract (script will start Anvil if needed)
npm run setup:local

# 3) Start the React dev server
npm start
```

What the setup script does

- Checks whether `http://127.0.0.1:8545` responds; starts `anvil` if not.
- Runs `forge script script/Deploy.s.sol:DeployScript --broadcast` to deploy the `Marketplace` contract.
- Parses the broadcast JSON to extract the deployed address, and writes `.env.local` with:

```env
REACT_APP_CONTRACT_ADDRESS=0x...    # deployed address
REACT_APP_RPC_URL=http://127.0.0.1:8545
```

After the script finishes, open `http://localhost:3000` in your browser.

## Manual Run (Foundry)

If you prefer to run the pieces manually:

1. Start Anvil:

```zsh
anvil --port 8545 --chain-id 31337
```

Anvil prints deterministic accounts and private keys in the console—import one of these private keys into MetaMask to use the wallet.

2. Build & Deploy with Foundry:

```zsh
forge build
forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast -vvvv
```

3. Take the deployed address from the broadcast JSON (or the forge output) and place it in `.env.local` as shown above. Then run `npm start`.

## MetaMask configuration

- Add a custom network in MetaMask:
	- Network Name: `Anvil (local)`
	- RPC URL: `http://127.0.0.1:8545`
	- Chain ID: `31337`

- Import one of the private keys shown in the Anvil console to use as your signer.

Note: The frontend also attempts to request a network switch/add via `wallet_addEthereumChain` if MetaMask is connected to the wrong chain.

## Smart contract details — `src/Marketplace.sol`

High-level summary

- The contract stores items with fields: id, name, price, seller, owner, isSold.
- Sellers call `listItem(name, price)` to list an item. Price is an amount in wei.
- Buyers call `purchaseItem(itemId)` with `msg.value` equal to the item price; contract forwards ETH to the seller and updates ownership.
- Owners can call `transferItem(itemId, newOwner)` to transfer ownership off-chain or between addresses.
- View functions expose items and owner-specific lists (`getItemsByOwner`).

Events

- `ItemListed`, `ItemSold`, `ItemTransferred`, and `ItemRemovedFromSale` (if implemented) are emitted for UI to consume (note: some functions/events may be present or commented depending on the version).

Important notes

- If you plan to add delist/remove-from-sale behavior, ensure both the contract and frontend ABI/UI are updated and redeploy.

## Frontend details — `src/App.js` and `src/App.css`

- `src/App.js` responsibilities:
	- Reads `REACT_APP_CONTRACT_ADDRESS` and `REACT_APP_RPC_URL` from process env.
	- Connects to MetaMask via `window.ethereum` and requests signer access.
	- Uses `ethers.js` `Web3Provider` and `Signer` to call contract write functions and to sign transactions.
	- Loads items (all items, listed items, owned items) via contract read calls and updates React state.
	- Provides UI elements for listing an item (name + price), buying (payable call), and transferring ownership.
	- Listens for `accountsChanged` and `chainChanged` events on `window.ethereum` to refresh the UI.

- `src/App.css` contains theme styles and small animations that were iteratively tuned for the UI.

## Deployment artifacts

- `broadcast/` contains the JSON output from `forge script --broadcast`. It has the deployed address and transaction details.
- `out/` contains compiled contract JSON (ABI and bytecode) generated by `forge build`.

If you need the contract ABI for another tool, copy it from `out/Marketplace.json` (or `out/contracts/Marketplace.sol/Marketplace.json`) depending on your Foundry layout.

## Demo flow — (quick script for a live demo)

1. Run `npm run setup:local` and `npm start`.
2. Configure MetaMask to the Anvil network and import two Anvil private keys (Account A and Account B).
3. With Account A selected in MetaMask: fill the frontend form to list an item (example: `Handmade Bowl`, price `0.05` ETH). Confirm listing transaction.
4. Switch MetaMask to Account B: click `Buy` on the listed item, confirm the payable transaction (value must match the listed price).
5. Observe ownership change in the UI and check contract state via `cast` or by refreshing the frontend.

Example `cast` read:

```zsh
cast call $REACT_APP_CONTRACT_ADDRESS "itemCount()" --rpc-url http://127.0.0.1:8545
```

## Troubleshooting & tips

- Frontend doesn't show items / incorrect contract address
	- Confirm `.env.local` exists and contains the correct `REACT_APP_CONTRACT_ADDRESS`.
	- Restart the React dev server after updating `.env.local`.

- MetaMask rejects a transaction or is on the wrong network
	- Make sure MetaMask is set to `http://127.0.0.1:8545` chainId `31337`.
	- Import an Anvil account private key if you don't have accounts with ETH.

- `npm run setup:local` fails with errors
	- Check that `forge` and `anvil` are on your PATH. Running `forge --version` and `anvil --version` should succeed.
	- Run `bash ./scripts/setup_local.sh` manually and inspect output to see where it fails. Broadcast JSON parsing is used to extract the deployed address—if file paths differ on your platform, adapt the script.

- Transactions failing with `insufficient funds`
	- Use Anvil account with funds (Anvil funds the accounts it prints at startup).
	- Transfer ETH between local Anvil accounts using `cast send` if needed.

## Where to look for outputs

- `broadcast/Deploy.s.sol/` — contains the JSON broadcast for each deploy run (including deployed address).
- `out/` — compiled artifacts (ABI + bytecode) used by the frontend or external tooling.

## Advanced / next steps (suggestions)

- Store item metadata (name + image URI) off-chain (IPFS/S3) and reference URIs on-chain.
- Add contract events watchers in the frontend so UI auto-refreshes when events are emitted.
- Add unit and integration tests under `test/` (Foundry tests or Hardhat/JS tests) to validate contract behaviour.
- Implement `removeFromSale` in the contract and wire the UI to delist items safely.

## Contact / notes

If you need a condensed 3–5 slide presentation for a teacher, or want me to run the setup and demo here and report logs, tell me and I can do that next.

--

Made for a final-year project. Keep backups of your `.env.local` if you want to maintain a specific deployed address between Anvil restarts.
# KALA
