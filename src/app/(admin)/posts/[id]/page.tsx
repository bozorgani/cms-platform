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
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { MediaSelector } from '@/components/admin/MediaSelector';
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


const KEYWORD_STOP_WORDS = new Set([
  'از', 'به', 'در', 'با', 'برای', 'این', 'آن', 'های', 'ها', 'و', 'یا', 'را', 'که', 'یک', 'می',
  'شود', 'شد', 'است', 'هست', 'نیست', 'کرد', 'کردن', 'روی', 'تا', 'اما', 'اگر', 'هر', 'هم',
  'the', 'and', 'or', 'for', 'with', 'from', 'this', 'that', 'you', 'your', 'are', 'was', 'were',
  'درصد', 'سال', 'ماه', 'روز', 'مورد', 'روش', 'بخش', 'صورت', 'طور', 'چگونه', 'چرا', 'چیست',
]);

const KEYWORD_SPLIT_REGEX = /[,،;؛\n]+/;
const KEYWORD_TEXT_REGEX = /[^؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿a-z0-9\s-]/g;

function normalizeKeyword(value: string): string {
  return value
    .toLowerCase()
    .replace(KEYWORD_TEXT_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueKeywords(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const keyword = normalizeKeyword(value);
    if (!keyword || seen.has(keyword)) continue;
    seen.add(keyword);
    out.push(keyword);
  }
  return out;
}

function tokenizeKeywordText(text: string): string[] {
  return normalizeKeyword(text)
    .split(/\s+/)
    .filter((word) => word.length > 1 && !KEYWORD_STOP_WORDS.has(word) && !/^\d+$/.test(word));
}

function ngrams(words: string[], size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i <= words.length - size; i++) {
    const chunk = words.slice(i, i + size);
    if (chunk.some((word) => KEYWORD_STOP_WORDS.has(word))) continue;
    out.push(chunk.join(' '));
  }
  return out;
}

interface KeywordSuggestionOptions {
  focusKeyword?: string;
  selectedKeywords?: string[];
  preferLongTail?: boolean;
  includeSingleWords?: boolean;
  limit?: number;
}

function splitSentences(text: string): string[] {
  return text
    .split(/[.!؟?\n]+/)
    .map((sentence) => normalizeKeyword(sentence))
    .filter(Boolean);
}

function generateKeywordSuggestions(
  selectedKeywords: string[],
  content: TiptapContent | null,
  title = '',
  excerpt = '',
  options: KeywordSuggestionOptions = {}
): string[] {
  const contentText = extractTextFromContent(content as any);
  const fullText = [title, excerpt, contentText].filter(Boolean).join(' ');
  const fullWords = tokenizeKeywordText(fullText);
  const titleText = normalizeKeyword(title);
  const excerptText = normalizeKeyword(excerpt);
  const focusKeyword = normalizeKeyword(options.focusKeyword || '');
  const selected = new Set([...(selectedKeywords || []), ...(options.selectedKeywords || [])].map(normalizeKeyword));

  if (fullWords.length === 0) return [];

  const sentences = splitSentences(fullText);
  const focusSentences = focusKeyword
    ? sentences.filter((sentence) => sentence.includes(focusKeyword))
    : [];

  const scores = new Map<string, number>();
  const sizes = options.includeSingleWords ? [3, 2, 1] : [4, 3, 2];

  for (const size of sizes) {
    for (const phrase of ngrams(fullWords, size)) {
      if (phrase.length < 3 || selected.has(phrase) || phrase === focusKeyword) continue;
      if (!options.includeSingleWords && phrase.split(' ').length < 2) continue;

      const phraseLength = phrase.split(' ').length;
      const longTailBoost = options.preferLongTail ? phraseLength * 3 : phraseLength * 1.5;
      const titleBoost = titleText.includes(phrase) ? 10 : 0;
      const excerptBoost = excerptText.includes(phrase) ? 5 : 0;
      const focusBoost = focusSentences.some((sentence) => sentence.includes(phrase)) ? 7 : 0;
      const exactFocusPartBoost = focusKeyword && phrase.includes(focusKeyword) ? 4 : 0;

      scores.set(
        phrase,
        (scores.get(phrase) || 0) + 1 + longTailBoost + titleBoost + excerptBoost + focusBoost + exactFocusPartBoost
      );
    }
  }

  return [...scores.entries()]
    .filter(([phrase]) => !selected.has(phrase))
    .sort((a, b) => b[1] - a[1] || b[0].split(' ').length - a[0].split(' ').length || a[0].localeCompare(b[0], 'fa'))
    .slice(0, options.limit || 18)
    .map(([phrase]) => phrase);
}

