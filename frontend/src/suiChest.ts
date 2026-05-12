import type { QueryClient } from '@tanstack/react-query';

export const INVENTORY_REFETCH_DELAY_MS = 3000;
export const SUI_NETWORK = 'testnet';

const PUBLISHED_TESTNET_PACKAGE_ID =
  '0xd7434493860ef5f8e7e83715965a3a1143b2abd5dbdc9656dd90b2f68fbcc902';

const vitePackageId = import.meta.env.VITE_PACKAGE_ID?.trim();

if (!vitePackageId) {
  console.error(
    '[Sui Chest] Missing VITE_PACKAGE_ID. Falling back to the testnet package ID from sui_artillery/Published.toml. Hard-restart Vite after adding or changing .env.',
  );
} else if (vitePackageId !== PUBLISHED_TESTNET_PACKAGE_ID) {
  console.warn('[Sui Chest] VITE_PACKAGE_ID differs from sui_artillery/Published.toml.', {
    vitePackageId,
    publishedTestnetPackageId: PUBLISHED_TESTNET_PACKAGE_ID,
  });
}

export const PACKAGE_ID = vitePackageId || PUBLISHED_TESTNET_PACKAGE_ID;

// --- ĐỊNH NGHĨA STRUCT TYPE ---
export const CHEST_STRUCT_TYPE = `${PACKAGE_ID}::player::Chest`;
export const WEAPON_STRUCT_TYPE = `${PACKAGE_ID}::player::Weapon`;
export const KEY_STRUCT_TYPE = `${PACKAGE_ID}::player::Key`;

// --- QUERY PARAMS ---
export function getChestOwnedObjectsParams(owner: string) {
  return {
    owner,
    filter: { StructType: CHEST_STRUCT_TYPE },
    options: {
      showContent: true,
      showType: true,
    },
  };
}

// Hàm query mới dành cho Vũ Khí (Tab Trang bị)
export function getWeaponOwnedObjectsParams(owner: string) {
  return {
    owner,
    filter: { StructType: WEAPON_STRUCT_TYPE },
    options: {
      showContent: true,
      showType: true,
    },
  };
}

function isOwnedObjectsQueryForOwner(queryKey: readonly unknown[], owner: string) {
  const [network, method, params] = queryKey;
  return (
    network === SUI_NETWORK &&
    method === 'getOwnedObjects' &&
    typeof params === 'object' &&
    params !== null &&
    'owner' in params &&
    (params as { owner?: unknown }).owner === owner
  );
}

// Hàm này giờ sẽ quét sạch cache của cả Rương lẫn Vũ khí để ép tải lại
export async function invalidateChestInventory(queryClient: QueryClient, owner: string) {
  await queryClient.invalidateQueries({
    predicate: ({ queryKey }) => isOwnedObjectsQueryForOwner(queryKey, owner),
  });
}

export function scheduleChestInventoryRefetch(queryClient: QueryClient, owner: string) {
  setTimeout(() => {
    void invalidateChestInventory(queryClient, owner);
  }, INVENTORY_REFETCH_DELAY_MS);
}
