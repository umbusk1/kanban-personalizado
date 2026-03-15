import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "KanbanBonsai <notificaciones@compita.umbusk.com>"

// ── Header HTML reutilizable con logo visual ──────────────────────────────────
const EMAIL_HEADER = `
  <div style="
    background: #0a1a10;
    padding: 20px 32px;
    border-radius: 12px 12px 0 0;
    border-bottom: 2px solid #16a34a;
    text-align: center;
  ">
    <div style="display: inline-block; text-align: left; line-height: 1.15;">
      <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: 700; letter-spacing: 1px;">
        <span style="color: #8b6b2a;">盆栽</span>
      </div>
      <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: 700; letter-spacing: 1px;">
        <span style="color: #2d5090;">看板</span>
        <span style="font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 300; color: #8c96aa; letter-spacing: -0.5px; margin-left: 8px;">kanban</span><span style="font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 300; color: #6aaa28; letter-spacing: -0.5px;">bonsai</span>
      </div>
    </div>
  </div>
`

// ── Footer HTML reutilizable ──────────────────────────────────────────────────
const EMAIL_FOOTER = `
  <div style="
    background: #0a1a10;
    padding: 16px 32px;
    border-radius: 0 0 12px 12px;
    border-top: 1px solid #1f2d1f;
    text-align: center;
  ">
    <p style="margin: 0; font-size: 0.75em; color: #4b5563;">
      KanbanBonsai · <a href="https://kanban.umbusk.com" style="color: #4ade80; text-decoration: none;">kanban.umbusk.com</a>
      &nbsp;·&nbsp; vibe-coded por <a href="https://umbusk.com" style="color: #9ca3af; text-decoration: none;">Umbusk</a>
    </p>
  </div>
`

// ── Wrapper general del email ─────────────────────────────────────────────────
function emailWrapper(body: string) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; padding: 24px; min-height: 100vh;">
      <div style="max-width: 540px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        ${EMAIL_HEADER}
        <div style="padding: 28px 32px; color: #1a1a1a; line-height: 1.6;">
          ${body}
        </div>
        ${EMAIL_FOOTER}
      </div>
    </div>
  `
}

// ─── Email: te asignaron una hoja ────────────────────────────────────────────
interface CardAssignedParams {
  to:             string
  assigneeName:   string
  cardTitle:      string
  boardName:      string
  assignedByName: string
}

export async function sendCardAssignedEmail(params: CardAssignedParams) {
  const { to, assigneeName, cardTitle, boardName, assignedByName } = params
  await resend.emails.send({
    from:    FROM,
    to,
    subject: `🍃 Te asignaron una hoja en "${boardName}"`,
    html: emailWrapper(`
      <p style="font-size: 1em; color: #374151;">Hola <strong>${assigneeName}</strong>,</p>
      <p style="color: #374151;">
        <strong>${assignedByName}</strong> te asignó la siguiente hoja
        en el Sprint <em style="color: #16a34a;">${boardName}</em>:
      </p>
      <div style="
        background: #f0fdf4;
        border-left: 4px solid #16a34a;
        padding: 14px 18px;
        border-radius: 8px;
        margin: 20px 0;
        font-size: 1.05em;
        color: #111827;
      ">
        🍃 <strong>${cardTitle}</strong>
      </div>
      <p style="color: #6b7280; font-size: 0.9em;">
        Ingresa a tu tablero para ver los detalles, fechas y recursos asignados.
      </p>
      <div style="text-align: center; margin: 24px 0 8px;">
        <a href="https://kanban.umbusk.com" style="
          display: inline-block;
          background: #16a34a;
          color: white;
          font-weight: 600;
          padding: 12px 28px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 0.95em;
        ">Ver mi Sprint →</a>
      </div>
    `),
  })
}

// ─── Email: te quitaron una hoja ─────────────────────────────────────────────
interface CardUnassignedParams {
  to:              string
  prevAssigneeName: string
  cardTitle:       string
  boardName:       string
  reassignedByName: string
  newAssigneeName:  string
}

export async function sendCardUnassignedEmail(params: CardUnassignedParams) {
  const { to, prevAssigneeName, cardTitle, boardName, reassignedByName, newAssigneeName } = params
  await resend.emails.send({
    from:    FROM,
    to,
    subject: `🔄 Te reasignaron una hoja en "${boardName}"`,
    html: emailWrapper(`
      <p style="font-size: 1em; color: #374151;">Hola <strong>${prevAssigneeName}</strong>,</p>
      <p style="color: #374151;">
        <strong>${reassignedByName}</strong> reasignó la siguiente hoja
        del Sprint <em style="color: #16a34a;">${boardName}</em>,
        que tenías asignada, a <strong>${newAssigneeName}</strong>:
      </p>
      <div style="
        background: #faf5ff;
        border-left: 4px solid #7c3aed;
        padding: 14px 18px;
        border-radius: 8px;
        margin: 20px 0;
        font-size: 1.05em;
        color: #111827;
      ">
        🔄 <strong>${cardTitle}</strong>
      </div>
      <p style="color: #6b7280; font-size: 0.9em;">
        Si crees que esto fue un error, contacta a <strong>${reassignedByName}</strong>
        o al propietario del Sprint.
      </p>
      <div style="text-align: center; margin: 24px 0 8px;">
        <a href="https://kanban.umbusk.com" style="
          display: inline-block;
          background: #16a34a;
          color: white;
          font-weight: 600;
          padding: 12px 28px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 0.95em;
        ">Ver el Sprint →</a>
      </div>
    `),
  })
}

// ─── Email: editaron tu hoja ──────────────────────────────────────────────────
interface CardEditedParams {
  to:           string
  assigneeName: string
  cardTitle:    string
  boardName:    string
  editedByName: string
}

export async function sendCardEditedEmail(params: CardEditedParams) {
  const { to, assigneeName, cardTitle, boardName, editedByName } = params
  await resend.emails.send({
    from:    FROM,
    to,
    subject: `✏️ Editaron tu hoja en "${boardName}"`,
    html: emailWrapper(`
      <p style="font-size: 1em; color: #374151;">Hola <strong>${assigneeName}</strong>,</p>
      <p style="color: #374151;">
        <strong>${editedByName}</strong> realizó cambios en tu hoja
        del Sprint <em style="color: #16a34a;">${boardName}</em>:
      </p>
      <div style="
        background: #fefce8;
        border-left: 4px solid #ca8a04;
        padding: 14px 18px;
        border-radius: 8px;
        margin: 20px 0;
        font-size: 1.05em;
        color: #111827;
      ">
        ✏️ <strong>${cardTitle}</strong>
      </div>
      <p style="color: #6b7280; font-size: 0.9em;">
        Revisa los cambios, fechas o recursos actualizados en tu Sprint.
      </p>
      <div style="text-align: center; margin: 24px 0 8px;">
        <a href="https://kanban.umbusk.com" style="
          display: inline-block;
          background: #16a34a;
          color: white;
          font-weight: 600;
          padding: 12px 28px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 0.95em;
        ">Ver los cambios →</a>
      </div>
    `),
  })
}
