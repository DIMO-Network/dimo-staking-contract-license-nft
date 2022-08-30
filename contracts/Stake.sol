//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./LicenseBase/LicenseBase.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract Stake is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    LicenseBase
{
    /* ========== STATE VARIABLES ========== */
    mapping(address => uint256) public stakedBalanceOf;
    uint256 public minStakeAmount;
    uint256 public dimoTotalAmountStaked;
    string baseUri;
    uint256 tokenId;
    ERC20 dimoToken;

    /* ========== EVENTS ========== */

    event StakeTokens(address indexed user, uint256 amountOfTokens);

    event UnstakeTokens(address indexed user, uint256 amountOfTokens);

    event EmergencyWithdrawal(address indexed user, uint256 amountOfTokens);

    event StakeAmountAdjusted(uint256 amount);

    event LicenseMinted(address indexed user, uint256 tokenId);

    event LicenseRevoked(uint256 tokenId);

    /* ========== CONSTRUCTOR ========== */

    /** @dev replaces the constructor function due to upgradeable convention UUPS
     * @param tokenAddress The contract address for DIMO
     */
    function initialize(address tokenAddress) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __LicenseBase_init("Dimo License", "DIMO");

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        dimoToken = ERC20(tokenAddress);
        minStakeAmount = 100000 * 10**18; // 100,000;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /** @dev User deposits DIMO tokens to be locked
     * The ERC20 approval tx needs to be executed in advance
     * @param _amount The amount of tokens to stake
     */
    function stake(uint256 _amount) external {
        // prevent user from staking less than the minimum staking amount
        require(
            _amount >= minStakeAmount,
            "amount below the mininum staking requirement"
        );

        // update the balance of the user's staked tokens
        stakedBalanceOf[msg.sender] += _amount;
        dimoTotalAmountStaked += _amount;

        // token has to send  before continuing the function
        require(
            dimoToken.transferFrom(msg.sender, address(this), _amount),
            "token transfer failed"
        );

        emit StakeTokens(msg.sender, _amount);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /** @dev Update the min stake amount if needed
     * @param _amount The new amount of tokens required to stake
     */
    function setNewMinStakeAmount(uint256 _amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        minStakeAmount = _amount;
        emit StakeAmountAdjusted(_amount);
    }

    /** @dev withdraw DIMO tokens the user has staked
     * @param user The address of the user
     * @param _amount The amount of tokens to withdraw
     */
    function unstake(address user, uint256 _amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        // update the balance of the user's staked tokens
        require(
            stakedBalanceOf[user] >= _amount,
            "User does not have enough staked balance"
        );
        stakedBalanceOf[user] -= _amount;
        dimoTotalAmountStaked -= _amount;

        require(dimoToken.transfer(user, _amount), "Transfer Failed");
        emit UnstakeTokens(user, _amount);
    }

    /** @dev emergency function for when the user might send DIMO to the contract without interacting with the stake() function
     * @param user The address of the user
     * @param amount The amount of tokens to withdraw
     */
    function emergencyWithdraw(address user, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        // only positive when accidental tokens are sent to this contract
        require(
            getWithdrawableAmount() >= amount,
            "Not enough withdrawable funds"
        );

        require(dimoToken.transfer(user, amount), "Transfer Failed");
        emit EmergencyWithdrawal(user, amount);
    }

    /** @dev Owner issues a license to the specified address
     * @param to The address that already staked DIMO tokens
     */
    function mint(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            checkUserIsWhitelisted(to),
            "User has not staked the required DIMO tokens"
        );

        uint256 newTokenId = ++tokenId;

        super._mint(to, newTokenId);
        emit LicenseMinted(to, newTokenId);
    }

    /** @dev An existing License is revoked from an account
     * @param _tokenId the index for the newly created License
     */
    function revoke(uint256 _tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        super._burn(_tokenId);
        emit LicenseRevoked(tokenId);
    }

    /** @dev set the tokenURI
     *  @param dimoURI new URI (ex https://dimo.zone/)
     */
    function setDimoURI(string memory dimoURI)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setDimoURI(dimoURI);
    }

    /* ========== VIEWS ========== */

    /** @dev Get the amount of DIMO tokens the user has staked
     * @param user The address to check for a balance
     * @return uint256 the amount of tokens staked
     */
    function checkUserStakedBalance(address user)
        external
        view
        returns (uint256)
    {
        return stakedBalanceOf[user];
    }

    /** @dev Check whether the user has a valid amount of DIMO staked
     * @param user The address to check
     * @return bool whether the user has a valid amount staked
     */
    function checkUserIsWhitelisted(address user) public view returns (bool) {
        return stakedBalanceOf[user] >= minStakeAmount;
    }

    /** @dev Returns the amount of (lost) tokens that can be withdrawn by the user
     * @return uint256 amount of tokens
     */
    function getWithdrawableAmount() public view returns (uint256) {
        return dimoToken.balanceOf(address(this)) - dimoTotalAmountStaked;
    }

    /**  @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override
        returns (bool)
    {
        super.supportsInterface(interfaceId);
    }

    /**
     * @dev Function that should revert when `msg.sender` is not authorized to upgrade the contract. Called by
     * {upgradeTo} and {upgradeToAndCall}.
     *
     * Normally, this function will use an xref:access.adoc[access control] modifier such as {Ownable-onlyOwner}.
     *
     * ```solidity
     * function _authorizeUpgrade(address) internal override onlyOwner {}
     * ```
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}
}
