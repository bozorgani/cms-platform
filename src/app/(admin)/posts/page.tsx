'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { listPosts, deletePost } from '@/lib/api';
import { POST_STATUS_COLORS, POST_STATUS_LABELS, DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton, TableRowSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { formatPersianDate } from '@/lib/utils';
import type { Post, PostStatus } from '@/types';

type StatusFilter = 'all' | PostStatus;

export default function PostsPage() {
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    setPage(1); // Reset to first page when filters change
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    loadPosts();
  }, [statusFilter, debouncedSearch, page]);

  async function loadPosts() {
    setLoading(true);
    const res = await listPosts({
      status: statusFilter === 'all' ? 'all' : statusFilter,
      page,
      limit: DEFAULT_PAGE_SIZE,
      search: debouncedSearch || undefined,
    });
    if (res.ok) {
      setPosts(res.items || []);
      setTotal(res.total || 0);
    } else {
      toast.error('خطا در بارگذاری پست‌ها');
    }
    setLoading(false);
  }

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE)),
    [total]
  );

  async function handleDelete(post: Post) {
    const confirmed = await confirm({
      title: 'حذف پست',
      message: `آیا از حذف "${post.title}" اطمینان دارید؟ این عملیات قابل بازگشت نیست.`,
      confirmLabel: 'حذف',
      variant: 'danger',
    });
    if (!confirmed) return;

    const res = await deletePost(post._id);
    if (res.ok) {
      toast.success('پست با موفقیت حذف شد');
      loadPosts();
    } else {
      toast.error(res.error || 'خطا در حذف پست');
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">پست‌ها</h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">مدیریت و ویرایش پست‌های بلاگ</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/posts/new')}
          leftIcon={<span>+</span>}
        >
          ایجاد پست جدید
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 min-w-0">
            <label htmlFor="search-posts" className="sr-only">
              جستجو
            </label>
            <input
              id="search-posts"
              type="text"
              placeholder="جستجو در عنوان یا اسلاگ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm lg:text-base"
            />
          </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="status-filter" className="sr-only">
              فیلتر وضعیت
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full sm:w-auto px-3 py-2 border rounded-md text-sm lg:text-base"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="draft">پیش‌نویس</option>
              <option value="scheduled">زمان‌بندی شده</option>
              <option value="published">منتشر شده</option>
            </select>
          </div>
        </div>
      </div>

      {/* Posts table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="p-3 lg:p-4 text-right whitespace-nowrap">عنوان</th>
                <th className="p-3 lg:p-4 text-right whitespace-nowrap hidden md:table-cell">
                  اسلاگ
                </th>
                <th className="p-3 lg:p-4 text-right whitespace-nowrap">وضعیت</th>
                <th className="p-3 lg:p-4 text-right whitespace-nowrap hidden lg:table-cell">
                  تاریخ انتشار
                </th>
                <th className="p-3 lg:p-4 text-right whitespace-nowrap">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-0">
                    <EmptyState
                      icon={<FileText className="w-12 h-12 text-gray-300" />}
                      title={debouncedSearch ? 'نتیجه‌ای یافت نشد' : 'هنوز پستی ایجاد نشده'}
                      description={
                        debouncedSearch
                          ? 'جستجوی خود را تغییر دهید یا فیلتر را پاک کنید.'
                          : 'برای شروع، اولین پست خود را ایجاد کنید.'
                      }
                      action={
                        !debouncedSearch && (
                          <Button onClick={() => router.push('/posts/new')}>ایجاد اولین پست</Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                posts.map((p) => (
                  <tr key={p._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 lg:p-4 font-medium">
                      <div className="max-w-xs truncate lg:max-w-none">{p.title}</div>
                      <div className="md:hidden text-xs text-gray-500 mt-1">{p.slug}</div>
                      <div className="lg:hidden text-xs text-gray-500 mt-1">
                        {p.publishAt ? formatPersianDate(p.publishAt) : '-'}
                      </div>
                    </td>
                    <td className="p-3 lg:p-4 text-gray-600 hidden md:table-cell">{p.slug}</td>
                    <td className="p-3 lg:p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          POST_STATUS_COLORS[p.status] || 'bg-gray-100'
                        }`}
                      >
                        {POST_STATUS_LABELS[p.status] || p.status}
                      </span>
                    </td>
                    <td className="p-3 lg:p-4 text-gray-600 text-xs hidden lg:table-cell">
                      {p.publishAt ? formatPersianDate(p.publishAt) : '-'}
                    </td>
                    <td className="p-3 lg:p-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/posts/${p._id}`)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 whitespace-nowrap"
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/posts/${p._id}/preview`)}
                          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 whitespace-nowrap"
                        >
                          پیش‌نمایش
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
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

// Suppress unused warning - kept for type checking
export type { Post };
