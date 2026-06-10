export default function Loading() {
  return (
    <div className="p-8 max-w-5xl mx-auto w-full animate-pulse">
      <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-4 w-56 bg-gray-100 dark:bg-gray-800 rounded mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 h-24" />
        ))}
      </div>
      <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 h-16" />
        ))}
      </div>
    </div>
  )
}
