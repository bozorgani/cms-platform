/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { useEffect, useState, useCallback } from 'react';
import { listMedia, getMediaUrl } from '@/lib/api';
import { isImage } from '@/lib/utils';
import type { TiptapContent, Media } from '@/types';

interface RichTextEditorProps {
  content: TiptapContent | null;
  onChange: (content: TiptapContent) => void;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [mediaItems, setMediaItems] = useState<Media[]>([]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as TiptapContent);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const loadMedia = useCallback(async () => {
    const res = await listMedia({ limit: 50 });
    if (res.ok && res.items) setMediaItems(res.items);
  }, []);

  function handleInsertImage(media: Media) {
    if (!editor) return;
    const imageUrl = getMediaUrl(media.path);
    editor.chain().focus().setImage({ src: imageUrl, alt: media.alt || '' }).run();
    setShowImageModal(false);
  }

  function handleOpenLinkModal() {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    const attrs = editor.getAttributes('link');

    if (attrs.href) {
      setLinkUrl(attrs.href);
      setLinkText(selectedText || attrs.href);
    } else {
      setLinkUrl('');
      setLinkText(selectedText);
    }
    setShowLinkModal(true);
  }

  function handleInsertLink() {
    if (!editor || !linkUrl.trim()) return;

    const url = linkUrl.trim().startsWith('http://') || linkUrl.trim().startsWith('https://')
      ? linkUrl.trim()
      : `https://${linkUrl.trim()}`;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');

    if (selectedText && !linkText.trim()) {
      editor.chain().focus().setLink({ href: url }).run();
    } else if (linkText.trim()) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: linkText.trim(),
          marks: [{ type: 'link', attrs: { href: url } }],
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: url,
          marks: [{ type: 'link', attrs: { href: url } }],
        })
        .run();
    }

    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
  }

  function handleRemoveLink() {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setShowLinkModal(false);
  }

  if (!editor) {
    return (
      <div className="border rounded-md p-4 min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"
            aria-hidden="true"
          />
          <p className="mt-2 text-sm text-gray-500">در حال بارگذاری ویرایشگر...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div
        className="border-b bg-gray-50 p-2 flex gap-1 flex-wrap"
        role="toolbar"
        aria-label="نوار ابزار ویرایشگر"
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 text-sm rounded hover:bg-gray-200 ${
            editor.isActive('bold') ? 'bg-gray-300' : ''
          }`}
          aria-label="بولد"
          title="بولد"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 text-sm rounded hover:bg-gray-200 ${
            editor.isActive('italic') ? 'bg-gray-300' : ''
          }`}
          aria-label="ایتالیک"
          title="ایتالیک"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 text-sm rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''
          }`}
          aria-label="سرفصل ۱"
          title="سرفصل ۱"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 text-sm rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''
          }`}
          aria-label="سرفصل ۲"
          title="سرفصل ۲"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1 text-sm rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : ''
          }`}
          aria-label="سرفصل ۳"
          title="سرفصل ۳"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 text-sm rounded hover:bg-gray-200 ${
            editor.isActive('bulletList') ? 'bg-gray-300' : ''
          }`}
          aria-label="لیست نامرتب"
          title="لیست نامرتب"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 text-sm rounded hover:bg-gray-200 ${
            editor.isActive('orderedList') ? 'bg-gray-300' : ''
          }`}
          aria-label="لیست مرتب"
          title="لیست مرتب"
        >
          1.
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-3 py-1 text-sm rounded hover:bg-gray-200 ${
            editor.isActive('blockquote') ? 'bg-gray-300' : ''
          }`}
          aria-label="نقل قول"
          title="نقل قول"
        >
          "
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" aria-hidden="true" />
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`px-3 py-1 text-sm rounded hover:bg-gray-200 ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''
          }`}
          aria-label="چپ چین"
          title="چپ چین"
        >
          ⬅
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`px-3 py-1 text-sm rounded hover:bg-gray-200 ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''
          }`}
          aria-label="وسط چین"
          title="وسط چین"
        >
          ⬌
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`px-3 py-1 text-sm rounded hover:bg-gray-200 ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''
          }`}
          aria-label="راست چین"
          title="راست چین"
        >
          ➡
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`px-3 py-1 text-sm rounded hover:bg-gray-200 ${
            editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-300' : ''
          }`}
          aria-label="چاستیفای"
          title="چاستیفای"
        >
          ⬌⬌
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" aria-hidden="true" />
        <button
          type="button"
          onClick={handleOpenLinkModal}
          className={`px-3 py-1 text-sm rounded hover:bg-gray-200 ${
            editor.isActive('link') ? 'bg-gray-300' : ''
          }`}
          aria-label="افزودن لینک"
          title="افزودن لینک"
        >
          🔗
        </button>
        {editor.isActive('link') && (
          <button
            type="button"
            onClick={handleRemoveLink}
            className="px-3 py-1 text-sm rounded hover:bg-gray-200"
            aria-label="حذف لینک"
            title="حذف لینک"
          >
            🔗✕
          </button>
        )}
        <div className="w-px h-6 bg-gray-300 mx-1" aria-hidden="true" />
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="px-3 py-1 text-sm rounded hover:bg-gray-200"
          aria-label="خط افقی"
          title="خط افقی"
        >
          ─
        </button>
        <button
          type="button"
          onClick={() => {
            setShowImageModal(true);
            loadMedia();
          }}
          className="px-3 py-1 text-sm rounded hover:bg-gray-200"
          aria-label="درج تصویر"
          title="درج تصویر"
        >
          🖼️
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="px-3 py-1 text-sm rounded hover:bg-gray-200 disabled:opacity-50"
          aria-label="واگرد"
          title="واگرد"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="px-3 py-1 text-sm rounded hover:bg-gray-200 disabled:opacity-50"
          aria-label="جلو"
          title="جلو"
        >
          ↷
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Image Modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="انتخاب تصویر"
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">انتخاب تصویر برای درج در محتوا</h3>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="بستن"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {mediaItems
                  .filter((item) => isImage(item.path))
                  .map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => handleInsertImage(item)}
                      className="border-2 border-gray-200 rounded-md overflow-hidden hover:border-blue-500 transition-all"
                    >
                      <div className="aspect-square bg-gray-100">
                        <img
                          src={getMediaUrl(item.path)}
                          alt={item.alt || ''}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      {item.alt && (
                        <div className="p-2 bg-white">
                          <p className="text-xs text-gray-600 truncate">{item.alt}</p>
                        </div>
                      )}
                    </button>
                  ))}
              </div>

              {mediaItems.filter((item) => isImage(item.path)).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>هنوز تصویری آپلود نشده است</p>
                  <p className="text-sm mt-2">لطفا ابتدا از صفحه مدیریت رسانه تصویر آپلود کنید</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowLinkModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="افزودن لینک"
        >
          <div
            className="bg-white rounded-lg max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">افزودن لینک</h3>
              <button
                type="button"
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkUrl('');
                  setLinkText('');
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="بستن"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 mb-1">
                  آدرس URL
                </label>
                <input
                  id="link-url"
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInsertLink();
                    }
                  }}
                  autoFocus
                  dir="ltr"
                />
              </div>
              <div>
                <label htmlFor="link-text" className="block text-sm font-medium text-gray-700 mb-1">
                  متن لینک (اختیاری)
                </label>
                <input
                  id="link-text"
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="متن نمایشی لینک"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInsertLink();
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  اگر متن خالی باشد، متن انتخاب شده یا URL استفاده می‌شود
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkModal(false);
                    setLinkUrl('');
                    setLinkText('');
                  }}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  انصراف
                </button>
                {editor?.isActive('link') && (
                  <button
                    type="button"
                    onClick={handleRemoveLink}
                    className="px-4 py-2 text-sm text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                  >
                    حذف لینک
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleInsertLink}
                  disabled={!linkUrl.trim()}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  افزودن لینک
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
