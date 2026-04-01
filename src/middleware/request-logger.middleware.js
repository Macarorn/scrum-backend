export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const userId = req.user?.id_usuario || req.user?.id || "anonymous";
    const ip = req.ip || req.connection.remoteAddress;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - user:${userId} - ip:${ip}`,
    );
  });

  next();
};
