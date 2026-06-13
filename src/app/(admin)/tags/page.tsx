'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Tag as TagIcon } from 'lucide-react';
import { listTags, deleteTag } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { Pagination } from '@/components/ui/Pagination';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import type { Tag } from '@/types';

export default function TagsPage() {
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadTags();
  }, [debouncedSearch, page]);

  async function loadTags() {
    setLoading(true);
    const res = await listTags({ page, limit: DEFAULT_PAGE_SIZE });
    if (res.ok) {
      setTags(res.items || []);
      setTotal(res.total || 0);
    } else {
      toast.error('خطا در بارگذاری برچسب‌ها');
    }
    setLoading(false);
  }

  const filteredTags = useMemo(
    () =>
      tags.filter(
        (t) =>
          t.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          t.slug.toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    [tags, debouncedSearch]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE)),
    [total]
  );

  async function handleDelete(tag: Tag) {
    const confirmed = await confirm({
      title: 'حذف برچسب',
      message: `آیا از حذف "${tag.name}" اطمینان دارید؟`,
      confirmLabel: 'حذف',
      variant: 'danger',
    });
    if (!confirmed) return;

    const res = await deleteTag(tag._id);
    if (res.ok) {
      toast.success('برچسب با موفقیت حذف شد');
      loadTags();
    } else {
      toast.error(res.error || 'خطا در حذف برچسب');
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">برچسب‌ها</h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">مدیریت برچسب‌های بلاگ</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/tags/new')}
          leftIcon={<span>+</span>}
        >
          ایجاد برچسب جدید
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <label htmlFor="search-tags" className="sr-only">
          جستجو
        </label>
        <input
          id="search-tags"
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
              ) : filteredTags.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-0">
                    <EmptyState
                      icon={<TagIcon className="w-12 h-12 text-gray-300" />}
                      title={debouncedSearch ? 'نتیجه‌ای یافت نشد' : 'هنوز برچسبی ایجاد نشده'}
                      description={
                        debouncedSearch ? 'جستجوی خود را تغییر دهید.' : 'برای شروع، اولین برچسب را ایجاد کنید.'
                      }
                      action={
                        !debouncedSearch && (
                          <Button onClick={() => router.push('/tags/new')}>ایجاد اولین برچسب</Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredTags.map((tag) => (
                  <tr key={tag._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 lg:p-4 font-medium">
                      <div className="max-w-xs truncate lg:max-w-none">{tag.name}</div>
                      <div className="md:hidden text-xs text-gray-500 mt-1">{tag.slug}</div>
                      <div className="lg:hidden text-xs text-gray-500 mt-1">
                        {tag.description || '-'}
                      </div>
                    </td>
                    <td className="p-3 lg:p-4 text-gray-600 hidden md:table-cell">{tag.slug}</td>
                    <td className="p-3 lg:p-4 text-gray-600 hidden lg:table-cell">
                      {tag.description || '-'}
                    </td>
                    <td className="p-3 lg:p-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/tags/${tag._id}`)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 whitespace-nowrap"
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tag)}
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
