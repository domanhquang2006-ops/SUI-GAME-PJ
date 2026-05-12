import {
    TxBuilderService,
} from './txBuilder.js';

export class GameplayTxService {

    // ─────────────────────────────────────────────
    // BUY AMMO FLOW
    // ─────────────────────────────────────────────
    static buildBuyAmmoFlow(params) {

        return TxBuilderService.buildBuyAmmoTx({
            playerAddress:
                params.playerAddress,
        });
    }

    // ─────────────────────────────────────────────
    // OPEN CHEST FLOW
    // ─────────────────────────────────────────────
    static buildOpenChestFlow(params) {

        return TxBuilderService.buildOpenChestTx({
            playerAddress:
                params.playerAddress,
        });
    }
}