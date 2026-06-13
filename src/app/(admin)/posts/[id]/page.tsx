'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  getPost,
  createPost,
  updatePost,
  listCategories,
  listTags,
  createCategory,
  createTag,
} from '@/lib/api';
import { RichTextEditor } from '@/components/RichTextEditor';
import { MediaSelector } from '@/components/MediaSelector';
import { useToast } from '@/hooks/useToast';
import { ROBOTS_OPTIONS, SCHEMA_TYPES, TWITTER_CARDS, SEO_LIMITS } from '@/lib/constants';
import { extractTextFromContent, generateSlug } from '@/lib/utils';
import type {
  Category,
  Post,
  PostInput,
  PostStatus,
  SEO,
  Tag,
  TiptapContent,
} from '@/types';
import DatePicker from 'react-multi-date-picker';
import TimePicker from 'react-multi-date-picker/plugins/time_picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

const DEFAULT_SEO: SEO = {
  metaTitle: '',
  metaDescription: '',
  robots: 'index, follow',
  ogTitle: '',
  ogDescription: '',
  ogImageId: '',
  twitterCard: 'summary_large_image',
  schemaType: 'Article',
};

interface KeywordAnalysis {
  keyword: string;
  count: number;
  density: number;
}

function calculateKeywordDensity(
  keywords: string[],
  content: TiptapContent | null,
  title = '',
  excerpt = ''
): KeywordAnalysis[] {
  if (!keywords?.length) return [];

  const contentText = extractTextFromContent(content as any);
  const fullText = [title, excerpt, contentText].filter(Boolean).join(' ');

  if (!fullText) return [];

  const normalizedText = fullText
    .toLowerCase()
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-z0-9\s]/g, ' ');
  const words = normalizedText.split(/\s+/).filter((w) => w.length > 0);
  const totalWords = words.length;

  if (totalWords === 0) return [];

  return keywords.map((keyword) => {
    const normalizedKeyword = keyword.toLowerCase().trim();
    if (!normalizedKeyword) return { keyword, count: 0, density: 0 };

    const keywordWords = normalizedKeyword.split(/\s+/);
    let count = 0;

    if (keywordWords.length === 1) {
      count = words.filter((w) => w === normalizedKeyword).length;
    } else {
      const phrase = normalizedKeyword;
      let index = 0;
      while ((index = normalizedText.indexOf(phrase, index)) !== -1) {
        count++;
        index += phrase.length;
      }
    }

    const density = totalWords > 0 ? (count / totalWords) * 100 : 0;
    return { keyword, count, density: Math.round(density * 100) / 100 };
  });
}

