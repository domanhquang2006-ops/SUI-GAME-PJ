import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import {
  SuiJsonRpcClient,
  getJsonRpcFullnodeUrl,
} from '@mysten/sui/jsonRpc';

import {
  Ed25519Keypair,
} from '@mysten/sui/keypairs/ed25519';

import {
  Transaction,
} from '@mysten/sui/transactions';

import {
  MongoClient,
} from 'mongodb';

import {
  decodeSuiPrivateKey,
} from '@mysten/sui/cryptography';

dotenv.config();

// ─────────────────────────────────────────────
// EXPRESS
// ─────────────────────────────────────────────

const app = express();

app.use(cors());

app.use(express.json({
  limit: '10mb',
}));

// ─────────────────────────────────────────────
// ENV
// ─────────────────────────────────────────────

const MONGO_URI =
  process.env.MONGO_URI;

// ─────────────────────────────────────────────
// SUI CLIENT (SuiJsonRpcClient CHUẨN SUI SDK v2.x)
// ─────────────────────────────────────────────

const suiClient =
  new SuiJsonRpcClient({
    url:
      getJsonRpcFullnodeUrl(
        'testnet'
      ),
  });

// ─────────────────────────────────────────────
// ADMIN KEYPAIR
// ─────────────────────────────────────────────

let adminKeypair;

try {
  const secret = process.env.ADMIN_SECRET_KEY;
  if (secret.startsWith('suiprivkey')) {
    const { secretKey } = decodeSuiPrivateKey(secret);
    adminKeypair = Ed25519Keypair.fromSecretKey(secretKey);
  } else {
    adminKeypair = Ed25519Keypair.fromSecretKey(Buffer.from(secret, 'hex'));
  }
} catch (err) {
  console.error('❌ LỖI ĐỌC ADMIN_SECRET_KEY trong file .env');
  process.exit(1);
}

// ─────────────────────────────────────────────
// LOG
// ─────────────────────────────────────────────

console.log(
  '📦 Package ID:',
  process.env.PACKAGE_ID
);

console.log(
  '🛡️ Admin Cap ID:',
  process.env.ADMIN_CAP_ID
);

console.log(
  '🔑 Ví Admin (Backend):',
  adminKeypair.getPublicKey().toSuiAddress()
);

// ─────────────────────────────────────────────
// MONGODB
// ─────────────────────────────────────────────

const mongo =
  new MongoClient(
    MONGO_URI
  );

await mongo.connect();

console.log(
  '✅ MongoDB Connected'
);

const db =
  mongo.db(
    'sui_artillery'
  );

const users =
  db.collection(
    'users'
  );

const marketListings =
  db.collection(
    'market_listings'
  );

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function getOrCreateUser(
  wallet
) {

  let user =
    await users.findOne({
      wallet,
    });

  if (!user) {

    user = {

      wallet,

      gold: 500,

      energy: 50,

      woodAmmo: 999,

      stoneAmmo: 5,

      ironAmmo: 5,

      fireAmmo: 3,

      acidAmmo: 2,

      clusterAmmo: 1,

      voidAmmo: 1,

      inventory: [],

      chests: [],

      keys: [],

      lastDailyClaim: null,

      lastEnergyRegen:
        Date.now(),

      createdAt:
        new Date(),
    };

    await users.insertOne(
      user
    );
  }

  return user;
}

async function regenEnergy(user) {

  const now = Date.now();

  const last =
    user.lastEnergyRegen || now;

  const diff =
    now - last;

  const regenAmount =
    Math.floor(
      diff / 60000
    );

  if (
    regenAmount <= 0 ||
    user.energy >= 50
  ) {

    return user;
  }

  const newEnergy =
    Math.min(
      50,
      user.energy + regenAmount
    );

  const consumedMs =
    regenAmount * 60000;

  const newLastRegen =
    last + consumedMs;

  await users.updateOne(
    {
      wallet:
        user.wallet,
    },
    {
      $set: {
        energy: newEnergy,
        lastEnergyRegen:
          newLastRegen,
      },
    }
  );

  user.energy =
    newEnergy;

  user.lastEnergyRegen =
    newLastRegen;

  return user;
}

// ─────────────────────────────────────────────
// USER STATUS
// ─────────────────────────────────────────────

