import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from '@mysten/dapp-kit';

import { toast } from 'sonner';

import {
  GameplayTx,
  type ChestOpenType,
} from '../services/gameplayTx';

import {
  PACKAGE_ID,
  getChestOwnedObjectsParams,
  getWeaponOwnedObjectsParams,
  invalidateChestInventory,
  scheduleChestInventoryRefetch,
} from '../suiChest';
import { GameButton, GamePanel, PanelTitle } from './ui/GamePrimitives';
import { cx } from '../utils/cx';
import { API_BASE } from '../config/api';

const GAME_POOL_ID = import.meta.env.VITE_GAME_POOL_ID;

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────

function shortenId(value: string) {
  if (!value) return '';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

const RARITY_MAP: Record<
  number,
  {
    name: string;
    color: string;
    bg: string;
    text: string;
    icon: string;
  }
> = {
  1: {
    name: 'Sứt mẻ',
    color: 'border-slate-300/70',
    bg: 'bg-slate-700/70',
    text: 'text-slate-200',
    icon: 'MẺ',
  },

  2: {
    name: 'Thường',
    color: 'border-emerald-300/80',
    bg: 'bg-emerald-700/70',
    text: 'text-emerald-100',
    icon: 'TH',
  },

  3: {
    name: 'Hiếm',
    color: 'border-sky-200/90',
    bg: 'bg-sky-700/70',
    text: 'text-sky-100',
    icon: 'HI',
  },

  4: {
    name: 'Huyền thoại',
    color: 'border-amber-200',
    bg: 'bg-amber-600/75',
    text: 'text-amber-100',
    icon: 'HT',
  },
};

// ─────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────

function CompactInventorySlot({
  icon,
  label,
  count,
  level,
  rarity = 2,
  active = false,
  onClick,
}: {
  icon: string;
  label: string;
  count?: number;
  level?: number | string;
  rarity?: number;
  active?: boolean;
  onClick: () => void;
}) {
  const style = RARITY_MAP[rarity] || RARITY_MAP[2];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
      className={cx(
        'group relative h-full min-h-0 w-full overflow-hidden rounded-[20px] border-[3px] p-2 text-center shadow-[0_7px_0_rgba(8,13,46,0.48),0_14px_28px_rgba(15,23,42,0.32)] transition-all',
        'bg-gradient-to-b from-white/24 via-blue-900/48 to-blue-950/86',
        active ? 'border-white ring-4 ring-cyan-200/35' : style.color,
      )}
    >
      <div className="absolute inset-x-2 top-1 h-1/3 rounded-full bg-white/18" />
      <div className={cx('absolute inset-2 rounded-[18px] opacity-45 blur-xl transition-opacity group-hover:opacity-70', style.bg)} />

      <div className="relative z-10 flex h-full min-h-0 flex-col items-center justify-center gap-1">
        <div className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-2xl border-2 bg-gradient-to-b text-xs font-black shadow-inner sm:h-12 sm:w-12 sm:text-sm', style.color, style.bg, style.text)}>
          {icon}
        </div>
        <p className="max-w-full truncate text-[10px] font-black uppercase tracking-wide text-cyan-50/88 sm:text-[11px]">
          {label}
        </p>
      </div>

      {count != null && count > 0 && (
        <div className="absolute right-1.5 top-1.5 z-20 rounded-full border-2 border-white/70 bg-red-500 px-2 py-0.5 text-[10px] font-black text-white shadow-lg">
          x{count}
        </div>
      )}
      {level != null && (
        <div className="absolute bottom-1.5 left-1.5 z-20 rounded-full border border-white/50 bg-blue-950/82 px-2 py-0.5 text-[9px] font-black text-cyan-100 shadow-lg">
          Lv.{level}
        </div>
      )}
    </motion.button>
  );
}

