import { toNano } from "@ton/core";
import { TreasuryContract } from "../wrappers/Treasury";
import { compile, NetworkProvider } from "@ton/blueprint";

export async function run(provider: NetworkProvider) {
  const treasury = provider.open(
    TreasuryContract.createFromConfig(
      {
        adminKey: BigInt("0x" + process.env.ADMIN_PUBLIC_KEY),
        dailyLimit: toNano("10000"), // 10,000 TON daily limit
      },
      await compile("Treasury")
    )
  );

  await treasury.sendDeploy(provider.sender(), toNano("0.05"));
  await provider.waitForDeploy(treasury.address);

  console.log("Treasury deployed at:", treasury.address.toString());
}
