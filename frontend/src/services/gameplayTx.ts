import { Transaction } from '@mysten/sui/transactions';
import {
    CHEST_STRUCT_TYPE,
    KEY_STRUCT_TYPE,
    PACKAGE_ID,
} from '../suiChest';

export type ChestOpenType =
    'normal' |
    'epic';

export class GameplayTx {

    static buildBuyAmmoTx(params: {
        playerAddress: string;
        ammoType: string;
    }) {

        const tx = new Transaction();

        tx.setSender(params.playerAddress);

        tx.moveCall({
            target: `0x2::clock::timestamp_ms`,
            arguments: [
                tx.object.clock(),
            ],
        });

        return tx;
    }

    static buildOpenChestTx(params: {
        playerAddress: string;
        poolId: string;
        chestType: ChestOpenType;
        chestIds: string[];
        keyIds?: string[];
    }) {

        if (!params.chestIds.length) {
            throw new Error(
                'Khong co ruong de mo.',
            );
        }

        if (
            params.chestType === 'epic' &&
            params.chestIds.length !== (params.keyIds?.length || 0)
        ) {
            throw new Error(
                'So ruong va chia khoa khong khop.',
            );
        }

        const tx = new Transaction();

        tx.setSender(params.playerAddress);

        const chestVector =
            tx.makeMoveVec({
                type: CHEST_STRUCT_TYPE,
                elements: params.chestIds,
            });

        const poolObject =
            tx.object(params.poolId);

        const clockObject =
            tx.object.clock();

        const randomObject =
            tx.object.random();

        if (params.chestType === 'epic') {
            const keyVector =
                tx.makeMoveVec({
                    type: KEY_STRUCT_TYPE,
                    elements: params.keyIds || [],
                });

            tx.moveCall({
                target:
                    `${PACKAGE_ID}::player::open_epic_batch`,
                arguments: [
                    chestVector,
                    keyVector,
                    poolObject,
                    clockObject,
                    randomObject,
                ],
            });
        } else {
            tx.moveCall({
                target:
                    `${PACKAGE_ID}::player::open_normal_batch`,
                arguments: [
                    chestVector,
                    poolObject,
                    clockObject,
                    randomObject,
                ],
            });
        }

        return tx;
    }
}
