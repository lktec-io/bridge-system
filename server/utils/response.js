export const sendSuccess = (res, data, status = 200) =>
  res.status(status).json(data);

export const sendError = (res, message, status = 400) =>
  res.status(status).json({ message });
