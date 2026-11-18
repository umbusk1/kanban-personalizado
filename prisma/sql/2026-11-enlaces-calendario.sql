-- Enlace privado de calendario (YouRadar) — nov 2026
-- Correr UNA vez en Neon (SQL Editor) antes de publicar el cambio. Solo crea una tabla nueva; no toca las existentes.

-- CreateTable
CREATE TABLE "enlaces_calendario" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bonsaiId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enlaces_calendario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enlaces_calendario_token_key" ON "enlaces_calendario"("token");

-- CreateIndex
CREATE UNIQUE INDEX "enlaces_calendario_userId_bonsaiId_key" ON "enlaces_calendario"("userId", "bonsaiId");

-- AddForeignKey
ALTER TABLE "enlaces_calendario" ADD CONSTRAINT "enlaces_calendario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enlaces_calendario" ADD CONSTRAINT "enlaces_calendario_bonsaiId_fkey" FOREIGN KEY ("bonsaiId") REFERENCES "bonsais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

