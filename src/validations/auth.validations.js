import { validateEmail, validateString } from "../utils/validators.js";
import { validatePassword } from "../utils/password.utils.js";

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
      "Contraseña debe tener mín 8 caracteres, 1 mayúscula, 1 número y 1 símbolo";
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
