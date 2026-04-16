-- Migración: Agregar campo codigo_proyecto a tabla proyecto
-- Fecha: 2026-04-15
-- Descripción: Agrega un campo único para códigos de proyecto de 8 caracteres alfanuméricos

USE scrum_db;

-- Agregar columna codigo_proyecto a la tabla proyecto
ALTER TABLE proyecto
ADD COLUMN codigo_proyecto VARCHAR(10) NOT NULL UNIQUE AFTER fecha_fin_est;

-- Crear índice para búsquedas eficientes por código
CREATE INDEX idx_proyecto_codigo ON proyecto(codigo_proyecto);

-- Actualizar proyectos existentes con códigos únicos (si hay datos existentes)
-- Nota: Esta sección se ejecutará solo si hay proyectos existentes
SET @counter = 0;
UPDATE proyecto
SET codigo_proyecto = CONCAT(
  CHAR(65 + FLOOR(RAND() * 26)),  -- Letra A-Z
  CHAR(65 + FLOOR(RAND() * 26)),  -- Letra A-Z
  CHAR(65 + FLOOR(RAND() * 26)),  -- Letra A-Z
  LPAD(FLOOR(RAND() * 10000), 4, '0'),  -- 4 dígitos
  CHAR(65 + FLOOR(RAND() * 26)),  -- Letra A-Z
  CHAR(65 + FLOOR(RAND() * 26))   -- Letra A-Z
)
WHERE codigo_proyecto IS NULL OR codigo_proyecto = '';

-- Verificar que no hay códigos duplicados (por si acaso)
-- Si hay duplicados, actualizarlos manualmente o ejecutar el script de corrección