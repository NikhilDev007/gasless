// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;
import "@opengsn/contracts/src/ERC2771Recipient.sol";

// contract to store data in the ledger.
contract Ledger is ERC2771Recipient {

    event dataStored(address indexed _clientName, uint8 _ledgerID, uint248 _amount);

    // LEDGER mapping which contains the address, id and amount of the user
    // first key: address of the user, second key: ledger id ==> amount 
    mapping(address=>mapping(uint8=>uint248)) private LEDGER;

    /** 
     * Set the trustedForwarder address either in constructor or 
     * in other init function in your contract
     */ 
    // OR constructor(address _trustedForwarder) public ERC2771Context(_trustedForwarder)
    constructor(address _trustedForwarder) {
        _setTrustedForwarder(_trustedForwarder);
    }
    

    /**
    * @notice Function used to stor the user data into the ledger.
    * @param _clientName address of the user
    * @param _ledgerID user id 
    * @param _amount amount user wants to store inside the ledger.
    */
    function storeData(address _clientName, uint8 _ledgerID, uint248 _amount) external {
        LEDGER[_clientName][_ledgerID] = _amount;

        emit dataStored(_clientName, _ledgerID, _amount);
    }

    /**
    * @notice Function used to get data from ledger
    * @param _clientName address of the user
    * @param _ledgerID user id 
    */
    function getData(address _clientName, uint8 _ledgerID) external view returns(uint248) {
        uint248 amount = LEDGER[_clientName][_ledgerID];
        return amount;
    }

    /**
    * @notice Function used to set trusted forwerder
    * @param _trustedForwarder address of the the trusted forwerder.
    */
    function setTrustedForwarder(address _trustedForwarder) external {
        _setTrustedForwarder(_trustedForwarder);
    }


    /** 
     * Override this function.
     * This version is to keep track of BaseRelayRecipient you are using
     * in your contract. 
     */
    function versionRecipient() external view override returns (string memory) {
        return "1";
    }

}
                                                                                                                                                                                                