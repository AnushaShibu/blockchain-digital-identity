// Deploys DigitalIdentity to the local Ganache chain (npm run chain) and prints its address.
// Usage: node compile.js && node deploy.js   (Ganache desktop app: RPC_URL=http://127.0.0.1:7545 node deploy.js)
const { ethers } = require("ethers");
const { abi, bytecode } = require("./build/DigitalIdentity.json");

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
  const admin = await provider.getSigner(0);
  const c = await new ethers.ContractFactory(abi, bytecode, admin).deploy();
  await c.waitForDeployment();
  console.log("\nDigitalIdentity deployed at:", await c.getAddress());
  console.log("Admin (account 0):", await admin.getAddress());
  console.log("\nPaste the contract address into the web page (index.html).");
})().catch((e) => {
  console.error("Deploy failed. Is the local chain running? (npm run chain)\n", e.message);
  process.exit(1);
});
