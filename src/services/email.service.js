import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === "true" || false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

export const sendVerificationEmail = async (email, nombre, token) => {
  const frontUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const verificationLink = `${frontUrl}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"ScrumTrack" <${process.env.SMTP_USER || "no-reply@scrumtrack.com"}>`,
    to: email,
    subject: "Verifica tu cuenta en ScrumTrack",
    html: `
      <h2>Hola, ${nombre}</h2>
      <p>Gracias por registrarte en ScrumTrack. Por favor, verifica tu correo electrónico para activar tu cuenta haciendo clic en el botón de abajo:</p>
      <div style="margin: 30px 0;">
        <a href="${verificationLink}" style="padding: 14px 24px; background-color: #39a900; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Verificar correo electrónico</a>
      </div>
      <p>Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:</p>
      <p><a href="${verificationLink}">${verificationLink}</a></p>
      <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
      <p style="font-size: 12px; color: #666;">Si no creaste una cuenta en ScrumTrack, puedes ignorar este correo de forma segura.</p>
    `,
  };

  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("⚠️ Advertencia: Credenciales SMTP no configuradas. Simulación de correo en consola.");
      console.warn("Enlace de verificación generado:", verificationLink);
      return; // Fallback for development if no smtp is set
    }
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error al enviar email de verificación:", error);
    throw new Error("No se pudo enviar el correo de verificación");
  }
};

export const sendPasswordResetEmail = async (email, token) => {
  const frontUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetLink = `${frontUrl}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"ScrumTrack" <${process.env.SMTP_USER || "no-reply@scrumtrack.com"}>`,
    to: email,
    subject: "Recuperación de contraseña en ScrumTrack",
    html: `
      <h2>Recuperación de Contraseña</h2>
      <p>Has solicitado restablecer tu contraseña de ScrumTrack. Haz clic en el botón de abajo para crear una nueva contraseña:</p>
      <div style="margin: 30px 0;">
        <a href="${resetLink}" style="padding: 14px 24px; background-color: #39a900; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Restablecer contraseña</a>
      </div>
      <p>Si no solicitaste este cambio, puedes ignorar este correo y tu contraseña actual seguirá funcionando.</p>
      <p>O usa este enlace directo: <br/><a href="${resetLink}">${resetLink}</a></p>
    `,
  };

  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("⚠️ Advertencia: Credenciales SMTP no configuradas. Simulación de correo en consola.");
      console.warn("Enlace de recuperación generado:", resetLink);
      return;
    }
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error al enviar email de recuperación:", error);
    throw new Error("No se pudo enviar el correo de recuperación");
  }
};
