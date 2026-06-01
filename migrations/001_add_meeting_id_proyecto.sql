-- Migración segura: Añade columna id_proyecto a la tabla meeting y un índice.
-- Revise antes de ejecutar en producción y haga backup de la base de datos.

START TRANSACTION;

-- 1) Añadir columna si no existe
ALTER TABLE meeting
  ADD COLUMN IF NOT EXISTS id_proyecto INT NULL;

-- 2) Crear índice para mejorar consultas por proyecto
CREATE INDEX IF NOT EXISTS idx_project_meeting ON meeting (id_proyecto);

-- 3) (Opcional) Añadir clave foránea si la tabla proyecto existe y las filas actuales son consistentes
-- Verifique que todos los id_proyecto existentes en meeting correspondan a proyectos válidos antes de descomentar.
-- ALTER TABLE meeting
--   ADD CONSTRAINT fk_meeting_proyecto FOREIGN KEY (id_proyecto)
--   REFERENCES proyecto(id_proyecto) ON DELETE CASCADE;

COMMIT;

-- Nota: Algunas versiones de MySQL/MariaDB no soportan IF NOT EXISTS en ALTER TABLE ADD COLUMN o CREATE INDEX.
-- En ese caso, ejecute manualmente las comprobaciones con SELECT COUNT(*) ... antes de aplicar los cambios.
