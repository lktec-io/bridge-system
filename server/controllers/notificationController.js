import asyncHandler from '../utils/asyncHandler.js';
import * as notifService from '../services/notificationService.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await notifService.getNotificationsForUser(req.user.id);
  res.json(notifications);
});

export const markRead = asyncHandler(async (req, res) => {
  await notifService.markRead(req.user.id, Number(req.params.id));
  res.json({ success: true });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await notifService.markAllRead(req.user.id);
  res.json({ success: true });
});
