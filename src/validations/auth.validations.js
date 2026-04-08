import { validatePassword } from "../utils/password.utils.js";
import { validateEmail, validateString } from "../utils/validators.js";

export const validateRegister = (email, nombre, password, confirmPassword) => {
  const errors = {};

  if (!validateEmail(email)) {
    errors.email = "Email inválido";
  }

  if (!validateString(nombre, 3, 100)) {
    errors.nombre = "Nombre debe tener entre 3 y 100 caracteres";
  }

  if (!validatePassword(password)) {
    errors.password =
      "Contraseña debe tener mínimo 8 caracteres, 1 mayúscula y 1 número";
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateLogin = (email, password) => {
  const errors = {};

  if (!validateEmail(email)) {
    errors.email = "Email inválido";
  }

  if (!validateString(password, 1)) {
    errors.password = "Contraseña requerida";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateProfileUpdate = ({ email, nombre, password }) => {
  const errors = {};

  if (email && !validateEmail(email)) {
    errors.email = "Email inválido";
  }

  if (nombre && !validateString(nombre, 3, 100)) {
    errors.nombre = "Nombre debe tener entre 3 y 100 caracteres";
  }

  if (password && !validatePassword(password)) {
    errors.password =
      "Contraseña debe tener mínimo 8 caracteres, 1 mayúscula y 1 número";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
