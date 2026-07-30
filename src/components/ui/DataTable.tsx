import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Plus } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  searchPlaceholder?: string;
  searchableKey?: keyof T;
  onRowDoubleClick?: (item: T) => void;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  searchPlaceholder = 'Buscar...',
  searchableKey,
  onRowDoubleClick,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredData = React.useMemo(() => {
    let filtered = [...data];

    if (searchTerm && searchableKey) {
      filtered = filtered.filter((item) =>
        String(item[searchableKey]).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortConfig !== null) {
      filtered.sort((a: any, b: any) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig, searchableKey]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-300"
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.header}
                    {sortConfig?.key === column.key ? (
                      sortConfig.direction === 'asc' ? (
                        <ChevronUp className="h-4 w-4 ml-1" />
                      ) : (
                        <ChevronDown className="h-4 w-4 ml-1" />
                      )
                    ) : null}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th scope="col" className="relative px-6 py-3 w-24">
                  <span className="sr-only">Ações</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <tr 
                  key={item.id} 
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${onRowDoubleClick ? 'cursor-pointer' : ''}`}
                  onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(item)}
                >
                  {columns.map((column) => (
                    <td key={`${item.id}-${column.key}`} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {column.render ? column.render(item) : String((item as any)[column.key] ?? '-')}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Editar
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(item)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="px-6 py-8 text-center text-slate-500 text-sm">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
