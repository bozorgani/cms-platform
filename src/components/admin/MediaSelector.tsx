'use client';

import { useState, useEffect, useCallback } from 'react';
import { listMedia, getMediaUrl, getMedia } from '@/lib/api';
import { isImage } from '@/lib/utils';

interface MediaSelectorProps {
  value?: string;
  onChange: (mediaId: string | null) => void;
  label: string;
}

export function MediaSelector({ value, onChange, label }: MediaSelectorProps) {
  const [showModal, setShowModal] = useState(false);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    const res = await listMedia({ limit: 50 });
    if (res.ok && res.items) {
      setMediaItems(res.items);
      if (value) {
        const media = res.items.find((m: any) => m._id === value);
        if (media) {
          setSelectedMedia(media);
        } else {
          // Fallback: fetch the single media by id in case it's not in the first page
          try {
            const one = await getMedia(value);
            if (one.ok && one.media) setSelectedMedia(one.media);
          } catch {
            /* ignore */
          }
        }
      }
    }
    setLoading(false);
  }, [value]);

  useEffect(() => {
    if (value) loadMedia();
  }, [value, loadMedia]);

  function handleSelectMedia(media: any) {
    setSelectedMedia(media);
    onChange(media._id);
    setShowModal(false);
  }

  function handleRemove() {
    setSelectedMedia(null);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>

      {selectedMedia ? (
        <div className="border rounded-md p-3 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 bg-gray-200 rounded overflow-hidden flex-shrink-0">
              {isImage(selectedMedia.path) ? (
                <img
                  src={getMediaUrl(selectedMedia.path)}
                  alt={selectedMedia.alt || ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl">📄</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedMedia.alt || 'بدون نام'}</p>
              {selectedMedia.caption && (
                <p className="text-xs text-gray-500 truncate">{selectedMedia.caption}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                تغییر
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setShowModal(true);
            loadMedia();
          }}
          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 text-gray-600 hover:text-gray-700"
        >
          + انتخاب رسانه
        </button>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="انتخاب رسانه"
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">انتخاب رسانه</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="بستن"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-8">در حال بارگذاری...</div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {mediaItems.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => handleSelectMedia(item)}
                      className={`border-2 rounded-md overflow-hidden hover:border-blue-500 transition-all ${
                        selectedMedia?._id === item._id
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="aspect-square bg-gray-100">
                        {isImage(item.path) ? (
                          <img
                            src={getMediaUrl(item.path)}
                            alt={item.alt || ''}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-3xl">📄</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!loading && mediaItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>هنوز رسانه‌ای آپلود نشده است</p>
                  <p className="text-sm mt-2">لطفا ابتدا از صفحه مدیریت رسانه فایل آپلود کنید</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
