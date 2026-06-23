export default function Table({ columns, data, onSort, sortConfig }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: "var(--color-border)" }}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-[#f8f9fa]" style={{ borderColor: "var(--color-border)" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3 text-xs font-semibold text-[#868e96] ${col.key !== "actions" && onSort ? 'cursor-pointer hover:bg-[#e9ecef] transition-colors select-none' : ''}`}
                  onClick={() => {
                    if (col.key !== "actions" && onSort) onSort(col.key);
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    {col.key !== "actions" && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          stroke={sortConfig?.key === col.key && sortConfig.direction === 'desc' ? "#212529" : "#ced4da"}
                          d="M8.25 15L12 18.75 15.75 15" 
                        />
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          stroke={sortConfig?.key === col.key && sortConfig.direction === 'asc' ? "#212529" : "#ced4da"}
                          d="M8.25 9L12 5.25 15.75 9" 
                        />
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={row.id ?? rowIdx}
                className="border-b transition-colors duration-100 hover:bg-[#f8f9fa]"
                style={{ borderColor: "var(--color-border-light, #f1f3f5)" }}
              >
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-5 py-3 text-[13px] text-[#495057]">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  className="px-5 py-16 text-center text-[#adb5bd]"
                  colSpan={columns.length}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="h-8 w-8 text-[#dee2e6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                    <span className="text-sm">No records found.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
