-- Orden de los sprints dentro de un bonsai — nov 2026
-- Correr UNA vez en Neon (SQL Editor) antes de publicar el cambio.
--
-- Es seguro correrlo antes de publicar: el código actual de producción ignora
-- la columna nueva, así que nada cambia hasta que se publique el cambio de código.
ALTER TABLE "boards" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Rellenar con el orden actual (por fecha de creación) dentro de cada bonsai
UPDATE "boards" b
SET "position" = s.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "bonsaiId" ORDER BY "createdAt") - 1 AS rn
  FROM "boards"
  WHERE "bonsaiId" IS NOT NULL
) s
WHERE b.id = s.id;
