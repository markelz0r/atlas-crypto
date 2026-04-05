import { getUserPortfolioTool } from './get-user-portfolio.tool.js';
import { updateUserPortfolioTool } from './update-user-portfolio.tool.js';
import { getPriceVolumeTool } from './get-price-volume.tool.js';
import { getOnchainFundamentalsTool } from './get-onchain-fundamentals.tool.js';

export const allTools = [
  getUserPortfolioTool,
  updateUserPortfolioTool,
  getPriceVolumeTool,
  getOnchainFundamentalsTool,
];
