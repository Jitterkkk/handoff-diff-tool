export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-gray-900 dark:text-gray-100 tracking-tight">Handoff</span>
          <div className="h-5 w-20 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-7 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-4 w-1/2 bg-gray-100 dark:bg-gray-800 rounded mb-8" />

        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl h-12 mb-6" />

        <div className="h-3 w-28 bg-gray-100 dark:bg-gray-800 rounded mb-3" />
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg h-14 mb-2" />
        ))}

        <div className="h-3 w-28 bg-gray-100 dark:bg-gray-800 rounded mb-3 mt-6" />
        {[1, 2].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg h-14 mb-2" />
        ))}
      </main>
    </div>
  )
}
