import { ethers } from "hardhat";

async function main() {
  console.log("Deploying GlitchRegistry contract...");

  const GlitchRegistry = await ethers.getContractFactory("GlitchRegistry");
  const glitchRegistry = await GlitchRegistry.deploy();

  await glitchRegistry.waitForDeployment();

  const address = await glitchRegistry.getAddress();
  console.log(`GlitchRegistry deployed to: ${address}`);

  console.log("\nSave this address to your .env file:");
  console.log(`NEXT_PUBLIC_GLITCH_REGISTRY_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
