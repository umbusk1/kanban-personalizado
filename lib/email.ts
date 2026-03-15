import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = "KanbanBonsai <notificaciones@compita.umbusk.com>"

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
    subject: `📋 Te asignaron una hoja en "${boardName}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: auto; color: #1a1a1a;">
        <h2 style="color: #4f46e5;">🌿 KanbanBonsai</h2>
        <p>Hola <strong>${assigneeName}</strong>,</p>
        <p>
          <strong>${assignedByName}</strong> te asignó la siguiente hoja
          en el Sprint <em>${boardName}</em>:
        </p>
        <div style="
          background: #f0fdf4;
          border-left: 4px solid #4f46e5;
          padding: 12px 16px;
          border-radius: 6px;
          margin: 16px 0;
          font-size: 1.05em;
        ">
          📄 <strong>${cardTitle}</strong>
        </div>
        <p>Ingresa a <a href="https://kanban.umbusk.com">kanban.umbusk.com</a> para ver los detalles.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 0.8em; color: #9ca3af;">KanbanBonsai · umbusk.com</p>
      </div>
    `,
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
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: auto; color: #1a1a1a;">
        <h2 style="color: #4f46e5;">🌿 KanbanBonsai</h2>
        <p>Hola <strong>${assigneeName}</strong>,</p>
        <p>
          <strong>${editedByName}</strong> realizó cambios en tu hoja
          del Sprint <em>${boardName}</em>:
        </p>
        <div style="
          background: #fefce8;
          border-left: 4px solid #eab308;
          padding: 12px 16px;
          border-radius: 6px;
          margin: 16px 0;
          font-size: 1.05em;
        ">
          ✏️ <strong>${cardTitle}</strong>
        </div>
        <p>Ingresa a <a href="https://kanban.umbusk.com">kanban.umbusk.com</a> para revisar los cambios.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 0.8em; color: #9ca3af;">KanbanBonsai · umbusk.com</p>
      </div>
    `,
  })
}
