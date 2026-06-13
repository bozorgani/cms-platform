'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCategory, createCategory, updateCategory } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { SEO_LIMITS } from '@/lib/constants';
import { generateSlug } from '@/lib/utils';
import type { CategoryInput } from '@/types';

export default function CategoryEditPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const id = params?.id as string;
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<CategoryInput>({
    name: '',
    slug: '',
    description: '',
    seo: {
      metaTitle: '',
      metaDescription: '',
    },
  });

  useEffect(() => {
    if (!isNew) {
      loadCategory();
    }
  }, [id, isNew]);

  async function loadCategory() {
    if (!id) return;
    const res = await getCategory(id);
    if (res.ok && res.category) {
      const cat = res.category;
      setFormData({
        name: cat.name || '',
        slug: cat.slug || '',
        description: cat.description || '',
        seo: {
          metaTitle: cat.seo?.metaTitle || '',
          metaDescription: cat.seo?.metaDescription || '',
        },
      });
    } else {
      toast.error(res.error || 'خطا در بارگذاری دسته‌بندی');
    }
    setLoading(false);
  }

  function handleNameChange(name: string) {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
      seo: {
        ...prev.seo,
        metaTitle: prev.seo?.metaTitle || name,
      },
    }));
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.warning('نام دسته‌بندی الزامی است');
      return;
    }

    setSaving(true);
    try {
      const payload: CategoryInput = {
        ...formData,
        slug: formData.slug || generateSlug(formData.name),
      };

      const res = isNew ? await createCategory(payload) : await updateCategory(id, payload);

      if (res.ok) {
        toast.success(isNew ? 'دسته‌بندی ایجاد شد' : 'دسته‌بندی به‌روزرسانی شد');
        router.push('/categories');
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

  const metaTitleLength = formData.seo?.metaTitle?.length || 0;
  const metaDescLength = formData.seo?.metaDescription?.length || 0;

  return (
    <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
            {isNew ? 'ایجاد دسته‌بندی جدید' : 'ویرایش دسته‌بندی'}
          </h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">
            {isNew ? 'دسته‌بندی جدید ایجاد کنید' : 'ویرایش دسته‌بندی'}
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
          <h2 className="text-lg font-semibold">اطلاعات پایه</h2>

          <div>
            <label htmlFor="cat-name" className="block text-sm font-medium mb-1">
              نام <span className="text-red-500">*</span>
            </label>
            <input
              id="cat-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="نام دسته‌بندی"
              required
            />
          </div>

          <div>
            <label htmlFor="cat-slug" className="block text-sm font-medium mb-1">
              اسلاگ (URL) <span className="text-red-500">*</span>
            </label>
            <input
              id="cat-slug"
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
            <label htmlFor="cat-desc" className="block text-sm font-medium mb-1">
              توضیحات
            </label>
            <textarea
              id="cat-desc"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md"
              rows={4}
              placeholder="توضیحات دسته‌بندی"
            />
          </div>
        </div>

        {/* SEO Settings */}
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold">تنظیمات SEO</h2>

          <div>
            <label htmlFor="cat-meta-title" className="block text-sm font-medium mb-1">
              Meta Title
            </label>
            <input
              id="cat-meta-title"
              type="text"
              value={formData.seo?.metaTitle || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  seo: { ...prev.seo, metaTitle: e.target.value },
                }))
              }
              className="w-full px-3 py-2 border rounded-md"
              placeholder="عنوان برای SEO"
            />
            <p
              className={`text-xs mt-1 ${
                metaTitleLength > SEO_LIMITS.META_TITLE_MAX
                  ? 'text-red-500'
                  : metaTitleLength < SEO_LIMITS.META_TITLE_MIN
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}
            >
              {metaTitleLength} کاراکتر (توصیه: {SEO_LIMITS.META_TITLE_MIN}-
              {SEO_LIMITS.META_TITLE_MAX})
            </p>
          </div>

          <div>
            <label htmlFor="cat-meta-desc" className="block text-sm font-medium mb-1">
              Meta Description
            </label>
            <textarea
              id="cat-meta-desc"
              value={formData.seo?.metaDescription || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  seo: { ...prev.seo, metaDescription: e.target.value },
                }))
              }
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              placeholder="توضیحات برای SEO"
            />
            <p
              className={`text-xs mt-1 ${
                metaDescLength > SEO_LIMITS.META_DESCRIPTION_MAX
                  ? 'text-red-500'
                  : metaDescLength < SEO_LIMITS.META_DESCRIPTION_MIN
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}
            >
              {metaDescLength} کاراکتر (توصیه: {SEO_LIMITS.META_DESCRIPTION_MIN}-
              {SEO_LIMITS.META_DESCRIPTION_MAX})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
