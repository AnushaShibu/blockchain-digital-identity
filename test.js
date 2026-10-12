// End-to-end test of the contract on an in-memory Ganache chain.  Run: node test.js
const ganache = require("ganache");
const { ethers } = require("ethers");
const assert = require("assert");
const { abi, bytecode } = require("./build/DigitalIdentity.json");

async function expectRevert(promise, msg) {
  try {
    await promise;
  } catch (e) {
    const text = (e.reason || "") + (e.shortMessage || "") + (e.message || "");
    assert(text.includes(msg), `expected revert "${msg}", got: ${text.slice(0, 200)}`);
    return;
  }
  assert.fail(`expected revert "${msg}" but call succeeded`);
}

(async () => {
  const provider = new ethers.BrowserProvider(ganache.provider({ logging: { quiet: true } }));
  const [admin, issuer, user, other] = await Promise.all([0, 1, 2, 3].map((i) => provider.getSigner(i)));
  const factory = new ethers.ContractFactory(abi, bytecode, admin);
  const c = await factory.deploy();
  await c.waitForDeployment();
  const as = (s) => c.connect(s);
  const addr = (s) => s.getAddress();
  const h = ethers.keccak256(ethers.toUtf8Bytes("Anusha|Student ID|05"));
  let n = 0;
  const ok = (name) => console.log(`  PASS ${++n}. ${name}`);

  assert.equal(await c.admin(), await addr(admin)); ok("deployer is admin");

  await expectRevert(as(user).addIssuer.staticCall(await addr(issuer)), "Only admin"); ok("non-admin cannot add issuer");
  await (await as(admin).addIssuer(await addr(issuer))).wait();
  assert.equal(await c.isIssuer(await addr(issuer)), true); ok("admin adds issuer");

  await expectRevert(as(issuer).issueCredential.staticCall(await addr(user), "Student ID", h, 0), "Holder not registered");
  ok("cannot issue to unregistered user");

  await (await as(user).registerIdentity(ethers.keccak256(ethers.toUtf8Bytes("profile")))).wait();
  await expectRevert(as(user).registerIdentity.staticCall(h), "Already registered"); ok("register once, duplicate rejected");

  await expectRevert(as(user).issueCredential.staticCall(await addr(user), "Fake", h, 0), "Only issuer"); ok("non-issuer cannot issue");

  await (await as(issuer).issueCredential(await addr(user), "Student ID", h, 0)).wait();
  assert.equal(await c.credentialCount(), 1n); ok("issuer issues credential #1");

  const ids = await as(user).getMyCredentialIds();
  assert.deepEqual(ids.map(Number), [1]); ok("holder sees own credential ids");

  assert.equal(await c.verifyCredential(1, h), true); ok("verify valid credential -> true");
  assert.equal(await c.verifyCredential(1, ethers.keccak256("0x01")), false); ok("wrong hash -> false");
  assert.equal(await c.verifyCredential(99, h), false); ok("unknown id -> false");

  await expectRevert(as(other).revokeCredential.staticCall(1), "Only original issuer"); ok("stranger cannot revoke");
  await (await as(issuer).revokeCredential(1)).wait();
  assert.equal(await c.verifyCredential(1, h), false); ok("revoked -> false");
  await expectRevert(as(issuer).revokeCredential.staticCall(1), "Already revoked"); ok("double revoke rejected");

  // expiry: valid for 100s, then advance chain time
  const h2 = ethers.keccak256(ethers.toUtf8Bytes("degree"));
  await (await as(issuer).issueCredential(await addr(user), "Degree", h2, 100)).wait();
  assert.equal(await c.verifyCredential(2, h2), true); ok("expiring credential valid before expiry");
  await provider.send("evm_increaseTime", [200]);
  await provider.send("evm_mine", []);
  assert.equal(await c.verifyCredential(2, h2), false); ok("expired credential -> false");

  // removing issuer invalidates their credentials
  const h3 = ethers.keccak256(ethers.toUtf8Bytes("id3"));
  await (await as(issuer).issueCredential(await addr(user), "Aadhaar", h3, 0)).wait();
  assert.equal(await c.verifyCredential(3, h3), true);
  await (await as(admin).removeIssuer(await addr(issuer))).wait();
  assert.equal(await c.verifyCredential(3, h3), false); ok("removed issuer's credentials -> false");

  const cred = await c.getCredential(3);
  assert.equal(cred.credType, "Aadhaar"); ok("getCredential returns struct");

  console.log(`\nAll ${n} checks passed.`);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
