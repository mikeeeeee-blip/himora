// Crypto Configuration - Supported Networks and Currencies

const CRYPTO_NETWORKS = {
  ethereum: {
    id: '1',
    name: 'Ethereum',
    explorerUrl: 'https://etherscan.io',
    explorerTxUrl: 'https://etherscan.io/tx/',
    currencies: ['ETH', 'USDT', 'USDC', 'DAI', 'WBTC'],
    addressFormat: 'ethereum', // 0x + 40 hex chars
    hashFormat: 'ethereum' // 0x + 64 hex chars
  },
  polygon: {
    id: '137',
    name: 'Polygon',
    explorerUrl: 'https://polygonscan.com',
    explorerTxUrl: 'https://polygonscan.com/tx/',
    currencies: ['MATIC', 'USDT', 'USDC', 'DAI'],
    addressFormat: 'ethereum', // Same format as Ethereum
    hashFormat: 'ethereum'
  },
  bitcoin: {
    id: '0',
    name: 'Bitcoin',
    explorerUrl: 'https://blockstream.info',
    explorerTxUrl: 'https://blockstream.info/tx/',
    currencies: ['BTC'],
    addressFormat: 'bitcoin', // Base58 or Bech32
    hashFormat: 'bitcoin' // 64 hex chars (no 0x prefix)
  },
  bsc: {
    id: '56',
    name: 'Binance Smart Chain',
    explorerUrl: 'https://bscscan.com',
    explorerTxUrl: 'https://bscscan.com/tx/',
    currencies: ['BNB', 'USDT', 'USDC', 'BUSD'],
    addressFormat: 'ethereum',
    hashFormat: 'ethereum'
  },
  arbitrum: {
    id: '42161',
    name: 'Arbitrum',
    explorerUrl: 'https://arbiscan.io',
    explorerTxUrl: 'https://arbiscan.io/tx/',
    currencies: ['ETH', 'USDT', 'USDC'],
    addressFormat: 'ethereum',
    hashFormat: 'ethereum'
  },
  optimism: {
    id: '10',
    name: 'Optimism',
    explorerUrl: 'https://optimistic.etherscan.io',
    explorerTxUrl: 'https://optimistic.etherscan.io/tx/',
    currencies: ['ETH', 'USDT', 'USDC'],
    addressFormat: 'ethereum',
    hashFormat: 'ethereum'
  }
};

// Get supported networks list
function getSupportedNetworks() {
  return Object.keys(CRYPTO_NETWORKS);
}

// Get currencies for a network
function getCurrenciesForNetwork(network) {
  if (!CRYPTO_NETWORKS[network]) {
    return [];
  }
  return CRYPTO_NETWORKS[network].currencies;
}

// Check if network is supported
function isNetworkSupported(network) {
  return CRYPTO_NETWORKS.hasOwnProperty(network);
}

// Check if currency is supported for network
function isCurrencySupportedForNetwork(network, currency) {
  if (!isNetworkSupported(network)) {
    return false;
  }
  return CRYPTO_NETWORKS[network].currencies.includes(currency.toUpperCase());
}

// Get network info
function getNetworkInfo(network) {
  return CRYPTO_NETWORKS[network] || null;
}

// Generate explorer URL for transaction
function getExplorerUrl(network, transactionHash) {
  const networkInfo = getNetworkInfo(network);
  if (!networkInfo || !transactionHash) {
    return null;
  }
  return networkInfo.explorerTxUrl + transactionHash;
}

module.exports = {
  CRYPTO_NETWORKS,
  getSupportedNetworks,
  getCurrenciesForNetwork,
  isNetworkSupported,
  isCurrencySupportedForNetwork,
  getNetworkInfo,
  getExplorerUrl
};