export default function PostEditPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const id = params?.id as string;
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [publishPickerValue, setPublishPickerValue] = useState<any>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);

  const [formData, setFormData] = useState<PostInput>({
    title: '',
    slug: '',
    excerpt: '',
    content: null,
    status: 'draft',
    publishAt: '',
    categoryId: '',
    categoryIds: [],
    tags: [],
    keywords: [],
    coverImageId: '',
    canonicalUrl: '',
    isFeatured: false,
    seo: { ...DEFAULT_SEO },
  });

  useEffect(() => {
    if (!isNew) loadPost();
    loadCategories();
    loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadPost() {
    if (!id) return;
    const res = await getPost(id);
    if (res.ok && res.post) {
      const post: Post = res.post;
      setFormData({
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        content: post.content || null,
        status: post.status || 'draft',
        publishAt: post.publishAt ? new Date(post.publishAt).toISOString() : '',
        categoryId:
          typeof post.categoryId === 'string'
            ? post.categoryId
            : post.categoryId?._id?.toString() || '',
        categoryIds: Array.isArray(post.categoryIds)
          ? post.categoryIds
              .map((c: any) => (typeof c === 'string' ? c : c?._id?.toString() || ''))
              .filter(Boolean)
          : [],
        tags: Array.isArray(post.tags)
          ? post.tags
              .map((t: any) => (typeof t === 'string' ? t : t?._id?.toString() || ''))
              .filter(Boolean)
          : [],
        keywords: Array.isArray(post.keywords) ? post.keywords : [],
        coverImageId:
          typeof post.coverImageId === 'string'
            ? post.coverImageId
            : post.coverImageId?._id?.toString() || '',
        canonicalUrl: post.canonicalUrl || '',
        isFeatured: post.isFeatured || false,
        seo: {
          metaTitle: post.seo?.metaTitle || '',
          metaDescription: post.seo?.metaDescription || '',
          robots: post.seo?.robots || 'index, follow',
          ogTitle: post.seo?.ogTitle || '',
          ogDescription: post.seo?.ogDescription || '',
          ogImageId:
            typeof post.seo?.ogImageId === 'string'
              ? post.seo.ogImageId
              : post.seo?.ogImageId?._id?.toString() || '',
          twitterCard: post.seo?.twitterCard || 'summary_large_image',
          schemaType: post.seo?.schemaType || 'Article',
        },
      });
      if (post.publishAt) {
        try {
          const d = new Date(post.publishAt);
          if (!isNaN(d.getTime())) setPublishPickerValue(d);
        } catch {
          /* ignore */
        }
      }
    } else {
      toast.error(res.error || 'خطا در بارگذاری پست');
    }
    setLoading(false);
  }

  async function loadCategories() {
    const res = await listCategories();
    if (res.ok && res.items) setCategories(res.items);
  }

  async function loadTags() {
    const res = await listTags();
    if (res.ok && res.items) setTags(res.items);
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim() || creatingCategory) return;
    setCreatingCategory(true);
    try {
      const res = await createCategory({ name: newCategoryName.trim() });
      if (res.ok && res.category) {
        setCategories((prev) => [...prev, res.category!]);
        setFormData((prev) => ({
          ...prev,
          categoryIds: [...(prev.categoryIds || []), res.category!._id],
        }));
        setNewCategoryName('');
        setCategorySearch('');
        toast.success(`دسته‌بندی "${res.category!.name}" ایجاد شد`);
      } else {
        toast.error(res.error || 'خطا در ایجاد دسته‌بندی');
      }
    } catch {
      toast.error('خطا در ایجاد دسته‌بندی');
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim() || creatingTag) return;
    setCreatingTag(true);
    try {
      const res = await createTag({ name: newTagName.trim() });
      if (res.ok && res.tag) {
        setTags((prev) => [...prev, res.tag!]);
        setFormData((prev) => ({
          ...prev,
          tags: [...(prev.tags || []), res.tag!._id],
        }));
        setNewTagName('');
        setTagSearch('');
        toast.success(`برچسب "${res.tag!.name}" ایجاد شد`);
      } else {
        toast.error(res.error || 'خطا در ایجاد برچسب');
      }
    } catch {
      toast.error('خطا در ایجاد برچسب');
    } finally {
      setCreatingTag(false);
    }
  }

  function handleTitleChange(title: string) {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
      seo: {
        ...prev.seo,
        metaTitle: prev.seo?.metaTitle || title,
        ogTitle: prev.seo?.ogTitle || title,
      },
    }));
  }

  async function handleSave() {
    if (!formData.title.trim()) {
      toast.warning('عنوان پست الزامی است');
      return;
    }

    setSaving(true);
    try {
      const payload: PostInput = {
        ...formData,
        publishAt: formData.publishAt || undefined,
        categoryId: formData.categoryId || undefined,
        categoryIds: formData.categoryIds?.length ? formData.categoryIds : undefined,
        tags: formData.tags?.length ? formData.tags : undefined,
        keywords: formData.keywords?.length ? formData.keywords : undefined,
        coverImageId: formData.coverImageId || undefined,
        seo: {
          ...formData.seo,
          ogImageId: formData.seo?.ogImageId || undefined,
        } as SEO,
      };

      const res = isNew ? await createPost(payload) : await updatePost(id, payload);

      if (res.ok) {
        toast.success(isNew ? 'پست ایجاد شد' : 'پست به‌روزرسانی شد');
        router.push('/posts');
      } else {
        toast.error(res.error || 'خطا در ذخیره');
      }
    } catch {
      toast.error('خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  }

  const keywordDensity = useMemo(
    () => calculateKeywordDensity(formData.keywords || [], formData.content, formData.title, formData.excerpt || ''),
    [formData.keywords, formData.content, formData.title, formData.excerpt]
  );

  const metaTitleLength = formData.seo?.metaTitle?.length || 0;
  const metaDescLength = formData.seo?.metaDescription?.length || 0;

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
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
            {isNew ? 'ایجاد پست جدید' : 'ویرایش پست'}
          </h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">
            {isNew ? 'پست جدید خود را ایجاد کنید' : 'ویرایش و به‌روزرسانی پست'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => router.push('/posts')}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-all text-sm lg:text-base whitespace-nowrap"
          >
            انصراف
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={() => router.push(`/posts/${id}/preview`)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm hover:shadow-md text-sm lg:text-base whitespace-nowrap"
            >
              👁️ پیش‌نمایش
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md text-sm lg:text-base whitespace-nowrap flex items-center gap-2"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          {/* Basic info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4">
            <h2 className="text-lg font-semibold">اطلاعات پایه</h2>

            <div>
              <label htmlFor="post-title" className="block text-sm font-medium mb-1">
                عنوان <span className="text-red-500">*</span>
              </label>
              <input
                id="post-title"
                type="text"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="عنوان پست"
                required
              />
            </div>

            <div>
              <label htmlFor="post-slug" className="block text-sm font-medium mb-1">
                اسلاگ (URL) <span className="text-red-500">*</span>
              </label>
              <input
                id="post-slug"
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
              <label htmlFor="post-excerpt" className="block text-sm font-medium mb-1">
                خلاصه (Excerpt)
              </label>
              <textarea
                id="post-excerpt"
                value={formData.excerpt || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="خلاصه کوتاه پست"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">محتوا <span className="text-red-500">*</span></label>
              <RichTextEditor
                content={formData.content}
                onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
              />
            </div>
          </div>

          {/* SEO Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4">
            <h2 className="text-lg font-semibold">تنظیمات SEO</h2>

            <div>
              <label htmlFor="seo-meta-title" className="block text-sm font-medium mb-1">
                Meta Title
              </label>
              <input
                id="seo-meta-title"
                type="text"
                value={formData.seo?.metaTitle || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    seo: { ...prev.seo, metaTitle: e.target.value } as SEO,
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
              <label htmlFor="seo-meta-desc" className="block text-sm font-medium mb-1">
                Meta Description
              </label>
              <textarea
                id="seo-meta-desc"
                value={formData.seo?.metaDescription || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    seo: { ...prev.seo, metaDescription: e.target.value } as SEO,
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

            <div>
              <label htmlFor="seo-robots" className="block text-sm font-medium mb-1">
                Robots
              </label>
              <select
                id="seo-robots"
                value={formData.seo?.robots || 'index, follow'}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    seo: { ...prev.seo, robots: e.target.value as any } as SEO,
                  }))
                }
                className="w-full px-3 py-2 border rounded-md"
              >
                {ROBOTS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="seo-og-title" className="block text-sm font-medium mb-1">
                Open Graph Title
              </label>
              <input
                id="seo-og-title"
                type="text"
                value={formData.seo?.ogTitle || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    seo: { ...prev.seo, ogTitle: e.target.value } as SEO,
                  }))
                }
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label htmlFor="seo-og-desc" className="block text-sm font-medium mb-1">
                Open Graph Description
              </label>
              <textarea
                id="seo-og-desc"
                value={formData.seo?.ogDescription || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    seo: { ...prev.seo, ogDescription: e.target.value } as SEO,
                  }))
                }
                className="w-full px-3 py-2 border rounded-md"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Open Graph Image</label>
              <MediaSelector
                value={typeof formData.seo?.ogImageId === 'string' ? formData.seo.ogImageId : ''}
                onChange={(id) =>
                  setFormData((prev) => ({
                    ...prev,
                    seo: { ...prev.seo, ogImageId: id || '' } as SEO,
                  }))
                }
                label=""
              />
            </div>

            <div>
              <label htmlFor="seo-twitter" className="block text-sm font-medium mb-1">
                Twitter Card
              </label>
              <select
                id="seo-twitter"
                value={formData.seo?.twitterCard || 'summary_large_image'}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    seo: { ...prev.seo, twitterCard: e.target.value as any } as SEO,
                  }))
                }
                className="w-full px-3 py-2 border rounded-md"
              >
                {TWITTER_CARDS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="seo-schema" className="block text-sm font-medium mb-1">
                Schema Type
              </label>
              <select
                id="seo-schema"
                value={formData.seo?.schemaType || 'Article'}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    seo: { ...prev.seo, schemaType: e.target.value as any } as SEO,
                  }))
                }
                className="w-full px-3 py-2 border rounded-md"
              >
                {SCHEMA_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="post-canonical" className="block text-sm font-medium mb-1">
                Canonical URL
              </label>
              <input
                id="post-canonical"
                type="url"
                value={formData.canonicalUrl || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, canonicalUrl: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="https://example.com/post"
                dir="ltr"
              />
            </div>
          </div>

          {/* Keywords */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4">
            <h2 className="text-lg font-semibold">کلمات کلیدی</h2>

            <div>
              <label htmlFor="post-keywords" className="block text-sm font-medium mb-1">
                کلمات کلیدی (جدا شده با کاما)
              </label>
              <textarea
                id="post-keywords"
                value={(formData.keywords || []).join(', ')}
                onChange={(e) => {
                  const keywords = e.target.value
                    .split(',')
                    .map((k) => k.trim())
                    .filter((k) => k.length > 0);
                  setFormData((prev) => ({ ...prev, keywords }));
                }}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="کلمه کلیدی ۱, کلمه کلیدی ۲, کلمه کلیدی ۳"
              />
              <p className="text-xs text-gray-500 mt-1">کلمات کلیدی را با کاما از هم جدا کنید</p>
            </div>

            {keywordDensity.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium mb-3">تحلیل چگالی کلمات کلیدی</h3>
                <div className="space-y-3">
                  {keywordDensity.map((item, idx) => {
                    const densityPercent = Math.min(item.density, 5);
                    const isOptimal = item.density >= 1 && item.density <= 3;
                    const isHigh = item.density > 3;

                    return (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-gray-900">{item.keyword}</span>
                            <span className="text-xs text-gray-500 mr-2">
                              ({item.count} بار در محتوا)
                            </span>
                          </div>
                          <span
                            className={`text-sm font-bold ${
                              isOptimal ? 'text-green-600' : isHigh ? 'text-yellow-600' : 'text-red-600'
                            }`}
                          >
                            {item.density.toFixed(2)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isOptimal ? 'bg-green-500' : isHigh ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${(densityPercent / 5) * 100}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          {isOptimal && (
                            <span className="text-green-600 flex items-center gap-1">
                              <span>✓</span>
                              <span>چگالی مناسب</span>
                            </span>
                          )}
                          {isHigh && (
                            <span className="text-yellow-600 flex items-center gap-1">
                              <span>⚠</span>
                              <span>چگالی بالا - ممکن است اسپم تلقی شود</span>
                            </span>
                          )}
                          {!isOptimal && !isHigh && (
                            <span className="text-red-600 flex items-center gap-1">
                              <span>!</span>
                              <span>چگالی پایین - باید بیشتر استفاده شود</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <strong>راهنمای چگالی:</strong> چگالی مناسب بین 1-3% است. کمتر از 1% ممکن است
                    برای SEO کافی نباشد و بیشتر از 3% ممکن است به عنوان اسپم تلقی شود.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:space-y-6">
          {/* Publish */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4">
            <h2 className="text-lg font-semibold">انتشار</h2>

            <div>
              <label htmlFor="post-status" className="block text-sm font-medium mb-1">
                وضعیت
              </label>
              <select
                id="post-status"
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as PostStatus }))}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="draft">پیش‌نویس</option>
                <option value="scheduled">زمان‌بندی شده</option>
                <option value="published">منتشر شده</option>
              </select>
            </div>

            {(formData.status === 'scheduled' || formData.status === 'published') && (
              <div>
                <label className="block text-sm font-medium mb-1">تاریخ انتشار</label>
                <DatePicker
                  value={publishPickerValue}
                  onChange={(val: any) => {
                    setPublishPickerValue(val || null);
                    if (!val) {
                      setFormData((prev) => ({ ...prev, publishAt: '' }));
                      return;
                    }
                    const v = Array.isArray(val) ? val[0] : val;
                    try {
                      const jsDate = typeof v?.toDate === 'function' ? v.toDate() : new Date(v);
                      if (jsDate && !isNaN(jsDate.getTime())) {
                        setFormData((prev) => ({ ...prev, publishAt: jsDate.toISOString() }));
                      }
                    } catch {
                      /* ignore */
                    }
                  }}
                  calendar={persian}
                  locale={persian_fa}
                  format="YYYY/MM/DD HH:mm"
                  plugins={[<TimePicker key="time" position="bottom" />]}
                  className="w-full"
                  style={{ width: '100%' }}
                />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFeatured || false}
                onChange={(e) => setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">پست ویژه</span>
            </label>
          </div>

          {/* Cover image */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4">
            <h2 className="text-lg font-semibold">تصویر شاخص</h2>
            <MediaSelector
              value={formData.coverImageId}
              onChange={(id) => setFormData((prev) => ({ ...prev, coverImageId: id || '' }))}
              label=""
            />
          </div>

          {/* Categories */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">دسته‌بندی‌ها</h2>
              <span className="text-xs text-gray-500">{formData.categoryIds?.length || 0} انتخاب شده</span>
            </div>

            <div>
              <label htmlFor="cat-search" className="sr-only">
                جستجو در دسته‌بندی‌ها
              </label>
              <input
                id="cat-search"
                type="text"
                placeholder="جستجو در دسته‌بندی‌ها..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>

            <div className="border-t pt-3">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="نام دسته‌بندی جدید..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCategoryName.trim()) {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 border rounded-md text-sm"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || creatingCategory}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm whitespace-nowrap"
                >
                  {creatingCategory ? '...' : '+ افزودن'}
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {categories
                .filter(
                  (cat) =>
                    cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                    cat.slug.toLowerCase().includes(categorySearch.toLowerCase())
                )
                .map((cat) => {
                  const selected = formData.categoryIds?.includes(cat._id);
                  return (
                    <label
                      key={cat._id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected || false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData((prev) => ({
                              ...prev,
                              categoryIds: [...(prev.categoryIds || []), cat._id],
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              categoryIds: (prev.categoryIds || []).filter((c) => c !== cat._id),
                            }));
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm flex-1">{cat.name}</span>
                      {selected && <span className="text-xs text-blue-600">✓</span>}
                    </label>
                  );
                })}
              {categories.filter(
                (cat) =>
                  cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                  cat.slug.toLowerCase().includes(categorySearch.toLowerCase())
              ).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">دسته‌بندی‌ای یافت نشد</p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">برچسب‌ها</h2>
              <span className="text-xs text-gray-500">{formData.tags?.length || 0} انتخاب شده</span>
            </div>

            <div>
              <label htmlFor="tag-search" className="sr-only">
                جستجو در برچسب‌ها
              </label>
              <input
                id="tag-search"
                type="text"
                placeholder="جستجو در برچسب‌ها..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>

            <div className="border-t pt-3">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="نام برچسب جدید..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTagName.trim()) {
                      e.preventDefault();
                      handleCreateTag();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 border rounded-md text-sm"
                />
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || creatingTag}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm whitespace-nowrap"
                >
                  {creatingTag ? '...' : '+ افزودن'}
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tags
                .filter(
                  (tag) =>
                    tag.name.toLowerCase().includes(tagSearch.toLowerCase()) ||
                    tag.slug.toLowerCase().includes(tagSearch.toLowerCase())
                )
                .map((tag) => {
                  const selected = formData.tags?.includes(tag._id);
                  return (
                    <label
                      key={tag._id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected || false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData((prev) => ({
                              ...prev,
                              tags: [...(prev.tags || []), tag._id],
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              tags: (prev.tags || []).filter((t) => t !== tag._id),
                            }));
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm flex-1">{tag.name}</span>
                      {selected && <span className="text-xs text-blue-600">✓</span>}
                    </label>
                  );
                })}
              {tags.filter(
                (tag) =>
                  tag.name.toLowerCase().includes(tagSearch.toLowerCase()) ||
                  tag.slug.toLowerCase().includes(tagSearch.toLowerCase())
              ).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">برچسبی یافت نشد</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
