'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import {
  listMedia,
  uploadMedia,
  deleteMedia,
  updateMedia,
  getMediaUrl,
  replaceMedia,
} from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { formatFileSize, formatPersianDate, isImage } from '@/lib/utils';
import type { Media } from '@/types';

export default function MediaPage() {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [mediaItems, setMediaItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadAlt, setUploadAlt] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacePreview, setReplacePreview] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs to prevent memory leaks
  const cleanupPreview = useCallback(() => {
    setPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  }, []);

  const cleanupReplacePreview = useCallback(() => {
    setReplacePreview((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  }, []);

  useEffect(() => {
    loadMedia();
  }, [page]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPreview();
      cleanupReplacePreview();
    };
  }, [cleanupPreview, cleanupReplacePreview]);

  async function loadMedia() {
    setLoading(true);
    const res = await listMedia({ page, limit: DEFAULT_PAGE_SIZE });
    if (res.ok && res.items) {
      setMediaItems(res.items);
      setTotal(res.total || 0);
    } else {
      toast.error('خطا در بارگذاری رسانه‌ها');
    }
    setLoading(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!uploadAlt) setUploadAlt(file.name);

    cleanupPreview();
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  function toggleUpload() {
    if (showUpload) {
      // Close form
      cleanupPreview();
      setSelectedFile(null);
      setUploadAlt('');
      setUploadCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    setShowUpload((s) => !s);
  }

  async function handleUpload() {
    if (!selectedFile) {
      toast.warning('لطفا فایلی انتخاب کنید');
      return;
    }

    setUploading(true);
    try {
      const res = await uploadMedia(selectedFile, uploadAlt || undefined, uploadCaption || undefined);
      if (res.ok) {
        toast.success('فایل با موفقیت آپلود شد');
        cleanupPreview();
        setSelectedFile(null);
        setUploadAlt('');
        setUploadCaption('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowUpload(false);
        setPage(1);
        loadMedia();
      } else {
        toast.error(res.error || 'خطا در آپلود فایل');
      }
    } catch {
      toast.error('خطا در آپلود فایل');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(item: Media) {
    const confirmed = await confirm({
      title: 'حذف فایل',
      message: `آیا از حذف "${item.alt || item.path.split('/').pop()}" اطمینان دارید؟`,
      confirmLabel: 'حذف',
      variant: 'danger',
    });
    if (!confirmed) return;

    const res = await deleteMedia(item._id);
    if (res.ok) {
      toast.success('فایل حذف شد');
      loadMedia();
    } else {
      toast.error(res.error || 'خطا در حذف فایل');
    }
  }

  function startEdit(item: Media) {
    setEditingId(item._id);
    setEditAlt(item.alt || '');
    setEditCaption(item.caption || '');
    setReplaceFile(null);
    cleanupReplacePreview();
  }

  function cancelEdit() {
    setEditingId(null);
    cleanupReplacePreview();
    setReplaceFile(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    let res;
    if (replaceFile) {
      res = await replaceMedia(editingId, replaceFile, editAlt || undefined, editCaption || undefined);
    } else {
      res = await updateMedia(editingId, {
        alt: editAlt || undefined,
        caption: editCaption || undefined,
      });
    }
    if (res.ok) {
      toast.success('رسانه به‌روزرسانی شد');
      cancelEdit();
      loadMedia();
    } else {
      toast.error(res.error || 'خطا در به‌روزرسانی');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">مدیریت رسانه</h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">آپلود و مدیریت فایل‌های رسانه</p>
        </div>
        <Button variant="primary" onClick={toggleUpload}>
          {showUpload ? 'انصراف' : '+ آپلود فایل جدید'}
        </Button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold">آپلود فایل جدید</h2>

          <div>
            <label htmlFor="media-file" className="block text-sm font-medium mb-1">
              فایل <span className="text-red-500">*</span>
            </label>
            <input
              id="media-file"
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border rounded-md"
            />
            {selectedFile && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">
                  انتخاب شده: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
                {previewUrl && (
                  <div className="mt-3 border rounded-lg overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="پیش‌نمایش"
                      className="w-full h-auto max-h-64 object-contain bg-gray-50"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="upload-alt" className="block text-sm font-medium mb-1">
              Alt Text
            </label>
            <input
              id="upload-alt"
              type="text"
              value={uploadAlt}
              onChange={(e) => setUploadAlt(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="متن جایگزین برای تصویر"
            />
          </div>

          <div>
            <label htmlFor="upload-caption" className="block text-sm font-medium mb-1">
              Caption
            </label>
            <textarea
              id="upload-caption"
              value={uploadCaption}
              onChange={(e) => setUploadCaption(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              rows={2}
              placeholder="توضیحات فایل"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="success" onClick={handleUpload} loading={uploading} disabled={!selectedFile}>
              آپلود
            </Button>
            <Button variant="secondary" onClick={toggleUpload}>
              انصراف
            </Button>
          </div>
        </div>
      )}

      {/* Gallery */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : mediaItems.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="w-12 h-12 text-gray-300" />}
          title="هنوز رسانه‌ای آپلود نشده"
          description="برای شروع، اولین فایل خود را آپلود کنید."
          action={<Button onClick={() => setShowUpload(true)}>آپلود اولین فایل</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
            {mediaItems.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all hover:border-blue-300"
              >
                <div className="aspect-square bg-gray-100 relative">
                  {isImage(item.path) ? (
                    <img
                      src={getMediaUrl(item.path)}
                      alt={item.alt || ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center p-4">
                        <div className="text-4xl mb-2">📄</div>
                        <p className="text-xs text-gray-600 truncate">{item.path.split('/').pop()}</p>
                      </div>
                    </div>
                  )}

                  {editingId === item._id ? (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2">
                      <div className="bg-white rounded p-2 w-full max-w-xs space-y-2">
                        <div>
                          <label className="block text-xs font-medium mb-1">
                            تعویض فایل (اختیاری)
                          </label>
                          <input
                            type="file"
                            accept="image/*,video/*,.pdf"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              setReplaceFile(f);
                              cleanupReplacePreview();
                              if (f && f.type.startsWith('image/')) {
                                setReplacePreview(URL.createObjectURL(f));
                              }
                            }}
                            className="w-full px-2 py-1 text-xs border rounded"
                          />
                          {replacePreview && (
                            <div className="mt-2 border rounded overflow-hidden">
                              <img
                                src={replacePreview}
                                alt="پیش‌نمایش"
                                className="w-full h-auto"
                              />
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          value={editAlt}
                          onChange={(e) => setEditAlt(e.target.value)}
                          placeholder="متن جایگزین"
                          className="w-full px-2 py-1 text-xs border rounded"
                          autoFocus
                        />
                        <textarea
                          value={editCaption}
                          onChange={(e) => setEditCaption(e.target.value)}
                          placeholder="Caption"
                          className="w-full px-2 py-1 text-xs border rounded"
                          rows={2}
                        />
                        <div className="flex gap-1">
                          <Button size="sm" onClick={saveEdit}>
                            ذخیره
                          </Button>
                          <Button size="sm" variant="secondary" onClick={cancelEdit}>
                            انصراف
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        حذف
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-2">
                  <p className="text-xs font-medium truncate">{item.alt || 'بدون نام'}</p>
                  {item.caption && (
                    <p className="text-xs text-gray-500 truncate mt-1">{item.caption}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                    {item.width && item.height && <span>{item.width} × {item.height}</span>}
                    {item.createdAt && <span>{formatPersianDate(item.createdAt)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={DEFAULT_PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
