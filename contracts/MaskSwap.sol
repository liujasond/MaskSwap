// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ConfidentialUSDT} from "./ConfidentialUSDT.sol";

/// @title MaskSwap
/// @notice Swap ETH for cUSDT at a fixed rate while keeping token balances confidential.
contract MaskSwap is ZamaEthereumConfig, Ownable, ReentrancyGuard {
    ConfidentialUSDT public immutable cusdt;

    uint256 public constant RATE = 3300;
    uint256 public constant CUSDT_DECIMALS = 1e6;

    error NoEthProvided();
    error AmountTooSmall();
    error AmountTooLarge();
    error TransferFailed();
    error InvalidRecipient();
    error InsufficientEthReserves();

    event SwapExecuted(address indexed buyer, uint256 ethSpent, euint64 cusdtMinted);
    event EthWithdrawn(address indexed receiver, uint256 amount);

    constructor(address cusdtAddress) Ownable(msg.sender) {
        if (cusdtAddress == address(0)) {
            revert InvalidRecipient();
        }
        cusdt = ConfidentialUSDT(cusdtAddress);
    }

    /// @notice Preview how many cUSDT a swap would mint for a given ETH amount.
    /// @param weiAmount Amount of ETH in wei.
    /// @return cUSDT amount denominated with 6 decimals.
    function previewSwap(uint256 weiAmount) public pure returns (uint64) {
        if (weiAmount == 0) {
            revert NoEthProvided();
        }

        uint256 tokens = (weiAmount * RATE * CUSDT_DECIMALS) / 1 ether;
        if (tokens == 0) {
            revert AmountTooSmall();
        }
        if (tokens > type(uint64).max) {
            revert AmountTooLarge();
        }

        return uint64(tokens);
    }

    /// @notice Swap ETH for cUSDT at the fixed rate.
    /// @dev Emits a SwapExecuted event with the encrypted mint amount.
    function swap() external payable nonReentrant returns (euint64) {
        if (msg.value == 0) {
            revert NoEthProvided();
        }

        uint64 mintAmount = previewSwap(msg.value);

        cusdt.mint(msg.sender, mintAmount);

        euint64 encryptedMintAmount = FHE.asEuint64(mintAmount);
        emit SwapExecuted(msg.sender, msg.value, encryptedMintAmount);

        return encryptedMintAmount;
    }

    /// @notice View an account's encrypted cUSDT balance.
    /// @param account Address to query.
    function cusdtBalance(address account) external view returns (euint64) {
        return cusdt.confidentialBalanceOf(account);
    }

    /// @notice Withdraw ETH collected from swaps.
    /// @param receiver Address receiving the ETH.
    /// @param amount Amount in wei to withdraw.
    function withdrawETH(address receiver, uint256 amount) external onlyOwner nonReentrant {
        if (receiver == address(0)) {
            revert InvalidRecipient();
        }

        if (amount > address(this).balance) {
            revert InsufficientEthReserves();
        }

        (bool success, ) = receiver.call{value: amount}("");
        if (!success) {
            revert TransferFailed();
        }

        emit EthWithdrawn(receiver, amount);
    }
}
