export default function Loading() {
  return (
    <div className="p-8 max-w-4xl mx-auto w-full animate-pulse">
      <div className="flex items-center gap-1.5 mb-3">
        <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-3 w-2 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-7 w-56 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-4 w-36 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
        <div className="h-8 w-28 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 h-14" />
        ))}
      </div>
    </div>
  )
}
