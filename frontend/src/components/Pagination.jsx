export default function Pagination({ page, totalPages, onPageChange, totalRecords, pageSize = 10 }) {
  if (totalPages <= 1) return null;

  /* Build page numbers with ellipsis like HRISELINK: < 1 2 3 ... 20 > */
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalRecords || page * pageSize);

  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      {/* Records info */}
      <div className="text-[13px] text-[#868e96]">
        {totalRecords ? (
          <span>{startRecord} - {endRecord} of {totalRecords}</span>
        ) : (
          <span>Page {page} of {totalPages}</span>
        )}
      </div>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#868e96] transition-colors hover:bg-[#f1f3f5] disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {pageNumbers.map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="flex h-8 w-8 items-center justify-center text-[#adb5bd] text-xs">
              …
            </span>
          ) : (
            <button
              key={p}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-medium transition-colors ${
                p === page
                  ? "bg-[#212529] text-white"
                  : "text-[#495057] hover:bg-[#f1f3f5]"
              }`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#868e96] transition-colors hover:bg-[#f1f3f5] disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
