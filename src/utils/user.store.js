import { promises as fs } from "fs";
import path from "path";
import { hashPassword } from "./password.utils.js";

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

const isTestEnv = () => process.env.NODE_ENV === "test";

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
}) => {
  const exists = users.some((u) => u.email === email.toLowerCase());
  if (exists) {
    const error = new Error("El email ya se encuentra registrado");
    error.statusCode = 409;
    error.error = "EMAIL_ALREADY_EXISTS";
    error.details = { email };
    throw error;
  }

  const user = await buildUser({
    nombre,
    email,
    password,
    telefono,
    ciudad,
    id_rol,
  });
  users.push(user);

  await persistUsers();

  return sanitizeUser(user);
};

export const findUserByEmail = async (email) => {
  const user = users.find((u) => u.email === email.toLowerCase());
  return user ? sanitizeUser(user) : null;
};

export const findUserWithSecretByEmail = async (email) => {
  return users.find((u) => u.email === email.toLowerCase()) || null;
};

export const findUserById = async (id) => {
  const user = users.find((u) => u.id_usuario === Number(id));
  return user ? sanitizeUser(user) : null;
};

export const findUserWithSecretById = async (id) => {
  return users.find((u) => u.id_usuario === Number(id)) || null;
};

export const listUsers = async () => {
  return users.map(sanitizeUser);
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
  await persistUsers();
  return sanitizeUser(user);
};

export const deleteUser = async (id) => {
  const index = users.findIndex((u) => u.id_usuario === Number(id));
  if (index === -1) return false;

  users.splice(index, 1);
  await persistUsers();
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
