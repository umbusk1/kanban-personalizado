```typescript
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          🎯 KANBAN Personalizado
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Sistema de gestión de proyectos colaborativo
        </p>
        <div className="bg-green-100 dark:bg-green-900 p-6 rounded-lg">
          <p className="text-green-800 dark:text-green-200 font-semibold">
            ✅ Setup Inicial Completado
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Tarjeta 1.1 - DONE
          </p>
        </div>
      </div>
    </main>
  );
}
```