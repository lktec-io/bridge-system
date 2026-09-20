import asyncHandler from '../utils/asyncHandler.js';
import * as maintenanceService from '../services/maintenanceService.js';
import { createNotification } from '../services/notificationService.js';

export const getAllMaintenance = asyncHandler(async (req, res) => {
  const records = await maintenanceService.listMaintenance(req.query);
  res.json(records);
});

export const getMaintenanceSummary = asyncHandler(async (_req, res) => {
  const summary = await maintenanceService.getMaintenanceSummary();
  res.json(summary);
});

export const getMaintenanceById = asyncHandler(async (req, res) => {
  const record = await maintenanceService.getMaintenanceById(Number(req.params.id));
  if (!record) return res.status(404).json({ message: 'Maintenance record not found' });
  res.json(record);
});

export const createMaintenance = asyncHandler(async (req, res) => {
  const { bridgeId, description, maintenanceDate, performedBy } = req.body;

  if (!bridgeId || !description || !maintenanceDate || !performedBy) {
    return res.status(400).json({
      message: 'bridgeId, description, maintenanceDate and performedBy are required',
    });
  }

  const record = await maintenanceService.createMaintenance(req.body, req.user?.id);

  if (record.maintenanceType === 'EMERGENCY') {
    const serial = record.bridge?.serialNumber ?? `Bridge #${record.bridgeId}`;
    createNotification(
      'MAINTENANCE_LOGGED',
      'Emergency maintenance raised',
      `Emergency works scheduled on ${serial} — ${record.status.toLowerCase().replace('_', ' ')}`,
      'bridge',
      record.bridgeId
    ).catch(() => {});
  }

  res.status(201).json(record);
});

export const updateMaintenance = asyncHandler(async (req, res) => {
  const record = await maintenanceService.updateMaintenance(
    Number(req.params.id), req.body, req.user?.id
  );
  if (!record) return res.status(404).json({ message: 'Maintenance record not found' });
  res.json(record);
});

export const deleteMaintenance = asyncHandler(async (req, res) => {
  const removed = await maintenanceService.deleteMaintenance(Number(req.params.id), req.user?.id);
  if (!removed) return res.status(404).json({ message: 'Maintenance record not found' });
  res.json({ message: 'Maintenance record deleted' });
});
