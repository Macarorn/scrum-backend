import { hashPassword } from "./password.utils.js";
import pool from "./database.js";

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

const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

const getRoleById = (idRol) =>
  roles.find((role) => role.id_rol === Number(idRol));

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
  const role = getRoleById(id_rol);
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
};

export const createUser = async ({
  nombre,
  email,
  password,
  telefono = null,
  ciudad = null,
  id_rol = 2,
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

  // Insertar usuario
  const [result] = await pool.query(
    "INSERT INTO usuario (email, password, nombre, telefono, ciudad) VALUES (?, ?, ?, ?, ?)",
    [email.toLowerCase(), passwordHash, nombre, telefono, ciudad]
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

export const listUsers = async () => {
  const [rows] = await pool.query("SELECT * FROM usuario WHERE activo = 1");
  return rows.map(sanitizeUser);
};

export const updateUser = async (id, payload) => {
  const user = users.find((u) => u.id_usuario === Number(id));
  if (!user) return null;

  if (payload.email && payload.email.toLowerCase() !== user.email) {
    const emailExists = users.some(
      (u) =>
        u.email === payload.email.toLowerCase() &&
        u.id_usuario !== user.id_usuario,
    );
    if (emailExists) {
      const error = new Error("El email ya se encuentra registrado");
      error.statusCode = 409;
      error.error = "EMAIL_ALREADY_EXISTS";
      error.details = { email: payload.email };
      throw error;
    }
    user.email = payload.email.toLowerCase();
  }

  if (payload.nombre) user.nombre = payload.nombre;
  if (payload.telefono !== undefined) user.telefono = payload.telefono;
  if (payload.ciudad !== undefined) user.ciudad = payload.ciudad;

  if (payload.passwordHash) user.passwordHash = payload.passwordHash;

  if (payload.id_rol) {
    const role = getRoleById(payload.id_rol);
    if (!role) {
      const error = new Error("Rol no valido");
      error.statusCode = 400;
      error.error = "INVALID_ROLE";
      error.details = { id_rol: payload.id_rol };
      throw error;
    }

    user.roles = [role];
    user.permisos = getPermissionsForRole(role.nombre_rol);
    user.rol_principal = role.nombre_rol;
  }

  user.fecha_actualizacion = new Date().toISOString();
  return sanitizeUser(user);
};

export const deleteUser = async (id) => {
  const index = users.findIndex((u) => u.id_usuario === Number(id));
  if (index === -1) return false;

  users.splice(index, 1);
  return true;
};

export const setUserRole = async (id, id_rol) => {
  const role = getRoleById(id_rol);
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
  return roles;
};

export const listPermissions = async () => {
  return permisos;
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
