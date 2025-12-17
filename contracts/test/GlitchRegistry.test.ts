import { expect } from "chai";
import { ethers } from "hardhat";
import { GlitchRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("GlitchRegistry", function () {
  let glitchRegistry: GlitchRegistry;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const GlitchRegistry = await ethers.getContractFactory("GlitchRegistry");
    glitchRegistry = await GlitchRegistry.deploy();
    await glitchRegistry.waitForDeployment();
  });

  describe("submitGlitch", function () {
    it("should submit a new glitch and return correct glitch ID", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ title: "Test Glitch" })));

      await expect(glitchRegistry.connect(user1).submitGlitch(contentHash))
        .to.emit(glitchRegistry, "GlitchSubmitted")
        .withArgs(0, user1.address, contentHash);

      const glitch = await glitchRegistry.getGlitch(0);
      expect(glitch.author).to.equal(user1.address);
      expect(glitch.contentHash).to.equal(contentHash);
      expect(glitch.createdAt).to.be.gt(0);

      expect(await glitchRegistry.nextGlitchId()).to.equal(1);
    });

    it("should increment glitch ID for each submission", async function () {
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes("glitch1"));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("glitch2"));

      await glitchRegistry.connect(user1).submitGlitch(hash1);
      await glitchRegistry.connect(user2).submitGlitch(hash2);

      expect(await glitchRegistry.nextGlitchId()).to.equal(2);

      const glitch0 = await glitchRegistry.getGlitch(0);
      const glitch1 = await glitchRegistry.getGlitch(1);

      expect(glitch0.contentHash).to.equal(hash1);
      expect(glitch1.contentHash).to.equal(hash2);
    });
  });

  describe("upvote", function () {
    beforeEach(async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await glitchRegistry.connect(user1).submitGlitch(contentHash);
    });

    it("should allow a user to upvote a glitch", async function () {
      await expect(glitchRegistry.connect(user2).upvote(0))
        .to.emit(glitchRegistry, "GlitchUpvoted")
        .withArgs(0, user2.address);

      expect(await glitchRegistry.getVoteCount(0)).to.equal(1);
      expect(await glitchRegistry.hasUserVoted(0, user2.address)).to.be.true;
    });

    it("should not allow a user to vote twice", async function () {
      await glitchRegistry.connect(user2).upvote(0);

      await expect(glitchRegistry.connect(user2).upvote(0))
        .to.be.revertedWith("Already voted");
    });

    it("should allow author to vote", async function () {
      await glitchRegistry.connect(user1).upvote(0);
      expect(await glitchRegistry.getVoteCount(0)).to.equal(1);
    });

    it("should allow multiple users to vote", async function () {
      await glitchRegistry.connect(user1).upvote(0);
      await glitchRegistry.connect(user2).upvote(0);
      await glitchRegistry.connect(owner).upvote(0);

      expect(await glitchRegistry.getVoteCount(0)).to.equal(3);
    });

    it("should revert when voting on invalid glitch ID", async function () {
      await expect(glitchRegistry.connect(user2).upvote(999))
        .to.be.revertedWith("Invalid glitch ID");
    });
  });

  describe("getGlitch", function () {
    it("should return correct glitch data", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test data"));
      await glitchRegistry.connect(user1).submitGlitch(contentHash);

      const glitch = await glitchRegistry.getGlitch(0);
      expect(glitch.author).to.equal(user1.address);
      expect(glitch.contentHash).to.equal(contentHash);
      expect(glitch.createdAt).to.be.gt(0);
    });

    it("should revert for invalid glitch ID", async function () {
      await expect(glitchRegistry.getGlitch(0))
        .to.be.revertedWith("Invalid glitch ID");
    });
  });

  describe("getVoteCount", function () {
    it("should return 0 for newly submitted glitch", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await glitchRegistry.connect(user1).submitGlitch(contentHash);

      expect(await glitchRegistry.getVoteCount(0)).to.equal(0);
    });

    it("should return correct vote count after additional votes", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await glitchRegistry.connect(user1).submitGlitch(contentHash);

      await glitchRegistry.connect(user1).upvote(0);
      await glitchRegistry.connect(user2).upvote(0);

      expect(await glitchRegistry.getVoteCount(0)).to.equal(2);
    });

    it("should revert for invalid glitch ID", async function () {
      await expect(glitchRegistry.getVoteCount(999))
        .to.be.revertedWith("Invalid glitch ID");
    });
  });

  describe("hasUserVoted", function () {
    beforeEach(async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await glitchRegistry.connect(user1).submitGlitch(contentHash);
    });

    it("should return false for author initially", async function () {
      expect(await glitchRegistry.hasUserVoted(0, user1.address)).to.be.false;
    });

    it("should return false if user has not voted", async function () {
      expect(await glitchRegistry.hasUserVoted(0, user2.address)).to.be.false;
    });

    it("should return true if user has voted", async function () {
      await glitchRegistry.connect(user2).upvote(0);
      expect(await glitchRegistry.hasUserVoted(0, user2.address)).to.be.true;
    });

    it("should revert for invalid glitch ID", async function () {
      await expect(glitchRegistry.hasUserVoted(999, user1.address))
        .to.be.revertedWith("Invalid glitch ID");
    });
  });
});
