import { buildError, sendSuccess } from "../utils/response.utils.js";
import {
  findActiveLegalVersion,
  findLegalVersion,
  insertUserConsent,
} from "../utils/legal.store.js";

export const getTerms = async (req, res, next) => {
  try {
    const terms = await findActiveLegalVersion();

    if (!terms) {
      return next(
        buildError("No existe una versión activa de términos", {
          statusCode: 500,
          error: "TERMS_NOT_FOUND",
        }),
      );
    }

    return sendSuccess(
      res,
      {
        version: terms.version,
        title: terms.title,
        content: terms.content,
      },
      "Términos obtenidos correctamente",
    );
  } catch (error) {
    next(error);
  }
};

export const acceptTerms = async (req, res, next) => {
  try {
    const { accepted, version } = req.body;

    if (accepted !== true) {
      return next(
        buildError("Debes aceptar los términos y condiciones", {
          statusCode: 400,
          error: "CONSENT_REQUIRED",
          details: { accepted: "El consentimiento es obligatorio" },
        }),
      );
    }

    if (!version) {
      return next(
        buildError("Versión de términos requerida", {
          statusCode: 400,
          error: "VERSION_REQUIRED",
          details: { version: "La versión de los términos es obligatoria" },
        }),
      );
    }

    const legalVersion = await findLegalVersion(version);
    if (!legalVersion) {
      return next(
        buildError("Versión de términos inválida", {
          statusCode: 400,
          error: "INVALID_CONSENT_VERSION",
          details: { version },
        }),
      );
    }

    const ipAddress =
      (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();
    const userAgent = req.headers["user-agent"] || null;

    await insertUserConsent({
      userId: null,
      consentVersion: version,
      accepted: true,
      ipAddress,
      userAgent,
    });

    return sendSuccess(res, null, "Consentimiento registrado correctamente");
  } catch (error) {
    next(error);
  }
};
