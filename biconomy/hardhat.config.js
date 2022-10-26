require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");
require("dotenv/config");


// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "polygon_testnet",
  networks: {
    polygon_testnet: {
      url: "https://rpc-mumbai.maticvigil.com/v1/67e5e35c7eba76b23d0f3084339ecacc7361c915",
      chainId: 80001,
      accounts: [
        process.env.privateKey1,
      ],
    },
  },

  gasReporter: {
    currency: "ETH",
  },

  //compilers:
  solidity: {
    compilers: [
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  
  etherscan: {
    apiKey: process.env.polygonApiKey,
  },
};
