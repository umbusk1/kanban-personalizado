import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type Card = {
  id: string
  title: string
  description: string | null
  priority: string | null
  assignee: {
    id: string
    name: string | null
    email: string
  } | null
}

export function DraggableCard({
  card,
  columnId,
  onEdit,
  onDelete,
}: {
  card: Card
  columnId: string
  onEdit: (card: Card, columnId: string) => void
  onDelete: (cardId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium flex-1">{card.title}</h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(card, columnId)
            }}
            className="text-blue-600 hover:text-blue-700 text-xs"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(card.id)
            }}
            className="text-red-600 hover:text-red-700 text-xs"
          >
            🗑️
          </button>
        </div>
      </div>
      
      {card.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {card.description}
        </p>
      )}
      
      <div className="flex items-center justify-between text-xs">
        {card.priority && (
          <span
            className={`px-2 py-1 rounded font-medium ${
              card.priority === 'alta'
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : card.priority === 'media'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}
          >
            {card.priority}
          </span>
        )}
        
        {card.assignee && (
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
              {card.assignee.name?.[0] || card.assignee.email[0].toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}