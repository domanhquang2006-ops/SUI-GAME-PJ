import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
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

const GAME_POOL_ID = import.meta.env.VITE_GAME_POOL_ID;
const API_BASE = 'http://localhost:3000';

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

function InventorySlot({
  icon,
  count,
  rarity = 2,
  onClick,
  active = false,
  label,
}: any) {
  const style = RARITY_MAP[rarity] || RARITY_MAP[2];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -5, scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
      className={cx(
        'group relative aspect-square min-h-[82px] overflow-hidden rounded-[22px] border-[3px] p-2 text-left shadow-[0_9px_0_rgba(8,13,46,0.48),0_18px_34px_rgba(15,23,42,0.32)] transition-all',
        'bg-gradient-to-b from-white/24 via-blue-900/48 to-blue-950/86',
        active ? 'border-white ring-4 ring-cyan-200/35' : style.color,
      )}
    >
      <div className="absolute inset-x-2 top-1 h-1/3 rounded-full bg-white/18" />
      <div className={cx('absolute inset-2 rounded-[18px] opacity-45 blur-xl', style.bg)} />
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-1">
        <div className={cx('grid h-12 w-12 place-items-center rounded-2xl border-2 bg-gradient-to-b text-sm font-black shadow-inner', style.color, style.bg, style.text)}>
          {icon}
        </div>
        {label && <p className="max-w-full truncate text-[10px] font-black uppercase tracking-wide text-cyan-50/80">{label}</p>}
      </div>

      {count > 1 && (
        <div className="absolute bottom-2 right-2 z-20 rounded-lg border border-white/40 bg-red-500 px-2 py-0.5 text-xs font-black text-white shadow-lg">
          x{count}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 hidden rounded-xl border border-white/20 bg-blue-950/90 px-2 py-1 text-center text-[10px] font-bold text-cyan-50 shadow-xl group-hover:block">
        {label || style.name}
      </div>
    </motion.button>
  );
}

function InventoryItemCard({
  icon,
  label,
  subtitle,
  count,
  rarity = 2,
  active = false,
  onClick,
  onPrimaryAction,
  primaryLabel,
  disabled,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  count?: number;
  rarity?: number;
  active?: boolean;
  onClick: () => void;
  onPrimaryAction?: () => void;
  primaryLabel?: string;
  disabled?: boolean;
}) {
  const style = RARITY_MAP[rarity] || RARITY_MAP[2];

  return (
    <motion.article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={cx(
        'relative min-h-[150px] cursor-pointer overflow-hidden rounded-[24px] border-[3px] bg-gradient-to-b from-white/24 via-blue-900/48 to-blue-950/86 p-3 shadow-[0_9px_0_rgba(8,13,46,0.48),0_18px_34px_rgba(15,23,42,0.32)]',
        active ? 'border-white ring-4 ring-cyan-200/35' : style.color,
      )}
    >
      <div className="absolute inset-x-3 top-1 h-10 rounded-full bg-white/18" />
      <div className={cx('absolute inset-3 rounded-[20px] opacity-35 blur-xl', style.bg)} />

      <div className="relative z-10 flex items-start gap-3">
        <div className={cx('grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2 bg-gradient-to-b text-base font-black shadow-inner', style.color, style.bg, style.text)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black uppercase text-white">{label}</p>
          {subtitle && <p className="mt-1 text-[11px] font-bold text-cyan-100/72">{subtitle}</p>}
          {count != null && (
            <span className="mt-2 inline-flex rounded-full border border-white/25 bg-red-500 px-2 py-0.5 text-xs font-black text-white">
              x{count}
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
        <GameButton
          variant="ghost"
          className="px-2 py-2 text-[10px]"
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
        >
          Xem chi tiết
        </GameButton>
        {onPrimaryAction && primaryLabel && (
          <GameButton
            variant="green"
            disabled={disabled}
            className="px-2 py-2 text-[10px]"
            onClick={(event) => {
              event.stopPropagation();
              onPrimaryAction();
            }}
          >
            {primaryLabel}
          </GameButton>
        )}
      </div>
    </motion.article>
  );
}

function EmptyInventorySlot() {
  return (
    <div className="grid min-h-[112px] place-items-center rounded-[22px] border-2 border-dashed border-cyan-100/24 bg-blue-950/34 p-3 text-[11px] font-black uppercase tracking-wider text-cyan-100/42 shadow-inner shadow-black/25">
      Trống
    </div>
  );
}

function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-[20px] border-4 border-cyan-100/40 bg-gradient-to-b from-sky-400/40 to-indigo-950/70 text-sm font-black text-white shadow-xl">
        {icon}
      </div>

      <div className="max-w-[280px]">
        <p className="game-title text-xl font-black uppercase text-white">
          {title}
        </p>

        <p className="mt-1 text-xs font-bold text-cyan-100/75">
          {desc}
        </p>
      </div>
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

  const selectedFields =
    selectedItem?.data?.content?.fields;

  const selectedRarity =
    RARITY_MAP[selectedFields?.rarity] ||
    RARITY_MAP[2];

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────

  return (
    <GamePanel glow="cyan" className="flex h-full min-h-[520px] flex-col">
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

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
        <div className="grid max-h-[320px] min-h-[190px] auto-rows-max grid-cols-2 gap-3 overflow-y-auto rounded-[24px] border-2 border-white/15 bg-blue-950/38 p-3 shadow-inner shadow-black/30 no-scrollbar sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
          {activeTab === 'chests' ? (
            <>
              {chestIds.length > 0 && (
                <InventoryItemCard
                  icon="R"
                  label="Rương"
                  subtitle="Loại vật phẩm: Rương"
                  count={chestIds.length}
                  rarity={2}
                  active={selectedItem?.type === 'chest'}
                  onClick={() =>
                    setSelectedItem({
                      type: 'chest',
                    })
                  }
                  onPrimaryAction={() => handleOpenChest('normal', 1)}
                  primaryLabel="Mở rương"
                  disabled={isOpening || chestIds.length < 1}
                />
              )}

              {keyIds.length > 0 && (
                <InventoryItemCard
                  icon="K"
                  label="Chìa khóa"
                  subtitle="Dùng để mở rương EPIC"
                  count={keyIds.length}
                  rarity={3}
                  active={selectedItem?.type === 'key'}
                  onClick={() =>
                    setSelectedItem({
                      type: 'key',
                    })
                  }
                  onPrimaryAction={() => toast.info('Chọn rương EPIC để dùng chìa khóa.')}
                  primaryLabel="Dùng"
                />
              )}

              {chestIds.length === 0 &&
                keyIds.length === 0 && (
                  <div className="col-span-full">
                    <EmptyState
                      icon="TRỐNG"
                      title="Kho đang trống"
                      desc="Phá thành để nhận rương và chìa khóa."
                    />
                  </div>
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
                  <InventorySlot
                    key={w.data?.objectId}
                    icon={rarityStyle.icon}
                    label={rarityStyle.name}
                    rarity={fields?.rarity}
                    active={selectedItem?.data?.objectId === w.data?.objectId}
                    onClick={() =>
                      setSelectedItem(w)
                    }
                  />
                );
              })}

              {weapons.length === 0 && (
                <div className="col-span-full">
                  <EmptyState
                    icon="VK"
                    title="Chưa có trang bị"
                    desc="Mở rương để nhận vũ khí cho đội hình."
                  />
                </div>
              )}
              {Array.from({ length: Math.max(0, 8 - weapons.length) }).map((_, index) => (
                <EmptyInventorySlot key={`empty-gear-${index}`} />
              ))}
            </>
          )}
        </div>

        <div className="flex min-h-[260px] flex-1 flex-col rounded-[26px] border-2 border-white/18 bg-gradient-to-b from-sky-950/74 to-indigo-950/78 p-4 shadow-inner shadow-black/35">
          {!selectedItem ? (
            <div className="m-auto text-center">
              <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-[24px] border-2 border-dashed border-cyan-100/35 bg-blue-950/50 text-sm font-black text-cyan-100/55">
                CHỌN
              </div>
              <p className="game-title text-xl font-black uppercase text-white">Chọn vật phẩm</p>
              <p className="mt-2 text-xs font-bold text-cyan-100/60">Chạm vào ô vật phẩm để xem chi tiết.</p>
            </div>
          ) : selectedItem.type === 'chest' ? (
            <div className="flex h-full flex-col">
              <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-[28px] border-4 border-emerald-100/65 bg-gradient-to-b from-emerald-300 to-teal-600 text-2xl font-black text-emerald-950 shadow-xl">
                R
              </div>
              <h4 className="game-title text-center text-2xl font-black uppercase text-white">
                Rương
              </h4>
              <p className="mx-auto mt-2 max-w-[220px] text-center text-xs font-bold text-cyan-100/70">
                Loại vật phẩm: Rương. Số lượng hiện có: {chestIds.length}. Mở rương để nhận trang bị và phần thưởng on-chain.
              </p>

              <div className="mt-auto space-y-3 pt-6">
                <GameButton
                  onClick={() =>
                    handleOpenChest(
                      'normal',
                      1
                    )
                  }
                  disabled={isOpening}
                  variant="green"
                  className="w-full"
                >
                  Mở rương
                </GameButton>

                <GameButton
                  onClick={() =>
                    handleOpenChest(
                      'normal',
                      Math.min(
                        chestIds.length,
                        10
                      )
                    )
                  }
                  disabled={
                    isOpening ||
                    chestIds.length < 2
                  }
                  variant="blue"
                  className="w-full"
                >
                  Mở x{Math.min(chestIds.length, 10)}
                </GameButton>

                <GameButton
                  onClick={() =>
                    handleOpenChest(
                      'epic',
                      1
                    )
                  }
                  disabled={
                    isOpening ||
                    keyIds.length < 1
                  }
                  variant="gold"
                  className="w-full"
                >
                  Mở EPIC
                </GameButton>
              </div>
            </div>
          ) : selectedItem.type === 'key' ? (
            <div className="m-auto text-center">
              <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-[28px] border-4 border-sky-100/65 bg-gradient-to-b from-sky-300 to-indigo-600 text-2xl font-black text-sky-950 shadow-xl">
                K
              </div>
              <h4 className="game-title text-2xl font-black uppercase text-white">
                Chìa khóa EPIC
              </h4>
              <p className="mt-2 text-xs font-bold text-cyan-100/70">
                Cần có chìa khóa để mở rương EPIC.
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className={cx('mx-auto mb-4 grid h-24 w-24 place-items-center rounded-[28px] border-4 bg-gradient-to-b text-2xl font-black shadow-xl', selectedRarity.color, selectedRarity.bg, selectedRarity.text)}>
                {selectedRarity.icon}
              </div>

              <h4 className="game-title text-center text-2xl font-black uppercase text-white">
                {selectedRarity.name}
              </h4>
              <p className="mt-1 text-center font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-100/55">
                {shortenId(selectedItem.data?.objectId || '')}
              </p>

              <div className="mt-8 space-y-6">
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
              </div>

              <div className="mt-auto pt-6">
                <GameButton
                  onClick={handleSell}
                  disabled={isProcessing}
                  variant="gold"
                  className="w-full"
                >
                  Bán ở chợ
                </GameButton>
              </div>
            </div>
          )}
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
  );
}
