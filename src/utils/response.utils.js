export const sendSuccess = (
  res,
  data,
  message = "Operación exitosa",
  status = 200,
) => {
  return res.status(status).json({
    success: true,
    data,
    message,
  });
};

export const buildError = (
  message,
  { statusCode = 500, error = "INTERNAL_ERROR", details = {} } = {},
) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.error = error;
  err.details = details;
  return err;
};
