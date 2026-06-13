'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getTag, createTag, updateTag } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { generateSlug } from '@/lib/utils';
import type { TagInput } from '@/types';

export default function TagEditPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const id = params?.id as string;
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<TagInput>({
    name: '',
    slug: '',
    description: '',
  });

  useEffect(() => {
    if (!isNew) {
      loadTag();
    }
  }, [id, isNew]);

  async function loadTag() {
    if (!id) return;
    const res = await getTag(id);
    if (res.ok && res.tag) {
      const tag = res.tag;
      setFormData({
        name: tag.name || '',
        slug: tag.slug || '',
        description: tag.description || '',
      });
    } else {
      toast.error(res.error || 'خطا در بارگذاری برچسب');
    }
    setLoading(false);
  }

  function handleNameChange(name: string) {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.warning('نام برچسب الزامی است');
      return;
    }

    setSaving(true);
    try {
      const payload: TagInput = {
        ...formData,
        slug: formData.slug || generateSlug(formData.name),
      };

      const res = isNew ? await createTag(payload) : await updateTag(id, payload);

      if (res.ok) {
        toast.success(isNew ? 'برچسب ایجاد شد' : 'برچسب به‌روزرسانی شد');
        router.push('/tags');
      } else {
        toast.error(res.error || 'خطا در ذخیره');
      }
    } catch (e) {
      toast.error('خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"
          aria-hidden="true"
        />
        <p className="mt-4 text-gray-600">در حال بارگذاری...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
            {isNew ? 'ایجاد برچسب جدید' : 'ویرایش برچسب'}
          </h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">
            {isNew ? 'برچسب جدید ایجاد کنید' : 'ویرایش برچسب'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-md hover:bg-gray-50 text-sm lg:text-base whitespace-nowrap"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm lg:text-base whitespace-nowrap flex items-center gap-2"
          >
            {saving && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {saving ? 'در حال ذخیره...' : 'ذخیره'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4 lg:space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="tag-name" className="block text-sm font-medium mb-1">
              نام <span className="text-red-500">*</span>
            </label>
            <input
              id="tag-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="نام برچسب"
              required
            />
          </div>

          <div>
            <label htmlFor="tag-slug" className="block text-sm font-medium mb-1">
              اسلاگ (URL) <span className="text-red-500">*</span>
            </label>
            <input
              id="tag-slug"
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="slug-url"
              required
              dir="ltr"
            />
          </div>

          <div>
            <label htmlFor="tag-desc" className="block text-sm font-medium mb-1">
              توضیحات
            </label>
            <textarea
              id="tag-desc"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md"
              rows={4}
              placeholder="توضیحات برچسب"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
