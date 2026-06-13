import Link from 'next/link';
import { FileText, Folder, Tag, Image as ImageIcon, TrendingUp, Eye } from 'lucide-react';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

async function fetchTotals() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3001}`;
    const fetchOpts = { next: { revalidate: 30 } };
    const [allRes, draftsRes, publishedRes, catsRes, tagsRes, mediaRes, recentRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/posts?status=all&limit=1`, fetchOpts).then((r) => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/v1/posts?status=draft&limit=1`, fetchOpts).then((r) => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/v1/posts?status=published&limit=1`, fetchOpts).then((r) => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/v1/categories`, fetchOpts).then((r) => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/v1/tags`, fetchOpts).then((r) => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/v1/media?limit=1`, fetchOpts).then((r) => r.json()).catch(() => ({})),
      fetch(`${baseUrl}/api/v1/posts?status=all&limit=5`, fetchOpts).then((r) => r.json()).catch(() => ({ items: [] })),
    ]);

    return {
      totalPosts: Number(allRes?.total || 0),
      totalDrafts: Number(draftsRes?.total || 0),
      totalPublished: Number(publishedRes?.total || 0),
      totalCategories: Number(catsRes?.items?.length || 0),
      totalTags: Number(tagsRes?.items?.length || 0),
      totalMedia: Number(mediaRes?.total || 0),
      recentPosts: Array.isArray(recentRes?.items) ? recentRes.items : [],
    };
  } catch {
    return { totalPosts: 0, totalDrafts: 0, totalPublished: 0, totalCategories: 0, totalTags: 0, totalMedia: 0, recentPosts: [] };
  }
}

export default async function DashboardPage() {
  const data = await fetchTotals();

  const stats = [
    { label: 'Posts', value: data.totalPosts, icon: FileText, color: 'bg-blue-500', href: '/posts' },
    { label: 'Categories', value: data.totalCategories, icon: Folder, color: 'bg-green-500', href: '/categories' },
    { label: 'Tags', value: data.totalTags, icon: Tag, color: 'bg-purple-500', href: '/tags' },
    { label: 'Media', value: data.totalMedia, icon: ImageIcon, color: 'bg-orange-500', href: '/media' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 lg:p-8 text-white shadow-lg">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">Welcome to CMS Platform</h1>
        <p className="text-blue-100 text-sm lg:text-base">Unified admin panel + public blog + API in one project</p>
        <div className="mt-3 text-xs text-blue-200 flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span>Secure authentication with HttpOnly cookies</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all hover:border-blue-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{s.label}</p>
                  <p className="text-3xl font-bold">{s.value}</p>
                </div>
                <div className={`${s.color} p-4 rounded-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Recent Posts</h2>
          {data.recentPosts.length === 0 ? (
            <p className="text-gray-500 text-sm">No posts yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentPosts.map((p: any) => (
                <div key={p._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.title}</p>
                    <p className="text-sm text-gray-500">{new Date(p.createdAt).toLocaleDateString('fa-IR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/posts" className="block mt-4 text-center text-blue-600 hover:text-blue-700 font-medium">
            View all posts →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/posts/new" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-4 text-center font-medium">
              New Post
            </Link>
            <Link href="/categories/new" className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-4 text-center font-medium">
              New Category
            </Link>
            <Link href="/media" className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg p-4 text-center font-medium">
              Upload Media
            </Link>
            <Link href="/users" className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-4 text-center font-medium">
              Manage Users
            </Link>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Showing up to {DEFAULT_PAGE_SIZE} items per page
      </div>
    </div>
  );
}
