# AirWeave — Frontend + Backend tách rời trên PostgreSQL

Bản dựng lại của app theo dõi chất lượng không khí **air-aware**, thay toàn bộ Supabase
(Auth + Database + Storage + Edge Functions + Realtime) bằng backend NestJS tự chủ chạy trên
PostgreSQL. Giao diện giữ nguyên 100% so với bản Lovable.

```
airweave-app/
├── BE/    NestJS 10 + Prisma 6 + PostgreSQL  (API, cổng 3000)
└── FE/    React 18 + Vite 5 + shadcn/ui      (giao diện, cổng 8080)
```

---

## 1. Chuẩn bị

| Yêu cầu | Ghi chú |
|---|---|
| Node.js ≥ 20 | Đã kiểm thử trên v22 |
| PostgreSQL ≥ 14 **hoặc** Docker | Dùng Docker là nhanh nhất (xem bên dưới) |

## 2. Chạy Backend

### Cách nhanh nhất — Docker (khuyến nghị)

Đã kèm sẵn `docker-compose.yml` (Postgres 16, cổng host **5433** để không đụng Postgres cài sẵn),
một migration `0_init` đã tạo sẵn, và `BE/.env` với JWT secret ngẫu nhiên. Chỉ cần:

```bash
# từ thư mục gốc airweave-app/
docker compose up -d          # bật Postgres

cd BE
npm install
npx prisma migrate deploy     # áp migration đã có sẵn → tạo 12 bảng
npm run start:dev
```

API tại `http://localhost:3000/api`, Swagger tại **`http://localhost:3000/api/docs`**.
Không cần điền gì thêm cũng chạy được — đăng ký/đăng nhập/preferences/community/air hoạt động ngay.

### Dùng Postgres có sẵn của bạn

```bash
cd BE
npm install
cp .env.example .env          # sửa DATABASE_URL, sinh JWT secret
npx prisma migrate deploy
npm run start:dev
```

Sinh secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
`.env.example` đã ghi chú đầy đủ từng biến.

### Đã kiểm thử end-to-end ✅

Toàn bộ luồng đã chạy thật với Postgres: đăng ký → `/auth/me` → lưu preferences → tạo báo cáo
cộng đồng → đăng nhập lại → demo-login → refresh token xoay vòng → guard 401 → 503 khi thiếu key
→ validation 400 → `/air/current` (Open-Meteo, không cần key) → demo login qua giao diện chạy trọn vẹn.

### Khoá bạn cần cung cấp thêm

Thiếu khoá nào thì chỉ tính năng tương ứng trả về **503 kèm thông báo tiếng Việt**, phần còn lại của app vẫn chạy.

