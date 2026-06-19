export default function Loading() {
  return (
    <div className="p-8 max-w-5xl mx-auto w-full animate-pulse">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
        <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 h-28" />
        ))}
      </div>
    </div>
  )
}