function EmptyInventorySlot() {
  return (
    <div className="grid h-full min-h-0 place-items-center rounded-[20px] border-2 border-dashed border-cyan-100/24 bg-blue-950/34 p-2 text-[10px] font-black uppercase tracking-wider text-cyan-100/42 shadow-inner shadow-black/25">
      Trống
    </div>
  );
}

function StatBar({
  label,
  value,
  max,
  colorClass,
  icon,
}: any) {
  const percentage =
    Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end px-1">
        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-cyan-100/70">
          {icon} {label}
        </span>

        <span className="font-mono text-sm font-black text-white">
          {value}
        </span>
      </div>

      <div className="h-4 overflow-hidden rounded-full border border-white/25 bg-blue-950/80 p-0.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full rounded-full ${colorClass}`}
        />
      </div>
    </div>
  );
}

function EquipmentRail() {
  const slots = [
    ['Vũ khí', 'VK'],
    ['Lõi', 'LÕI'],
    ['Bùa', 'BÙA'],
    ['Di vật', 'DV'],
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map(([label, glyph]) => (
        <div
          key={label}
          title={label}
          className="grid aspect-square place-items-center rounded-2xl border-2 border-dashed border-cyan-100/28 bg-blue-950/45 text-[10px] font-black text-cyan-100/55 shadow-inner shadow-black/25"
        >
          {glyph}
        </div>
      ))}
    </div>
  );
}

