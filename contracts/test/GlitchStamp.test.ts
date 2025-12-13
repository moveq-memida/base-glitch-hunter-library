import { expect } from "chai";
import { ethers } from "hardhat";
import { GlitchStamp } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("GlitchStamp", function () {
  let glitchStamp: GlitchStamp;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [, user1, user2] = await ethers.getSigners();

    const GlitchStamp = await ethers.getContractFactory("GlitchStamp");
    glitchStamp = await GlitchStamp.deploy();
    await glitchStamp.waitForDeployment();
  });

  it("stamps a hash and emits event", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("payload"));
    const uri = "https://example.com/glitch/1";

    await expect(glitchStamp.connect(user1).stamp(hash, uri))
      .to.emit(glitchStamp, "Stamped")
      .withArgs(hash, user1.address, anyValue, uri);

    const stamp = await glitchStamp.getStamp(hash);
    expect(stamp.author).to.equal(user1.address);
    expect(stamp.uri).to.equal(uri);
    expect(stamp.timestamp).to.be.gt(0);
  });

  it("prevents duplicate stamps", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("payload"));
    await glitchStamp.connect(user1).stamp(hash, "a");
    await expect(glitchStamp.connect(user2).stamp(hash, "b")).to.be.revertedWith("Already stamped");
  });

  it("reverts getStamp when not stamped", async function () {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("missing"));
    await expect(glitchStamp.getStamp(hash)).to.be.revertedWith("Not stamped");
  });
});