| Biến | Lấy ở đâu | Dùng cho |
|---|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) | Đăng nhập Google |
| `WAQI_API_TOKEN` | [aqicn.org](https://aqicn.org/data-platform/token/) | Chỉ số AQI từ trạm quan trắc |
| `WINDY_API_KEY` | [api.windy.com](https://api.windy.com/keys) | Bản đồ gió |
| `MAPBOX_TOKEN` | [account.mapbox.com](https://account.mapbox.com/access-tokens/) | Tìm địa điểm + chỉ đường Smart Route |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) | Trợ lý AI (mặc định `claude-opus-4-8`) |
| `ONESIGNAL_REST_API_KEY` | Dashboard OneSignal | Push notification |

> **Google OAuth:** trong Google Cloud Console, mục *Authorized redirect URIs* phải khai đúng
> `http://localhost:3000/api/auth/google/callback` (đổi domain khi lên production).

> **Đổi nhà cung cấp AI:** đặt `AI_PROVIDER` = `anthropic` (mặc định) / `openai` / `gemini`
> rồi điền API key tương ứng.

## 3. Chạy Frontend

```bash
cd FE
npm install
npm run dev
```

Mở `http://localhost:8080`. File `FE/.env` chỉ cần `VITE_API_URL` trỏ về backend.

---

## 4. Ánh xạ Supabase → kiến trúc mới

| Supabase | Thay bằng |
|---|---|
| Supabase Auth | JWT access + refresh (xoay vòng token) + Google OAuth trong module `auth` |
| `supabase.from(...)` | REST endpoints, gọi qua `FE/src/integrations/api` |
| Supabase Storage (bucket `avatars`) | Upload multipart, phục vụ tĩnh tại `/api/uploads/avatars` |
| Supabase Realtime | WebSocket (socket.io) namespace `/community` |
| Row Level Security | Kiểm tra quyền sở hữu ngay trong service (`user_id` lấy từ JWT, không tin client) |
| Edge function `get-waqi-data` | `POST /api/air/waqi`, `POST /api/air/waqi/bounds` |
| Edge function `get-windy-key` | `GET /api/config/windy-key` |
| Edge function `ai-chat` | `POST /api/ai/chat` |
| Edge function `ai-insight` | `POST /api/ai/insight` |
| Edge function `medical-qr` | `GET /api/sos/share/:token` (công khai) |
| Edge function `send-push-notification` | `POST /api/notifications/push` |

### Cơ sở dữ liệu

11 bảng: `users`, `refresh_tokens`, `profiles`, `user_preferences`, `user_locations`,
`user_live_contexts`, `login_history`, `medical_profiles`, `medical_conditions`,
`sos_events`, `community_reports`.

Tên cột giữ nguyên `snake_case` như schema Supabase cũ nên JSON trả về khớp y hệt shape mà FE
đang dùng — không phải đổi cách đọc dữ liệu ở tầng giao diện.

---

## 5. Danh sách API

Toàn bộ endpoint có prefix `/api`. Trừ những chỗ ghi **công khai**, tất cả đều yêu cầu header
`Authorization: Bearer <access_token>`.

<details>
<summary><b>Auth</b> — 8 endpoint</summary>

| Method | Path | Mô tả |
|---|---|---|
| POST | `/auth/register` | Đăng ký (công khai) |
| POST | `/auth/login` | Đăng nhập (công khai) |
| POST | `/auth/demo-login` | Tài khoản demo, tự tạo + reset onboarding (công khai) |
| POST | `/auth/refresh` | Cấp lại access token, xoay vòng refresh token (công khai) |
| POST | `/auth/logout` | Thu hồi refresh token |
| GET | `/auth/me` | Thông tin tài khoản đang đăng nhập |
| POST | `/auth/change-password` | Đổi mật khẩu, thu hồi mọi phiên |
| GET | `/auth/login-history` | Lịch sử đăng nhập |
| GET | `/auth/google` → `/auth/google/callback` | Luồng Google OAuth (công khai) |

</details>

<details>
<summary><b>Hồ sơ, tuỳ chọn, địa điểm</b> — 13 endpoint</summary>

| Method | Path |
|---|---|
| GET / PATCH / DELETE | `/profiles/me` |
| POST | `/profiles/me/avatar` (multipart, tối đa 5MB) |
| POST | `/profiles/me/complete-onboarding` |
| GET / PUT / DELETE | `/preferences` |
| POST | `/preferences/mark-alert-sent` |
| GET / POST | `/locations` |
| PATCH / DELETE | `/locations/:id` |
| GET / PUT / DELETE | `/live-context` |

</details>

<details>
<summary><b>Y tế & SOS</b> — 12 endpoint</summary>

| Method | Path |
|---|---|
| GET / POST | `/medical/profiles` (`?include=conditions` để lấy kèm bệnh nền) |
| PATCH / DELETE | `/medical/profiles/:id` |
| GET | `/medical/conditions` |
| POST | `/medical/conditions/toggle` |
| PUT | `/medical/conditions/note` |
| DELETE | `/medical/conditions/:id` |
| GET / POST | `/sos/events` |
| DELETE | `/sos/events/:id` |
| GET | `/sos/share/:token` — **công khai**, hết hạn sau 24h |

</details>

<details>
<summary><b>Cộng đồng, không khí, AI, thông báo</b> — 15 endpoint</summary>

| Method | Path |
|---|---|
| GET / POST | `/community-reports` (hỗ trợ lọc bbox `lat1,lng1,lat2,lng2`) |
| GET | `/community-reports/mine` |
| PATCH / DELETE | `/community-reports/:id` |
| WS | namespace `/community` → sự kiện `report:new`, `report:deleted` |
| POST | `/air/waqi`, `/air/waqi/bounds` |
| GET | `/air/current`, `/air/history`, `/air/ranking` |
| POST | `/ai/chat`, `/ai/insight` |
| POST | `/notifications/push` |
| GET | `/config/windy-key`, `/config/mapbox-token`, `/config/onesignal` |

</details>

---

## 6. Ghi chú bảo mật

- Mật khẩu băm bằng bcrypt (12 vòng); refresh token lưu dưới dạng SHA-256, xoay vòng mỗi lần refresh.
- Mọi truy vấn lấy `user_id` từ JWT — không nhận `user_id` do client gửi lên.
- `user_id` không xuất hiện trong response của báo cáo cộng đồng (giữ đúng hành vi
  `REVOKE SELECT (user_id)` của bản Supabase).
- `POST /notifications/push` chỉ cho gửi cho chính mình, và tôn trọng `notify_enabled` +
  `quiet_hours` của người nhận.
- Link chia sẻ Medical ID có hạn dùng, kiểm tra định dạng UUID và giới hạn 30 request/phút.
- Rate limit toàn cục 200 request/phút, siết chặt hơn ở các route đăng nhập và AI.

## 7. Lệnh hữu ích

```bash
# BE
npm run start:dev        # dev có watch
npm run build            # biên dịch sang dist/
npx prisma studio        # xem/sửa dữ liệu bằng giao diện
npx prisma migrate deploy   # áp migration trên production

# FE
npm run dev              # dev server cổng 8080
npm run build            # build production vào dist/
npm run test             # chạy vitest
```
