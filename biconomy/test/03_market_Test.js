// Test cases for oddzMarket contract, which covers all the scenarios.
// This file dont contain Test cses for Base and Quote token which is covered in diffent file.
// So we directly use the function.
const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const Web3 = require("web3");
const hre = require("hardhat");
const truffleAssert = require("truffle-assertions");
const BigNumber = ethers.BigNumber;
const { deployMockContract } = require("@ethereum-waffle/mock-contract");

// Import the deployed addresses of smart contracts from setup
const { setUpContracts } = require("./01_setup");

// Define variables for testing.
let deployer, user2a, user3a, user4a;

// // Verified base, quote and pool addresses, we can use these directly to test the fnction.
uniV3FactoryAdd = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEFAULT_FEE = 3000;

// Get the addresses of the deployer and other accounts.
async function getAddresses() {
  const accounts = await hre.ethers.getSigners();
  user2a = accounts[1];
  user3a = accounts[2];
  user4a = accounts[3];
  deploySigner = accounts[0].address;
  user2 = accounts[1].address;
  user3 = accounts[2].address;
  deployer = accounts[0];
}

async function Testing(
  mockedChainlink1,
  mockedChainlink2,
  testUSDC,
  quoteToken,
  baseToken,
  baseToken2,
  poolAddress,
  poolAddress2,
  insuranceManager,
  oddzVault,
  oddzConfig,
  balanceManager,
  orderManager,
  swapManager,
  oddzMarket,
  oddzClearingHouse,
  oddzClearingHouseExtended,
  oddzPositionHandler,
  volumeManager,
) {
  const baseTokenMock = await hre.artifacts.readArtifact("contracts/baseToken.sol:BaseToken");
  const chainLinkPriceFeedMock = await hre.artifacts.readArtifact(
    "contracts/utils/chainlinkPriceFeed.sol:ChainlinkPriceFeed",
  );

  mockedChainlink1 = await deployMockContract(deployer, chainLinkPriceFeedMock.abi);
  await mockedChainlink1.mock.decimals.returns("18");

  mockedBaseToken = await deployMockContract(deployer, baseTokenMock.abi);
  await mockedBaseToken.mock.decimals.returns("8");

  // Get the address of the quote token
  const QuoteToken2 = await ethers.getContractFactory("QuoteToken");
  const quoteToken2 = await upgrades.deployProxy(QuoteToken2, ["vUSD", "vUSD"]);

  const BaseToken3 = await ethers.getContractFactory("BaseToken");
  let baseToken3;
  while (true) {
    baseToken3 = await upgrades.deployProxy(BaseToken3, ["vLINK", "vLINK", mockedChainlink1.address]);
    // size of the base token should be greater than base token as per uniswapV3 requirement.
    if (quoteToken2.address.toLowerCase() > baseToken3.address.toLowerCase()) {
      break;
    }
  }

  await quoteToken2.mint(
    deployer.address,
    "11579208923731619542357098500868790785326998466564056403945758400791312963993", // amount is not maximum
  );

  // Get the address of the market contract
  const OddzMarket = await ethers.getContractFactory("OddzMarket");
  const oddzMarket1 = await upgrades.deployProxy(OddzMarket, [uniV3FactoryAdd, quoteToken.address]); //new oddz market to add base market
  const oddzMarket2 = await upgrades.deployProxy(OddzMarket, [uniV3FactoryAdd, quoteToken2.address]); //supply is not maximum

  // Scenario:- Initiliation is required before adding pool, otherwise tx will revert.
  describe("Before Initialization", async () => {
    it("force error, addMarket fn revereted", async () => {
      // Expect:-calling addMarket before initiliation resulted in reverted tx
      const MarketFactory = await ethers.getContractFactory("OddzMarket");
      const oddzMarket1 = await MarketFactory.deploy();
      await expect(oddzMarket1.addMarket(baseToken.address, DEFAULT_FEE)).to.be.reverted;
    }).timeout("100s");
  });

  // Scenario:- Test all the scenarios regarding addMarket function.
  describe("#fn addMarket", async () => {
    // Expect:- add the market to uniswap V3
    it("add a UniswapV3 pool", async () => {
      // add market
      await oddzMarket1.addMarket(baseToken.address, DEFAULT_FEE);

      // fetchPool provided address should be same as preassigned POOL address.
      expect(await oddzMarket1.fetchPool(baseToken.address)).to.equal(poolAddress);
    }).timeout("100s");

    // Expect:- Emmited events should be same as preassinged addresses
    it("add a UniswapV3 pool and send an event", async () => {
      // addMarket emit event "poolCreated"should same preassigned.
      await expect(oddzMarket1.addMarket(baseToken2.address, DEFAULT_FEE))
        .to.emit(oddzMarket1, "poolCreated")
        .withArgs(baseToken2.address, DEFAULT_FEE, poolAddress2);
    }).timeout("100s");

    // Expect:- address of pool for base token should be zero
    it("force error, pool is existed in Exchange even with the same base but diff fee", async () => {
      // if base token is not equal to zero, tx will revet with "oddzMarket: pool exist"
      await expect(oddzMarket.addMarket(baseToken.address, 10000)).to.be.revertedWith("OM:PE");
    }).timeout("60s");

    // Expect:- Decimals of tokens shpuld not be less than 18
    it("force error, base must be smaller than quote to force base = token0 and quote = token1", async () => {
      // if decimals of base token less, then tx will reverted with "oddzMarket: decimal are less"
      await expect(oddzMarket.addMarket(mockedBaseToken.address, DEFAULT_FEE)).to.be.revertedWith(
        "OM:ID", //Invalid decimals
      );
    }).timeout("100s");

    // Expect:- total supply of the quote token should be enough or maximum.
    it("force error, total supply of the quote token must be maximum", async () => {
      // if supply is not enough then tx reverted with "oddzMarket: supply not max
      await expect(oddzMarket2.addMarket(baseToken.address, DEFAULT_FEE)).to.be.revertedWith(
        "OM:SNM", //Supply not max
      );
    }).timeout("100s");

    // Expect:- base token size should be less than quote
    it("force error, base must be smaller than quote to force base = token0 and quote = token1", async () => {
      // size of base token is large then tx will reverted with oddzMarket: size is large
      await expect(oddzMarket.addMarket(quoteToken.address, DEFAULT_FEE)).to.be.revertedWith(
        "OM:LS",
        //Large size
      );
    }).timeout("60s");

    // Expect:- Added pool should be exist on uniswap v#
    it("force error, pool is not existent in uniswap v3", async () => {
      // added pool should be exist on uniswap otherwise tx reverted with "oddzMarket: non-exist pool".
      await expect(oddzMarket1.addMarket(baseToken3.address, DEFAULT_FEE)).to.be.revertedWith("OM:PNE"); //Pool not exist
    }).timeout("60s");
  });

  // Scenario:- only owner should activate and inactivate the pool in market.
  describe("#fn inactivatePool", async () => {
    // Expect:- once pool inactivate it should not be fetchable and revert tx regarding same.
    it("Inactivate the pool and only owner can", async () => {
      // fetch pool and assigned pool address should be same before inactivation.
      expect(await oddzMarket.fetchPool(baseToken.address)).to.equal(poolAddress);

      // now inactivate the pool
      await oddzMarket.inactivatePool(baseToken.address);

      // empty address in param of inactivatePool should be reverted with "oddzMarket: base is zero"
      await expect(oddzMarket.inactivatePool(EMPTY_ADDRESS)).to.be.revertedWith("OM:ZB");

      // pool available should be false once inactivating pool.
      expect(await oddzMarket.PoolAvailable(baseToken.address)).to.be.false;

      expect(await oddzMarket.fetchPool(baseToken.address)).to.equal(EMPTY_ADDRESS);

      // If other person try to call this, it will revert tx.
      await expect(oddzMarket.connect(user2a).inactivatePool(baseToken.address)).to.be.reverted;
    });
  });

  // Scenario:- only owner should activate the pool
  describe("#fn activatePool", async () => {
    // Expect:- Once the pool activate it should not revert any tx regarding same.
    it("activate the pool and only owner can", async () => {
      // fetch the pool address it should be empty as of now pool is inactivated.
      expect(await oddzMarket.fetchPool(baseToken.address)).to.equal(EMPTY_ADDRESS);

      // check the available pool after inactivation it should show false
      expect(await oddzMarket.PoolAvailable(baseToken.address)).to.be.false;

      // activating pool with zero address should revert tx with "oddzMarket: base address zero"
      await expect(oddzMarket.activatePool(EMPTY_ADDRESS)).to.be.revertedWith("OM:ZB"); //Zero Base

      // activate the pool
      await oddzMarket.activatePool(baseToken.address);

      // available pool should return the true after activation.
      expect(await oddzMarket.PoolAvailable(baseToken.address)).to.be.true;

      // fetch pool fn return address should be same as pool preassigned.
      expect(await oddzMarket.fetchPool(baseToken.address)).to.equal(poolAddress);

      // If other person try to call this, it will revert tx.
      await expect(oddzMarket.connect(user2a).inactivatePool(baseToken.address)).to.be.revertedWith("OO:CNO");
    });
  });

  // Senario:- PoolAvaible fn should return true if pool exist.
  describe("#fn PoolAvailable", async () => {
    // Expect:- if pool exist, it should return true otherwise false
    it("Check pool existance", async () => {
      expect(await oddzMarket.PoolAvailable(baseToken.address)).to.be.true;
      expect(await oddzMarket.PoolAvailable(baseToken2.address)).to.be.true;
    });
  });

  // Senario:- ExchangeFeeAccured fn should return fee for particular base address to add on uniswap.
  describe("#fn Swapping fee", async () => {
    // Expect:- ExchangeFeeAccured retun value should be same as default fee.
    it("Check swapping fee fn", async () => {
      expect(await oddzMarket.fetchSwapingFee(baseToken.address, "10000000000000000")).to.equal(4000);
      expect(await oddzMarket.fetchSwapingFee(baseToken2.address, "500000000000000000")).to.equal(3000);
    });
  });

  // Senario:- fetchVolumeRange fn should return volume range for particular base address.
  describe("#fn Volume ranges", async () => {
    it("Check volume range fn", async () => {
      const volumeRanges = await oddzMarket.fetchVolumeRange(baseToken.address);
      const volumeRanges2 = await oddzMarket.fetchVolumeRange(baseToken2.address);

      expect(volumeRanges[1]).to.equal("10000000000000000");
      expect(volumeRanges2[5]).to.equal("2000000000000000000");
    });
  });

  // Scenario:- fn shuold return the quote address.
  describe("#fn fetch Quote address", async () => {
    // the return address should be same with preassigned quote token address
    it("Check the address of Quote Token", async () => {
      expect(await oddzMarket.qtoken()).to.equal(quoteToken.address);
    });
  });

  // Scenario:- fn  should return the address of uniswapV3Factory.
  describe("#fn fetch factory address", async () => {
    // Expect:- the return address should be same as preassigned uniV3FactoryAdd adddress.
    it("Check the address of uniswapV3Factory", async () => {
      expect(await oddzMarket.uniV3Factory()).to.equal(uniV3FactoryAdd);
    });
  });

  // Scenario:- fn should return the pool address.
  describe("#fn fetch pool address", async () => {
    // Expect:- fetch pool fn return the address should be same as preassigned pool address.
    it("Check the address of pool  for base token", async () => {
      expect(await oddzMarket.fetchPool(baseToken.address)).to.equal(poolAddress);
      expect(await oddzMarket.fetchPool(baseToken2.address)).to.equal(poolAddress2);
    });
  });
}

// Defined varibles for contracts and import the setup addresses
describe("Setup & Test Contracts", async function () {
  it("Setting up the contracts & Testing", async function () {
    await getAddresses();
    const {
      mockedChainlink1,
      mockedChainlink2,
      testUSDC,
      quoteToken,
      baseToken,
      baseToken2,
      poolAddress,
      poolAddress2,
      insuranceManager,
      oddzVault,
      oddzConfig,
      balanceManager,
      orderManager,
      swapManager,
      oddzMarket,
      oddzClearingHouse,
      oddzClearingHouseExtended,
      oddzPositionHandler,
      volumeManager,
    } = await setUpContracts("3548501948877255398746881041801", "17205327668361943026474184432430");

    await Testing(
      mockedChainlink1,
      mockedChainlink2,
      testUSDC,
      quoteToken,
      baseToken,
      baseToken2,
      poolAddress,
      poolAddress2,
      insuranceManager,
      oddzVault,
      oddzConfig,
      balanceManager,
      orderManager,
      swapManager,
      oddzMarket,
      oddzClearingHouse,
      oddzClearingHouseExtended,
      oddzPositionHandler,
      volumeManager,
    );
  }).timeout("200s");
});
