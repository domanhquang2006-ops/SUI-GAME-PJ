# SUI Artillery Game

Game Web3 chiến thuật bắn pháo xây trên Sui Testnet. Người chơi kết nối ví Sui, dùng năng lượng và đạn để phá thành, nhận vàng/rương, mở rương để lấy trang bị, và giao dịch vật phẩm trong chợ.

## Tính năng chính

- Giao diện fantasy mobile RPG với battlefield đảo bay.
- Kết nối ví bằng `@mysten/dapp-kit`.
- Gameplay Phaser trong React/Vite.
- Daily claim, nạp năng lượng, dùng đạn, nhận rương sau trận.
- Túi đồ dạng mobile RPG: slot gọn, modal chi tiết, mở rương bằng transaction handler hiện có.
- Chợ giao dịch vật phẩm/đạn.
- Smart contract Move trong thư mục `sui_artillery`.
- Backend Express + MongoDB xử lý trạng thái người chơi, marketplace và xác thực reward.

## Stack

Frontend:

- React
- TypeScript
- Vite
- TailwindCSS
- Framer Motion
- Phaser
- `@mysten/dapp-kit`
- `@mysten/sui`

Backend:

- Node.js
- Express
- MongoDB / Mongoose
- Sui SDK

Smart contract:

- Sui Move

## Cấu trúc thư mục

```txt
.
├── api/                 # Vercel serverless route bridge
├── backend/             # Express API, database, Sui backend services
├── frontend/            # React + Vite game client
│   └── src/
│       ├── components/  # HUD, inventory, marketplace, UI primitives
│       ├── game/        # Phaser scene/game rendering
│       ├── services/    # Transaction builders/services
│       └── suiChest.ts  # Sui object query helpers
├── sui_artillery/       # Sui Move package
├── vercel.json          # Vercel deployment config
└── README.md
```

## Cài đặt

Yêu cầu:

- Node.js
- npm hoặc pnpm
- MongoDB URI
- Sui wallet/testnet setup

Cài frontend:

```bash
cd frontend
npm install
```

Cài backend:

```bash
cd backend
npm install
```

Hoặc dùng script ở root:

```bash
npm run install:all
```

## Biến môi trường

Tạo file `backend/.env`:

```env
PORT=3000
MONGO_URI=your_mongodb_uri
ADMIN_SECRET_KEY=your_sui_admin_secret_key
PACKAGE_ID=your_sui_package_id
ADMIN_CAP_ID=your_admin_cap_object_id
```

Tạo file `frontend/.env` nếu cần override package/pool:

```env
VITE_API_BASE=http://localhost:3000
VITE_PACKAGE_ID=your_sui_package_id
VITE_GAME_POOL_ID=your_game_pool_object_id
```

Không commit private key hoặc secret thật lên Git.

## Chạy local

Chạy backend:

```bash
cd backend
npm run dev
```

Chạy frontend:

```bash
cd frontend
npm run dev
```

Mặc định:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

## Build

Build frontend từ root:

```bash
npm run build
```

Hoặc trong `frontend`:

```bash
npm run build
```

## Deploy Vercel

Repo đã có `vercel.json`:

- Build command: `npm --prefix frontend run build`
- Output: `frontend/dist`
- API route: `/api/*`

Khi deploy, cần cấu hình environment variables tương ứng trên Vercel.

## Smart Contract

Move package nằm trong:

```txt
sui_artillery/
```

Các file quan trọng:

- `Move.toml`
- `Published.toml`
- `sources/`

Sau khi publish/update contract, cập nhật các ID tương ứng trong `.env`.

## Ghi chú phát triển

- Không đổi transaction builders nếu chỉ chỉnh UI.
- Không đổi wallet flow nếu chỉ chỉnh giao diện.
- Inventory đang dùng flow: tap item -> mở modal/ticket -> bấm action.
- Chest action dùng lại handler mở rương hiện có, không tạo blockchain logic giả.
- Gameplay canvas giữ touch control riêng để không phá thao tác kéo/bắn.

## Scripts

Root:

```bash
npm run install:all
npm run build
```

Frontend:

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

Backend:

```bash
npm run dev
npm start
```
