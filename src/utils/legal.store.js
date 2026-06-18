import pool from "./database.js";

const defaultTermsContent = `SCRUM APP
Sistema de Gestión de Proyectos Ágiles

TÉRMINOS Y CONDICIONES
Scrum App — Plataforma de Gestión de Proyectos
Versión: v1.0
Fecha de vigencia: Mayo 2026
Idioma: Español
Documento generado para uso académico — Proyecto universitario de gestión Scrum

1. Introducción
Bienvenido a Scrum App, una plataforma digital de gestión de proyectos basada en la metodología ágil Scrum. Este sistema ha sido desarrollado como proyecto universitario con el propósito de facilitar la planificación, ejecución y seguimiento de proyectos de software mediante las buenas prácticas del desarrollo ágil. Los presentes Términos y Condiciones (en adelante, los Términos) regulan el acceso y uso de la plataforma Scrum App, incluyendo todas sus funcionalidades, módulos e interfaces disponibles para los usuarios registrados. Al utilizar Scrum App, el usuario manifiesta haber leído, comprendido y aceptado en su totalidad los presentes Términos y Condiciones. Si el usuario no está de acuerdo con alguna de las disposiciones aquí establecidas, deberá abstenerse de utilizar la plataforma.

2. Aceptación de Términos
El acceso y uso de Scrum App están condicionado a la aceptación expresa de los presentes Términos por parte del usuario. Esta aceptación se formaliza mediante:
• El marcado del casillero de verificación (checkbox) de aceptación durante el proceso de registro en la plataforma.
• El inicio de sesión y uso continuado de la plataforma tras el registro.
• La utilización de cualquier funcionalidad del sistema.

⚠ Consentimiento Explícito Requerido: Durante el proceso de registro, el usuario debe marcar de forma activa el checkbox de aceptación de estos Términos y Condiciones. Este acto constituye su consentimiento expreso, libre e informado para el tratamiento de sus datos personales y el uso de la plataforma, conforme a lo establecido en la presente política. La aceptación de los Términos implica también la aceptación de la Política de Tratamiento de Datos Personales descrita en la Sección 5 de este documento. Ningún usuario podrá alegar desconocimiento de las condiciones aquí establecidas una vez completado el proceso de registro.

3. Uso de la Plataforma
3.1 Funcionalidades Disponibles
Scrum App ofrece a sus usuarios las siguientes funcionalidades principales:
• Registro e inicio de sesión con autenticación de cuenta personal.
• Creación y gestión de proyectos bajo la metodología Scrum.
• Definición y administración de épicas, historias de usuario y tareas.
• Asignación de usuarios a proyectos y tareas específicas.
• Gestión de roles dentro de cada proyecto: Product Owner, Scrum Master y Developer.
• Planificación y seguimiento de sprints y backlog del producto.
• Uso del tablero Kanban para visualizar el estado de las tareas.
• Sistema de comentarios en tareas para la comunicación del equipo.
• Visualización del progreso individual y colectivo del equipo de trabajo.

3.2 Uso Permitido
El usuario se compromete a utilizar la plataforma exclusivamente para fines lícitos, académicos y/o profesionales relacionados con la gestión ágil de proyectos. Queda expresamente prohibido:
• Utilizar la plataforma para actividades ilícitas, fraudulentas o contrarias a la ética.
• Intentar acceder de forma no autorizada a cuentas, datos o sistemas ajenos.
• Publicar contenido ofensivo, discriminatorio, difamatorio o que vulnere derechos de terceros.
• Reproducir, distribuir o comercializar el software o sus componentes sin autorización.
• Realizar ingeniería inversa, descompilación o alteración del código fuente de la plataforma.
• Sobrecargar intencionalmente los servidores o infraestructura técnica del sistema.

4. Registro de Usuarios
4.1 Proceso de Registro
Para acceder a las funcionalidades de Scrum App, el usuario debe completar el proceso de registro proporcionando información veraz, actualizada y completa.

• Nombre completo (obligatorio)
• Correo electrónico (obligatorio)
• Teléfono (opcional)
• Ciudad (obligatorio)
• Contraseña (obligatorio)

4.2 Responsabilidad del Registro
El usuario garantiza que la información es verídica. Scrum App no se responsabiliza por datos falsos.

4.3 Roles
• Product Owner
• Scrum Master
• Developer

5. Tratamiento de Datos Personales
• Nombre
• Correo
• Teléfono
• Ciudad
• Actividad del sistema

5.2 Finalidad
• Autenticación
• Gestión de proyectos
• Roles
• Métricas académicas
• Notificaciones
• Mejora del sistema

5.3 Consentimiento
Aceptación mediante checkbox.

5.4 Conservación
30 días tras eliminación.

5.5 Seguridad
Medidas técnicas razonables.

5.6 Derechos
Acceso, corrección, eliminación, retiro de consentimiento.

6. Responsabilidades del Usuario
• Uso correcto del sistema
• Seguridad de credenciales
• Actividad en la cuenta
• Notificación de accesos no autorizados

7. Seguridad de la Cuenta
• Contraseña segura
• No compartir credenciales
• Cerrar sesión
• Reportar accesos sospechosos

8. Propiedad de la Plataforma
Scrum App es académico. Código y diseño pertenecen a desarrolladores.

9. Modificaciones
Aviso en plataforma y correo.

10. Contacto
soporte@scrumapp.edu
privacidad@scrumapp.edu

Scrum App — v1.0 Mayo 2026`;



export const insertLegalTermsVersion = async ({
  version,
  title,
  content,
  is_active = 0,
}) => {
  await pool.query(
    `INSERT INTO legal_terms_versions (version, title, content, is_active) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content), is_active = VALUES(is_active)`,
    [version, title, content, is_active ? 1 : 0],
  );
};

export const findActiveLegalVersion = async () => {
  const [rows] = await pool.query(
    `SELECT version, title, content FROM legal_terms_versions WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1`,
  );
  return rows[0] || null;
};

export const findLegalVersion = async (version) => {
  const [rows] = await pool.query(
    `SELECT version, title, content FROM legal_terms_versions WHERE version = ? LIMIT 1`,
    [version],
  );
  return rows[0] || null;
};

export const insertUserConsent = async ({
  userId = null,
  consentVersion,
  accepted,
  ipAddress,
  userAgent,
  consentAt = new Date(),
}) => {
  await pool.query(
    `INSERT INTO user_consents (id_usuario, consent_version, accepted, consent_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      consentVersion,
      accepted ? 1 : 0,
      consentAt,
      ipAddress,
      userAgent?.slice(0, 512) || null,
    ],
  );
};

export const getLatestUserConsent = async (userId) => {
  const [rows] = await pool.query(
    `SELECT id_consent, id_usuario, consent_version, accepted, consent_at, ip_address, user_agent, created_at FROM user_consents WHERE id_usuario = ? ORDER BY consent_at DESC LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
};