app.get(
  '/api/user-status/:wallet',
  async (req, res) => {

    try {

      const wallet =
        req.params.wallet;

      let user =
        await getOrCreateUser(
          wallet
        );

      user =
        await regenEnergy(
          user
        );

      const now = Date.now();

      const lastClaim =
        user.lastDailyClaim
          ? new Date(
            user.lastDailyClaim
          )
          : null;

      let canClaim = true;

      // if (lastClaim) {

      //   const diff =
      //     now - lastClaim.getTime();

      //   canClaim =
      //     diff >=
      //     24 * 60 * 60 * 1000;
      // }

      const msUntilNextRegen =
        Math.max(
          0,
          60000 - (
            now -
            user.lastEnergyRegen
          )
        );

      return res.json({

        success: true,

        energy:
          user.energy,

        gold:
          user.gold,

        canClaim,

        msUntilNextRegen,

        woodAmmo:
          user.woodAmmo || 0,

        stoneAmmo:
          user.stoneAmmo || 0,

        ironAmmo:
          user.ironAmmo || 0,

        fireAmmo:
          user.fireAmmo || 0,

        acidAmmo:
          user.acidAmmo || 0,

        clusterAmmo:
          user.clusterAmmo || 0,

        voidAmmo:
          user.voidAmmo || 0,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          err.message,
      });
    }
  }
);

// ─────────────────────────────────────────────
// BUY ENERGY
// ─────────────────────────────────────────────

