#!/bin/bash
# اسکریپت تست API users با پشتیبانی Bearer Token
# استفاده: ./scripts/api-users.sh <email> <password> [command]
#   commands: list, admin, search=<text>, page=<n>

set -e

API_URL="${API_URL:-https://panel.bozorgani.ir/api/v1}"
EMAIL="${1:-}"
PASSWORD="${2:-}"
COMMAND="${3:-list}"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "استفاده: $0 <email> <password> [command]"
  echo ""
  echo "Commands:"
  echo "  list              - لیست همه کاربران (پیش‌فرض)"
  echo "  admin             - فقط مدیران"
  echo "  search=<text>     - جستجو در ایمیل/نام"
  echo "  page=<n>          - شماره صفحه"
  echo "  limit=<n>         - تعداد در صفحه"
  echo ""
  echo "مثال:"
  echo "  $0 admin@example.com MyPass123 list"
  echo "  $0 admin@example.com MyPass123 admin"
  echo "  $0 admin@example.com MyPass123 search=ali"
  exit 1
fi

echo "=== لاگین ==="
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if ! echo "$LOGIN_RESPONSE" | grep -q '"ok":true'; then
  echo "✗ لاگین ناموفق:"
  echo "$LOGIN_RESPONSE" | head -c 500
  exit 1
fi

# استخراج token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -oP '"token":"\K[^"]+' | head -1)
echo "✓ لاگین موفق - Token دریافت شد"

echo ""
echo "=== درخواست API ==="

# ساخت URL با query params
case "$COMMAND" in
  list)
    URL="$API_URL/users"
    DESC="همه کاربران"
    ;;
  admin)
    URL="$API_URL/users?role=admin"
    DESC="فقط مدیران"
    ;;
  search=*)
    SEARCH="${COMMAND#search=}"
    URL="$API_URL/users?search=$SEARCH"
    DESC="جستجو: $SEARCH"
    ;;
  page=*)
    PAGE="${COMMAND#page=}"
    URL="$API_URL/users?page=$PAGE"
    DESC="صفحه: $PAGE"
    ;;
  limit=*)
    LIMIT="${COMMAND#limit=}"
    URL="$API_URL/users?limit=$LIMIT"
    DESC="تعداد در صفحه: $LIMIT"
    ;;
  *)
    URL="$API_URL/users?$COMMAND"
    DESC="Custom: $COMMAND"
    ;;
esac

echo "URL: $URL"
echo "Filter: $DESC"
echo ""
echo "--- پاسخ ---"

curl -s "$URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool 2>/dev/null || echo "(پاسخ خام JSON نیست)"

echo ""
echo "--- خلاصه ---"
curl -s "$URL" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data.get('ok'):
        items = data.get('items', [])
        total = data.get('total', 0)
        print(f'تعداد کل: {total}')
        print(f'تعداد نمایش داده شده: {len(items)}')
        print('')
        for u in items:
            role = u.get('role', '?')
            email = u.get('email', '?')
            name = u.get('name', '(بدون نام)')
            print(f'  - {email} | {name} | {role}')
except:
    print('(خطا در parse)')
"
