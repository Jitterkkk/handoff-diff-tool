export default function Loading() {
  return (
    <div className="p-8 max-w-5xl mx-auto w-full animate-pulse">
      <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-4 w-40 bg-gray-100 dark:bg-gray-800 rounded mb-6" />
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-7 w-20 bg-gray-100 dark:bg-gray-800 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 h-28" />
        ))}
      </div>
    </div>
  )
}
