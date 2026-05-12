module sui_artillery::player;

use sui::event;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::balance::{Self, Balance};
use sui::random::{Self, Random};
use sui::clock::{Self, Clock};

// --- ERROR CODES ---
const E_INSUFFICIENT_FEE: u64 = 1;
const E_KEY_MISMATCH: u64 = 3;

// --- CONSTANTS ---
const CHEST_EXPIRE_MS: u64 = 7 * 24 * 60 * 60 * 1000; 
const LEGENDARY_PRICE: u64 = 100_000_000; // 0.1 SUI cho Legendary

// --- STRUCTS ---
public struct AdminCap has key, store { id: UID }

public struct GamePool has key { id: UID, balance: Balance<SUI> }

public struct Chest has key, store { id: UID, mint_time: u64 }

public struct Weapon has key, store { id: UID, damage: u64, durability: u8 }

// Vật phẩm On-chain giá trị cao
public struct Key has key, store { id: UID }

// --- EVENTS ---
public struct ChestMinted has copy, drop { chest_id: ID, recipient: address }
public struct KeyMinted has copy, drop { key_id: ID, recipient: address }
public struct WeaponMinted has copy, drop { weapon_id: ID, owner: address, damage: u64, rarity: u8, sui_reward: u64 }

// --- INIT ---
fun init(ctx: &mut TxContext) {
    transfer::public_transfer(AdminCap { id: object::new(ctx) }, tx_context::sender(ctx));
    transfer::share_object(GamePool { id: object::new(ctx), balance: balance::zero() });
}

// --- ADMIN FUNCTIONS ---
public fun fund_pool(_: &AdminCap, pool: &mut GamePool, fund: Coin<SUI>) {
    coin::put(&mut pool.balance, fund);
}

public fun mint_chest(_: &AdminCap, recipient: address, clock: &Clock, ctx: &mut TxContext) {
    let chest = Chest { id: object::new(ctx), mint_time: clock::timestamp_ms(clock) };
    let chest_id = object::uid_to_inner(&chest.id);
    event::emit(ChestMinted { chest_id, recipient });
    transfer::public_transfer(chest, recipient);
}

public fun mint_key(_: &AdminCap, recipient: address, ctx: &mut TxContext) {
    let key = Key { id: object::new(ctx) };
    let key_id = object::uid_to_inner(&key.id);
    event::emit(KeyMinted { key_id, recipient });
    transfer::public_transfer(key, recipient);
}

// --- INTERNAL LOGIC ---
fun process_reward(
    chest: Chest, pool: &mut GamePool, rarity: u8, damage: u64, durability: u8, mut reward_sui: u64, ctx: &mut TxContext
) {
    let owner = tx_context::sender(ctx);
    
    if (reward_sui > 0 && balance::value(&pool.balance) >= reward_sui) {
        let reward_coin = coin::take(&mut pool.balance, reward_sui, ctx);
        transfer::public_transfer(reward_coin, owner);
    } else {
        reward_sui = 0;
    };

    let weapon = Weapon { id: object::new(ctx), damage, durability };
    let weapon_id = object::uid_to_inner(&weapon.id);
    let Chest { id: chest_uid, mint_time: _ } = chest; 
    object::delete(chest_uid);

    event::emit(WeaponMinted { weapon_id, owner, damage, rarity, sui_reward: reward_sui });
    transfer::public_transfer(weapon, owner);
}

// --- 1. NORMAL CHEST ---
public fun open_normal_batch(mut chests: vector<Chest>, pool: &mut GamePool, clock: &Clock, r: &Random, ctx: &mut TxContext) {
    let mut generator = random::new_generator(r, ctx);
    let now = clock::timestamp_ms(clock);

    while (!vector::is_empty(&chests)) {
        let chest = vector::pop_back(&mut chests);
        if (now > chest.mint_time + CHEST_EXPIRE_MS) {
            let Chest { id: chest_uid, mint_time: _ } = chest;
            object::delete(chest_uid);
        } else {
            let roll = random::generate_u8_in_range(&mut generator, 1, 100);
            let (rarity, damage, durability, reward_sui) = if (roll <= 70) { (1, 10, 50, 0) } 
            else if (roll <= 95) { (2, 50, 100, 1_000_000) } 
            else { (3, 100, 150, 5_000_000) };
            
            process_reward(chest, pool, rarity, damage, durability, reward_sui, ctx);
        }
    };
    vector::destroy_empty(chests);
}

