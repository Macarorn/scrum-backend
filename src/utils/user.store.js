import { promises as fs } from "fs";
import path from "path";
import { hashPassword } from "./password.utils.js";
import pool from "./database.js";
import config from "../config/config.js";

const roles = [
  { id_rol: 1, nombre_rol: "admin", descripcion: "Acceso total al sistema" },
  { id_rol: 2, nombre_rol: "usuario", descripcion: "Acceso estandar" },
  {
    id_rol: 3,
    nombre_rol: "Product Owner",
    descripcion: "Gestiona backlog y prioridades del producto",
  },
  {
    id_rol: 4,
    nombre_rol: "Scrum Master",
    descripcion: "Facilita el proceso Scrum del equipo",
  },
  {
    id_rol: 5,
    nombre_rol: "Developer",
    descripcion: "Implementa tareas tecnicas del sprint",
  },
];

const permisos = [
  { id_permiso: 1, nombre: "usuarios:read", descripcion: "Listar usuarios" },
  {
    id_permiso: 2,
    nombre: "usuarios:update",
    descripcion: "Actualizar usuarios",
  },
  {
    id_permiso: 3,
    nombre: "usuarios:delete",
    descripcion: "Eliminar usuarios",
  },
  { id_permiso: 4, nombre: "roles:assign", descripcion: "Asignar roles" },
  {
    id_permiso: 5,
    nombre: "perfil:update",
    descripcion: "Actualizar perfil propio",
  },
  { id_permiso: 6, nombre: "roles:read", descripcion: "Listar roles" },
  { id_permiso: 7, nombre: "permisos:read", descripcion: "Listar permisos" },
];

const rolePermissions = {
  admin: permisos.map((p) => p.nombre),
  usuario: ["perfil:update"],
  "Product Owner": ["perfil:update"],
  "Scrum Master": ["perfil:update"],
  Developer: ["perfil:update"],
};

const users = [];
const refreshTokens = new Set();
let userIdSequence = 1;

const DATA_DIR = path.resolve(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

const isTestEnv = () => config.server.nodeEnv === "test";

const ensureDataDir = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
};

const persistUsers = async () => {
  if (isTestEnv()) return;
  await ensureDataDir();
  const payload = {
    userIdSequence,
    users,
  };
  await fs.writeFile(USERS_FILE, JSON.stringify(payload, null, 2), "utf-8");
};

const loadUsers = async () => {
  if (isTestEnv()) return false;

  try {
    const raw = await fs.readFile(USERS_FILE, "utf-8");
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed.users)) {
      users.splice(0, users.length, ...parsed.users);
      userIdSequence = parsed.userIdSequence || users.length + 1;
      return true;
    }
  } catch (error) {
    return false;
  }

  return false;
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

const getRoleById = async (idRol) => {
  const [rows] = await pool.query(
    "SELECT id_rol, nombre_rol, descripcion FROM rol WHERE id_rol = ?",
    [Number(idRol)],
  );
  return rows.length ? rows[0] : null;
};

const getPermissionsForRole = (roleName) =>
  permisos.filter((permiso) =>
    rolePermissions[roleName]?.includes(permiso.nombre),
  );

const buildUser = async ({
  nombre,
  email,
  password,
  telefono = null,
  ciudad = null,
  id_rol = 2,
}) => {
  const role = await getRoleById(id_rol);
  if (!role) {
    const error = new Error("Rol no valido");
    error.statusCode = 400;
    error.error = "INVALID_ROLE";
    error.details = { id_rol };
    throw error;
  }

  const now = new Date().toISOString();
  return {
    id_usuario: userIdSequence++,
    nombre,
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    telefono,
    ciudad,
    activo: true,
    fecha_registro: now,
    fecha_actualizacion: now,
    roles: [role],
    permisos: getPermissionsForRole(role.nombre_rol),
    rol_principal: role.nombre_rol,
  };
};

