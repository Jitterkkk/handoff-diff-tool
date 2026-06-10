export default function Loading() {
  return (
    <div className="p-8 max-w-2xl mx-auto w-full animate-pulse">
      <div className="h-7 w-36 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-4 w-52 bg-gray-100 dark:bg-gray-800 rounded mb-8" />
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded mb-2" />
        <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800 rounded mb-6" />
        <div className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded-lg mb-3" />
        <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    </div>
  )
}
