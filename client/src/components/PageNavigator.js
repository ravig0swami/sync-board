'use client';

/**
 * PageNavigator
 *
 * Floating bottom-center bar for multi-page navigation.
 *
 * Props:
 *   currentPage  - 0-indexed current page index
 *   totalPages   - total number of pages
 *   onPrevPage   - () => void
 *   onNextPage   - () => void
 *   onNewPage    - () => void
 */
export default function PageNavigator({
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  onNewPage,
  onDeletePage,
}) {
  return (
    <div
      id="page-navigator"
      className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-xl px-1.5 sm:px-2 py-1 sm:py-1.5 z-50"
    >
      {/* Previous page */}
      <button
        id="btn-prev-page"
        title="Previous page"
        onClick={onPrevPage}
        disabled={currentPage <= 0}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* Page indicator */}
      <span
        id="page-indicator"
        className="min-w-[3.5rem] sm:min-w-[5rem] text-center text-xs font-semibold text-gray-700 tabular-nums select-none"
      >
        Page {currentPage + 1} / {totalPages}
      </span>

      {/* Next page */}
      <button
        id="btn-next-page"
        title="Next page"
        onClick={onNextPage}
        disabled={currentPage >= totalPages - 1}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* New page button */}
      <button
        id="btn-new-page"
        title="Add new page"
        onClick={onNewPage}
        className="flex items-center gap-1 px-1.5 sm:px-2.5 h-8 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 border-0 sm:border sm:border-gray-300 hover:border-indigo-200 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span className="hidden sm:inline">New Page</span>
      </button>
      
      {/* Delete page button */}
      <button
        id="btn-delete-page"
        title="Delete current page"
        onClick={onDeletePage}
        disabled={currentPage <= 0}
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
          currentPage <= 0 
            ? "text-gray-300 cursor-not-allowed opacity-50" 
            : "text-red-500 hover:bg-red-50 hover:text-red-700"
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </div>
  );
}
