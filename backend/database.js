import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Đã kết nối MongoDB thành công!');
    } catch (error) {
        console.error('❌ Lỗi kết nối MongoDB:', error.message);
        throw error;
    }
};

const userSchema = new mongoose.Schema(
    {
        walletAddress: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        energy: {
            type: Number,
            default: 5,
            min: 0,
            max: 200,
        },
        gold: {
            type: Number,
            default: 500, // 🌟 Tiền tệ Off-chain (Game Economy)
            min: 0,
        },
        lastClaimDate: {
            type: String,
            default: '',
        },
        lastEnergyUpdate: {
            type: Number,
            default: Date.now,
        },
        usedTxDigests: {
            type: [String],
            default: [],
        },
        // 🌟 Nền kinh tế đạn dược & Tiến trình (Phase 2)
        woodAmmo: {
            type: Number,
            default: 30,
        },
        stoneAmmo: {
            type: Number,
            default: 0,
        },
        ironAmmo: {
            type: Number,
            default: 0,
        },
        fireAmmo: {
            type: Number,
            default: 0,
        },
        acidAmmo: {
            type: Number,
            default: 0,
        },
        clusterAmmo: {
            type: Number,
            default: 0,
        },
        voidAmmo: {
            type: Number,
            default: 0,
        },
        xp: {
            type: Number,
            default: 0,
        },
        level: {
            type: Number,
            default: 1,
        },
        quests: {
            type: Object,
            default: {
                loginClaimed: false,
                shotsFiredToday: 0,
                wallsDestroyedToday: 0,
                lastResetDate: '',
            },
        },
    },
    {
        timestamps: true,
    }
);

export const User = mongoose.model('User', userSchema);

const serverPoolSchema = new mongoose.Schema(
    {
        configKey: {
            type: String,
            default: 'GLOBAL_POOL',
            unique: true,
        },
        totalEnergyLeft: {
            type: Number,
            default: 10000,
        },
        lastResetDate: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

export const ServerPool = mongoose.model('ServerPool', serverPoolSchema);

// ─── MARKETPLACE SCHEMA ──────────────────────────────────────────────────
const marketListingSchema = new mongoose.Schema(
    {
        seller: { type: String, required: true, index: true },
        itemObjectId: { type: String, required: true, unique: true },
        itemType: { type: String, required: true }, // 'weapon' | 'key' | 'chest'
        priceGold: { type: Number, required: true },
        status: { type: String, default: 'active', enum: ['active', 'sold', 'cancelled'] },
        // Metadata lưu thừa để hiển thị nhanh
        itemName: { type: String, default: 'Vật phẩm' },
        rarity: { type: Number, default: 1 },
        damage: { type: Number, default: 0 },
        durability: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export const MarketListing = mongoose.model('MarketListing', marketListingSchema);