export const bootstrapStore = async () => {
  if (users.length > 0) return;

  const loaded = await loadUsers();
  if (loaded) return;

  const admin = await buildUser({
    nombre: "Admin",
    email: "admin@scrum.local",
    password: "Admin1234",
    id_rol: 1,
  });

  const productOwner = await buildUser({
    nombre: "Sofia Product Owner",
    email: "sofia@scrum.local",
    password: "Sofia1234",
    id_rol: 3,
  });

  const scrumMaster = await buildUser({
    nombre: "Mariana Scrum Master",
    email: "mariana@scrum.local",
    password: "Mariana1234",
    id_rol: 4,
  });

  users.push(admin);
  users.push(productOwner);
  users.push(scrumMaster);

  await persistUsers();
};

export const createUser = async ({
  nombre,
  email,
  password,
  telefono = null,
  ciudad = null,
  id_rol = 2,
  consent_granted = false,
  consent_version = "v1.0",
  rol_plataforma = null,
}) => {
  // Verificar si el email ya existe
  const [existing] = await pool.query("SELECT id_usuario FROM usuario WHERE email = ?", [email.toLowerCase()]);
  if (existing.length > 0) {
    const error = new Error("El email ya se encuentra registrado");
    error.statusCode = 409;
    error.error = "EMAIL_ALREADY_EXISTS";
    error.details = { email };
    throw error;
  }

  // Hashear la contraseña
  const passwordHash = await hashPassword(password);

  // Calcular fecha actual para consent_at
  const consentAt = consent_granted ? new Date() : null;

  // Insertar usuario con campos de consentimiento y rol_plataforma
  const [result] = await pool.query(
    "INSERT INTO usuario (email, password, nombre, telefono, ciudad, consent_granted, consent_at, consent_version, rol_plataforma) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [email.toLowerCase(), passwordHash, nombre, telefono, ciudad, consent_granted ? 1 : 0, consentAt, consent_version, rol_plataforma]
  );

  const userId = result.insertId;

  // Asignar rol por defecto
  await pool.query("INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)", [userId, id_rol]);

  // Obtener el usuario completo
  const user = await findUserWithSecretById(userId);
  return sanitizeUser(user);
};

export const findUserByEmail = async (email) => {
  const user = await findUserWithSecretByEmail(email);
  return user ? sanitizeUser(user) : null;
};

export const findUserWithSecretByEmail = async (email) => {
  const [rows] = await pool.query(`
    SELECT u.*, r.nombre_rol as rol_principal
    FROM usuario u
    LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
    LEFT JOIN rol r ON ur.id_rol = r.id_rol
    WHERE u.email = ? AND u.activo = 1
  `, [email.toLowerCase()]);

  if (rows.length === 0) return null;

  const user = rows[0];
  // Obtener permisos
  const [permisosRows] = await pool.query(`
    SELECT p.nombre
    FROM permiso p
    JOIN rol_permiso rp ON p.id_permiso = rp.id_permiso
    JOIN usuario_rol ur ON rp.id_rol = ur.id_rol
    WHERE ur.id_usuario = ?
  `, [user.id_usuario]);

  user.permisos = permisosRows;
  user.passwordHash = user.password; // Renombrar para consistencia
  return user;
};

export const findUserById = async (id) => {
  const user = await findUserWithSecretById(id);
  return user ? sanitizeUser(user) : null;
};

export const findUserWithSecretById = async (id) => {
  const [rows] = await pool.query(`
    SELECT u.*, r.nombre_rol as rol_principal
    FROM usuario u
    LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
    LEFT JOIN rol r ON ur.id_rol = r.id_rol
    WHERE u.id_usuario = ? AND u.activo = 1
  `, [id]);

  if (rows.length === 0) return null;

  const user = rows[0];
  // Obtener permisos
  const [permisosRows] = await pool.query(`
    SELECT p.nombre
    FROM permiso p
    JOIN rol_permiso rp ON p.id_permiso = rp.id_permiso
    JOIN usuario_rol ur ON rp.id_rol = ur.id_rol
    WHERE ur.id_usuario = ?
  `, [user.id_usuario]);

  user.permisos = permisosRows;
  user.passwordHash = user.password;
  return user;
};

export const listUsers = async (searchTerm = "") => {
  const trimmed = String(searchTerm || "").trim().toLowerCase();
  let query = "SELECT * FROM usuario WHERE activo = 1";
  const params = [];

  if (trimmed) {
    query += " AND (LOWER(email) LIKE ? OR LOWER(nombre) LIKE ?);";
    const like = `%${trimmed}%`;
    params.push(like, like);
  }

  const [rows] = await pool.query(query, params);
  return rows.map(sanitizeUser);
};