function ItemTicketModal({
  selectedItem,
  chestCount,
  keyCount,
  isOpening,
  isProcessing,
  onClose,
  onOpenChest,
  onSell,
}: {
  selectedItem: any;
  chestCount: number;
  keyCount: number;
  isOpening: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onOpenChest: (chestType: ChestOpenType, amount: number) => void;
  onSell: () => void;
}) {
  if (!selectedItem) return null;

  const selectedFields =
    selectedItem?.data?.content?.fields;

  const selectedRarity =
    RARITY_MAP[selectedFields?.rarity] ||
    RARITY_MAP[2];

  const isChest = selectedItem.type === 'chest';
  const isKey = selectedItem.type === 'key';
  const title = isChest
    ? 'Rương chiến lợi phẩm'
    : isKey
      ? 'Chìa khóa EPIC'
      : selectedRarity.name;
  const rarity = isChest
    ? RARITY_MAP[3]
    : isKey
      ? RARITY_MAP[4]
      : selectedRarity;
  const quantity = isChest ? chestCount : isKey ? keyCount : 1;

  return (
    <motion.div
      className="modal-scroll fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-blue-950/72 p-3 backdrop-blur-md sm:p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative my-auto flex max-h-[calc(100svh-1.5rem)] min-h-[min(680px,calc(100svh-1.5rem))] w-full max-w-[580px] flex-col overflow-hidden rounded-[34px] border-4 border-yellow-100/70 bg-gradient-to-b from-sky-600/96 via-indigo-950/98 to-violet-950/98 p-4 text-white shadow-[0_16px_0_rgba(69,26,3,0.45),0_32px_90px_rgba(15,23,42,0.7)] sm:min-h-0 sm:p-6"
        initial={{ y: 42, scale: 0.9, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 28, scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-8 top-2 h-12 rounded-full bg-white/22 blur-[2px]" />
        <div className="pointer-events-none absolute -left-16 top-16 h-44 w-44 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-24 h-52 w-52 rounded-full bg-amber-300/25 blur-3xl" />

        <button
          type="button"
          aria-label="Đóng"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-2xl border-2 border-white/30 bg-blue-950/70 text-lg font-black text-white shadow-[0_5px_0_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5"
        >
          ×
        </button>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-1 pt-6 text-center no-scrollbar sm:px-3">
          <div className="mx-auto mb-3 inline-flex rounded-full border-2 border-white/30 bg-blue-950/54 px-4 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/85">
            {rarity.name}
          </div>

          <h3 className="game-title text-3xl font-black uppercase leading-none text-white sm:text-4xl">
            {title}
          </h3>

          <div className="relative mx-auto my-5 grid h-40 w-40 place-items-center sm:h-48 sm:w-48">
            <div className={cx('absolute inset-0 animate-glow-pulse rounded-full opacity-70 blur-2xl', rarity.bg)} />
            <motion.div
              animate={{ y: [0, -8, 0], rotate: isChest ? [0, -1.5, 1.5, 0] : [0, 0, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className={cx(
                'relative grid h-32 w-32 place-items-center rounded-[34px] border-4 bg-gradient-to-b text-4xl font-black shadow-[0_12px_0_rgba(8,13,46,0.46),0_24px_44px_rgba(15,23,42,0.36)] sm:h-40 sm:w-40',
                rarity.color,
                rarity.bg,
                rarity.text,
              )}
            >
              {isChest ? (
                <div className="relative h-20 w-24 sm:h-24 sm:w-28">
                  <div className="absolute inset-x-1 top-1 h-9 rounded-t-[24px] border-4 border-amber-950/65 bg-gradient-to-b from-yellow-200 to-amber-500" />
                  <div className="absolute inset-x-0 bottom-0 h-16 rounded-[20px] border-4 border-amber-950/75 bg-gradient-to-b from-orange-400 to-amber-700 shadow-inner" />
                  <div className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border-[3px] border-amber-950/70 bg-yellow-200 text-base text-amber-950">
                    R
                  </div>
                </div>
              ) : isKey ? (
                'K'
              ) : (
                selectedRarity.icon
              )}
            </motion.div>
            <div className="absolute bottom-0 right-2 rounded-full border-2 border-white/80 bg-red-500 px-3 py-1 text-sm font-black text-white shadow-lg">
              x{quantity}
            </div>
          </div>

          <p className="mx-auto max-w-sm text-sm font-bold leading-relaxed text-cyan-50/82">
            {isChest
              ? 'Một rương chiến lợi phẩm có thể chứa trang bị, vật phẩm hiếm và phần thưởng on-chain cho kho vũ khí.'
              : isKey
                ? 'Chìa khóa dùng để kích hoạt rương EPIC khi tính năng tương ứng khả dụng.'
                : 'Trang bị có thể dùng trong đội hình hoặc rao bán tại chợ giao dịch.'}
          </p>

          <div className="mt-5 grid gap-3 rounded-[24px] border-2 border-white/16 bg-blue-950/45 p-3 text-left shadow-inner shadow-black/30">
            {isChest ? (
              <>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-3 py-2">
                  <span className="text-xs font-black uppercase text-cyan-100/70">Xem trước phần thưởng</span>
                  <span className="text-xs font-black text-yellow-200">Trang bị / Vàng / Vật phẩm</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-3 py-2">
                  <span className="text-xs font-black uppercase text-cyan-100/70">Số rương</span>
                  <span className="font-mono text-lg font-black text-white">{chestCount}</span>
                </div>
              </>
            ) : isKey ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-3 py-2">
                <span className="text-xs font-black uppercase text-cyan-100/70">Công dụng</span>
                <span className="text-xs font-black text-sky-100">Mở rương EPIC</span>
              </div>
            ) : (
              <>
                <StatBar
                  label="Sát thương"
                  value={selectedFields?.damage || 0}
                  max={1000}
                  colorClass="bg-gradient-to-r from-orange-300 to-red-500"
                  icon="ST"
                />
                <StatBar
                  label="Độ bền"
                  value={selectedFields?.durability || 0}
                  max={255}
                  colorClass="bg-gradient-to-r from-lime-300 to-emerald-500"
                  icon="ĐB"
                />
                <p className="text-center font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-100/55">
                  {shortenId(selectedItem.data?.objectId || '')}
                </p>
              </>
            )}
          </div>

          <div className="mt-auto grid gap-3 pt-5">
            {isChest ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <GameButton
                  onClick={() => onOpenChest('normal', 1)}
                  disabled={isOpening || chestCount < 1}
                  variant="green"
                  className="min-h-14 w-full text-sm"
                >
                  MỞ 1 RƯƠNG
                </GameButton>
                <GameButton
                  onClick={() => onOpenChest('normal', chestCount)}
                  disabled={isOpening || chestCount < 2}
                  variant="gold"
                  className="min-h-14 w-full text-sm"
                >
                  MỞ x{chestCount}
                </GameButton>
              </div>
            ) : isKey ? (
              <GameButton
                onClick={onClose}
                variant="blue"
                className="min-h-14 w-full text-sm"
              >
                ĐÃ HIỂU
              </GameButton>
            ) : (
              <div className="grid gap-2">
                <div className="rounded-2xl border-2 border-dashed border-cyan-100/24 bg-blue-950/54 px-3 py-2 text-center text-[11px] font-black uppercase tracking-wide text-cyan-100/68">
                  Chưa có nút trang bị / nâng cấp / tháo ra được kết nối smart contract.
                </div>
                <GameButton
                  onClick={onSell}
                  disabled={isProcessing}
                  variant="gold"
                  className="min-h-14 w-full text-sm"
                >
                  BÁN Ở CHỢ
                </GameButton>
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export function Inventory({
  onRefreshStatus,
}: {
  onRefreshStatus?: () => void;
}) {

  const account = useCurrentAccount();

  const client = useSuiClient();

  const queryClient = useQueryClient();

  const {
    mutateAsync: signAndExecuteTransaction,
  } = useSignAndExecuteTransaction();

  const [activeTab, setActiveTab] =
    useState<'chests' | 'equipment'>('chests');

  const [selectedItem, setSelectedItem] =
    useState<any>(null);

  const [isOpening, setIsOpening] =
    useState(false);

  const [isProcessing] =
    useState(false);

  // ─────────────────────────────
  // QUERIES
  // ─────────────────────────────

  const { data: chestData } =
    useSuiClientQuery(
      'getOwnedObjects',

      account?.address
        ? getChestOwnedObjectsParams(
          account.address
        )
        : (undefined as any),

      {
        enabled: !!account?.address,
      }
    );

  const { data: weaponData } =
    useSuiClientQuery(
      'getOwnedObjects',

      account?.address
        ? getWeaponOwnedObjectsParams(
          account.address
        )
        : (undefined as any),

      {
        enabled: !!account?.address,
      }
    );

  const { data: keyData } =
    useSuiClientQuery(
      'getOwnedObjects',

      account?.address
        ? {
          owner: account.address,

          filter: {
            StructType:
              `${PACKAGE_ID}::player::Key`,
          },

          options: {
            showContent: true,
          },
        }
        : (undefined as any),

      {
        enabled: !!account?.address,
      }
    );

  // ─────────────────────────────
  // DATA
  // ─────────────────────────────

  const chestIds = useMemo(
    () =>
      chestData?.data
        .map((d) => d.data?.objectId)
        .filter(
          (value): value is string =>
            Boolean(value)
        ) || [],
    [chestData]
  );

  const keyIds = useMemo(
    () =>
      keyData?.data
        .map((d) => d.data?.objectId)
        .filter(
          (value): value is string =>
            Boolean(value)
        ) || [],
    [keyData]
  );

  const weapons = useMemo(
    () => weaponData?.data || [],
    [weaponData]
  );

  // ─────────────────────────────
  // OPEN CHEST
  // ─────────────────────────────

  const handleOpenChest = async (
    chestType: ChestOpenType,
    amount: number = 1
  ) => {

    if (!account?.address || isOpening) {
      return;
    }

    if (!GAME_POOL_ID) {
      toast.error(
        'Chức năng mở rương chưa được kết nối smart contract.'
      );
      return;
    }

    const selectedChestIds =
      chestIds.slice(0, amount);

    const selectedKeyIds =
      chestType === 'epic'
        ? keyIds.slice(0, amount)
        : [];

    if (selectedChestIds.length < amount) {
      toast.error(
        'Không đủ rương để mở.'
      );
      return;
    }

    if (
      chestType === 'epic' &&
      selectedKeyIds.length < amount
    ) {
      toast.error(
        'Không đủ chìa khóa.'
      );
      return;
    }

    setIsOpening(true);

    const toastId = toast.loading(
      amount > 1
        ? `Đang mở ${amount} rương...`
        : 'Đang mở rương...'
    );

    try {

      const tx =
        GameplayTx.buildOpenChestTx({
          playerAddress:
            account.address,
          poolId:
            GAME_POOL_ID,
          chestType,
          chestIds:
            selectedChestIds,
          keyIds:
            selectedKeyIds,
        });

      const result =
        await signAndExecuteTransaction({
          transaction: tx,
        });

      if (!result?.digest) {
        throw new Error(
          'Không nhận được mã giao dịch.'
        );
      }

      await client.waitForTransaction({
        digest:
          result.digest,
      });

      toast.success(
        chestType === 'epic'
          ? 'Mở rương EPIC thành công!'
          : amount > 1
            ? `Đã mở ${amount} rương!`
            : 'Mở rương thành công!',
        {
          id: toastId,
        }
      );

      await invalidateChestInventory(
        queryClient,
        account.address
      );

      scheduleChestInventoryRefetch(
        queryClient,
        account.address
      );

      await onRefreshStatus?.();
      return;

      // ─────────────────────────────
      // DIRECT BACKEND FLOW
      // KHÔNG DÙNG PTB
      // ─────────────────────────────

      const endpoint =
        amount > 1
          ? '/api/open-chest-batch'
          : '/api/open-chest';

      const res = await fetch(
        `${API_BASE}${endpoint}`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            playerAddress:
              account!.address,

            chestType,

            amount,
          }),
        }
      );

      // FIX HTML ERROR PAGE
      const text =
        await res.text();

      let data: any;

      try {

        data =
          JSON.parse(text);

      } catch {

        console.error(
          'INVALID_JSON_RESPONSE',
          text
        );

        throw new Error(
          'Backend trả về lỗi HTML thay vì JSON'
        );
      }

      if (!data.success) {

        throw new Error(
          data.message ||
          'Mở rương thất bại'
        );
      }

      toast.success(
        amount > 1
          ? `Đã mở ${amount} rương!`
          : 'Mở rương thành công!',
        {
          id: toastId,
        }
      );

      invalidateChestInventory(
        queryClient,
        account!.address
      );

      await onRefreshStatus?.();

    } catch (err: any) {

      toast.error(
        err.message ||
        'Lỗi mở rương',
        {
          id: toastId,
        }
      );

      console.error(
        'OPEN_CHEST_ERROR',
        err
      );

    } finally {

      setIsOpening(false);
    }
  };

  // ─────────────────────────────
  // SELL ITEM
  // ─────────────────────────────

  const handleSell = async () => {

    if (
      !account ||
      !selectedItem ||
      selectedItem.type === 'chest' ||
      isProcessing
    ) {
      return;
    }

    toast.info(
      'Luồng chợ giao dịch đang hoạt động.'
    );
  };

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  return (
    <>
    <GamePanel glow="cyan" className="flex min-h-[min(720px,calc(100svh-6rem))] flex-col md:h-full md:min-h-[520px]">
      <div className="relative z-10 border-b-2 border-white/15 bg-blue-950/24 p-5">
        <PanelTitle
          eyebrow="Kho đồ"
          title="Túi đồ"
          right={
            <div className="grid grid-cols-2 gap-2 rounded-2xl border-2 border-white/15 bg-blue-950/62 p-1.5">
              <GameButton
                onClick={() => {
                  setActiveTab('chests');
                  setSelectedItem(null);
                }}
                variant={activeTab === 'chests' ? 'blue' : 'ghost'}
                className="px-4 py-2"
              >
                Rương
              </GameButton>
              <GameButton
                onClick={() => {
                  setActiveTab('equipment');
                  setSelectedItem(null);
                }}
                variant={activeTab === 'equipment' ? 'purple' : 'ghost'}
                className="px-4 py-2"
              >
                Trang bị
              </GameButton>
            </div>
          }
        />
        <div className="mt-4">
          <EquipmentRail />
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-3 sm:p-4">
        <div className="modal-scroll grid max-h-[52svh] min-h-[300px] auto-rows-[96px] grid-cols-3 gap-2 overflow-y-auto rounded-[24px] border-2 border-white/15 bg-blue-950/38 p-3 shadow-inner shadow-black/30 no-scrollbar sm:auto-rows-[104px] sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {activeTab === 'chests' ? (
            <>
              {chestIds.length > 0 && (
                <CompactInventorySlot
                  icon="R"
                  label="Rương"
                  count={chestIds.length}
                  rarity={3}
                  active={selectedItem?.type === 'chest'}
                  onClick={() =>
                    setSelectedItem({
                      type: 'chest',
                    })
                  }
                />
              )}

              {keyIds.length > 0 && (
                <CompactInventorySlot
                  icon="K"
                  label="Chìa khóa"
                  count={keyIds.length}
                  rarity={4}
                  active={selectedItem?.type === 'key'}
                  onClick={() =>
                    setSelectedItem({
                      type: 'key',
                    })
                  }
                />
              )}

              {Array.from({ length: Math.max(0, 6 - Number(chestIds.length > 0) - Number(keyIds.length > 0)) }).map((_, index) => (
                <EmptyInventorySlot key={`empty-chest-${index}`} />
              ))}
            </>
          ) : (
            <>
              {weapons.map((w: any) => {
                const fields =
                  w.data?.content?.fields;

                const rarityStyle =
                  RARITY_MAP[fields?.rarity] ||
                  RARITY_MAP[2];

                return (
                  <CompactInventorySlot
                    key={w.data?.objectId}
                    icon={rarityStyle.icon}
                    label={rarityStyle.name}
                    level={fields?.level ?? fields?.lvl}
                    rarity={fields?.rarity}
                    active={selectedItem?.data?.objectId === w.data?.objectId}
                    onClick={() =>
                      setSelectedItem(w)
                    }
                  />
                );
              })}

              {Array.from({ length: Math.max(0, 8 - weapons.length) }).map((_, index) => (
                <EmptyInventorySlot key={`empty-gear-${index}`} />
              ))}
            </>
          )}
        </div>

        <div className="rounded-[24px] border-2 border-white/14 bg-blue-950/38 px-4 py-3 text-center shadow-inner shadow-black/25">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/72">
            Chạm vào vật phẩm để mở phiếu chi tiết
          </p>
        </div>
      </div>

      {account && (
        <div className="relative z-10 flex flex-wrap justify-between gap-2 border-t-2 border-white/10 bg-blue-950/62 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-cyan-100/55">
          <span>
            Mạng SUI: <span className="font-mono text-cyan-200">Testnet</span>
          </span>
          <span>
            Chủ sở hữu: <span className="font-mono text-white/75">{shortenId(account.address)}</span>
          </span>
        </div>
      )}
    </GamePanel>
    <AnimatePresence>
      {selectedItem && (
        <ItemTicketModal
          selectedItem={selectedItem}
          chestCount={chestIds.length}
          keyCount={keyIds.length}
          isOpening={isOpening}
          isProcessing={isProcessing}
          onClose={() => setSelectedItem(null)}
          onOpenChest={handleOpenChest}
          onSell={handleSell}
        />
      )}
    </AnimatePresence>
    </>
  );
}
