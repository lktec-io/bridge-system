import asyncHandler from '../utils/asyncHandler.js';
import * as sensorService from '../services/sensorService.js';

export const getDevices = asyncHandler(async (req, res) => {
  const devices = await sensorService.listDevices(req.query);
  res.json(devices);
});

export const getSummary = asyncHandler(async (_req, res) => {
  const summary = await sensorService.getSensorSummary();
  res.json(summary);
});

export const createDevice = asyncHandler(async (req, res) => {
  const { bridgeId, deviceCode, sensorType } = req.body;
  if (!bridgeId || !deviceCode || !sensorType) {
    return res.status(400).json({ message: 'bridgeId, deviceCode and sensorType are required' });
  }
  const device = await sensorService.createDevice(req.body);
  res.status(201).json(device);
});

export const deleteDevice = asyncHandler(async (req, res) => {
  const removed = await sensorService.deleteDevice(Number(req.params.id));
  if (!removed) return res.status(404).json({ message: 'Sensor device not found' });
  res.json({ message: 'Sensor device deleted' });
});

export const getReadings = asyncHandler(async (req, res) => {
  const readings = await sensorService.getDeviceReadings(Number(req.params.id), req.query);
  res.json(readings);
});

/**
 * Telemetry ingest.
 *
 * NOTE: this endpoint currently sits behind the same operator JWT as the rest
 * of the API. Field gateways should not carry operator credentials — see the
 * architecture report ("Sensor ingest authentication") for the device-key
 * scheme that should replace this before real hardware is connected.
 */
export const postReading = asyncHandler(async (req, res) => {
  const { deviceCode, value, recordedAt } = req.body;

  if (!deviceCode || value === undefined || value === null || value === '') {
    return res.status(400).json({ message: 'deviceCode and value are required' });
  }
  if (Number.isNaN(Number(value))) {
    return res.status(400).json({ message: 'value must be numeric' });
  }

  const reading = await sensorService.ingestReading({ deviceCode, value, recordedAt });
  if (!reading) return res.status(404).json({ message: `Unknown device code: ${deviceCode}` });

  res.status(201).json(reading);
});