export const updateUser = async (id, payload) => {
  const userId = Number(id);
  const [existingRows] = await pool.query(
    "SELECT id_usuario FROM usuario WHERE id_usuario = ?",
    [userId],
  );
  if (existingRows.length === 0) return null;

  const updates = [];
  const params = [];

  if (payload.email) {
    const [emailRows] = await pool.query(
      "SELECT id_usuario FROM usuario WHERE email = ? AND id_usuario <> ?",
      [payload.email.toLowerCase(), userId],
    );
    if (emailRows.length > 0) {
      const error = new Error("El email ya se encuentra registrado");
      error.statusCode = 409;
      error.error = "EMAIL_ALREADY_EXISTS";
      error.details = { email: payload.email };
      throw error;
    }
    updates.push("email = ?");
    params.push(payload.email.toLowerCase());
  }

  if (payload.nombre !== undefined) {
    updates.push("nombre = ?");
    params.push(payload.nombre);
  }

  if (payload.telefono !== undefined) {
    updates.push("telefono = ?");
    params.push(payload.telefono);
  }

  if (payload.ciudad !== undefined) {
    updates.push("ciudad = ?");
    params.push(payload.ciudad);
  }

  if (payload.passwordHash !== undefined) {
    updates.push("password = ?");
    params.push(payload.passwordHash);
  }

  if (updates.length > 0) {
    updates.push("fecha_actualizacion = NOW()");
    const sql = `UPDATE usuario SET ${updates.join(", ")} WHERE id_usuario = ?`;
    await pool.query(sql, [...params, userId]);
  }

  if (payload.id_rol) {
    const role = await getRoleById(payload.id_rol);
    if (!role) {
      const error = new Error("Rol no valido");
      error.statusCode = 400;
      error.error = "INVALID_ROLE";
      error.details = { id_rol: payload.id_rol };
      throw error;
    }

    await pool.query(
      "DELETE FROM usuario_rol WHERE id_usuario = ?",
      [userId],
    );
    await pool.query(
      "INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)",
      [userId, payload.id_rol],
    );
  }

  return await findUserWithSecretById(userId);
};

export const deleteUser = async (id) => {
  const userId = Number(id);
  const [result] = await pool.query(
    "DELETE FROM usuario WHERE id_usuario = ?",
    [userId],
  );

  return result.affectedRows > 0;
};

export const setUserRole = async (id, id_rol) => {
  const role = await getRoleById(id_rol);
  if (!role) {
    const error = new Error("Rol no valido");
    error.statusCode = 400;
    error.error = "INVALID_ROLE";
    error.details = { id_rol };
    throw error;
  }

  return updateUser(id, { id_rol: role.id_rol });
};

export const listRoles = async () => {
  const [rows] = await pool.query(
    "SELECT id_rol, nombre_rol, descripcion FROM rol ORDER BY id_rol",
  );
  return rows;
};

export const listPermissions = async () => {
  return permisos;
};

export const createRole = async ({ nombre_rol, descripcion = null }) => {
  if (!nombre_rol || !String(nombre_rol).trim()) {
    const error = new Error('Nombre de rol requerido');
    error.statusCode = 400;
    throw error;
  }

  const [existing] = await pool.query(
    'SELECT id_rol FROM rol WHERE LOWER(nombre_rol) = LOWER(?)',
    [String(nombre_rol).trim()],
  );

  if (existing.length) {
    const error = new Error('Ya existe un rol con ese nombre');
    error.statusCode = 409;
    throw error;
  }

  const [result] = await pool.query(
    'INSERT INTO rol (nombre_rol, descripcion) VALUES (?, ?)',
    [String(nombre_rol).trim(), descripcion],
  );

  const [rows] = await pool.query('SELECT id_rol, nombre_rol, descripcion FROM rol WHERE id_rol = ?', [result.insertId]);
  return rows.length ? rows[0] : null;
};

export const storeRefreshToken = async (token) => {
  refreshTokens.add(token);
};

export const hasRefreshToken = async (token) => {
  return refreshTokens.has(token);
};

export const revokeRefreshToken = async (token) => {
  refreshTokens.delete(token);
};
