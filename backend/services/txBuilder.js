import {
    Transaction,
} from '@mysten/sui/transactions';

export class TxBuilderService {

    // ─────────────────────────────────────────────
    // BASE TX
    // ─────────────────────────────────────────────
    static createBaseTx(sender) {

        const tx = new Transaction();

        tx.setSender(sender);

        return tx;
    }

    // ─────────────────────────────────────────────
    // PTB PLACEHOLDER
    // ─────────────────────────────────────────────
    static attachGameplayMarker(tx) {

        tx.moveCall({
            target: `0x2::clock::timestamp_ms`,
            arguments: [
                tx.object('0x6'),
            ],
        });

        return tx;
    }

    // ─────────────────────────────────────────────
    // BUY AMMO
    // ─────────────────────────────────────────────
    static buildBuyAmmoTx(params) {

        const tx =
            this.createBaseTx(
                params.playerAddress
            );

        this.attachGameplayMarker(tx);

        return tx;
    }

    // ─────────────────────────────────────────────
    // MARKET BUY
    // ─────────────────────────────────────────────
    static buildMarketBuyTx(params) {

        const tx =
            this.createBaseTx(
                params.playerAddress
            );

        this.attachGameplayMarker(tx);

        return tx;
    }

    // ─────────────────────────────────────────────
    // OPEN CHEST
    // ─────────────────────────────────────────────
    static buildOpenChestTx(params) {

        const tx =
            this.createBaseTx(
                params.playerAddress
            );

        this.attachGameplayMarker(tx);

        return tx;
    }
}