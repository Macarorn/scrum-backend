import validator from "validator";

export const validateEmail = (email) => {
  return validator.isEmail(email);
};

export const validateString = (str, minLength = 1, maxLength = 255) => {
  return (
    typeof str === "string" &&
    str.length >= minLength &&
    str.length <= maxLength
  );
};

export const validateNumber = (num, min = 0, max = 999999) => {
  return typeof num === "number" && num >= min && num <= max;
};

export const validateEnum = (value, allowedValues) => {
  return allowedValues.includes(value);
};
