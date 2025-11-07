// Crypto Validation Utilities

const { isNetworkSupported, isCurrencySupportedForNetwork } = require('../config/cryptoConfig');

/**
 * Validate Ethereum/Polygon/BSC wallet address format
 * Format: 0x followed by 40 hexadecimal characters
 */
function validateEthereumAddress(address) {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address must be a non-empty string' };
  }

  const trimmed = address.trim();
  
  // Check if starts with 0x
  if (!trimmed.startsWith('0x')) {
    return { valid: false, error: 'Ethereum address must start with 0x' };
  }

  // Check length (0x + 40 hex chars = 42 total)
  if (trimmed.length !== 42) {
    return { valid: false, error: 'Ethereum address must be 42 characters (0x + 40 hex)' };
  }

  // Check if remaining characters are valid hex
  const hexPart = trimmed.slice(2);
  if (!/^[0-9a-fA-F]{40}$/.test(hexPart)) {
    return { valid: false, error: 'Ethereum address contains invalid hexadecimal characters' };
  }

  return { valid: true };
}

/**
 * Validate Bitcoin address format
 * Supports both legacy (Base58) and SegWit (Bech32) formats
 */
function validateBitcoinAddress(address) {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address must be a non-empty string' };
  }

  const trimmed = address.trim();

  // Legacy format (Base58): 26-35 characters, starts with 1 or 3
  // SegWit format (Bech32): starts with bc1, 14-74 characters
  if (trimmed.startsWith('bc1') || trimmed.startsWith('BC1')) {
    // Bech32 format
    if (trimmed.length < 14 || trimmed.length > 74) {
      return { valid: false, error: 'Bitcoin Bech32 address length invalid' };
    }
    if (!/^bc1[a-z0-9]{13,72}$/i.test(trimmed)) {
      return { valid: false, error: 'Bitcoin Bech32 address format invalid' };
    }
  } else if (trimmed.startsWith('1') || trimmed.startsWith('3')) {
    // Legacy format
    if (trimmed.length < 26 || trimmed.length > 35) {
      return { valid: false, error: 'Bitcoin legacy address length invalid' };
    }
    // Basic Base58 check (simplified - full validation would require Base58 decoding)
    if (!/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{26,35}$/.test(trimmed)) {
      return { valid: false, error: 'Bitcoin legacy address format invalid' };
    }
  } else {
    return { valid: false, error: 'Bitcoin address must start with 1, 3, or bc1' };
  }

  return { valid: true };
}

/**
 * Validate wallet address based on network
 */
function validateWalletAddress(address, network) {
  // Trim address
  const trimmedAddress = address ? String(address).trim() : '';
  
  if (!trimmedAddress || trimmedAddress.length === 0) {
    return { valid: false, error: 'Wallet address is required' };
  }

  if (!network || (typeof network === 'string' && network.trim().length === 0)) {
    return { valid: false, error: 'Crypto network is required to validate wallet address' };
  }

  const trimmedNetwork = String(network).trim();

  if (!isNetworkSupported(trimmedNetwork)) {
    return { valid: false, error: `Unsupported network: ${trimmedNetwork}` };
  }

  const networkInfo = require('../config/cryptoConfig').getNetworkInfo(trimmedNetwork);
  
  if (!networkInfo) {
    return { valid: false, error: `Network configuration not found: ${trimmedNetwork}` };
  }
  
  if (networkInfo.addressFormat === 'ethereum') {
    return validateEthereumAddress(trimmedAddress);
  } else if (networkInfo.addressFormat === 'bitcoin') {
    return validateBitcoinAddress(trimmedAddress);
  }

  return { valid: false, error: `Unknown address format for network: ${trimmedNetwork}` };
}

/**
 * Validate transaction hash format
 */
function validateTransactionHash(hash, network) {
  if (!hash || typeof hash !== 'string') {
    return { valid: false, error: 'Transaction hash must be a non-empty string' };
  }

  const trimmed = hash.trim();

  if (!network) {
    // Generic validation - check if it's a valid hex string
    if (trimmed.startsWith('0x')) {
      // Ethereum-style hash
      if (trimmed.length !== 66 || !/^0x[0-9a-fA-F]{64}$/.test(trimmed)) {
        return { valid: false, error: 'Transaction hash must be 0x followed by 64 hex characters' };
      }
    } else {
      // Bitcoin-style hash (no 0x prefix)
      if (trimmed.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(trimmed)) {
        return { valid: false, error: 'Transaction hash must be 64 hexadecimal characters' };
      }
    }
    return { valid: true };
  }

  // Network-specific validation
  if (!isNetworkSupported(network)) {
    return { valid: false, error: `Unsupported network: ${network}` };
  }

  const networkInfo = require('../config/cryptoConfig').getNetworkInfo(network);
  
  if (networkInfo.hashFormat === 'ethereum') {
    // Ethereum-style: 0x + 64 hex chars
    if (trimmed.length !== 66 || !trimmed.startsWith('0x')) {
      return { valid: false, error: 'Transaction hash must start with 0x and be 66 characters total' };
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(trimmed)) {
      return { valid: false, error: 'Transaction hash contains invalid hexadecimal characters' };
    }
  } else if (networkInfo.hashFormat === 'bitcoin') {
    // Bitcoin-style: 64 hex chars, no 0x prefix
    if (trimmed.length !== 64) {
      return { valid: false, error: 'Transaction hash must be exactly 64 hexadecimal characters' };
    }
    if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return { valid: false, error: 'Transaction hash contains invalid hexadecimal characters' };
    }
  }

  return { valid: true };
}

/**
 * Validate crypto payout request data
 */
function validateCryptoPayoutRequest(beneficiaryDetails) {
  const errors = [];

  // ✅ Validate network FIRST (needed for address validation)
  const cryptoNetwork = beneficiaryDetails.cryptoNetwork ? String(beneficiaryDetails.cryptoNetwork).trim() : '';
  if (!cryptoNetwork || cryptoNetwork.length === 0) {
    errors.push('Crypto network is required');
  } else if (!isNetworkSupported(cryptoNetwork)) {
    errors.push(`Unsupported crypto network: ${cryptoNetwork}`);
  }

  // ✅ Validate currency
  const cryptoCurrency = beneficiaryDetails.cryptoCurrency ? String(beneficiaryDetails.cryptoCurrency).trim() : '';
  if (!cryptoCurrency || cryptoCurrency.length === 0) {
    errors.push('Crypto currency is required');
  } else if (cryptoNetwork && !isCurrencySupportedForNetwork(cryptoNetwork, cryptoCurrency)) {
    errors.push(`Currency ${cryptoCurrency} is not supported for network ${cryptoNetwork}`);
  }

  // ✅ Validate wallet address (only if network is valid)
  const cryptoWalletAddress = beneficiaryDetails.cryptoWalletAddress ? String(beneficiaryDetails.cryptoWalletAddress).trim() : '';
  if (!cryptoWalletAddress || cryptoWalletAddress.length === 0) {
    errors.push('Crypto wallet address is required');
  } else if (cryptoNetwork && isNetworkSupported(cryptoNetwork)) {
    // Only validate address format if network is valid
    const addressValidation = validateWalletAddress(cryptoWalletAddress, cryptoNetwork);
    if (!addressValidation.valid) {
      errors.push(`Wallet address: ${addressValidation.error}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateEthereumAddress,
  validateBitcoinAddress,
  validateWalletAddress,
  validateTransactionHash,
  validateCryptoPayoutRequest
};

