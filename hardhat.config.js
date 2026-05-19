require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Ethereum
    ethereum: {
      url: process.env.ETH_RPC || "https://eth.drpc.org",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 1
    },
    // Base
    base: {
      url: process.env.BASE_RPC || "https://mainnet.base.org",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 8453
    },
    // BNB Chain
    bsc: {
      url: process.env.BSC_RPC || "https://bsc-dataseed.binance.org",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 56
    },
    // Arbitrum
    arbitrum: {
      url: process.env.ARB_RPC || "https://arb1.arbitrum.io/rpc",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 42161
    },
    // Polygon
    polygon: {
      url: process.env.POLYGON_RPC || "https://polygon-rpc.com",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 137
    },
    // Optimism
    optimism: {
      url: process.env.OP_RPC || "https://mainnet.optimism.io",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 10
    },
    // Avalanche
    avalanche: {
      url: process.env.AVAX_RPC || "https://api.avax.network/ext/bc/C/rpc",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 43114
    },
    // Fantom
    fantom: {
      url: process.env.FTM_RPC || "https://rpc.ftm.tools",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 250
    },
    // Cronos
    cronos: {
      url: process.env.CRO_RPC || "https://evm.cronos.org",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 25
    },
    // Blast
    blast: {
      url: process.env.BLAST_RPC || "https://rpc.blast.io",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 81457
    },
    // Zora
    zora: {
      url: process.env.ZORA_RPC || "https://rpc.zora.energy",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 7777777
    },
    // Polygon zkEVM
    polygon_zkevm: {
      url: process.env.PZKEVM_RPC || "https://zkevm-rpc.com",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 1101
    },
    // Manta Pacific
    manta: {
      url: process.env.MANTA_RPC || "https://pacific-rpc.manta.network/http",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 169
    },
    // zkSync Era
    zksync: {
      url: process.env.ZKSYNC_RPC || "https://mainnet.era.zksync.io",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 324
    },
    // Linea
    linea: {
      url: process.env.LINEA_RPC || "https://rpc.linea.build",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 59144
    }
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || "",
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      optimisticEthereum: process.env.OPSCAN_API_KEY || "",
      avalanche: process.env.SNOWTRACE_API_KEY || "",
      opera: process.env.FTMSCAN_API_KEY || "",
      cronos: process.env.CRONOSCAN_API_KEY || "",
    }
  }
};
