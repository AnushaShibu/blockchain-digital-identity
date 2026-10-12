// Compiles contracts/DigitalIdentity.sol and writes build/DigitalIdentity.json (abi + bytecode)
const solc = require("solc");
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "contracts", "DigitalIdentity.sol");
const input = {
  language: "Solidity",
  sources: { "DigitalIdentity.sol": { content: fs.readFileSync(file, "utf8") } },
  settings: {
    evmVersion: "paris", // widest compatibility (Ganache, older testnets)
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input)));
let failed = false;
(out.errors || []).forEach((e) => {
  console.log(e.formattedMessage);
  if (e.severity === "error") failed = true;
});
if (failed) process.exit(1);

const c = out.contracts["DigitalIdentity.sol"].DigitalIdentity;
fs.mkdirSync(path.join(__dirname, "build"), { recursive: true });
fs.writeFileSync(
  path.join(__dirname, "build", "DigitalIdentity.json"),
  JSON.stringify({ abi: c.abi, bytecode: "0x" + c.evm.bytecode.object }, null, 2)
);
console.log("Compiled OK. Functions:", c.abi.filter((x) => x.type === "function").map((x) => x.name).join(", "));
