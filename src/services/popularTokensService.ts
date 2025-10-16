// src/services/popularTokensService.ts - VERIFIED Popular tokens per chain
export interface PopularToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  isPopular: boolean;
}

export const POPULAR_TOKENS: { [chainId: string]: PopularToken[] } = {
  eth: [
    {
      address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png",
      isPopular: true,
    },
    {
      address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      logoURI:
        "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
      isPopular: true,
    },
    {
      address: "0x6b175474e89094c44da98b954eedeac495271d0f",
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png",
      isPopular: true,
    },
    {
      address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
      symbol: "WBTC",
      name: "Wrapped Bitcoin",
      decimals: 8,
      logoURI:
        "https://tokens.1inch.io/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.png",
      isPopular: true,
    },
    {
      address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png",
      isPopular: true,
    },
    {
      address: "0x514910771af9ca656af840dff83e8264ecf986ca",
      symbol: "LINK",
      name: "Chainlink",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png",
      isPopular: true,
    },
    {
      address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
      symbol: "UNI",
      name: "Uniswap",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x1f9840a85d5af5bf1d1762f925bdaddc4201f984.png",
      isPopular: true,
    },
    {
      address: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
      symbol: "AAVE",
      name: "Aave",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9.png",
      isPopular: true,
    },
    {
      address: "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2",
      symbol: "SUSHI",
      name: "SushiToken",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x6b3595068778dd592e39a122f4f5a5cf09c90fe2.png",
      isPopular: true,
    },
  ],
  base: [
    {
      address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png",
      isPopular: true,
    },
    {
      address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      logoURI: "https://ethereum-optimism.github.io/data/USDC/logo.png",
      isPopular: true,
    },
    {
      address: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb",
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png",
      isPopular: true,
    },
    {
      address: "0x4200000000000000000000000000000000000006",
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png",
      isPopular: true,
    },
    {
      address: "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca",
      symbol: "USDbC",
      name: "USD Base Coin",
      decimals: 6,
      logoURI: "https://ethereum-optimism.github.io/data/USDC/logo.png",
      isPopular: true,
    },
    {
      address: "0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22",
      symbol: "cbETH",
      name: "Coinbase Wrapped Staked ETH",
      decimals: 18,
      logoURI:
        "https://assets.coingecko.com/coins/images/27008/large/cbeth.png",
      isPopular: true,
    },
    {
      address: "0x940181a94a35a4569e4529a3cdfb74e38fd98631",
      symbol: "AERO",
      name: "Aerodrome Finance",
      decimals: 18,
      logoURI:
        "https://assets.coingecko.com/coins/images/31745/large/token.png",
      isPopular: true,
    },
    {
      address: "0x532f27101965dd16442e59d40670faf5ebb142e4",
      symbol: "BRETT",
      name: "Brett",
      decimals: 18,
      logoURI:
        "https://assets.coingecko.com/coins/images/35755/large/Brett.jpg",
      isPopular: true,
    },
    {
      address: "0xac1bd2486aaf3b5c0fc3fd868558b082a531b2b4",
      symbol: "TOSHI",
      name: "Toshi",
      decimals: 18,
      logoURI:
        "https://assets.coingecko.com/coins/images/33772/large/toshi.jpg",
      isPopular: true,
    },
    {
      address: "0x4ed4e862860bed51a9570b96d89af5e1b0efefed",
      symbol: "DEGEN",
      name: "Degen",
      decimals: 18,
      logoURI:
        "https://assets.coingecko.com/coins/images/34515/large/degen.jpg",
      isPopular: true,
    },
  ],
  polygon: [
    {
      address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      symbol: "MATIC",
      name: "Polygon",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0.png",
      isPopular: true,
    },
    {
      address: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      logoURI:
        "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
      isPopular: true,
    },
    {
      address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      logoURI:
        "https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png",
      isPopular: true,
    },
    {
      address: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png",
      isPopular: true,
    },
    {
      address: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png",
      isPopular: true,
    },
    {
      address: "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",
      symbol: "WBTC",
      name: "Wrapped Bitcoin",
      decimals: 8,
      logoURI:
        "https://tokens.1inch.io/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.png",
      isPopular: true,
    },
    {
      address: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
      symbol: "WMATIC",
      name: "Wrapped Matic",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0.png",
      isPopular: true,
    },
    {
      address: "0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39",
      symbol: "LINK",
      name: "Chainlink",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png",
      isPopular: true,
    },
    {
      address: "0xd6df932a45c0f255f85145f286ea0b292b21c90b",
      symbol: "AAVE",
      name: "Aave",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9.png",
      isPopular: true,
    },
    {
      address: "0xbbba073c31bf03b8acf7c28ef0738decf3695683",
      symbol: "SAND",
      name: "The Sandbox",
      decimals: 18,
      logoURI:
        "https://assets.coingecko.com/coins/images/12129/large/sandbox_logo.jpg",
      isPopular: true,
    },
  ],
  arbitrum: [
    {
      address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png",
      isPopular: true,
    },
    {
      address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      logoURI:
        "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
      isPopular: true,
    },
    {
      address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      logoURI:
        "https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png",
      isPopular: true,
    },
    {
      address: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png",
      isPopular: true,
    },
    {
      address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png",
      isPopular: true,
    },
    {
      address: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
      symbol: "WBTC",
      name: "Wrapped Bitcoin",
      decimals: 8,
      logoURI:
        "https://tokens.1inch.io/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.png",
      isPopular: true,
    },
    {
      address: "0x912ce59144191c1204e64559fe8253a0e49e6548",
      symbol: "ARB",
      name: "Arbitrum",
      decimals: 18,
      logoURI:
        "https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg",
      isPopular: true,
    },
    {
      address: "0xf97f4df75117a78c1a5a0dbb814af92458539fb4",
      symbol: "LINK",
      name: "Chainlink",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png",
      isPopular: true,
    },
    {
      address: "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
      symbol: "GMX",
      name: "GMX",
      decimals: 18,
      logoURI:
        "https://assets.coingecko.com/coins/images/18323/large/arbit.png",
      isPopular: true,
    },
    {
      address: "0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0",
      symbol: "UNI",
      name: "Uniswap",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x1f9840a85d5af5bf1d1762f925bdaddc4201f984.png",
      isPopular: true,
    },
  ],
  avalanche: [
    {
      address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      symbol: "AVAX",
      name: "Avalanche",
      decimals: 18,
      logoURI:
        "https://assets.coingecko.com/coins/images/12559/large/coin-round-red.png",
      isPopular: true,
    },
    {
      address: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      logoURI:
        "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
      isPopular: true,
    },
    {
      address: "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      logoURI:
        "https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png",
      isPopular: true,
    },
    {
      address: "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png",
      isPopular: true,
    },
    {
      address: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
      symbol: "WAVAX",
      name: "Wrapped AVAX",
      decimals: 18,
      logoURI:
        "https://assets.coingecko.com/coins/images/12559/large/coin-round-red.png",
      isPopular: true,
    },
    {
      address: "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab",
      symbol: "WETH",
      name: "Wrapped Ether",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png",
      isPopular: true,
    },
    {
      address: "0x50b7545627a5162f82a992c33b87adc75187b218",
      symbol: "WBTC",
      name: "Wrapped Bitcoin",
      decimals: 8,
      logoURI:
        "https://tokens.1inch.io/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.png",
      isPopular: true,
    },
    {
      address: "0x5947bb275c521040051d82396192181b413227a3",
      symbol: "LINK",
      name: "Chainlink",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png",
      isPopular: true,
    },
    {
      address: "0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd",
      symbol: "JOE",
      name: "JoeToken",
      decimals: 18,
      logoURI:
        "https://assets.coingecko.com/coins/images/17569/large/JoeToken.png",
      isPopular: true,
    },
    {
      address: "0x60781c2586d68229fde47564546784ab3faca982",
      symbol: "PNG",
      name: "Pangolin",
      decimals: 18,
      logoURI:
        "https://assets.coingecko.com/coins/images/14023/large/pangolin_logo.png",
      isPopular: true,
    },
  ],
  bsc: [
    {
      address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      symbol: "BNB",
      name: "BNB",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c.png",
      isPopular: true,
    },
    {
      address: "0x55d398326f99059ff775485246999027b3197955",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png",
      isPopular: true,
    },
    {
      address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
      isPopular: true,
    },
    {
      address: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
      symbol: "BUSD",
      name: "Binance USD",
      decimals: 18,
      logoURI: "https://assets.coingecko.com/coins/images/9576/large/BUSD.png",
      isPopular: true,
    },
    {
      address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
      symbol: "WBNB",
      name: "Wrapped BNB",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c.png",
      isPopular: true,
    },
    {
      address: "0x2170ed0880ac9a755fd29b2688956bd959f933f8",
      symbol: "ETH",
      name: "Ethereum Token",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png",
      isPopular: true,
    },
    {
      address: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
      symbol: "BTCB",
      name: "Bitcoin BEP2",
      decimals: 18,
      logoURI:
        "https://assets.coingecko.com/coins/images/14108/large/Binance-bitcoin.png",
      isPopular: true,
    },
    {
      address: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82",
      symbol: "CAKE",
      name: "PancakeSwap Token",
      decimals: 18,
      logoURI:
        "https://assets.coingecko.com/coins/images/12632/large/pancakeswap-cake-logo.png",
      isPopular: true,
    },
    {
      address: "0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd",
      symbol: "LINK",
      name: "ChainLink Token",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png",
      isPopular: true,
    },
    {
      address: "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
      symbol: "DAI",
      name: "Dai Token",
      decimals: 18,
      logoURI:
        "https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png",
      isPopular: true,
    },
  ],
};

export function getPopularTokensForChain(chainId: string): PopularToken[] {
  return POPULAR_TOKENS[chainId] || [];
}
