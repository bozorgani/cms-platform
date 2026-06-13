"use client";
import { useEffect, useState } from "react";
import { Users as UsersIcon, Trash2, Shield } from "lucide-react";
import { listUsers, deleteUser } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Skeleton, TableRowSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";
import type { User } from "@/types";

export default function UsersPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await listUsers();
      if (res.ok && res.items) {
        setUsers(res.items);
        const me = document.cookie.match(/cms-user-info=([^;]+)/);
        if (me) {
          try {
            const parsed = JSON.parse(decodeURIComponent(me[1]));
            setCurrentUserId(parsed._id);
          } catch (e) {}
        }
      } else {
        toast.error(res.error || "خطا در بارگذاری کاربران");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(user: User) {
    if (user._id === currentUserId) {
      toast.warning("نمی‌توانید خودتان را حذف کنید");
      return;
    }
    const confirmed = await confirm({
      title: "حذف کاربر",
      message: `آیا از حذف "${user.email}" اطمینان دارید؟`,
      confirmLabel: "حذف",
    });
    if (!confirmed) return;
    const res = await deleteUser(user._id);
    if (res.ok) {
      toast.success("کاربر با موفقیت حذف شد");
      loadUsers();
    } else {
      toast.error(res.error || "خطا در حذف کاربر");
    }
  }

  const roleLabels: Record<string, string> = {
    admin: "مدیر کل",
    editor: "ویرایشگر",
    author: "نویسنده",
    seo: "سئو",
    viewer: "بیننده",
  };

  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800",
    editor: "bg-blue-100 text-blue-800",
    author: "bg-green-100 text-green-800",
    seo: "bg-purple-100 text-purple-800",
    viewer: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">کاربران</h1>
        <p className="text-gray-600 mt-1 text-sm lg:text-base">مدیریت کاربران سیستم</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="p-3 lg:p-4 text-right whitespace-nowrap">نام</th>
                <th className="p-3 lg:p-4 text-right whitespace-nowrap">ایمیل</th>
                <th className="p-3 lg:p-4 text-right whitespace-nowrap">نقش</th>
                <th className="p-3 lg:p-4 text-right whitespace-nowrap hidden md:table-cell">تاریخ ایجاد</th>
                <th className="p-3 lg:p-4 text-right whitespace-nowrap">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-0">
                    <EmptyState
                      icon={<UsersIcon className="w-12 h-12 text-gray-300" />}
                      title="کاربری وجود ندارد"
                      description="برای شروع، کاربران را ایجاد کنید."
                    />
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 lg:p-4 font-medium">
                      <div className="flex items-center gap-2">
                        {user.role === "admin" && <Shield className="w-4 h-4 text-red-600" />}
                        {user.name || <span className="text-gray-400">بدون نام</span>}
                      </div>
                    </td>
                    <td className="p-3 lg:p-4 text-gray-600" dir="ltr">{user.email}</td>
                    <td className="p-3 lg:p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[user.role] || "bg-gray-100"}`}>
                        {roleLabels[user.role] || user.role}
                      </span>
                    </td>
                    <td className="p-3 lg:p-4 text-gray-600 text-xs hidden md:table-cell">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("fa-IR") : "-"}
                    </td>
                    <td className="p-3 lg:p-4">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(user)}
                        disabled={user._id === currentUserId}
                        leftIcon={<Trash2 className="w-3 h-3" />}
                      >
                        حذف
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">نکته</p>
        <p>برای ایجاد کاربر جدید، از CLI script استفاده کنید:</p>
        <pre className="bg-white p-2 rounded mt-2 text-xs overflow-x-auto" dir="ltr">npm run create-user -- email@example.com password &quot;Name&quot; admin</pre>
      </div>
    </div>
  );
}
