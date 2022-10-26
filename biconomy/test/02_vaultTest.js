// This file contains the test scenarios for vault contract.
const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const Web3 = require("web3");
const hre = require("hardhat");
const truffleAssert = require("truffle-assertions");
const BigNumber = ethers.BigNumber;

// Import the deployed addresses of smart contracts from setup
const { setUpContracts } = require("./01_setup");

let deploySigner, user2a, user3a;

async function getAddresses() {
  const accounts = await hre.ethers.getSigners();
  deploySigner = accounts[0];
  user2a = accounts[1];
  user3a = accounts[2];
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
  // setting base token 1 price
  await mockedChainlink1.mock.getPrice.returns("1877060000000000000000");

  // setting base token 2 price
  await mockedChainlink2.mock.getPrice.returns("30000000000000000000000");

  // Scenario: Trader should able to deposit and withdraw collateral
  describe("Deposit and Withdraw Check", async function () {
    // Expect: Trader should able to deposit 100 collateral and
    // check balance before and after depositing collateral
    it("Deposit 100 usdc", async function () {
      // used amounts to approve and deposit
      const amount = ethers.utils.parseUnits("1000", await testUSDC.decimals()); // to approve
      const amount1 = ethers.utils.parseUnits("100", await testUSDC.decimals()); // to deposit

      // approve amount testUSDC to vault(spender) contract.
      await testUSDC.connect(deploySigner).approve(oddzVault.address, amount);

      // deposit collateral of 100 usdc to the vault
      await oddzVault.connect(deploySigner).depositCollateral(testUSDC.address, amount1);

      // reduce trader wallet balance
      expect(await testUSDC.balanceOf(deploySigner.address)).to.equal(
        ethers.utils.parseUnits("99999999999999999999999900", await testUSDC.decimals()),
      );

      // increase oddzVault balance
      expect(await testUSDC.balanceOf(oddzVault.address)).to.equal(
        ethers.utils.parseUnits("100", await testUSDC.decimals()),
      );

      // update trader's balance
      expect(await oddzVault.getCollateralBalance(deploySigner.address, testUSDC.address)).to.equal(
        ethers.utils.parseUnits("100", await testUSDC.decimals()),
      );

      //check available balance.SHould be equal to deposited balance as it is not used anywhere
      expect(await oddzVault.getAvailableCollateral(deploySigner.address)).to.equal(
        ethers.utils.parseUnits("100", await testUSDC.decimals()),
      );
    });

    // Expect: events should be emitted once trader deposited
    it("Emit events after collateral doposited", async function () {
      // used amounts to approve and deposit
      const amount = ethers.utils.parseUnits("1000", await testUSDC.decimals()); // to approve
      const amount1 = ethers.utils.parseUnits("100", await testUSDC.decimals()); // to deposit

      // approve amount testUSDC to vault(spender) contract.
      await testUSDC.connect(deploySigner).approve(oddzVault.address, amount);

      // emit events once deposited.
      await expect(oddzVault.connect(deploySigner).depositCollateral(testUSDC.address, amount1))
        .to.emit(oddzVault, "CollateralDeposited")
        .withArgs(testUSDC.address, deploySigner.address, amount1);
    });

    it("If contract is paused then noone can deposit", async function () {
      //pausing the contract
      await oddzVault.pause();

      // used amounts to approve and deposit
      const amount = ethers.utils.parseUnits("1000", await testUSDC.decimals()); // to approve
      const amount1 = ethers.utils.parseUnits("100", await testUSDC.decimals()); // to deposit

      // approve amount testUSDC to vault(spender) contract.
      await testUSDC.connect(deploySigner).approve(oddzVault.address, amount);

      await expect(oddzVault.connect(deploySigner).depositCollateral(testUSDC.address, amount1)).to.be.revertedWith(
        "Pausable: paused",
      );
    });

    it("if contract is paused then noone can withdraw", async function () {
      const amount1 = ethers.utils.parseUnits("100", await testUSDC.decimals());

      // withdraw the amount from vault
      await expect(oddzVault.connect(deploySigner).withdrawCollateral(testUSDC.address, amount1)).to.be.revertedWith(
        "Pausable: paused",
      );
    });

    // Expect: tx should revert if trader wants to deposit more than balance.
    it("user should not be able to deposit more than balance", async function () {
      //unpausing the contract
      await oddzVault.unpause();

      // amount to be deposited
      const amount = ethers.utils.parseUnits("10000", await testUSDC.decimals());
      // approve the amount to vault
      await testUSDC.connect(user2a).approve(oddzVault.address, amount);
      // tx should be reverted
      await expect(oddzVault.connect(user2a).depositCollateral(testUSDC.address, amount)).to.be.revertedWith(
        "ERC20: transfer amount exceeds balance",
      );
    });

    // Expect: trader should be able to withdraw deposited amount and
    // Check balance before and after
    it("Withdraw 100 usdc", async function () {
      // Define the amount to be withdrawn
      const amount1 = ethers.utils.parseUnits("100", await testUSDC.decimals());
      // check balance before deposited
      const balanceBefore = await testUSDC.balanceOf(deploySigner.address);

      // withdraw the amount from vault
      await oddzVault.connect(deploySigner).withdrawCollateral(testUSDC.address, amount1);

      // decrease vault's token balance
      expect(await testUSDC.balanceOf(oddzVault.address)).to.equal(
        ethers.utils.parseUnits("100", await testUSDC.decimals()),
      );

      // balance after withdrawn
      const balanceAfter = await testUSDC.balanceOf(deploySigner.address);

      // trader's token balance increased
      expect(balanceAfter.sub(balanceBefore)).to.equal(amount1);

      // update trader's balance in vault
      expect(await oddzVault.getCollateralBalance(deploySigner.address, testUSDC.address)).to.equal(
        ethers.utils.parseUnits("100", await testUSDC.decimals()),
      );

      //check available balance.should be equal to 100*10**decimals
      expect(await oddzVault.getAvailableCollateral(deploySigner.address)).to.equal(
        ethers.utils.parseUnits("100", await testUSDC.decimals()),
      );
    });

    // Expect: trader should be able to withdraw deposited amount and
    // emit the evnts after withdrawn.
    it("Emit event after withdrawing 100 usdc", async function () {
      // Define the amount to be withdrawn
      const amount = ethers.utils.parseUnits("100", await testUSDC.decimals());

      // emit events once withdrwan.
      await expect(oddzVault.connect(deploySigner).withdrawCollateral(testUSDC.address, amount))
        .to.emit(oddzVault, "CollateralWithdrawn")
        .withArgs(testUSDC.address, deploySigner.address, amount);

      // update trader's balance in vault
      expect(await oddzVault.getCollateralBalance(deploySigner.address, testUSDC.address)).to.equal("0");

      //check available balance.SHould be 0
      expect(await oddzVault.getAvailableCollateral(deploySigner.address)).to.equal(ethers.utils.parseUnits("0"));
    });

    // Expect: trader should not allow to withdraw than more than balance availble for address.
    it("user should not be able to withdraw more than balance", async function () {
      // Get the balance of trader in vault
      const user2Balance = await oddzVault.getCollateralBalance(user2a.address, testUSDC.address);

      // revert tx when user wants to withdraw more than allowed
      await expect(
        oddzVault.connect(user2a).withdrawCollateral(testUSDC.address, user2Balance + 100),
      ).to.be.revertedWith("OV:NEAC");
      //Not enough available collateral
    });
  });
  describe("free collateral amount of specified trader", async function () {
    // base and quote token amount which will specify how much liquidity trader adding
    let baseAmount = "10000000000000000";
    let baseAmount2 = "10000000000000000";
    let quoteAmount = "49890000000000000000";

    it("User should have free collateral to withdraw after adding liquidity", async function () {
      let orderId = await orderManager.calcOrderID(deploySigner.address, baseToken.address, 81000, 81600);
      // approve the testUSDC amount to spender(oddzVault) and deposite the collateral.
      await testUSDC.approve(oddzVault.address, "100000000000000000000000000");
      // Deposit the collateral.
      await oddzVault.depositCollateral(testUSDC.address, "1000000000000");

      var collateral = 1000000000;
      //Add liquidty to the pool.
      await expect(
        oddzClearingHouse.connect(deploySigner).addLiquidity([
          baseToken.address, //Base token address
          baseAmount, //base token amount we want to add
          quoteAmount, //quote token amount we want to add
          "81000", //lower tick
          "81600", //upper tick
          "0", //minimum base token to be added .FOr testing considered as 0
          "0", //minimum quote token to be added
          collateral,
          "10000000000", //deadline
        ]),
      ) //emits an event if the add liquidity in completed
        .to.emit(oddzClearingHouse, "LiquidityUpdated")
        .withArgs(
          deploySigner.address, // maker address
          baseToken.address, //base token address
          quoteToken.address, //quote token address
          81000, //lower tick
          81600, //upper tick
          "9517266902729210", //base amount added,It might slightly differ from what we wanted to add
          quoteAmount, //quote amount added
          "47367960843565759152", //Liquidity amount recieved from adding liquidty
          "0", // fee in quote
          orderId,
          true,
        );

      await expect(1000000000000 - collateral).to.equals(await oddzVault.getAvailableCollateral(deploySigner.address));
      await expect(collateral).to.equals(await orderManager.getTotalCollateralForOrders(deploySigner.address));
      let orders = await orderManager.getCurrentOrderIds(deploySigner.address);
      let freeCollateral = await oddzVault.getLiquidityPositionCollateralByRatio(
        deploySigner.address,
        orders[orders.length - 1],
        100000,
      );
      let totalOrderValue = await balanceManager.getTotalOrderInfo(orders[orders.length - 1]);
      let unrealisedPnl = await balanceManager.getLiquidityPositionUnrealisedPnL(orders[orders.length - 1]);
      let marginRatio = await oddzConfig.initialMarginRatio();
      let totalMarginRequired = Math.round((totalOrderValue * marginRatio) / "1000000");
      let calculatedCollateral =
        collateral - Math.round(totalMarginRequired / 10 ** 10) - Math.round(unrealisedPnl / 10 ** 10);
      expect(calculatedCollateral).to.equal(freeCollateral);
    });

    it("User should have position collateral by ratio after opening position", async function () {
      // approve the testUSDC amount to spender(oddzVault) and deposite the collateral.
      await testUSDC.approve(oddzVault.address, "100000000000000000000000000");

      // Deposit the collateral.
      await oddzVault.depositCollateral(testUSDC.address, "1000000000000");

      //Add liquidty to the pool.
      await oddzClearingHouse.connect(deploySigner).addLiquidity([
        baseToken.address, //Base token address
        baseAmount, //base token amount we want to add
        quoteAmount, //quote token amount we want to add
        "81000", //lower tick
        "81600", //upper tick
        "0", //minimum base token to be added .FOr testing considered as 0
        "0", //minimum quote token to be added
        "1000000000",
        "10000000000", //deadline
      ]);

      await oddzClearingHouse.connect(deploySigner).openPosition([
        baseToken.address, //Base token address
        true, // true if is isolate
        false, // true if is short
        "200000000000", //token amount we want to swap
        true, //true if isExact Input
        0, //minimum base token to be recieved .For testing considered as 0
        false,
        0, // group id
        0, //true if is new group
        "10000000000", //collateral for this position
        "0", //limit in sqrt price of the pool
        "0", // 0 - for market order
        "0", // triggering price
        "10000000000", //deadline
      ]);

      let marginRatio = await oddzConfig.initialMarginRatio();

      // ratio = 0.1
      let groupCollateral = await oddzVault.getPositionCollateralByRatio(deploySigner.address, "1", marginRatio);
      expect(groupCollateral).to.be.equal("9999999989");
    });

    it("User should be able to use all the collateral", async function () {
      //deployerSigner deposited  => 1000000000000 + 1000000000000
      //used => 1000000000+1000000000+10000000000
      expect(await oddzVault.getAvailableCollateral(deploySigner.address)).to.equal("1988000000000");

      await oddzClearingHouse.connect(deploySigner).openPosition([
        baseToken.address, //Base token address
        true, // true if is isolate
        false, // true if is short
        "200000000000", //token amount we want to swap
        true, //true if isExact Input
        0, //minimum base token to be recieved .For testing considered as 0
        false,
        0, // group id
        0, //true if is new group
        "1988000000000", //collateral for this position
        "0", //limit in sqrt price of the pool
        "0", // 0 - for market order
        "0", // triggering price
        "10000000000", //deadline
      ]);

      expect(await oddzVault.getAvailableCollateral(deploySigner.address)).to.equal("0");
      expect(await balanceManager.getTotalUsedCollateralInPositions(deploySigner.address)).to.equal("1998000000000");
      expect(await orderManager.getTotalCollateralForOrders(deploySigner.address)).to.equal("2000000000");
    });
  });
}

// Deploy the contracts and various test scenario.
describe("Deploy & Test Contracts", async function () {
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
    } = await setUpContracts("4630020893985074015686987575017", "17205327668361943026474184432430");

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
  }).timeout("2000s");
});
