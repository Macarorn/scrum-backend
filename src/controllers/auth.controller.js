export const register = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Endpoint de registro (en desarrollo)",
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Endpoint de login (en desarrollo)",
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logout exitoso",
    });
  } catch (error) {
    next(error);
  }
};