// --- 2. EPIC CHEST ---
public fun open_epic_batch(mut chests: vector<Chest>, mut keys: vector<Key>, pool: &mut GamePool, clock: &Clock, r: &Random, ctx: &mut TxContext) {
    assert!(vector::length(&chests) == vector::length(&keys), E_KEY_MISMATCH);
    let mut generator = random::new_generator(r, ctx);
    let now = clock::timestamp_ms(clock);

    while (!vector::is_empty(&chests)) {
        let chest = vector::pop_back(&mut chests);
        let key = vector::pop_back(&mut keys);
        
        let Key { id: key_uid } = key; 
        object::delete(key_uid);

        if (now > chest.mint_time + CHEST_EXPIRE_MS) {
            let Chest { id: chest_uid, mint_time: _ } = chest;
            object::delete(chest_uid);
        } else {
            let roll = random::generate_u8_in_range(&mut generator, 1, 100);
            let (rarity, damage, durability, reward_sui) = if (roll <= 50) { (2, 80, 120, 5_000_000) } 
            else if (roll <= 90) { (3, 200, 200, 20_000_000) } 
            else { (4, 400, 255, 50_000_000) };
            
            process_reward(chest, pool, rarity, damage, durability, reward_sui, ctx);
        }
    };
    vector::destroy_empty(chests);
    vector::destroy_empty(keys);
}

// --- 3. LEGENDARY CHEST ---
public fun open_legendary_batch(mut chests: vector<Chest>, mut keys: vector<Key>, mut fee: Coin<SUI>, pool: &mut GamePool, clock: &Clock, r: &Random, ctx: &mut TxContext) {
    let total = vector::length(&chests);
    assert!(total == vector::length(&keys), E_KEY_MISMATCH);
    
    let total_fee_req = total * LEGENDARY_PRICE;
    let fee_val = coin::value(&fee); // 🌟 FIX: Lấy giá trị ra biến riêng để không bị mượn chồng chéo
    assert!(fee_val >= total_fee_req, E_INSUFFICIENT_FEE);
    
    if (fee_val > total_fee_req) {
        let change_amount = fee_val - total_fee_req;
        let change = coin::split(&mut fee, change_amount, ctx);
        transfer::public_transfer(change, tx_context::sender(ctx));
    };

    let mut generator = random::new_generator(r, ctx);
    let now = clock::timestamp_ms(clock);

    while (!vector::is_empty(&chests)) {
        let chest = vector::pop_back(&mut chests);
        let key = vector::pop_back(&mut keys);
        let single_fee = coin::split(&mut fee, LEGENDARY_PRICE, ctx);
        
        let Key { id: key_uid } = key; 
        object::delete(key_uid);
        coin::put(&mut pool.balance, single_fee);

        if (now > chest.mint_time + CHEST_EXPIRE_MS) {
            let Chest { id: chest_uid, mint_time: _ } = chest;
            object::delete(chest_uid);
        } else {
            let roll = random::generate_u8_in_range(&mut generator, 1, 100);
            let (rarity, damage, durability, reward_sui) = if (roll <= 40) { (3, 250, 200, 50_000_000) } 
            else { (4, 800, 255, 300_000_000) };
            
            process_reward(chest, pool, rarity, damage, durability, reward_sui, ctx);
        }
    };
    vector::destroy_empty(chests);
    vector::destroy_empty(keys);
    coin::destroy_zero(fee);
}