function allSeoKeywords(focusKeyword?: string, lsiKeywords?: string[], keywords?: string[]): string[] {
  return uniqueKeywords([focusKeyword || '', ...(lsiKeywords || []), ...(keywords || [])]);
}


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
  const [keywordInput, setKeywordInput] = useState('');
  const [lsiKeywordInput, setLsiKeywordInput] = useState('');

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
    focusKeyword: '',
    lsiKeywords: [],
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
        focusKeyword: post.focusKeyword || '',
        lsiKeywords: Array.isArray(post.lsiKeywords) ? post.lsiKeywords : [],
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

  function addKeywords(raw: string | string[]) {
    const values = Array.isArray(raw) ? raw : raw.split(KEYWORD_SPLIT_REGEX);
    const nextKeywords = uniqueKeywords([...(formData.keywords || []), ...values]);
    setFormData((prev) => ({ ...prev, keywords: nextKeywords }));
    setKeywordInput('');
  }

  function removeKeyword(keyword: string) {
    const normalized = normalizeKeyword(keyword);
    setFormData((prev) => ({
      ...prev,
      keywords: (prev.keywords || []).filter((item) => normalizeKeyword(item) !== normalized),
    }));
  }

  function addLsiKeywords(raw: string | string[]) {
    const values = Array.isArray(raw) ? raw : raw.split(KEYWORD_SPLIT_REGEX);
    const nextKeywords = uniqueKeywords([...(formData.lsiKeywords || []), ...values]);
    setFormData((prev) => ({ ...prev, lsiKeywords: nextKeywords }));
    setLsiKeywordInput('');
  }

  function removeLsiKeyword(keyword: string) {
    const normalized = normalizeKeyword(keyword);
    setFormData((prev) => ({
      ...prev,
      lsiKeywords: (prev.lsiKeywords || []).filter((item) => normalizeKeyword(item) !== normalized),
    }));
  }

  function setFocusKeyword(keyword: string) {
    const normalized = normalizeKeyword(keyword);
    setFormData((prev) => ({
      ...prev,
      focusKeyword: normalized,
      lsiKeywords: (prev.lsiKeywords || []).filter((item) => normalizeKeyword(item) !== normalized),
      keywords: (prev.keywords || []).filter((item) => normalizeKeyword(item) !== normalized),
    }));
  }

  function handleKeywordInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === '،') {
      e.preventDefault();
      if (keywordInput.trim()) addKeywords(keywordInput);
    }
    if (e.key === 'Backspace' && !keywordInput && formData.keywords?.length) {
      removeKeyword(formData.keywords[formData.keywords.length - 1]);
    }
  }

  function handleLsiKeywordInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === '،') {
      e.preventDefault();
      if (lsiKeywordInput.trim()) addLsiKeywords(lsiKeywordInput);
    }
    if (e.key === 'Backspace' && !lsiKeywordInput && formData.lsiKeywords?.length) {
      removeLsiKeyword(formData.lsiKeywords[formData.lsiKeywords.length - 1]);
    }
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
        focusKeyword: formData.focusKeyword?.trim() || undefined,
        lsiKeywords: formData.lsiKeywords?.length ? formData.lsiKeywords : undefined,
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

  const allSelectedSeoKeywords = useMemo(
    () => allSeoKeywords(formData.focusKeyword, formData.lsiKeywords, formData.keywords),
    [formData.focusKeyword, formData.lsiKeywords, formData.keywords]
  );

  const keywordDensity = useMemo(
    () => calculateKeywordDensity(allSelectedSeoKeywords, formData.content, formData.title, formData.excerpt || ''),
    [allSelectedSeoKeywords, formData.content, formData.title, formData.excerpt]
  );

  const primaryKeywordSuggestions = useMemo(
    () => generateKeywordSuggestions(allSelectedSeoKeywords, formData.content, formData.title, formData.excerpt || '', {
      preferLongTail: true,
      includeSingleWords: false,
      limit: 10,
    }),
    [allSelectedSeoKeywords, formData.content, formData.title, formData.excerpt]
  );

  const lsiKeywordSuggestions = useMemo(
    () => generateKeywordSuggestions(allSelectedSeoKeywords, formData.content, formData.title, formData.excerpt || '', {
      focusKeyword: formData.focusKeyword,
      preferLongTail: false,
      includeSingleWords: true,
      limit: 18,
    }),
    [allSelectedSeoKeywords, formData.content, formData.title, formData.excerpt, formData.focusKeyword]
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

            {/* Focus Keyword */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <label htmlFor="focus-keyword" className="block text-sm font-semibold text-blue-950">
                    Keyword اصلی (Focus Keyword)
                  </label>
                  <p className="text-xs text-blue-700 mt-1">
                    مهم‌ترین عبارت هدف مقاله؛ بهتر است در عنوان، URL، مقدمه و Meta Description حضور داشته باشد.
                  </p>
                </div>
                {formData.focusKeyword && (
                  <button
                    type="button"
                    onClick={() => setFocusKeyword('')}
                    className="text-xs text-blue-700 hover:text-red-600"
                  >
                    حذف Keyword اصلی
                  </button>
                )}
              </div>

              <input
                id="focus-keyword"
                type="text"
                value={formData.focusKeyword || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, focusKeyword: e.target.value }))}
                onBlur={(e) => setFocusKeyword(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                placeholder="مثلاً: ثبت شرکت در ایران"
              />

              {primaryKeywordSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-blue-900">پیشنهادهای دقیق برای Keyword اصلی:</p>
                  <div className="flex flex-wrap gap-2">
                    {primaryKeywordSuggestions.map((keyword) => (
                      <button
                        key={keyword}
                        type="button"
                        onClick={() => setFocusKeyword(keyword)}
                        className="rounded-full border border-blue-300 bg-white px-3 py-1 text-sm text-blue-800 hover:bg-blue-100"
                      >
                        انتخاب: {keyword}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* LSI Keywords */}
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label htmlFor="lsi-keywords" className="block text-sm font-semibold text-green-950">
                    LSI Keywords / کلمات مرتبط معنایی
                  </label>
                  <p className="text-xs text-green-700 mt-1">
                    عبارت‌های هم‌معنا و مرتبط که به گوگل کمک می‌کنند موضوع مقاله را بهتر بفهمد.
                  </p>
                </div>
                <span className="text-xs text-green-700">{formData.lsiKeywords?.length || 0} مورد</span>
              </div>

              <div className="min-h-14 rounded-lg border border-green-300 bg-white p-2 focus-within:ring-2 focus-within:ring-green-200 focus-within:border-green-500">
                <div className="flex flex-wrap items-center gap-2">
                  {(formData.lsiKeywords || []).map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-3 py-1 text-sm"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeLsiKeyword(keyword)}
                        className="text-green-700 hover:text-red-600 font-bold leading-none"
                        aria-label={`حذف ${keyword}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    id="lsi-keywords"
                    type="text"
                    value={lsiKeywordInput}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      if (KEYWORD_SPLIT_REGEX.test(nextValue)) {
                        addLsiKeywords(nextValue);
                      } else {
                        setLsiKeywordInput(nextValue);
                      }
                    }}
                    onKeyDown={handleLsiKeywordInputKeyDown}
                    onBlur={() => lsiKeywordInput.trim() && addLsiKeywords(lsiKeywordInput)}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text');
                      if (KEYWORD_SPLIT_REGEX.test(text)) {
                        e.preventDefault();
                        addLsiKeywords(text);
                      }
                    }}
                    className="min-w-48 flex-1 bg-transparent px-2 py-1 text-sm outline-none"
                    placeholder="مثلاً: مدارک ثبت شرکت، هزینه ثبت شرکت، شناسه ملی"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => lsiKeywordInput.trim() && addLsiKeywords(lsiKeywordInput)}
                  disabled={!lsiKeywordInput.trim()}
                  className="px-3 py-1.5 rounded-md bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  افزودن LSI
                </button>
                {(formData.lsiKeywords?.length || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, lsiKeywords: [] }))}
                    className="px-3 py-1.5 rounded-md border border-green-300 text-sm hover:bg-white"
                  >
                    پاک کردن LSIها
                  </button>
                )}
              </div>

              {lsiKeywordSuggestions.length > 0 && (
                <div className="space-y-2 border-t border-green-200 pt-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs font-medium text-green-900">
                      پیشنهادهای LSI {formData.focusKeyword ? `برای «${formData.focusKeyword}»` : 'بر اساس متن مقاله'}:
                    </p>
                    <button
                      type="button"
                      onClick={() => addLsiKeywords(lsiKeywordSuggestions.slice(0, 10))}
                      className="px-3 py-1.5 rounded-md bg-green-600 text-white text-sm hover:bg-green-700 whitespace-nowrap"
                    >
                      افزودن ۱۰ پیشنهاد اول
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lsiKeywordSuggestions.map((keyword) => (
                      <button
                        key={keyword}
                        type="button"
                        onClick={() => addLsiKeywords(keyword)}
                        className="rounded-full border border-green-300 bg-white px-3 py-1 text-sm text-green-800 hover:bg-green-100"
                      >
                        + {keyword}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Extra Keywords */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label htmlFor="post-keywords" className="block text-sm font-semibold text-gray-900">
                    کلمات کلیدی تکمیلی / Meta Keywords
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    برای عبارت‌های فرعی یا long-tailهایی که می‌خواهید در خروجی API و JSON-LD هم باشند.
                  </p>
                </div>
                <span className="text-xs text-gray-500">{formData.keywords?.length || 0} مورد</span>
              </div>

              <div className="min-h-14 rounded-lg border border-gray-300 bg-white p-2 focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-500">
                <div className="flex flex-wrap items-center gap-2">
                  {(formData.keywords || []).map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-sm"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(keyword)}
                        className="text-blue-600 hover:text-red-600 font-bold leading-none"
                        aria-label={`حذف ${keyword}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    id="post-keywords"
                    type="text"
                    value={keywordInput}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      if (KEYWORD_SPLIT_REGEX.test(nextValue)) {
                        addKeywords(nextValue);
                      } else {
                        setKeywordInput(nextValue);
                      }
                    }}
                    onKeyDown={handleKeywordInputKeyDown}
                    onBlur={() => keywordInput.trim() && addKeywords(keywordInput)}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text');
                      if (KEYWORD_SPLIT_REGEX.test(text)) {
                        e.preventDefault();
                        addKeywords(text);
                      }
                    }}
                    className="min-w-48 flex-1 bg-transparent px-2 py-1 text-sm outline-none"
                    placeholder="مثلاً: ثبت شرکت فوری، ثبت برند، روزنامه رسمی"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => keywordInput.trim() && addKeywords(keywordInput)}
                  disabled={!keywordInput.trim()}
                  className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  افزودن
                </button>
                {(formData.keywords?.length || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, keywords: [] }))}
                    className="px-3 py-1.5 rounded-md border text-sm hover:bg-white"
                  >
                    پاک کردن تکمیلی‌ها
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <strong>راهنما:</strong> یک Keyword اصلی انتخاب کنید، ۵ تا ۱۵ LSI مرتبط اضافه کنید و فقط چند keyword تکمیلی ضروری نگه دارید. Keyword stuffing نکنید؛ کیفیت و ارتباط معنایی مهم‌تر از تعداد است.
            </div>

            {keywordDensity.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium mb-3">تحلیل چگالی Keyword اصلی، LSI و کلمات تکمیلی</h3>
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
