'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Folder } from 'lucide-react';
import { listCategories, deleteCategory } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { Pagination } from '@/components/ui/Pagination';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import type { Category } from '@/types';

export default function CategoriesPage() {
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadCategories();
  }, [debouncedSearch, page]);

  async function loadCategories() {
    setLoading(true);
    const res = await listCategories({ page, limit: DEFAULT_PAGE_SIZE });
    if (res.ok) {
      setCategories(res.items || []);
      setTotal(res.total || 0);
    } else {
      toast.error('خطا در بارگذاری دسته‌بندی‌ها');
    }
    setLoading(false);
  }

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (cat) =>
          cat.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          cat.slug.toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    [categories, debouncedSearch]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE)),
    [total]
  );

  async function handleDelete(cat: Category) {
    const confirmed = await confirm({
      title: 'حذف دسته‌بندی',
      message: `آیا از حذف "${cat.name}" اطمینان دارید؟`,
      confirmLabel: 'حذف',
      variant: 'danger',
    });
    if (!confirmed) return;

    const res = await deleteCategory(cat._id);
    if (res.ok) {
      toast.success('دسته‌بندی با موفقیت حذف شد');
      loadCategories();
    } else {
      toast.error(res.error || 'خطا در حذف دسته‌بندی');
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">دسته‌بندی‌ها</h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">مدیریت دسته‌بندی‌های بلاگ</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/categories/new')}
          leftIcon={<span>+</span>}
        >
          ایجاد دسته‌بندی جدید
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <label htmlFor="search-categories" className="sr-only">
          جستجو
        </label>
        <input
          id="search-categories"
          type="text"
          placeholder="جستجو در نام یا اسلاگ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm lg:text-base"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="p-3 lg:p-4 text-right whitespace-nowrap">نام</th>
                <th className="p-3 lg:p-4 text-right whitespace-nowrap hidden md:table-cell">
                  اسلاگ
                </th>
                <th className="p-3 lg:p-4 text-right whitespace-nowrap hidden lg:table-cell">
                  توضیحات
                </th>
                <th className="p-3 lg:p-4 text-right whitespace-nowrap">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-0">
                    <EmptyState
                      icon={<Folder className="w-12 h-12 text-gray-300" />}
                      title={debouncedSearch ? 'نتیجه‌ای یافت نشد' : 'هنوز دسته‌بندی ایجاد نشده'}
                      description={
                        debouncedSearch
                          ? 'جستجوی خود را تغییر دهید.'
                          : 'برای شروع، اولین دسته‌بندی را ایجاد کنید.'
                      }
                      action={
                        !debouncedSearch && (
                          <Button onClick={() => router.push('/categories/new')}>
                            ایجاد اولین دسته‌بندی
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => (
                  <tr key={cat._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 lg:p-4 font-medium">
                      <div className="max-w-xs truncate lg:max-w-none">{cat.name}</div>
                      <div className="md:hidden text-xs text-gray-500 mt-1">{cat.slug}</div>
                      <div className="lg:hidden text-xs text-gray-500 mt-1">
                        {cat.description || '-'}
                      </div>
                    </td>
                    <td className="p-3 lg:p-4 text-gray-600 hidden md:table-cell">{cat.slug}</td>
                    <td className="p-3 lg:p-4 text-gray-600 hidden lg:table-cell">
                      {cat.description || '-'}
                    </td>
                    <td className="p-3 lg:p-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/categories/${cat._id}`)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 whitespace-nowrap"
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 whitespace-nowrap"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && total > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={DEFAULT_PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
