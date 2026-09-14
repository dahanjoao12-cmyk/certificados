import Link from "next/link";

export function Pagination({
  page,
  pageSize,
  total,
  currentQuery,
}: {
  page: number;
  pageSize: number;
  total: number;
  currentQuery: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  function linkFor(targetPage: number, targetPageSize = pageSize) {
    const params = new URLSearchParams(currentQuery);
    params.set("page", String(targetPage));
    params.set("pageSize", String(targetPageSize));
    return `?${params.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-sm text-slate-600">
      <p>
        Mostrando {from}–{to} de {total.toLocaleString("pt-BR")} registros
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Por página:</span>
          {[25, 50, 100, 200].map((size) => (
            <Link
              key={size}
              href={linkFor(1, size)}
              className={
                size === pageSize
                  ? "rounded bg-slate-900 px-2 py-0.5 text-xs font-medium text-white"
                  : "rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
              }
            >
              {size}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={linkFor(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={
              page <= 1
                ? "pointer-events-none rounded px-2 py-1 text-xs text-slate-300"
                : "rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            }
          >
            Anterior
          </Link>
          <span className="px-2 text-xs text-slate-500">
            Página {page} de {totalPages}
          </span>
          <Link
            href={linkFor(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
            className={
              page >= totalPages
                ? "pointer-events-none rounded px-2 py-1 text-xs text-slate-300"
                : "rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            }
          >
            Próxima
          </Link>
        </div>
      </div>
    </div>
  );
}
