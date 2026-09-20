import asyncHandler from '../utils/asyncHandler.js';
import * as inspectionService from '../services/inspectionService.js';
import { createNotification } from '../services/notificationService.js';

/**
 * Notifications are side effects, not part of the write. They are dispatched
 * AFTER the transaction commits and never block the response — but failures
 * are logged loudly. Silently swallowing them is what hid the notification
 * schema mismatch for so long.
 */
function notify(type, title, message, entityType, entityId) {
  createNotification(type, title, message, entityType, entityId).catch((err) =>
    console.error(`[notify] ${type} failed for ${entityType} ${entityId}: ${err.message}`)
  );
}

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
  const { bridgeId, inspectionDate, conditionStatus } = req.body;

  if (!bridgeId || !inspectionDate || !conditionStatus) {
    return res.status(400).json({ message: 'bridgeId, inspectionDate, and conditionStatus are required' });
  }
  if (!['GOOD', 'FAIR', 'POOR'].includes(String(conditionStatus).toUpperCase())) {
    return res.status(400).json({ message: 'conditionStatus must be GOOD, FAIR or POOR' });
  }

  const inspection = await inspectionService.createInspection(req.body, req.user?.id);

  if (inspection.conditionStatus === 'POOR') {
    const serial = inspection.bridge?.serialNumber ?? `Bridge #${inspection.bridgeId}`;
    notify(
      'INSPECTION_POOR',
      'Critical inspection result',
      `${serial} rated POOR — urgent maintenance required`,
      'bridge',
      inspection.bridgeId
    );
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

/**
 * Defect sign-off. Each outcome is a real business state, mapped to the
 * status code a client can act on:
 *
 *   404 inspection does not exist
 *   422 nothing to approve — no defect was recorded
 *   403 self-approval blocked (non-admin)
 *   409 already signed off — idempotent no-op, returns the existing record
 *   200 approved
 */
export const resolveInspection = asyncHandler(async (req, res) => {
  const resolvedBy = req.body.resolvedBy || `${req.user.firstName} ${req.user.lastName}`;

  const result = await inspectionService.resolveInspection(Number(req.params.id), {
    resolvedBy,
    actorId:   req.user?.id,
    actorRole: req.user?.role,
  });

  if (result.status === 'not_found') {
    return res.status(404).json({ message: 'Inspection not found' });
  }
  if (result.status === 'no_defect') {
    return res.status(422).json({
      message:    'This inspection records no defect, so there is nothing to approve',
      inspection: result.inspection,
    });
  }
  if (result.status === 'self_approval') {
    return res.status(403).json({
      message: 'You cannot approve a defect you recorded. Ask another engineer or an administrator to sign it off.',
    });
  }
  if (result.status === 'already_resolved') {
    return res.status(409).json({
      message: result.inspection?.resolvedBy
        ? `Already signed off by ${result.inspection.resolvedBy}`
        : 'This defect has already been signed off',
      inspection: result.inspection,
    });
  }

  const serial = result.inspection.bridge?.serialNumber ?? `Bridge #${result.inspection.bridgeId}`;
  notify(
    'INSPECTION_RESOLVED',
    'Defect resolved',
    `Reported defect on ${serial} has been signed off by ${resolvedBy}`,
    'bridge',
    result.inspection.bridgeId
  );

  res.json(result.inspection);
});

export const deleteInspection = asyncHandler(async (req, res) => {
  const removed = await inspectionService.deleteInspection(Number(req.params.id), req.user?.id);
  if (!removed) return res.status(404).json({ message: 'Inspection not found' });
  res.json({ message: 'Inspection deleted' });
});
