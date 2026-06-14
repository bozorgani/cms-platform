// Centralized Persian error/success messages
// Used throughout the API and UI for consistent Persian text

export const MESSAGES = {
  // ============== Auth ==============
  'auth.invalidCredentials': 'ایمیل یا رمز عبور اشتباه است',
  'auth.invalid2fa': 'کد تأیید دو مرحله‌ای اشتباه است',
  'auth.emailRequired': 'ایمیل الزامی است',
  'auth.passwordRequired': 'رمز عبور الزامی است',
  'auth.emailAndPasswordRequired': 'ایمیل و رمز عبور الزامی هستند',
  'auth.notAuthenticated': 'احراز هویت نشده‌اید',
  'auth.invalidToken': 'توکن نامعتبر است',
  'auth.tooManyAttempts': 'تلاش‌های زیاد. لطفاً بعداً دوباره تلاش کنید',
  'auth.tooManyRequests': 'درخواست‌های زیاد. لطفاً کمی صبر کنید',
  'auth.unauthorized': 'دسترسی غیرمجاز',
  'auth.forbidden': 'دسترسی ممنوع',
  'auth.enter2fa': 'کد تأیید دو مرحله‌ای را وارد کنید',
  'auth.2faError': 'خطا در تأیید دو مرحله‌ای',
  'auth.loginSuccess': 'ورود موفقیت‌آمیز',
  'auth.loginFailed': 'ورود ناموفق',
  'auth.invalidRequest': 'درخواست نامعتبر',
  'auth.passwordMinLength': 'رمز عبور باید حداقل ۸ کاراکتر باشد',
  'auth.rateLimit': 'تعداد تلاش‌ها زیاد است. لطفاً بعداً دوباره تلاش کنید',
  'auth.loggedOut': 'خارج شدید',
  'auth.invalidRole': 'نقش نامعتبر',
  'auth.cannotDeleteSelf': 'نمی‌توانید حساب خود را حذف کنید',

  // ============== Database ==============
  'db.unavailable': 'پایگاه داده در دسترس نیست',
  'db.connectionFailed': 'خطا در اتصال به پایگاه داده',

  // ============== Generic ==============
  'error.invalidRequest': 'درخواست نامعتبر',
  'error.notFound': 'یافت نشد',
  'error.unauthorized': 'دسترسی غیرمجاز',
  'error.forbidden': 'دسترسی ممنوع',
  'error.serverError': 'خطای سرور',
  'error.network': 'خطای شبکه',

  // ============== Resources ==============
  'resource.notFound': 'مورد یافت نشد',
  'resource.createSuccess': 'با موفقیت ایجاد شد',
  'resource.updateSuccess': 'با موفقیت به‌روزرسانی شد',
  'resource.deleteSuccess': 'با موفقیت حذف شد',
  'resource.deleteConfirm': 'آیا از حذف این مورد اطمینان دارید؟',
  'resource.emailExists': 'این ایمیل قبلاً ثبت شده',

  // ============== Media ==============
  'media.noFile': 'فایلی انتخاب نشده',
  'media.invalidType': 'نوع فایل نامعتبر',
  'media.tooLarge': 'حجم فایل زیاد است',
  'media.uploadSuccess': 'فایل با موفقیت آپلود شد',
  'media.uploadFailed': 'خطا در آپلود فایل',
  'media.deleteFailed': 'خطا در حذف فایل',

  // ============== Settings ==============
  'settings.saveSuccess': 'تنظیمات با موفقیت ذخیره شد',
  'settings.saveFailed': 'خطا در ذخیره تنظیمات',
  'settings.reset': 'تنظیمات به حالت پیش‌فرض بازنشانی شد',

  // ============== Health ==============
  'health.ok': 'سرویس فعال',
  'health.error': 'سرویس در دسترس نیست',

  // ============== Users ==============
  'user.createSuccess': 'کاربر با موفقیت ایجاد شد',
  'user.updateSuccess': 'اطلاعات کاربر به‌روزرسانی شد',
  'user.deleteSuccess': 'کاربر حذف شد',
  'user.notFound': 'کاربر یافت نشد',
  'user.emailExists': 'ایمیل قبلاً استفاده شده',
  'user.invalidEmail': 'ایمیل نامعتبر',
  'user.passwordMismatch': 'رمزهای عبور مطابقت ندارند',
} as const;

export type MessageKey = keyof typeof MESSAGES;

export function t(key: MessageKey): string {
  return MESSAGES[key];
}
