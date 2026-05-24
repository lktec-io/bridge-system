import asyncHandler from '../utils/asyncHandler.js';
import * as inspectionService from '../services/inspectionService.js';
import { createNotification } from '../services/notificationService.js';

export const getAllInspections = asyncHandler(async (req, res) => {
  const inspections = await inspectionService.getAllInspections(req.query);
  res.json(inspections);
});

export const getInspectionById = asyncHandler(async (req, res) => {
  const inspection = await inspectionService.getInspectionById(Number(req.params.id));
  if (!inspection) return res.status(404).json({ message: 'Inspection not found' });
  res.json(inspection);
});

export const createInspection = asyncHandler(async (req, res) => {
  if (!req.body.bridgeId || !req.body.inspectionDate || !req.body.conditionStatus) {
    return res.status(400).json({ message: 'bridgeId, inspectionDate, and conditionStatus are required' });
  }
  const inspection = await inspectionService.createInspection(req.body, req.user?.id);
  if (inspection.conditionStatus === 'POOR') {
    const serial = inspection.bridge?.serialNumber ?? `Bridge #${inspection.bridgeId}`;
    createNotification(
      'INSPECTION_POOR',
      'Critical inspection result',
      `${serial} rated POOR — urgent maintenance required`,
      'bridge',
      inspection.bridgeId
    ).catch(() => {});
  }
  res.status(201).json(inspection);
});

export const updateInspection = asyncHandler(async (req, res) => {
  const inspection = await inspectionService.updateInspection(
    Number(req.params.id), req.body, req.user?.id
  );
  if (!inspection) return res.status(404).json({ message: 'Inspection not found' });
  res.json(inspection);
});

export const resolveInspection = asyncHandler(async (req, res) => {
  const resolvedBy = req.body.resolvedBy ||
    `${req.user.firstName} ${req.user.lastName}`;
  const inspection = await inspectionService.resolveInspection(
    Number(req.params.id), resolvedBy, req.user?.id
  );
  if (!inspection) return res.status(404).json({ message: 'Inspection not found' });
  const serial = inspection.bridge?.serialNumber ?? `Bridge #${inspection.bridgeId}`;
  createNotification(
    'INSPECTION_RESOLVED',
    'Defect resolved',
    `Reported defect on ${serial} has been marked as resolved`,
    'bridge',
    inspection.bridgeId
  ).catch(() => {});
  res.json(inspection);
});

export const deleteInspection = asyncHandler(async (req, res) => {
  await inspectionService.deleteInspection(Number(req.params.id));
  res.json({ message: 'Inspection deleted' });
});
