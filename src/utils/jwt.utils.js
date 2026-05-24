import jwt from "jsonwebtoken";
import config from "../config/config.js";

export const generateToken = (idUsuario, email, rol, permisos = []) => {
  return jwt.sign(
    { id_usuario: idUsuario, email, rol, permisos },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expire,
    },
  );
};

export const generateRefreshToken = (idUsuario) => {
  return jwt.sign({ id_usuario: idUsuario }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpire,
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (error) {
    return null;
  }
};
