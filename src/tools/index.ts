import { getUserPortfolioTool } from './get-user-portfolio.tool.js';
import { updateUserPortfolioTool } from './update-user-portfolio.tool.js';
import { getPriceVolumeTool } from './get-price-volume.tool.js';
import { getOnchainFundamentalsTool } from './get-onchain-fundamentals.tool.js';
import { getFearGreedTool } from './get-fear-greed.tool.js';
import { getMarketOverviewTool } from './get-market-overview.tool.js';
import { getStablecoinFlowsTool } from './get-stablecoin-flows.tool.js';
import { getCoinDetailTool } from './get-coin-detail.tool.js';

export const allTools = [
  getUserPortfolioTool,
  updateUserPortfolioTool,
  getPriceVolumeTool,
  getOnchainFundamentalsTool,
  getFearGreedTool,
  getMarketOverviewTool,
  getStablecoinFlowsTool,
  getCoinDetailTool,
];
