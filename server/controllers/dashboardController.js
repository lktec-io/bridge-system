import asyncHandler from '../utils/asyncHandler.js';
import { getDashboardStats } from '../services/dashboardService.js';

export const getDashboard = asyncHandler(async (_req, res) => {
  const stats = await getDashboardStats();
  res.json(stats);
});
