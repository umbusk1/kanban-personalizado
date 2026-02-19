export default function AppFooter() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center gap-3 text-center">

          <span className="font-bold text-lg tracking-tight text-gray-700 dark:text-gray-300">
            <span className="text-gray-500">kanban</span>
            <span className="text-green-600 dark:text-green-400">bonsai</span>
          </span>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            vibe-coded by{" "}
            <a
              href="https://umbusk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 dark:text-green-400 hover:underline font-medium"
            >
              Umbusk
            </a>
            {" "}y{" "}
            <a
              href="https://anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Claude de Anthropic
            </a>
          </p>

          <p className="text-xs text-gray-400 dark:text-gray-600">
            © 2026 kanbanbonsai · Todos los derechos reservados
          </p>

        </div>
      </div>
    </footer>
  )
}
