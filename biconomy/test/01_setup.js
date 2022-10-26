// This file contains the deployed addresses of various contracts,
// which can be use in futher testing of functions.
// This setup must be imported to other contract testing file, rather than deploying contracts again.
const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const Web3 = require("web3");
const hre = require("hardhat");
const truffleAssert = require("truffle-assertions");
const BigNumber = ethers.BigNumber;
const { deployMockContract } = require("@ethereum-waffle/mock-contract");

// Define the variables
var web3 = new Web3(hre.network.provider);
let deployer;

//Some mainnet addresses
uniV3FactoryAdd = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
// Default fee used in the pool to add market.
const DEFAULT_FEE = 3000;

//  Get deployed addresses of the accounts and contracts to cross check.
async function setUpContracts(ethPrice, BtcPrice) {
  // Get the address of the first account, which will deploy all the contract.
  const accounts = await hre.ethers.getSigners();
  deployer = accounts[0].address;
  let deployerInstance = accounts[0];

  //chainLink Price Feed contract used to fetch price and calculations
  const chainLinkPriceFeed = await ethers.getContractFactory("ChainlinkPriceFeed");
  const chainLinkPriceFeedMock = await hre.artifacts.readArtifact(
    "contracts/utils/chainlinkPriceFeed.sol:ChainlinkPriceFeed",
  );

  mockedChainlink1 = await deployMockContract(deployerInstance, chainLinkPriceFeedMock.abi);

  mockedChainlink2 = await deployMockContract(deployerInstance, chainLinkPriceFeedMock.abi);

  await mockedChainlink1.mock.decimals.returns("18");

  await mockedChainlink2.mock.decimals.returns("18");

  // Get the address of the test USDC.
  const testToken = await ethers.getContractFactory("TestERC20");
  testUSDC = await testToken.deploy(
    "testUSDC",
    "testUSDC",
    "10000000000000000000000000000000000", // initial supply of test usdc
  );
  console.log("Test USDC deployed at :", testUSDC.address);

  // Get the address of the test oddzToken.
  const OddzToken = await ethers.getContractFactory("TestERC20");
  oddzToken = await OddzToken.deploy(
    "oddz",
    "oddz",
    "10000000000000000000000000000000000"  // initial supply of oddz Token
  );
  console.log("Oddz Token deployed at :", oddzToken.address);

  // Get the address of the quote token
  const QuoteToken = await ethers.getContractFactory("QuoteToken");
  quoteToken = await upgrades.deployProxy(QuoteToken, ["vUSD", "vUSD"]);

  //Just to make sure quote token address is greater than base token .As uniswap has price=token1/token0
  while (true) {
    // Get the address of the base token
    const BaseToken = await ethers.getContractFactory("BaseToken");
    baseToken = await upgrades.deployProxy(BaseToken, ["vEth", "vEth", mockedChainlink1.address]);

    // size of the base token should be greater than base token as per uniswapV3 requirement.
    if (quoteToken.address.toLowerCase() > baseToken.address.toLowerCase()) {
      break;
    }
  }

  while (true) {
    const BaseToken2 = await ethers.getContractFactory("BaseToken");
    baseToken2 = await upgrades.deployProxy(BaseToken2, ["vBTC", "vBTC", mockedChainlink2.address]);

    // size of the base token should be greater than base token as per uniswapV3 requirement.
    if (quoteToken.address.toLowerCase() > baseToken2.address.toLowerCase()) {
      break;
    }
  }
  console.log("Quote Token deployed at :", quoteToken.address);
  console.log("Base Token deployed at :", baseToken.address);
  console.log("Base Token 2 deployed at :", baseToken2.address);

  //fetching the abi of the uniswap factory contract
  const uniswapFactoryAbi = await hre.artifacts.readArtifact(
    "contracts/uniswap/IUniswapV3Factory.sol:IUniswapV3Factory",
  );

  // making an instance of the uniswap factory
  const uniswapInstance = await new web3.eth.Contract(uniswapFactoryAbi.abi, uniV3FactoryAdd);

  // creating a uniswap pool with base token and quote token
  const result = await uniswapInstance.methods
    .createPool(baseToken.address, quoteToken.address, DEFAULT_FEE)
    .send({ from: deployer });

  const result2 = await uniswapInstance.methods
    .createPool(baseToken2.address, quoteToken.address, DEFAULT_FEE)
    .send({ from: deployer });

  //Getting pool address
  const poolAddress = await uniswapInstance.methods.getPool(quoteToken.address, baseToken.address, DEFAULT_FEE).call();

  const poolAddress2 = await uniswapInstance.methods
    .getPool(quoteToken.address, baseToken2.address, DEFAULT_FEE)
    .call();

  //Fetching uniswap pool abi
  const uniswapPoolAbi = await hre.artifacts.readArtifact("contracts/uniswap/IUniswapV3Pool.sol:IUniswapV3Pool");

  //creating uniswap pool instance
  const uniswapPoolInstance = await new web3.eth.Contract(uniswapPoolAbi.abi, poolAddress);

  const uniswapPoolInstance2 = await new web3.eth.Contract(uniswapPoolAbi.abi, poolAddress2);

  //Intializing the uniswap pool with the inital price => token1/token0
  await uniswapPoolInstance.methods.initialize(ethPrice).send({ from: deployer });

  await uniswapPoolInstance2.methods.initialize(BtcPrice).send({ from: deployer });

  //Adding the uniswap pool to the allowList of the tokens so that transfer of these tokens can happen in uniswap pool
  await quoteToken.addInAllowList(poolAddress);
  await quoteToken.addInAllowList(poolAddress2);
  await baseToken.addInAllowList(poolAddress);
  await baseToken2.addInAllowList(poolAddress2);

  //Minting max number of base and quote tokens.
  await quoteToken.mint(
    deployer,
    "115792089237316195423570985008687907853269984665640564039457584007913129639935", //uint256 maximum amount to mint
  );
  await baseToken.mint(
    deployer,
    "115792089237316195423570985008687907853269984665640564039457584007913129639935", //uint256 maximum amount to mint
  );

  await baseToken2.mint(
    deployer,
    "115792089237316195423570985008687907853269984665640564039457584007913129639935", //uint256 maximum amount to mint
  );

  // Get the address of the volume manager
  const VolumeManager = await ethers.getContractFactory("VolumeManager");
  volumeManager = await upgrades.deployProxy(VolumeManager, ["2592000"]);
  console.log("Volume Manager deployed to:", volumeManager.address);

  // Get the address of the oddz vault
  const OddzVault = await ethers.getContractFactory("OddzVault");
  oddzVault = await upgrades.deployProxy(OddzVault, [testUSDC.address]);
  console.log("Oddz Vault deployed to:", oddzVault.address);

  // Get the address of the insurance manager
  const InsuranceManager = await ethers.getContractFactory("InsuranceManager");
  insuranceManager = await upgrades.deployProxy(InsuranceManager, [testUSDC.address, oddzVault.address]);
  console.log("Insurance Manager deployed to:", insuranceManager.address);

  // Get the address of the odd config contract.
  const OddzConfig = await ethers.getContractFactory("OddzConfig");
  oddzConfig = await upgrades.deployProxy(OddzConfig, [
    "1",
    "1",
    "2",
    "100000",
    "62500",
    "5",
    "100000",
    "25000",
    "300000",
    "25000",
    "1500000",
    "350000",
  ]);
  // _maxGroup = 1
  // _maxPositionPerGroup= 1
  // _maxPositionPerDefaultGroup=2
  // _initialMarginRatio=100000  => 10**5/10**6   => 0.1  or 10
  // _maintenanceMarginRatio=62500 => 62500/10**6 => 0.0625 or 6.25
  // _twapInterval=5 seconds
  // _maxFundingRate=100000
  // _liquiditationPenaltyRatio=25000 => 25000/1000000 => 0.025
  // _deleveragePercentage = 300000 => 300000/1000000 => 0.3
  // _deleveragingFees = 25000  => 25000/1000000 => 0.025
  // _reducingThresholdPercentage = 1500000 => 1500000/1000000 => 1.5
  // _reducePercentage = 350000 => 350000/1000000 => 0.35
  console.log("Oddz Config deployed to:", oddzConfig.address);

  // Get the address of the market contract
  const OddzMarket = await ethers.getContractFactory("OddzMarket");
  oddzMarket = await upgrades.deployProxy(OddzMarket, [uniV3FactoryAdd, quoteToken.address, oddzToken.address]);
  console.log("Oddz Marker deployed to :", oddzMarket.address);

  // Get the address of the balance manager.
  const BalanceManager = await ethers.getContractFactory("BalanceManager");
  balanceManager = await upgrades.deployProxy(BalanceManager, [
    oddzConfig.address,
    oddzVault.address,
    insuranceManager.address,
    oddzMarket.address,
  ]);
  console.log("Balance Manager deployed to:", balanceManager.address);

  // Get the address of the order manager
  const OrderManager = await ethers.getContractFactory("OrderManager");
  orderManager = await upgrades.deployProxy(OrderManager, [oddzMarket.address, oddzConfig.address, oddzVault.address]);
  console.log("Order Manager deployed to:", orderManager.address);

  //Deploy Position Handler
  const PositionHandler = await ethers.getContractFactory("OddzPositionOpeninghandler");
  oddzPositionHandler = await upgrades.deployProxy(PositionHandler, [
    balanceManager.address,
    oddzVault.address,
    oddzConfig.address,
  ]);
  console.log("Position Handler deployed to:", oddzPositionHandler.address);

  // Get the address of the swap manager
  const OddzSwapManager = await ethers.getContractFactory("SwapManager");
  swapManager = await upgrades.deployProxy(OddzSwapManager, [
    balanceManager.address,
    orderManager.address,
    oddzMarket.address,
    oddzConfig.address,
    volumeManager.address,
    oddzPositionHandler.address,
  ]);
  console.log("Oddz swap manager deployed to :", swapManager.address);

  // Get the address of the swap manager
  const OddzClearingHouseExtended = await ethers.getContractFactory("OddzClearingHouseExtended");
  oddzClearingHouseExtended = await upgrades.deployProxy(OddzClearingHouseExtended, [
    oddzVault.address,
    balanceManager.address,
    swapManager.address,
    oddzConfig.address,
    orderManager.address,
    insuranceManager.address,
  ]);

  console.log("Oddz Clearing house extended deployed to :" + oddzClearingHouseExtended.address);

  // Get the address of the clearing house
  const OddzClearingHouse = await ethers.getContractFactory("OddzClearingHouse");
  oddzClearingHouse = await upgrades.deployProxy(OddzClearingHouse, [
    oddzConfig.address,
    oddzVault.address,
    quoteToken.address,
    balanceManager.address,
    orderManager.address,
    swapManager.address,
    oddzPositionHandler.address,
  ]);
  console.log("Oddz clearing house contract deployed to :", oddzClearingHouse.address);

  //Setting up the contracts

  //Adding the vETh and vUSD market
  await oddzMarket.addMarket(baseToken.address, DEFAULT_FEE);
  await oddzMarket.addMarket(baseToken2.address, DEFAULT_FEE);
  await oddzMarket.updateVolumeManager(volumeManager.address);

  // update volume fees ratios.
  // for testing purpose volume ranges scaled by 1e10
  await oddzMarket.updateFeeRatios(baseToken.address, "0", "5000");
  await oddzMarket.updateFeeRatios(baseToken.address, "10000000000000000", "4000");
  await oddzMarket.updateFeeRatios(baseToken.address, "50000000000000000", "3500");
  await oddzMarket.updateFeeRatios(baseToken.address, "100000000000000000", "3000");
  await oddzMarket.updateFeeRatios(baseToken.address, "500000000000000000", "2500");
  await oddzMarket.updateFeeRatios(baseToken.address, "2000000000000000000", "2000");

  // for testing purpose volume ranges scaled by 1e10
  await oddzMarket.updateFeeRatios(baseToken2.address, "0", "5000");
  await oddzMarket.updateFeeRatios(baseToken2.address, "10000000000000000", "4500");
  await oddzMarket.updateFeeRatios(baseToken2.address, "50000000000000000", "4000");
  await oddzMarket.updateFeeRatios(baseToken2.address, "100000000000000000", "3500");
  await oddzMarket.updateFeeRatios(baseToken2.address, "500000000000000000", "3000");
  await oddzMarket.updateFeeRatios(baseToken2.address, "2000000000000000000", "2500");

  // update volume ranges which are scaled by 1e10 for testing purpose
  //base token 1
  await oddzMarket.updateVolumeRanges(baseToken.address, "0");
  await oddzMarket.updateVolumeRanges(baseToken.address, "10000000000000000");
  await oddzMarket.updateVolumeRanges(baseToken.address, "50000000000000000");
  await oddzMarket.updateVolumeRanges(baseToken.address, "100000000000000000");
  await oddzMarket.updateVolumeRanges(baseToken.address, "500000000000000000");
  await oddzMarket.updateVolumeRanges(baseToken.address, "2000000000000000000");
  // base token 2
  await oddzMarket.updateVolumeRanges(baseToken2.address, "0");
  await oddzMarket.updateVolumeRanges(baseToken2.address, "10000000000000000");
  await oddzMarket.updateVolumeRanges(baseToken2.address, "50000000000000000");
  await oddzMarket.updateVolumeRanges(baseToken2.address, "100000000000000000");
  await oddzMarket.updateVolumeRanges(baseToken2.address, "500000000000000000");
  await oddzMarket.updateVolumeRanges(baseToken2.address, "2000000000000000000");

  //Setting up oddzVault
  await oddzVault.updateBalanceManager(balanceManager.address);
  await oddzVault.updateOrderManager(orderManager.address);
  await oddzVault.updateInsuranceManager(insuranceManager.address);

  //setting Up oddz Config
  await oddzConfig.updateInsuranceFundFeeRatio(baseToken.address, "400000");
  await oddzConfig.updateInsuranceFundFeeRatio(baseToken2.address, "400000");

  await oddzConfig.updateMaxTickCrossLimit(baseToken.address, 1050);
  await oddzConfig.updateMaxTickCrossLimit(baseToken2.address, 1050);

  //200 usd considering 8 decimals
  await oddzConfig.updateInsuranceManagerThreshold("20000000000");

  await oddzConfig.updateBackstopLiquidityProvider(deployer, true);

  //Setting Up Balance Manager
  //Update the authorized addresses

  await balanceManager.updateAuthorizedAddress(oddzClearingHouse.address, true);
  await balanceManager.updateAuthorizedAddress(oddzClearingHouseExtended.address, true);
  await balanceManager.updateAuthorizedAddress(oddzPositionHandler.address, true);

  // update the address of the order manager
  await balanceManager.updateOrderManager(orderManager.address);

  // update the address of the swap Manager
  await balanceManager.updateSwapManager(swapManager.address);

  //Setting up order Manager

  // update the address of teh clearing house in order manager.
  await orderManager.updateClearingHouse(oddzClearingHouse.address);

  // update the address swap contract in order manager.
  await orderManager.updateSwapManager(swapManager.address);

  await orderManager.updateClearingHouseExtended(oddzClearingHouseExtended.address);

  //Setting up position handler
  await oddzPositionHandler.updateClearingHouse(oddzClearingHouse.address);
  await oddzPositionHandler.updateSwapManager(swapManager.address);

  //setting up swap Manager

  // update the address of the clearing house in swap manager.
  await swapManager.updateClearingHouse(oddzClearingHouse.address);

  //Setting up oddzClearingHouseExtended
  await oddzClearingHouseExtended.updateClearingHouse(oddzClearingHouse.address);

  await oddzClearingHouseExtended.updateAuthorizedAddress(deployer, true);

  //Setting up oddz Clearing House

  await oddzClearingHouse.updateAuthorizedAddresses(oddzClearingHouseExtended.address, true);
  await oddzClearingHouse.updateAuthorizedAddresses(oddzPositionHandler.address, true);

  //Setting up volume manager

  // update the address of the swap maanger in volume manager.
  await volumeManager.updateSwapManager(swapManager.address);

  //Adding clearinghouse and deployer adddress in allowlist.Deployer address is allowd for testing
  await quoteToken.addInAllowList(oddzClearingHouse.address);
  await quoteToken.addInAllowList(deployer);

  //Transfer some tokens to clearing house so that when makers add liquidity , virtual tokens can be transfered by clearing house
  await quoteToken.transfer(oddzClearingHouse.address, "10000000000000000000000000000");

  // add user and clearing house address in allow list of base token.
  await baseToken.addInAllowList(oddzClearingHouse.address);
  await baseToken2.addInAllowList(oddzClearingHouse.address);
  await baseToken.addInAllowList(deployer);
  await baseToken2.addInAllowList(deployer);

  // transfer the amount of base token to clearing house.
  await baseToken.transfer(oddzClearingHouse.address, "1000000000000000000000000000");

  await baseToken2.transfer(oddzClearingHouse.address, "1000000000000000000000000000");

  return {
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
    oddzToken
  };
}


// Export the setup
module.exports = { setUpContracts };
