import {
    TxBuilderService,
} from './txBuilder.js';

export class MarketTxService {

    // ─────────────────────────────────────────────
    // MARKET BUY FLOW
    // ─────────────────────────────────────────────
    static buildBuyMarketFlow(params) {

        return TxBuilderService.buildMarketBuyTx({
            playerAddress:
                params.playerAddress,
        });
    }
}