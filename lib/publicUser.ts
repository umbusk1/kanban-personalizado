// Campos de un usuario que se pueden mandar al navegador.
// Nunca incluir passwordHash, isAdmin, empresaId ni plan de otras personas.
export const publicUserSelect = {
  id:    true,
  name:  true,
  email: true,
} as const