app.post(
  '/api/buy-energy',
  async (req, res) => {

    try {

      const {
        playerAddress,
      } = req.body;

      const user =
        await getOrCreateUser(
          playerAddress
        );

      const newEnergy =
        Math.min(
          50,
          user.energy + 10
        );

      await users.updateOne(
        {
          wallet:
            playerAddress,
        },
        {
          $set: {
            energy:
              newEnergy,
          },
        }
      );

      return res.json({

        success: true,

        message:
          '+10⚡️',
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({

        success: false,

        message:
          err.message,
      });
    }
  }
);

// ─────────────────────────────────────────────
// CLAIM DAILY
// ─────────────────────────────────────────────

app.post(
  '/api/claim-daily',
  async (req, res) => {

    try {

      const {
        playerAddress,
      } = req.body;

      const user =
        await getOrCreateUser(
          playerAddress
        );

      const now = Date.now();

      // if (
      //   user.lastDailyClaim
      // ) {

      //   const diff =
      //     now -
      //     new Date(
      //       user.lastDailyClaim
      //     ).getTime();

      //   if (
      //     diff <
      //     24 * 60 * 60 * 1000
      //   ) {

      //     return res.json({

      //       success: false,

      //       message:
      //         'Đã nhận hôm nay',
      //     });
      //   }
      // }
      const newEnergy = Math.min(50, user.energy + 10);
      await users.updateOne(
        {
          wallet:
            playerAddress,
        },
        {
          $inc: {
            gold: 250,
            stoneAmmo: 2,
            ironAmmo: 2,
          },

          $set: {
            energy: newEnergy,
            lastDailyClaim:
              new Date(),
          },
        }
      );

      return res.json({

        success: true,

        message:
          'Nhận thành công 10⚡️  + 250💰',
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({

        success: false,

        message:
          err.message,
      });
    }
  }
);

// ─────────────────────────────────────────────
// BUY AMMO
// ─────────────────────────────────────────────

app.post(
  '/api/buy-ammo',
  async (req, res) => {

    try {

      const {
        playerAddress,
        ammoType,
      } = req.body;

      const PRICE_MAP = {

        STONE: 50,
        IRON: 20,
        FIRE: 50,
        ACID: 100,
        CLUSTER: 200,
        VOID: 500,
      };

      const FIELD_MAP = {

        STONE: 'stoneAmmo',
        IRON: 'ironAmmo',
        FIRE: 'fireAmmo',
        ACID: 'acidAmmo',
        CLUSTER: 'clusterAmmo',
        VOID: 'voidAmmo',
      };

      const price =
        PRICE_MAP[ammoType];

      const field =
        FIELD_MAP[ammoType];

      if (!price || !field) {

        return res.json({

          success: false,

          message:
            'Ammo không hợp lệ',
        });
      }

      const user =
        await getOrCreateUser(
          playerAddress
        );

      if (
        user.gold < price
      ) {

        return res.json({

          success: false,

          message:
            'Không đủ vàng',
        });
      }

      await users.updateOne(
        {
          wallet:
            playerAddress,
        },
        {
          $inc: {
            gold: -price,
            [field]: 1,
          },
        }
      );

      return res.json({

        success: true,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({

        success: false,
        message:
          err.message,
      });
    }
  }
);

// ─────────────────────────────────────────────
// USE AMMO
// ─────────────────────────────────────────────

app.post(
  '/api/use-ammo',
  async (req, res) => {

    try {

      const {
        playerAddress,
        ammoType,
      } = req.body;

      const FIELD_MAP = {

        WOOD: 'woodAmmo',
        STONE: 'stoneAmmo',
        IRON: 'ironAmmo',
        FIRE: 'fireAmmo',
        ACID: 'acidAmmo',
        CLUSTER: 'clusterAmmo',
        VOID: 'voidAmmo',
      };

      const field =
        FIELD_MAP[ammoType];

      if (!field) {

        return res.json({

          success: false,
          message:
            'Ammo invalid',
        });
      }

      const user =
        await getOrCreateUser(
          playerAddress
        );

      if (
        user.energy <= 0
      ) {

        return res.json({

          success: false,
          message:
            'Hết năng lượng',
        });
      }

      if (
        user[field] <= 0
      ) {

        return res.json({

          success: false,
          message:
            'Hết đạn',
        });
      }

      await users.updateOne(
        {
          wallet:
            playerAddress,
        },
        {
          $inc: {
            energy: -1,
            [field]: -1,
          },
        }
      );

      return res.json({
        success: true,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          err.message,
      });
    }
  }
);

// ─────────────────────────────────────────────
// VERIFY SHOT (ÉP CLIENT VÀO TX.BUILD ĐỂ KHÔNG BỊ MISSING)
// ─────────────────────────────────────────────

app.post(
  '/api/verify-shot',
  async (req, res) => {

    try {

      const {
        playerAddress,
      } = req.body;

      await getOrCreateUser(
        playerAddress
      );

      // 1. CỘNG CHUẨN 500 VÀNG
      await users.updateOne(
        {
          wallet:
            playerAddress,
        },
        {
          $inc: {
            gold: 500,
          },
        }
      );

      // 2. MINT RƯƠNG ON-CHAIN CHO USER
      const tx = new Transaction();

      tx.setSender(adminKeypair.getPublicKey().toSuiAddress());

      tx.moveCall({
        target: `${process.env.PACKAGE_ID}::player::mint_chest`,
        arguments: [
          tx.object(process.env.ADMIN_CAP_ID),
          tx.pure.address(playerAddress),
          tx.object('0x6') // Bắt buộc phải có theo file player.move
        ]
      });

      // 🌟 BẤT TỬ ĐÂY RỒI: ÉP THẲNG CLIENT VÀO ĐỂ DỊCH MÃ 0X6 🌟
      const txBytes = await tx.build({ client: suiClient });

      const { signature } = await adminKeypair.signTransaction(txBytes);

      const result = await suiClient.executeTransactionBlock({
        transactionBlock: txBytes,
        signature: signature,
        options: { showEffects: true }
      });

      // BẮT LỖI TỪ MẠNG SUI NẾU CÓ
      if (result.effects?.status?.status !== 'success') {
        const errorMsg = result.effects?.status?.error || 'Unknown Sui Error';
        throw new Error(`SUI TỪ CHỐI GIAO DỊCH: ${errorMsg}`);
      }

      return res.json({

        success: true,

        digest:
          result.digest,
      });

    } catch (err) {

      console.error('LỖI ĐÚC RƯƠNG:', err);

      return res.status(500).json({

        success: false,
        message:
          err.message,
      });
    }
  }
);

// ─────────────────────────────────────────────
// OPEN CHEST
// ─────────────────────────────────────────────

app.post(
  '/api/open-chest',
  async (req, res) => {

    try {

      const {
        playerAddress,
      } = req.body;

      const user =
        await getOrCreateUser(
          playerAddress
        );

      if (
        user.gold < 100
      ) {

        return res.json({

          success: false,

          message:
            'Không đủ vàng',
        });
      }

      await users.updateOne(
        {
          wallet:
            playerAddress,
        },
        {
          $inc: {
            gold: -100,
          },
        }
      );

      return res.json({
        success: true,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          err.message,
      });
    }
  }
);

// ─────────────────────────────────────────────
// MARKET LISTINGS
// ─────────────────────────────────────────────

app.get(
  '/api/market/listings',
  async (req, res) => {

    try {

      const listings =
        await marketListings
          .find({})
          .sort({
            createdAt: -1,
          })
          .toArray();

      return res.json({
        success: true,
        listings,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          err.message,
      });
    }
  }
);

// ─────────────────────────────────────────────
// SERVER
// ─────────────────────────────────────────────

export default app;
