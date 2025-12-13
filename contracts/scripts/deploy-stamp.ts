import { ethers } from "hardhat";

async function main() {
  console.log("Deploying GlitchStamp contract...");

  const GlitchStamp = await ethers.getContractFactory("GlitchStamp");
  const glitchStamp = await GlitchStamp.deploy();

  await glitchStamp.waitForDeployment();

  const address = await glitchStamp.getAddress();
  console.log(`GlitchStamp deployed to: ${address}`);

  console.log("\nSave this address to your root .env file:");
  console.log(`NEXT_PUBLIC_GLITCH_STAMP_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

