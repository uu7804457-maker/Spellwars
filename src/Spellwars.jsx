import React, { useState, useEffect, useRef } from "react";
import { Skull, Users, Wifi, Copy, RefreshCw } from "lucide-react";
import { ref, get, set, onValue } from "firebase/database";
import { db, ensureAuth } from "./firebase.js";

// ============================================================
// Effect builders
// ============================================================
const dmgS = (power, extra = {}) => ({ type: "dmg_single", power, ...extra });
const dmgA = (power) => ({ type: "dmg_aoe", power });
const heal = (power) => ({ type: "heal_self", power });
const shieldEff = (charges = 1) => ({ type: "shield_self", charges });
const reflectEff = () => ({ type: "reflect_self" });
const stunEff = () => ({ type: "stun_single" });
const silenceEff = () => ({ type: "silence_single" });
const stealEff = () => ({ type: "steal_letter" });
const removeRand = () => ({ type: "remove_letter_random" });
const shuffleEff = () => ({ type: "shuffle_letters" });
const drawDebuff = () => ({ type: "debuff_next_draw" });
const cleanseHeal = (power) => ({ type: "cleanse_heal_self", power });
const powerBuff = () => ({ type: "buff_next_power" });
const costDiscount = () => ({ type: "reduce_next_cost" });
const reviveCharge = () => ({ type: "revive_charge" });
const invincibleEff = () => ({ type: "invincible_self" });
const dispelEff = () => ({ type: "dispel_target" });
const revealEff = () => ({ type: "reveal_target" });
const extraTurn = () => ({ type: "extra_turn" });
const executeEff = (basePower, bonus) => ({ type: "execute", basePower, bonus });
const recoilSelf = (power) => ({ type: "recoil_self", power });
const massDraw = (amount) => ({ type: "mass_draw", amount });
const healAllFull = () => ({ type: "heal_all_full" });
const globalDebuffImmune = (rounds) => ({ type: "global_debuff_immune", rounds });
const delayedMaxHpBoost = (rounds, multiplier) => ({ type: "delayed_max_hp_boost", rounds, multiplier });
const invincibleRounds = (rounds) => ({ type: "invincible_rounds", rounds });
const pacifistWard = (rounds, healAmount) => ({ type: "pacifist_ward", rounds, healAmount });
const stealImmuneGrowth = (rounds) => ({ type: "steal_immune_growth", rounds });

// ============================================================
// Grimoires: 28 + 22 + 30 = 80 spells
// ============================================================
const BOOKS = {
  western: {
    key: "western",
    name: "西洋の書",
    sub: "Christianity & Greek Myth",
    accent: "#C9A227",
    sigil: "†",
    drawCount: 5,
    pool: "A,B,C,D,E,F,G,H,I,K,L,M,N,O,P,R,S,T,U,V,W,X,Y,Z".split(","),
    spells: [
      { id: "fire", name: "FIRE", origin: "汎用", cost: ["F","I","R","E"], effects: [dmgS(25)] },
      { id: "thunderbolt", name: "THUNDERBOLT", origin: "汎用/ゼウスの武器", cost: ["T","H","U","N","D","E","R","B","O","L","T"], effects: [dmgS(35), stunEff()] },
      { id: "heal", name: "HEAL", origin: "汎用", cost: ["H","E","A","L"], effects: [heal(20)] },
      { id: "shield", name: "SHIELD", origin: "汎用", cost: ["S","H","I","E","L","D"], effects: [shieldEff(1)] },
      { id: "meteor", name: "METEOR", origin: "汎用", cost: ["M","E","T","E","O","R"], effects: [dmgA(15)] },
      { id: "steal", name: "STEAL", origin: "汎用", cost: ["S","T","E","A","L"], effects: [stealEff()] },
      { id: "curse", name: "CURSE", origin: "汎用", cost: ["C","U","R","S","E"], effects: [stunEff()] },
      { id: "revive", name: "REVIVE", origin: "汎用", cost: ["R","E","V","I","V","E"], effects: [cleanseHeal(35)] },
      { id: "drain", name: "DRAIN", origin: "汎用", cost: ["D","R","A","I","N"], effects: [dmgS(20), heal(20)] },
      { id: "mirror", name: "MIRROR", origin: "汎用", cost: ["M","I","R","R","O","R"], effects: [reflectEff()] },
      { id: "genesis", name: "GENESIS", origin: "創世記", cost: ["G","E","N","E","S","I","S"], effects: [cleanseHeal(40)] },
      { id: "eden", name: "EDEN", origin: "楽園", cost: ["E","D","E","N"], effects: [heal(30)] },
      { id: "seraphim", name: "SERAPHIM", origin: "熾天使", cost: ["S","E","R","A","P","H","I","M"], effects: [dmgS(35)] },
      { id: "armageddon", name: "ARMAGEDDON", origin: "終末の決戦地", cost: ["A","R","M","A","G","E","D","D","O","N"], effects: [dmgA(25)] },
      { id: "salvation", name: "SALVATION", origin: "救済", cost: ["S","A","L","V","A","T","I","O","N"], effects: [cleanseHeal(40)] },
      { id: "zeus", name: "ZEUS", origin: "雷の主神", cost: ["Z","E","U","S"], effects: [dmgS(35)] },
      { id: "olympus", name: "OLYMPUS", origin: "神々の座", cost: ["O","L","Y","M","P","U","S"], effects: [powerBuff()] },
      { id: "medusa", name: "MEDUSA", origin: "石化の怪物", cost: ["M","E","D","U","S","A"], effects: [stunEff()] },
      { id: "phoenix", name: "PHOENIX", origin: "不死鳥", cost: ["P","H","O","E","N","I","X"], effects: [reviveCharge()] },
      { id: "chimera", name: "CHIMERA", origin: "合成獣", cost: ["C","H","I","M","E","R","A"], effects: [dmgS(20), drawDebuff()] },
      { id: "hades", name: "HADES", origin: "冥府の王", cost: ["H","A","D","E","S"], effects: [stealEff()] },
      { id: "chaos", name: "CHAOS", origin: "混沌", cost: ["C","H","A","O","S"], effects: [shuffleEff()] },
      { id: "titan", name: "TITAN", origin: "巨神族", cost: ["T","I","T","A","N"], effects: [dmgS(45), recoilSelf(15)] },
      { id: "nemesis", name: "NEMESIS", origin: "復讐と応報の女神", cost: ["N","E","M","E","S","I","S"], effects: [reflectEff()] },
      { id: "atlas", name: "ATLAS", origin: "天を支える巨神", cost: ["A","T","L","A","S"], effects: [shieldEff(1)] },
      { id: "styx", name: "STYX", origin: "冥界の川", cost: ["S","T","Y","X"], effects: [silenceEff()] },
      { id: "elysium", name: "ELYSIUM", origin: "英雄の楽園", cost: ["E","L","Y","S","I","U","M"], effects: [heal(30)] },
      { id: "covenant", name: "COVENANT", origin: "契約", cost: ["C","O","V","E","N","A","N","T"], effects: [costDiscount()] },
      { id: "pandora", name: "PANDORA", origin: "パンドラの箱", cost: ["P","A","N","D","O","R","A"], effects: [dmgA(20)] },
      { id: "icarus", name: "ICARUS", origin: "太陽に近づきすぎた者", cost: ["I","C","A","R","U","S"], effects: [dmgS(30), recoilSelf(10)] },
      { id: "thirst", name: "If any man thirst, let him come unto me, and drink", origin: "ヨハネ7:37(超上位)", cost: ["I","F","A","N","Y","M","A","N","T","H","I","R","S","T","L","E","T","H","I","M","C","O","M","E","U","N","T","O","M","E","A","N","D","D","R","I","N","K"], effects: [massDraw(8)] },
      { id: "narrowgate", name: "Enter through the narrow gate", origin: "マタイ7:13-14(超上位)", cost: ["E","N","T","E","R","T","H","R","O","U","G","H","T","H","E","N","A","R","R","O","W","G","A","T","E"], effects: [healAllFull(), globalDebuffImmune(2)] },
      { id: "logos", name: "In the beginning was the Word, and the Word was with God, and the Word was God", origin: "ヨハネ1:1(超上位)", cost: ["I","N","T","H","E","B","E","G","I","N","N","I","N","G","W","A","S","T","H","E","W","O","R","D","A","N","D","T","H","E","W","O","R","D","W","A","S","W","I","T","H","G","O","D","A","N","D","T","H","E","W","O","R","D","W","A","S","G","O","D"], effects: [delayedMaxHpBoost(3, 2)] },
    ],
  },
  wa: {
    key: "wa",
    name: "和の書",
    sub: "古事記・日本書紀",
    accent: "#B23A48",
    sigil: "巴",
    drawCount: 5,
    pool: "か,ぜ,き,り,み,ず,が,は,な,ふ,ぶ,ち,の,わ,さ,め,げ,ぬ,す,つ,ど,う,あ,ま,て,ら,お,く,よ,や,た,ろ,ぎ,い,と,ひ,も,そ,に,ぐ,え,ば,し,ざ,こ,け,づ,せ,じ,る,ご,を".split(","),
    spells: [
      { id: "kazekiri", name: "かぜきり", origin: "汎用", cost: ["か","ぜ","き","り"], effects: [dmgS(15), extraTurn()] },
      { id: "mizukagami", name: "みずかがみ", origin: "汎用", cost: ["み","ず","か","が","み"], effects: [shieldEff(1)] },
      { id: "hanafubuki", name: "はなふぶき", origin: "汎用", cost: ["は","な","ふ","ぶ","き"], effects: [dmgA(12), removeRand()] },
      { id: "chinowa", name: "ちのわ", origin: "汎用/茅の輪", cost: ["ち","の","わ"], effects: [heal(20)] },
      { id: "kirisame", name: "きりさめ", origin: "汎用", cost: ["き","り","さ","め"], effects: [stunEff()] },
      { id: "kagenusumi", name: "かげぬすみ", origin: "汎用", cost: ["か","げ","ぬ","す","み"], effects: [stealEff()] },
      { id: "tsukinohadou", name: "つきのはどう", origin: "汎用", cost: ["つ","き","の","は","ど","う"], effects: [dmgA(18)] },
      { id: "amaterasu", name: "あまてらす", origin: "太陽神・皇祖神", cost: ["あ","ま","て","ら","す"], effects: [dmgA(12), heal(15)] },
      { id: "susanoo", name: "すさのお", origin: "嵐の神・荒ぶる神", cost: ["す","さ","の","お"], effects: [dmgS(35)] },
      { id: "tsukuyomi", name: "つくよみ", origin: "月読の神", cost: ["つ","く","よ","み"], effects: [silenceEff()] },
      { id: "yamatanoorochi", name: "やまたのおろち", origin: "八岐大蛇", cost: ["や","ま","た","の","お","ろ","ち"], effects: [dmgA(25)] },
      { id: "kusanagi", name: "くさなぎ", origin: "草薙剣", cost: ["く","さ","な","ぎ"], effects: [dmgS(25, { pierce: true })] },
      { id: "amanoiwato", name: "あまのいわと", origin: "天岩戸", cost: ["あ","ま","の","い","わ","と"], effects: [silenceEff(), drawDebuff()] },
      { id: "yomotsuhirasaka", name: "よもつひらさか", origin: "黄泉比良坂", cost: ["よ","も","つ","ひ","ら","さ","か"], effects: [cleanseHeal(35)] },
      { id: "misogi", name: "みそぎ", origin: "禊(穢れ祓い)", cost: ["み","そ","ぎ"], effects: [dispelEff(), heal(12)] },
      { id: "kamikaze", name: "かみかぜ", origin: "神風", cost: ["か","み","か","ぜ"], effects: [reflectEff()] },
      { id: "takamagahara", name: "たかまがはら", origin: "高天原", cost: ["た","か","ま","が","は","ら"], effects: [costDiscount()] },
      { id: "yatagarasu", name: "やたがらす", origin: "八咫烏(導きの神使)", cost: ["や","た","が","ら","す"], effects: [revealEff(), extraTurn()] },
      { id: "inabanoshirousagi", name: "いなばのしろうさぎ", origin: "因幡の白兎", cost: ["い","な","ば","の","し","ろ","う","さ","ぎ"], effects: [heal(30)] },
      { id: "okuninushi", name: "おおくにぬし", origin: "大国主(国造りの神)", cost: ["お","お","く","に","ぬ","し"], effects: [powerBuff()] },
      { id: "kaguyahime", name: "かぐやひめ", origin: "かぐや姫(竹取物語)", cost: ["か","ぐ","や","ひ","め"], effects: [invincibleEff()] },
      { id: "yomigaeri", name: "よみがえり", origin: "汎用/黄泉還り", cost: ["よ","み","が","え","り"], effects: [reviveCharge()] },
      { id: "izanagi", name: "いざなぎ", origin: "伊邪那岐(禊から三貴子を生む)", cost: ["い","ざ","な","ぎ"], effects: [cleanseHeal(35)] },
      { id: "izanami", name: "いざなみ", origin: "伊邪那美(黄泉の女神)", cost: ["い","ざ","な","み"], effects: [dmgS(30)] },
      { id: "kotoshironushi", name: "ことしろぬし", origin: "事代主(託宣の神)", cost: ["こ","と","し","ろ","ぬ","し"], effects: [revealEff()] },
      { id: "takemikazuchi", name: "たけみかづち", origin: "建御雷(雷と剣の神)", cost: ["た","け","み","か","づ","ち"], effects: [dmgS(35)] },
      { id: "toyotamahime", name: "とよたまひめ", origin: "豊玉姫(海神の娘)", cost: ["と","よ","た","ま","ひ","め"], effects: [heal(25)] },
      { id: "seoritsuhime", name: "せおりつひめ", origin: "瀬織津姫(祓えの女神)", cost: ["せ","お","り","つ","ひ","め"], effects: [dispelEff()] },
      { id: "watatsumi", name: "わたつみ", origin: "綿津見(海の神)", cost: ["わ","た","つ","み"], effects: [shieldEff(1)] },
      { id: "ninigi", name: "ににぎのみこと", origin: "瓊瓊杵尊(天孫降臨)", cost: ["に","に","ぎ","の","み","こ","と"], effects: [powerBuff()] },
      { id: "amenominakanushi", name: "あめつちはじめておこりしときにたかあまのはらになるかみ", origin: "古事記冒頭(超上位)", cost: ["あ","め","つ","ち","は","じ","め","て","お","こ","り","し","と","き","に","た","か","あ","ま","の","は","ら","に","な","る","か","み"], effects: [dmgA(35)] },
      { id: "amaterasuhikari", name: "たかまのはらもあしはらのなかつくにもおのずからてりあかりき", origin: "天照大神の光(超上位)", cost: ["た","か","ま","の","は","ら","も","あ","し","は","ら","の","な","か","つ","く","に","も","お","の","ず","か","ら","て","り","あ","か","り","き"], effects: [heal(50)] },
      { id: "yaegaki", name: "やくもたついずもやえがきつまごみにやえがきつくるそのやえがきを", origin: "須佐之男の歌(超上位)", cost: ["や","く","も","た","つ","い","ず","も","や","え","が","き","つ","ま","ご","み","に","や","え","が","き","つ","く","る","そ","の","や","え","が","き","を"], effects: [shieldEff(8)] },
    ],
  },
  chinese: {
    key: "chinese",
    name: "中華の書",
    sub: "仏教・道教・中国神話",
    accent: "#2F6F4E",
    sigil: "龍",
    drawCount: 4,
    pool: "火,炎,雷,撃,治,癒,結,界,天,罰,封,印,奪,魂,再,生,静,寂,崩,壊,涅,槃,輪,廻,陰,陽,太,極,龍,神,鳳,凰,麒,麟,命,因,果,修,羅,漢,冥,府,八,卦,玄,武,朱,雀,青,虎,般,若,業,白,色,即,是,空,上,善,水,利,万,物,而,不,子,曰,学,如,及,猶,恐,失,之,争".split(","),
    spells: [
      { id: "kaen", name: "火炎", origin: "汎用", cost: ["火","炎"], effects: [dmgS(25)] },
      { id: "raigeki", name: "雷撃", origin: "汎用", cost: ["雷","撃"], effects: [dmgS(35)] },
      { id: "chiyu", name: "治癒", origin: "汎用", cost: ["治","癒"], effects: [heal(20)] },
      { id: "kekkai", name: "結界", origin: "汎用", cost: ["結","界"], effects: [shieldEff(1)] },
      { id: "tenbatsu", name: "天罰", origin: "汎用", cost: ["天","罰"], effects: [dmgA(25)] },
      { id: "fuuin", name: "封印", origin: "汎用", cost: ["封","印"], effects: [stunEff()] },
      { id: "dakon", name: "奪魂", origin: "汎用", cost: ["奪","魂"], effects: [stealEff()] },
      { id: "saisei", name: "再生", origin: "汎用", cost: ["再","生"], effects: [cleanseHeal(35)] },
      { id: "seijaku", name: "静寂", origin: "汎用", cost: ["静","寂"], effects: [silenceEff()] },
      { id: "houkai", name: "崩壊", origin: "汎用", cost: ["崩","壊"], effects: [dmgS(45), recoilSelf(15)] },
      { id: "nehan", name: "涅槃", origin: "仏教・悟りの境地", cost: ["涅","槃"], effects: [cleanseHeal(40)] },
      { id: "rinne", name: "輪廻", origin: "仏教・生死の circulation", cost: ["輪","廻"], effects: [reviveCharge()] },
      { id: "inyou", name: "陰陽", origin: "道教・二元の調和", cost: ["陰","陽"], effects: [shieldEff(1), heal(15)] },
      { id: "taikyoku", name: "太極", origin: "道教・万物の根源", cost: ["太","極"], effects: [powerBuff()] },
      { id: "ryuujin", name: "龍神", origin: "中国神話・水と天の神", cost: ["龍","神"], effects: [dmgS(35)] },
      { id: "houou", name: "鳳凰", origin: "中国神話・不死の霊鳥", cost: ["鳳","凰"], effects: [cleanseHeal(35)] },
      { id: "kirin", name: "麒麟", origin: "中国神話・仁獣", cost: ["麒","麟"], effects: [heal(30)] },
      { id: "tenmei", name: "天命", origin: "儒教・王権の正統性", cost: ["天","命"], effects: [executeEff(15, 25)] },
      { id: "inga", name: "因果", origin: "仏教・業(カルマ)", cost: ["因","果"], effects: [reflectEff()] },
      { id: "shura", name: "修羅", origin: "仏教・戦いの鬼神", cost: ["修","羅"], effects: [dmgS(45), recoilSelf(20)] },
      { id: "rakan", name: "羅漢", origin: "仏教・悟りを得た聖者", cost: ["羅","漢"], effects: [shieldEff(1)] },
      { id: "meifu", name: "冥府", origin: "道教・民間信仰の死者の国", cost: ["冥","府"], effects: [stealEff()] },
      { id: "hakke", name: "八卦", origin: "道教・易占", cost: ["八","卦"], effects: [revealEff()] },
      { id: "genbu", name: "玄武", origin: "四神・北を司る霊獣", cost: ["玄","武"], effects: [shieldEff(2)] },
      { id: "suzaku", name: "朱雀", origin: "四神・南を司る霊獣", cost: ["朱","雀"], effects: [dmgA(18)] },
      { id: "seiryuu", name: "青龍", origin: "四神・東を司る霊獣", cost: ["青","龍"], effects: [dmgS(35)] },
      { id: "byakko", name: "白虎", origin: "四神・西を司る霊獣", cost: ["白","虎"], effects: [extraTurn()] },
      { id: "hannya", name: "般若", origin: "仏教・智慧/鬼女の面", cost: ["般","若"], effects: [silenceEff()] },
      { id: "gouka", name: "業火", origin: "仏教・カルマの炎", cost: ["業","火"], effects: [dmgS(35)] },
      { id: "houshin", name: "封神", origin: "中国神話・神への列聖", cost: ["封","神"], effects: [dmgA(30)] },
      { id: "shikisokuzeku", name: "色即是空、空即是色", origin: "般若心経(超上位)", cost: ["色","即","是","空","空","即","是","色"], effects: [invincibleRounds(2)] },
      { id: "jouzenjyakusui", name: "上善若水、水善利万物而不争", origin: "老子(超上位)", cost: ["上","善","若","水","水","善","利","万","物","而","不","争"], effects: [pacifistWard(3, 20)] },
      { id: "gakunyofukyuu", name: "子曰、学如不及。猶恐失之", origin: "論語(超上位)", cost: ["子","曰","学","如","不","及","猶","恐","失","之"], effects: [stealImmuneGrowth(3)] },
    ],
  },
};

const EFFECT_LABEL = {
  dmg_single: "単体攻撃", dmg_aoe: "全体攻撃", heal_self: "回復", shield_self: "シールド",
  stun_single: "行動不能", silence_single: "沈黙", steal_letter: "文字奪取", reflect_self: "反射",
  remove_letter_random: "文字消去", shuffle_letters: "撹乱", debuff_next_draw: "取得妨害",
  cleanse_heal_self: "浄化回復", buff_next_power: "威力上昇", reduce_next_cost: "コスト軽減",
  revive_charge: "不屈の加護", invincible_self: "無敵", dispel_target: "解呪", reveal_target: "透視",
  extra_turn: "連続発動", execute: "処刑", recoil_self: "反動",
  mass_draw: "文字大量獲得", heal_all_full: "全員全回復", global_debuff_immune: "全体デバフ無効",
  delayed_max_hp_boost: "自己犠牲の大成長", invincible_rounds: "無敵(複数巡)", pacifist_ward: "献身の加護",
  steal_immune_growth: "研鑽の加護",
};

function effectLabel(spell) {
  return spell.effects.map((e) => EFFECT_LABEL[e.type]).join(" + ");
}

const TARGET_TYPES = ["dmg_single", "stun_single", "silence_single", "steal_letter", "dispel_target", "reveal_target", "execute", "shuffle_letters"];
function needsTarget(spell) {
  return spell.effects.some((e) => TARGET_TYPES.includes(e.type));
}

// ============================================================
// Core game math
// ============================================================
function costToCounts(cost) {
  const m = {};
  for (const c of cost) m[c] = (m[c] || 0) + 1;
  return m;
}
function canCast(letters, cost, discount) {
  const need = costToCounts(cost);
  const missing = Object.entries(need).reduce((s, [ch, n]) => s + Math.max(0, n - (letters[ch] || 0)), 0);
  return discount ? missing <= 1 : missing === 0;
}
function payCost(letters, cost) {
  const need = costToCounts(cost);
  const next = { ...letters };
  for (const [ch, n] of Object.entries(need)) next[ch] = Math.max(0, (next[ch] || 0) - n);
  return next;
}

// Finds the letter type that best "snipes" toward the nearest-to-castable spell.
// Falls back to uniform random from the book's pool if everything is already castable.
function bestSnipeLetter(book, letters) {
  let bestMissing = Infinity;
  let candidates = [];
  for (const spell of book.spells) {
    const need = costToCounts(spell.cost);
    let missing = 0;
    const missingChars = [];
    for (const [ch, n] of Object.entries(need)) {
      const have = letters[ch] || 0;
      if (n > have) { missing += n - have; missingChars.push(...Array(n - have).fill(ch)); }
    }
    if (missing > 0 && missing < bestMissing) { bestMissing = missing; candidates = missingChars; }
    else if (missing > 0 && missing === bestMissing) { candidates.push(...missingChars); }
  }
  if (candidates.length === 0) return book.pool[Math.floor(Math.random() * book.pool.length)];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Caps kept letters at 20 units when moving into a new set. If the player holds
// 20 or fewer already, everything carries over with no need to choose.
function selectKeptLetters(letters, keptList) {
  const totalHeld = Object.values(letters).reduce((a, b) => a + b, 0);
  if (totalHeld <= 20) return { ...letters };
  return costToCounts(keptList);
}

// Resets everything except identity/letters/eliminated for a fresh set.
function resetPlayerForNewSet(player, baseMaxHp, keptLetters) {
  return {
    name: player.name, book: player.book, eliminated: player.eliminated || false,
    hp: baseMaxHp, maxHp: baseMaxHp, letters: keptLetters,
    shieldCharges: 0, reflect: false, invincible: false,
    stunnedTurns: 0, silencedTurns: 0, drawPenalty: 0,
    reviveCharge: false, nextPowerBoost: false, nextCostDiscount: false,
    invincibleRounds: 0, untargetableRounds: 0, stealImmuneRounds: 0,
    drawBonus: 0, pendingMaxHpBoost: null, healOthersPending: null,
    growthActive: false, growthTicker: 0,
  };
}

function makePlayer(name, book, maxHp) {
  return {
    name, book, hp: maxHp, maxHp, letters: {}, eliminated: false,
    shieldCharges: 0, reflect: false, invincible: false,
    stunnedTurns: 0, silencedTurns: 0, drawPenalty: 0,
    reviveCharge: false, nextPowerBoost: false, nextCostDiscount: false,
    invincibleRounds: 0, untargetableRounds: 0, stealImmuneRounds: 0,
    drawBonus: 0, pendingMaxHpBoost: null, healOthersPending: null,
    growthActive: false, growthTicker: 0,
  };
}

function applyEffects(playersIn, casterIdx, targetIdx, spell, globalDebuffImmuneRounds = 0) {
  const list = playersIn.map((p) => ({ ...p }));
  let msg = `${list[casterIdx].name} は「${spell.name}」を発動`;
  let debuffImmuneRounds = globalDebuffImmuneRounds;
  const others = () => list.map((p, i) => i).filter((i) => i !== casterIdx && list[i].hp > 0 && !(list[i].untargetableRounds > 0));
  const getPower = (base) => (list[casterIdx].nextPowerBoost ? Math.round(base * 1.5) : base);
  const debuffBlocked = () => {
    if (debuffImmuneRounds > 0) { msg += ` → 全体デバフ無効化中のため不発`; return true; }
    return false;
  };

  const maybeAutoRevive = (idx) => {
    const t = list[idx];
    if (t.hp <= 0 && t.reviveCharge) {
      list[idx] = { ...t, hp: Math.ceil(t.maxHp * 0.3), reviveCharge: false };
      msg += `(${t.name}は不屈の加護で持ちこたえた)`;
    }
  };

  const dealDamage = (idx, power, { pierce = false } = {}) => {
    const t = list[idx];
    if (t.invincible || t.invincibleRounds > 0) { msg += ` → ${t.name}は無敵で無効化`; return; }
    if (pierce) { list[idx] = { ...t, hp: t.hp - power }; msg += ` → ${t.name}に${power}ダメージ(貫通)`; maybeAutoRevive(idx); return; }
    if (t.reflect) { list[idx] = { ...t, reflect: false }; list[casterIdx] = { ...list[casterIdx], hp: list[casterIdx].hp - power }; msg += ` → ${t.name}が反射!${power}ダメージが跳ね返った`; maybeAutoRevive(casterIdx); return; }
    if (t.shieldCharges > 0) { list[idx] = { ...t, shieldCharges: t.shieldCharges - 1 }; msg += ` → ${t.name}はシールドで無効化`; return; }
    list[idx] = { ...t, hp: t.hp - power }; msg += ` → ${t.name}に${power}ダメージ`; maybeAutoRevive(idx);
  };

  for (const eff of spell.effects) {
    switch (eff.type) {
      case "dmg_single": dealDamage(targetIdx, getPower(eff.power), { pierce: eff.pierce }); break;
      case "dmg_aoe": others().forEach((i) => dealDamage(i, getPower(eff.power))); break;
      case "heal_self": { const h = getPower(eff.power); list[casterIdx] = { ...list[casterIdx], hp: Math.min(list[casterIdx].maxHp, list[casterIdx].hp + h) }; msg += ` → HPを${h}回復`; break; }
      case "shield_self": { const c = eff.charges || 1; list[casterIdx] = { ...list[casterIdx], shieldCharges: (list[casterIdx].shieldCharges || 0) + c }; msg += ` → シールド展開(${c}回分)`; break; }
      case "reflect_self": list[casterIdx] = { ...list[casterIdx], reflect: true }; msg += ` → 反射の構え`; break;
      case "stun_single": if (!debuffBlocked()) { list[targetIdx] = { ...list[targetIdx], stunnedTurns: (list[targetIdx].stunnedTurns || 0) + 1 }; msg += ` → ${list[targetIdx].name}を行動不能に`; } break;
      case "silence_single": if (!debuffBlocked()) { list[targetIdx] = { ...list[targetIdx], silencedTurns: (list[targetIdx].silencedTurns || 0) + 1 }; msg += ` → ${list[targetIdx].name}を沈黙させた`; } break;
      case "steal_letter": {
        const t = list[targetIdx];
        if (t.stealImmuneRounds > 0) { msg += ` → ${t.name}は文字を奪われない`; break; }
        const owned = Object.entries(t.letters).filter(([, n]) => n > 0);
        if (owned.length === 0) { msg += ` → ${t.name}は文字を持たず不発`; }
        else {
          const [stolenCh] = owned[Math.floor(Math.random() * owned.length)];
          list[targetIdx] = { ...t, letters: { ...t.letters, [stolenCh]: t.letters[stolenCh] - 1 } };
          const casterBook = BOOKS[list[casterIdx].book];
          const gainedCh = bestSnipeLetter(casterBook, list[casterIdx].letters);
          list[casterIdx] = { ...list[casterIdx], letters: { ...list[casterIdx].letters, [gainedCh]: (list[casterIdx].letters[gainedCh] || 0) + 1 } };
          msg += ` → ${t.name}から文字を奪い、自分の書の「${gainedCh}」に変換して獲得`;
        }
        break;
      }
      case "remove_letter_random": {
        const alive = others(); if (alive.length === 0) break;
        const idx = alive[Math.floor(Math.random() * alive.length)]; const t = list[idx];
        const owned = Object.entries(t.letters).filter(([, n]) => n > 0);
        if (owned.length > 0) { const [ch] = owned[Math.floor(Math.random() * owned.length)]; list[idx] = { ...t, letters: { ...t.letters, [ch]: t.letters[ch] - 1 } }; msg += ` → ${t.name}の「${ch}」を消し去った`; }
        break;
      }
      case "shuffle_letters": {
        const t = list[targetIdx]; const book = BOOKS[t.book];
        const total = Object.values(t.letters).reduce((a, b) => a + b, 0);
        let fresh = {};
        for (let i = 0; i < total; i++) { const ch = book.pool[Math.floor(Math.random() * book.pool.length)]; fresh[ch] = (fresh[ch] || 0) + 1; }
        list[targetIdx] = { ...t, letters: fresh }; msg += ` → ${t.name}の文字を掻き乱した`;
        break;
      }
      case "debuff_next_draw": if (!debuffBlocked()) { list[targetIdx] = { ...list[targetIdx], drawPenalty: (list[targetIdx].drawPenalty || 0) + 1 }; msg += ` → ${list[targetIdx].name}の次の文字取得を減らした`; } break;
      case "cleanse_heal_self": list[casterIdx] = { ...list[casterIdx], hp: Math.min(list[casterIdx].maxHp, list[casterIdx].hp + eff.power), stunnedTurns: 0, silencedTurns: 0 }; msg += ` → 自らを癒やし状態異常を払った(+${eff.power})`; break;
      case "buff_next_power": list[casterIdx] = { ...list[casterIdx], nextPowerBoost: true }; msg += ` → 次の呪文の威力が高まる`; break;
      case "reduce_next_cost": list[casterIdx] = { ...list[casterIdx], nextCostDiscount: true }; msg += ` → 次の呪文の必要文字が軽減される`; break;
      case "revive_charge": list[casterIdx] = { ...list[casterIdx], reviveCharge: true }; msg += ` → 力尽きても一度だけ持ちこたえる加護を得た`; break;
      case "invincible_self": list[casterIdx] = { ...list[casterIdx], invincible: true }; msg += ` → 次の自分のターンまで無敵になった`; break;
      case "dispel_target": if (!debuffBlocked()) { const t = list[targetIdx]; list[targetIdx] = { ...t, shieldCharges: 0, reflect: false, invincible: false }; msg += ` → ${t.name}の加護を祓った`; } break;
      case "reveal_target": { const t = list[targetIdx]; const held = Object.entries(t.letters).filter(([, n]) => n > 0).map(([c, n]) => `${c}×${n}`).join(" "); msg += ` → ${t.name}の手持ち:${held || "なし"}`; break; }
      case "recoil_self": list[casterIdx] = { ...list[casterIdx], hp: list[casterIdx].hp - eff.power }; msg += ` → 反動で自分に${eff.power}ダメージ`; maybeAutoRevive(casterIdx); break;
      case "execute": { const t = list[targetIdx]; const missingRatio = 1 - t.hp / t.maxHp; const power = Math.round(eff.basePower + eff.bonus * Math.max(0, missingRatio)); dealDamage(targetIdx, getPower(power)); break; }
      case "extra_turn": break;
      case "mass_draw": {
        const book = BOOKS[list[casterIdx].book];
        let letters = { ...list[casterIdx].letters };
        for (let i = 0; i < eff.amount; i++) { const ch = book.pool[Math.floor(Math.random() * book.pool.length)]; letters[ch] = (letters[ch] || 0) + 1; }
        list[casterIdx] = { ...list[casterIdx], letters }; msg += ` → 文字を${eff.amount}個一気に獲得`;
        break;
      }
      case "heal_all_full": list.forEach((p, i) => { if (p.hp > 0) list[i] = { ...p, hp: p.maxHp }; }); msg += ` → 全員(敵味方問わず)が全回復`; break;
      case "global_debuff_immune": debuffImmuneRounds = Math.max(debuffImmuneRounds, eff.rounds); msg += ` → 次の${eff.rounds}巡、全員があらゆるデバフを無効化`; break;
      case "delayed_max_hp_boost": {
        const c = list[casterIdx]; const originalMax = c.maxHp; const halved = Math.floor(originalMax / 2);
        list[casterIdx] = { ...c, maxHp: halved, hp: Math.min(c.hp, halved), pendingMaxHpBoost: { roundsLeft: eff.rounds, newMaxHp: originalMax * eff.multiplier } };
        msg += ` → 最大HPを${halved}に半減。${eff.rounds}巡後、最大HP${originalMax * eff.multiplier}で全回復する`;
        break;
      }
      case "invincible_rounds": list[casterIdx] = { ...list[casterIdx], invincibleRounds: eff.rounds }; msg += ` → ${eff.rounds}巡の間、無敵になった`; break;
      case "pacifist_ward": list[casterIdx] = { ...list[casterIdx], untargetableRounds: eff.rounds, healOthersPending: { roundsLeft: eff.rounds, amount: eff.healAmount } }; msg += ` → ${eff.rounds}巡の間、攻撃対象から外れ、毎巡相手を${eff.healAmount}回復させる`; break;
      case "steal_immune_growth": list[casterIdx] = { ...list[casterIdx], stealImmuneRounds: eff.rounds, growthActive: true }; msg += ` → ${eff.rounds}巡の間、文字を奪われず、以後3巡ごとに成長し続ける`; break;
      default: break;
    }
  }

  if (list[casterIdx].nextPowerBoost && spell.effects.some((e) => ["dmg_single", "dmg_aoe", "heal_self", "execute"].includes(e.type))) {
    list[casterIdx] = { ...list[casterIdx], nextPowerBoost: false };
  }
  if (list[casterIdx].nextCostDiscount) list[casterIdx] = { ...list[casterIdx], nextCostDiscount: false };

  const hasExtraTurn = spell.effects.some((e) => e.type === "extra_turn");
  return { list, msg, hasExtraTurn, globalDebuffImmuneRounds: debuffImmuneRounds };
}

// Called once per full round (every alive player has had one turn-slot pass).
function applyRoundBoundary(playersIn, globalDebuffImmuneRounds) {
  const list = playersIn.map((p) => ({ ...p }));
  const notes = [];
  for (let i = 0; i < list.length; i++) {
    let p = list[i];
    if (p.hp <= 0) continue;
    if (p.invincibleRounds > 0) p = { ...p, invincibleRounds: p.invincibleRounds - 1 };
    if (p.untargetableRounds > 0) p = { ...p, untargetableRounds: p.untargetableRounds - 1 };
    if (p.stealImmuneRounds > 0) p = { ...p, stealImmuneRounds: p.stealImmuneRounds - 1 };
    if (p.growthActive) {
      const ticker = (p.growthTicker || 0) + 1;
      if (ticker >= 3) { p = { ...p, growthTicker: ticker - 3, drawBonus: (p.drawBonus || 0) + 1 }; notes.push(`${p.name}の成長+1`); }
      else p = { ...p, growthTicker: ticker };
    }
    if (p.healOthersPending) {
      const amt = p.healOthersPending.amount;
      for (let j = 0; j < list.length; j++) { if (j !== i && list[j].hp > 0) list[j] = { ...list[j], hp: Math.min(list[j].maxHp, list[j].hp + amt) }; }
      const roundsLeft = p.healOthersPending.roundsLeft - 1;
      p = { ...p, healOthersPending: roundsLeft > 0 ? { ...p.healOthersPending, roundsLeft } : null };
    }
    if (p.pendingMaxHpBoost) {
      const roundsLeft = p.pendingMaxHpBoost.roundsLeft - 1;
      if (roundsLeft <= 0) { p = { ...p, maxHp: p.pendingMaxHpBoost.newMaxHp, hp: p.pendingMaxHpBoost.newMaxHp, pendingMaxHpBoost: null }; notes.push(`${p.name}が大成長を遂げた`); }
      else p = { ...p, pendingMaxHpBoost: { ...p.pendingMaxHpBoost, roundsLeft } };
    }
    list[i] = p;
  }
  return { list, globalDebuffImmuneRounds: Math.max(0, globalDebuffImmuneRounds - 1), notes };
}

// Consumes one turn-slot; if the round completes, applies round-boundary effects.
function consumeSlot(list, globalDebuffImmuneRounds, slotsLeft) {
  const remaining = slotsLeft - 1;
  if (remaining <= 0) {
    const r = applyRoundBoundary(list, globalDebuffImmuneRounds);
    return { list: r.list, globalDebuffImmuneRounds: r.globalDebuffImmuneRounds, slotsLeft: aliveCount(r.list), roundNote: r.notes.join(" / ") };
  }
  return { list, globalDebuffImmuneRounds, slotsLeft: remaining, roundNote: "" };
}

function drawForPlayer(player) {
  const book = BOOKS[player.book];
  const n = Math.max(1, book.drawCount - (player.drawPenalty > 0 ? 1 : 0) + (player.drawBonus || 0));
  const letters = { ...player.letters };
  for (let i = 0; i < n; i++) {
    const ch = book.pool[Math.floor(Math.random() * book.pool.length)];
    letters[ch] = (letters[ch] || 0) + 1;
  }
  return { ...player, letters, drawPenalty: Math.max(0, player.drawPenalty - 1) };
}

function nextAliveIndex(list, from) {
  const n = list.length;
  let i = from;
  for (let step = 0; step < n; step++) {
    i = (i + 1) % n;
    if (list[i].hp > 0) return i;
  }
  return from;
}

function aliveCount(list) {
  return list.filter((p) => p.hp > 0).length;
}

// ============================================================
// Sound effects (Web Audio API, no external assets)
// ============================================================
function playTone({ freq = 440, duration = 0.15, wave = "sine", volume = 0.2, delay = 0 }) {
  try {
    if (!window.__spellwarsAudioCtx) {
      window.__spellwarsAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = window.__spellwarsAudioCtx;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch (e) { /* audio unavailable, ignore */ }
}

function sfxForEffectType(type) {
  switch (type) {
    case "dmg_single": case "dmg_aoe": case "execute": return { freq: 160, duration: 0.28, wave: "sawtooth", volume: 0.22 };
    case "recoil_self": return { freq: 100, duration: 0.2, wave: "square", volume: 0.18 };
    case "heal_self": case "cleanse_heal_self": return { freq: 700, duration: 0.32, wave: "sine", volume: 0.18 };
    case "shield_self": case "reflect_self": case "invincible_self": return { freq: 440, duration: 0.22, wave: "triangle", volume: 0.2 };
    case "stun_single": case "silence_single": return { freq: 130, duration: 0.4, wave: "square", volume: 0.15 };
    case "steal_letter": case "remove_letter_random": case "shuffle_letters": return { freq: 950, duration: 0.1, wave: "square", volume: 0.12 };
    case "buff_next_power": case "reduce_next_cost": case "revive_charge": return { freq: 520, duration: 0.25, wave: "triangle", volume: 0.18 };
    default: return { freq: 500, duration: 0.15, wave: "sine", volume: 0.15 };
  }
}
function playSpellSfx(spell) {
  spell.effects.forEach((eff, i) => playTone({ ...sfxForEffectType(eff.type), delay: i * 0.1 }));
}
function playStampThud() { playTone({ freq: 80, duration: 0.3, wave: "sine", volume: 0.3 }); }
function playVictoryChime() {
  [523, 659, 784, 1046].forEach((f, i) => playTone({ freq: f, duration: 0.35, wave: "sine", volume: 0.22, delay: i * 0.15 }));
}
function playPassTone() { playTone({ freq: 260, duration: 0.12, wave: "sine", volume: 0.1 }); }

// ============================================================
// Shared UI bits
// ============================================================
const FontImport = () => (
  <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=EB+Garamond:wght@400;500&display=swap');`}</style>
);

function SealStamp({ book }) {
  useEffect(() => { playStampThud(); }, []);
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div style={{ borderColor: book.accent, color: book.accent, fontFamily: "'Cinzel', serif", animation: "sealStamp 0.9s ease-out forwards" }} className="w-40 h-40 rounded-full border-4 flex items-center justify-center text-7xl">
        {book.sigil}
      </div>
      <style>{`@keyframes sealStamp { 0% { transform: scale(1.6) rotate(-20deg); opacity: 0; } 35% { transform: scale(1) rotate(0deg); opacity: 0.95; } 75% { transform: scale(1) rotate(0deg); opacity: 0.95; } 100% { transform: scale(1.05) rotate(0deg); opacity: 0; } }`}</style>
    </div>
  );
}

function HpStrip({ players, highlightIdx }) {
  return (
    <div className="flex gap-2 justify-center mb-6 flex-wrap">
      {players.map((p, i) => {
        const b = BOOKS[p.book];
        const badges = [];
        if (p.shieldCharges > 0) badges.push(`盾${p.shieldCharges}`);
        if (p.reflect) badges.push("反射");
        if (p.invincible || p.invincibleRounds > 0) badges.push(p.invincibleRounds > 1 ? `無敵${p.invincibleRounds}巡` : "無敵");
        if (p.untargetableRounds > 0) badges.push(`対象外${p.untargetableRounds}巡`);
        if (p.stealImmuneRounds > 0) badges.push(`奪取耐性${p.stealImmuneRounds}巡`);
        if (p.growthActive) badges.push(`成長中(次+1まで${3 - (p.growthTicker || 0)}巡)`);
        if (p.drawBonus > 0) badges.push(`成長+${p.drawBonus}`);
        if (p.pendingMaxHpBoost) badges.push(`大成長待${p.pendingMaxHpBoost.roundsLeft}巡`);
        return (
          <div key={i} style={{ borderColor: p.hp <= 0 ? "#3a3550" : b.accent, opacity: p.hp <= 0 ? 0.4 : 1 }} className={`border rounded px-3 py-2 text-xs min-w-[90px] ${i === highlightIdx ? "ring-1 ring-white/30" : ""}`}>
            <div className="flex items-center justify-between">
              <span style={{ color: b.accent, fontFamily: "'Cinzel', serif" }}>{b.sigil}</span>
              {p.hp <= 0 && <Skull size={12} className="text-[#8b8578]" />}
            </div>
            <div className="text-[#EDE6D6] truncate">{p.name}</div>
            <div className="h-1.5 bg-[#1B1826] rounded mt-1 overflow-hidden">
              <div style={{ width: `${Math.max(0, (p.hp / p.maxHp) * 100)}%`, backgroundColor: b.accent }} className="h-full" />
            </div>
            <div className="text-[#8b8578] mt-0.5">{Math.max(0, p.hp)} / {p.maxHp}</div>
            {badges.length > 0 && <div className="flex flex-wrap gap-0.5 mt-1">{badges.map((bd, j) => <span key={j} style={{ borderColor: b.accent, color: b.accent }} className="border rounded px-1 text-[9px]">{bd}</span>)}</div>}
          </div>
        );
      })}
    </div>
  );
}

// Presentational panel shared by hotseat + online. Renders the active player's
// grimoire page. If isInteractive=false it renders a read-only waiting view.
const SPELLS_PER_PAGE = 5;
function LetterKeepScreen({ book, player, onConfirm }) {
  const [kept, setKept] = useState({});
  const totalKept = Object.values(kept).reduce((a, b) => a + b, 0);
  const owned = Object.entries(player.letters).filter(([, n]) => n > 0);
  const inc = (ch) => { if (totalKept >= 20) return; if ((kept[ch] || 0) >= (player.letters[ch] || 0)) return; setKept((k) => ({ ...k, [ch]: (k[ch] || 0) + 1 })); };
  const dec = (ch) => setKept((k) => ({ ...k, [ch]: Math.max(0, (k[ch] || 0) - 1) }));
  return (
    <div className="min-h-screen w-full bg-[#0A0910] flex items-center justify-center px-4">
      <div style={{ borderColor: book.accent }} className="max-w-md w-full bg-[#EDE6D6] text-[#221E2C] rounded-lg border-2 p-6">
        <div style={{ fontFamily: "'Cinzel', serif", color: book.accent }} className="text-lg mb-1 text-center">{player.name}</div>
        <div className="text-xs text-[#6b6558] mb-4 text-center">持ち越す文字を20個まで選んでください({totalKept} / 20)</div>
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {owned.map(([ch, n]) => (
            <div key={ch} style={{ borderColor: book.accent }} className="border rounded px-2 py-1 flex items-center gap-2">
              <button onClick={() => dec(ch)} className="text-sm px-1">-</button>
              <span className="font-mono text-sm">{ch} {kept[ch] || 0}/{n}</span>
              <button onClick={() => inc(ch)} className="text-sm px-1">+</button>
            </div>
          ))}
        </div>
        <button onClick={() => onConfirm(kept)} className="w-full py-2 rounded bg-[#C9A227] text-[#100E17] tracking-widest font-semibold">確定</button>
      </div>
    </div>
  );
}

function LetterPickerScreen({ book, player, onPick }) {
  const uniqueLetters = [...new Set(book.pool)];
  return (
    <div className="min-h-screen w-full bg-[#0A0910] flex items-center justify-center px-4">
      <div style={{ borderColor: book.accent }} className="max-w-md w-full bg-[#EDE6D6] text-[#221E2C] rounded-lg border-2 p-6 text-center">
        <div style={{ fontFamily: "'Cinzel', serif", color: book.accent }} className="text-lg mb-1">{player.name}</div>
        <div className="text-xs text-[#6b6558] mb-4">ランダム取得に加えて、好きな文字を1つ選べます</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {uniqueLetters.map((ch) => (
            <button key={ch} onClick={() => onPick(ch)} style={{ borderColor: book.accent }} className="border rounded px-3 py-2 font-mono text-lg hover:bg-black/5">{ch}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function paginateSpells(spells) {
  const ultra = spells.slice(-3);
  const regular = spells.slice(0, -3);
  const pages = [];
  for (let i = 0; i < regular.length; i += SPELLS_PER_PAGE) pages.push({ spells: regular.slice(i, i + SPELLS_PER_PAGE), ultra: false });
  pages.push({ spells: ultra, ultra: true });
  return pages;
}

function GrimoirePanel({ player, others, isInteractive, silenced, onCast, onPass, log }) {
  const book = BOOKS[player.book];
  const [targeting, setTargeting] = useState(null);
  const [stampBook, setStampBook] = useState(null);
  const [page, setPage] = useState(0);
  const pages = paginateSpells(book.spells);
  const current = pages[Math.min(page, pages.length - 1)];
  const castableCount = book.spells.filter((s) => canCast(player.letters, s.cost, player.nextCostDiscount)).length;

  const handleCastClick = (spell) => {
    if (needsTarget(spell)) setTargeting(spell);
    else fire(spell, null);
  };
  const fire = (spell, targetIdx) => {
    playSpellSfx(spell);
    setStampBook(book);
    setTimeout(() => setStampBook(null), 900);
    onCast(spell, targetIdx);
    setTargeting(null);
  };

  return (
    <div style={{ borderColor: book.accent }} className="max-w-xl mx-auto bg-[#EDE6D6] text-[#221E2C] rounded-lg border-2 p-6">
      {stampBook && <SealStamp book={stampBook} />}
      <div className="flex items-center justify-between mb-4">
        <div style={{ fontFamily: "'Cinzel', serif", color: book.accent }} className="text-xl">{book.name}</div>
        <div className="text-right">
          <div className="text-xs text-[#6b6558]">{player.name}</div>
          <div className="text-[10px]" style={{ color: book.accent }}>発動可能: {castableCount} / {book.spells.length}</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs tracking-widest text-[#6b6558] mb-2">所持している文字</div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(player.letters).filter(([, n]) => n > 0).length === 0 && <span className="text-xs text-[#6b6558]">まだ文字がない</span>}
          {Object.entries(player.letters).filter(([, n]) => n > 0).map(([ch, n]) => (
            <span key={ch} style={{ borderColor: book.accent }} className="border rounded px-2 py-0.5 text-sm font-mono">{ch}×{n}</span>
          ))}
        </div>
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs tracking-widest text-[#6b6558]">{current.ultra ? "★ 超上位呪文" : "呪文"}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="text-xs px-2 py-0.5 border border-[#221E2C] rounded disabled:opacity-30">←</button>
            <span className="text-[10px] text-[#6b6558]">{page + 1} / {pages.length}</span>
            <button onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))} disabled={page === pages.length - 1} className="text-xs px-2 py-0.5 border border-[#221E2C] rounded disabled:opacity-30">→</button>
          </div>
        </div>
        <div className={`space-y-2 ${current.ultra ? "border-2 rounded p-2" : ""}`} style={current.ultra ? { borderColor: book.accent } : {}}>
          {current.spells.map((spell) => {
            const affordable = canCast(player.letters, spell.cost, player.nextCostDiscount);
            const disabled = !isInteractive || !affordable || silenced;
            return (
              <button key={spell.id} disabled={disabled} onClick={() => handleCastClick(spell)}
                className={`w-full text-left border rounded px-3 py-2 flex items-center justify-between transition ${!disabled ? "border-[#221E2C] hover:bg-[#221E2C]/5" : "border-[#c9c2b0] opacity-40"}`}>
                <div>
                  <div style={{ fontFamily: "'Cinzel', serif" }} className="text-sm">{spell.name}</div>
                  <div className="text-[10px] text-[#6b6558]">{spell.origin} ・ {effectLabel(spell)}</div>
                </div>
                <div className="flex gap-1 flex-wrap justify-end max-w-[40%]">
                  {spell.cost.map((c, i) => <span key={i} className="text-xs font-mono border border-current rounded px-1">{c}</span>)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {silenced && <div className="text-xs text-red-700 mt-2">沈黙状態:今ターンは呪文を発動できない</div>}
      {!isInteractive && <div className="text-xs text-[#6b6558] mt-2 italic">他プレイヤーのターンです…</div>}

      {isInteractive && (
        <button onClick={() => { playPassTone(); onPass(); }} className="w-full mt-5 py-2 rounded border border-[#221E2C] text-sm tracking-widest hover:bg-[#221E2C]/5">
          ターンを終了する(発動しない)
        </button>
      )}

      {log && <div className="mt-4 text-center text-xs text-[#6b6558] italic">{log}</div>}

      {targeting && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-40">
          <div className="bg-[#1B1826] border border-[#3a3550] rounded-lg p-5 w-full max-w-sm">
            <div style={{ fontFamily: "'Cinzel', serif" }} className="text-[#EDE6D6] mb-4">{targeting.name} の対象を選ぶ</div>
            <div className="space-y-2">
              {others.map((o) => (
                <button key={o.idx} onClick={() => fire(targeting, o.idx)} className="w-full text-left border border-[#3a3550] rounded px-3 py-2 text-[#EDE6D6] hover:bg-white/5">
                  {o.name} <span className="text-[#8b8578] text-xs ml-2">HP {o.hp}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setTargeting(null)} className="w-full mt-3 py-2 text-xs text-[#8b8578] tracking-widest">キャンセル</button>
          </div>
        </div>
      )}
    </div>
  );
}

function GameOverScreen({ winner, onRestart, restartLabel = "もう一度" }) {
  useEffect(() => { playVictoryChime(); }, []);
  const book = winner ? BOOKS[winner.book] : null;
  return (
    <div className="min-h-screen w-full bg-[#0A0910] flex items-center justify-center px-4">
      <div className="text-center">
        {book && <div style={{ color: book.accent, fontFamily: "'Cinzel', serif" }} className="text-6xl mb-6">{book.sigil}</div>}
        <div style={{ fontFamily: "'Cinzel', serif" }} className="text-3xl text-[#EDE6D6] mb-2">{winner ? `${winner.name} の勝利` : "相討ち"}</div>
        <div className="text-[#8b8578] text-sm mb-8 tracking-widest">{winner ? BOOKS[winner.book].name : "全員が同時に力尽きた"}</div>
        <button onClick={onRestart} className="border border-[#C9A227] text-[#C9A227] rounded px-8 py-3 tracking-widest hover:bg-white/5">{restartLabel}</button>
      </div>
    </div>
  );
}

// ============================================================
// Mode select
// ============================================================
function ModeSelect({ onPick }) {
  return (
    <div style={{ fontFamily: "'EB Garamond', serif" }} className="min-h-screen w-full bg-[#100E17] text-[#EDE6D6] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div style={{ fontFamily: "'Cinzel', serif" }} className="text-4xl tracking-widest mb-2">SPELLWARS</div>
        <div className="text-sm tracking-[0.3em] text-[#8b8578] mb-10">三冊の魔導書、最後まで残るのは誰か</div>
        <button onClick={() => onPick("hotseat")} className="w-full mb-4 border border-[#3a3550] rounded-lg p-5 text-left hover:border-[#C9A227] transition group">
          <div className="flex items-center gap-3 mb-1"><Users size={18} className="text-[#C9A227]" /><span style={{ fontFamily: "'Cinzel', serif" }}>この端末だけで遊ぶ</span></div>
          <div className="text-xs text-[#8b8578]">1台の端末を回して遊ぶホットシート形式</div>
        </button>
        <button onClick={() => onPick("online")} className="w-full border border-[#3a3550] rounded-lg p-5 text-left hover:border-[#C9A227] transition">
          <div className="flex items-center gap-3 mb-1"><Wifi size={18} className="text-[#C9A227]" /><span style={{ fontFamily: "'Cinzel', serif" }}>オンラインで遊ぶ</span></div>
          <div className="text-xs text-[#8b8578]">部屋コードを作って、離れた友達と対戦</div>
        </button>
      </div>
    </div>
  );
}

// ============================================================
// HOTSEAT MODE
// ============================================================
function HotseatSetup({ onStart, onBack }) {
  const [count, setCount] = useState(3);
  const [players, setPlayers] = useState([
    { name: "プレイヤー1", book: "western" },
    { name: "プレイヤー2", book: "wa" },
    { name: "プレイヤー3", book: "chinese" },
    { name: "プレイヤー4", book: "western" },
  ]);
  const update = (i, patch) => setPlayers((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  return (
    <div style={{ fontFamily: "'EB Garamond', serif" }} className="min-h-screen w-full bg-[#100E17] text-[#EDE6D6] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <button onClick={onBack} className="text-xs text-[#8b8578] mb-4">← 戻る</button>
        <div className="text-center mb-8">
          <div style={{ fontFamily: "'Cinzel', serif" }} className="text-3xl tracking-widest">SPELLWARS</div>
          <div className="text-xs tracking-[0.3em] text-[#8b8578] mt-2">ホットシート対戦</div>
        </div>
        <div className="bg-[#1B1826] border border-[#3a3550] rounded-lg p-6 mb-6">
          <div className="text-sm tracking-widest text-[#8b8578] mb-3">人数</div>
          <div className="flex gap-3">
            {[3, 4].map((n) => (
              <button key={n} onClick={() => setCount(n)} className={`flex-1 py-2 rounded border transition ${count === n ? "border-[#C9A227] text-[#C9A227] bg-[#C9A227]/10" : "border-[#3a3550] text-[#8b8578]"}`}>{n}人</button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {players.slice(0, count).map((p, i) => (
            <div key={i} className="bg-[#1B1826] border border-[#3a3550] rounded-lg p-4">
              <input value={p.name} onChange={(e) => update(i, { name: e.target.value })} className="bg-transparent border-b border-[#3a3550] text-[#EDE6D6] mb-3 w-full outline-none pb-1" />
              <div className="flex gap-2">
                {Object.values(BOOKS).map((b) => (
                  <button key={b.key} onClick={() => update(i, { book: b.key })} style={{ borderColor: p.book === b.key ? b.accent : "#3a3550", color: p.book === b.key ? b.accent : "#8b8578", backgroundColor: p.book === b.key ? b.accent + "1A" : "transparent" }} className="flex-1 border rounded py-2 text-sm transition">
                    <span style={{ fontFamily: "'Cinzel', serif" }} className="mr-1">{b.sigil}</span>{b.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => onStart(players.slice(0, count).map((p) => makePlayer(p.name, p.book, 50 * count)))} className="w-full mt-6 py-3 rounded bg-[#C9A227] text-[#100E17] tracking-widest font-semibold hover:brightness-110 transition">対戦開始</button>
      </div>
    </div>
  );
}

function HandoffScreen({ player, onOpen }) {
  const book = BOOKS[player.book];
  return (
    <div className="min-h-screen w-full bg-[#0A0910] flex items-center justify-center px-4">
      <div className="text-center">
        <div style={{ borderColor: book.accent, color: book.accent, fontFamily: "'Cinzel', serif" }} className="w-28 h-28 rounded-full border-2 flex items-center justify-center text-5xl mx-auto mb-6 opacity-90">{book.sigil}</div>
        <div className="text-[#8b8578] text-sm tracking-widest mb-2">端末を渡してください</div>
        <div style={{ fontFamily: "'Cinzel', serif" }} className="text-2xl text-[#EDE6D6] mb-8">{player.name}のターン</div>
        <button onClick={onOpen} style={{ borderColor: book.accent, color: book.accent }} className="border rounded px-8 py-3 tracking-widest hover:bg-white/5 transition">開く</button>
      </div>
    </div>
  );
}

function HotseatGame({ onExit }) {
  const [players, setPlayers] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [phase, setPhase] = useState("setup");
  const [log, setLog] = useState("");
  const [slotsLeft, setSlotsLeft] = useState(0);
  const [globalDebuff, setGlobalDebuff] = useState(0);
  const [baseMaxHp, setBaseMaxHp] = useState(150);
  const [setNumber, setSetNumber] = useState(1);
  const [setQueue, setSetQueue] = useState([]); // survivor indices still needing to confirm kept letters
  const [keptMap, setKeptMap] = useState({}); // idx -> chosen kept letters object

  const beginTurnFor = (list, startIdx, gDebuff, slots) => {
    let cur = list.map((p) => ({ ...p }));
    let i = startIdx;
    let gd = gDebuff, sl = slots;
    let skipLogs = [];
    while (true) {
      let p = cur[i];
      if (p.invincible) { cur[i] = { ...p, invincible: false }; p = cur[i]; }
      if (p.stunnedTurns > 0) {
        cur[i] = { ...p, stunnedTurns: p.stunnedTurns - 1 };
        skipLogs.push(`${p.name}は行動不能でスキップ`);
        const r = consumeSlot(cur, gd, sl);
        cur = r.list; gd = r.globalDebuffImmuneRounds; sl = r.slotsLeft;
        if (r.roundNote) skipLogs.push(r.roundNote);
        i = nextAliveIndex(cur, i);
        continue;
      }
      cur[i] = drawForPlayer(cur[i]);
      return { list: cur, idx: i, log: skipLogs.join(" / "), globalDebuff: gd, slotsLeft: sl };
    }
  };

  const startGame = (initPlayers) => {
    const bhp = initPlayers[0].maxHp;
    setBaseMaxHp(bhp); setSetNumber(1);
    const r = beginTurnFor(initPlayers, 0, 0, aliveCount(initPlayers));
    setPlayers(r.list); setActiveIdx(r.idx); setLog(r.log); setGlobalDebuff(r.globalDebuff); setSlotsLeft(r.slotsLeft); setPhase("picking");
  };
  const openHandoff = () => {
    const r = beginTurnFor(players, activeIdx, globalDebuff, slotsLeft);
    setPlayers(r.list); setActiveIdx(r.idx); setLog(r.log); setGlobalDebuff(r.globalDebuff); setSlotsLeft(r.slotsLeft); setPhase("picking");
  };
  const onLetterPick = (ch) => {
    const list = players.map((p, i) => (i === activeIdx ? { ...p, letters: { ...p.letters, [ch]: (p.letters[ch] || 0) + 1 } } : p));
    setPlayers(list); setPhase("turn");
  };

  const startSetTransition = (list, deadNames) => {
    const survivors = list.map((p, i) => i).filter((i) => list[i].hp > 0);
    setPlayers(list);
    setSetQueue(survivors);
    setKeptMap({});
    setLog(`${deadNames}が力尽きた → セット${setNumber + 1}へ`);
    setPhase("setTransitionHandoff");
  };

  const finalizeSetTransition = (finalKeptMap) => {
    const list = players.map((p, i) => {
      if (p.hp <= 0) return p; // eliminated, frozen forever
      const kept = selectKeptLetters(p.letters, finalKeptMap[i] ? Object.entries(finalKeptMap[i]).flatMap(([ch, n]) => Array(n).fill(ch)) : []);
      return resetPlayerForNewSet(p, baseMaxHp, kept);
    });
    setSetNumber((n) => n + 1);
    const firstIdx = list.map((p, i) => i).find((i) => list[i].hp > 0);
    const r = beginTurnFor(list, firstIdx, 0, aliveCount(list));
    setPlayers(r.list); setActiveIdx(r.idx); setLog(r.log); setGlobalDebuff(0); setSlotsLeft(r.slotsLeft); setPhase("picking");
  };

  const finishTurn = (list, fromIdx, gDebuff, slots) => {
    const r = consumeSlot(list, gDebuff, slots);
    if (aliveCount(r.list) <= 1) { setPlayers(r.list); setGlobalDebuff(r.globalDebuffImmuneRounds); setSlotsLeft(r.slotsLeft); setPhase("gameover"); return; }
    const ni = nextAliveIndex(r.list, fromIdx);
    setPlayers(r.list); setActiveIdx(ni); setGlobalDebuff(r.globalDebuffImmuneRounds); setSlotsLeft(r.slotsLeft); setPhase("handoff");
  };

  const handleOutcome = (list, msg, gDebuff, hasExtraTurn, fromIdx, slots) => {
    const prevAlive = aliveCount(players);
    const newAlive = aliveCount(list);
    if (newAlive <= 1) { setPlayers(list); setLog(msg); setGlobalDebuff(gDebuff); setPhase("gameover"); return; }
    if (newAlive < prevAlive) {
      const deadNames = players.filter((p, i) => p.hp > 0 && list[i].hp <= 0).map((p) => p.name).join("・");
      startSetTransition(list, deadNames);
      return;
    }
    if (hasExtraTurn) { setPlayers(list); setLog(msg); setGlobalDebuff(gDebuff); return; }
    setLog(msg);
    finishTurn(list, fromIdx, gDebuff, slots);
  };

  const onCast = (spell, targetIdx) => {
    const { list, msg, hasExtraTurn, globalDebuffImmuneRounds } = applyEffects(players, activeIdx, targetIdx, spell, globalDebuff);
    list[activeIdx] = { ...list[activeIdx], letters: payCost(list[activeIdx].letters, spell.cost) };
    handleOutcome(list, msg, globalDebuffImmuneRounds, hasExtraTurn, activeIdx, slotsLeft);
  };
  const onPass = () => {
    let list = players.map((p) => ({ ...p }));
    if (list[activeIdx].silencedTurns > 0) list[activeIdx] = { ...list[activeIdx], silencedTurns: list[activeIdx].silencedTurns - 1 };
    handleOutcome(list, `${list[activeIdx].name} は発動せずターンを終えた`, globalDebuff, false, activeIdx, slotsLeft);
  };

  if (phase === "setup" || !players) return <HotseatSetup onStart={startGame} onBack={onExit} />;
  if (phase === "gameover") {
    const alive = players.filter((p) => p.hp > 0);
    return <GameOverScreen winner={alive.length === 1 ? alive[0] : null} onRestart={() => { setPlayers(null); setPhase("setup"); }} />;
  }
  if (phase === "handoff") return <HandoffScreen player={players[activeIdx]} onOpen={openHandoff} />;
  if (phase === "picking") return <LetterPickerScreen book={BOOKS[players[activeIdx].book]} player={players[activeIdx]} onPick={onLetterPick} />;

  if (phase === "setTransitionHandoff") {
    const idx = setQueue[0];
    const p = players[idx];
    const needsPick = Object.values(p.letters).reduce((a, b) => a + b, 0) > 20;
    return (
      <HandoffScreen
        player={p}
        onOpen={() => {
          if (needsPick) { setPhase("setTransitionPick"); return; }
          const nextKeptMap = { ...keptMap, [idx]: {} };
          setKeptMap(nextKeptMap);
          const rest = setQueue.slice(1);
          if (rest.length === 0) finalizeSetTransition(nextKeptMap);
          else { setSetQueue(rest); setPhase("setTransitionHandoff"); }
        }}
      />
    );
  }
  if (phase === "setTransitionPick") {
    const idx = setQueue[0];
    const p = players[idx];
    return (
      <LetterKeepScreen
        book={BOOKS[p.book]}
        player={p}
        onConfirm={(kept) => {
          const nextKeptMap = { ...keptMap, [idx]: kept };
          setKeptMap(nextKeptMap);
          const rest = setQueue.slice(1);
          if (rest.length === 0) { finalizeSetTransition(nextKeptMap); }
          else { setSetQueue(rest); setPhase("setTransitionHandoff"); }
        }}
      />
    );
  }

  const me = players[activeIdx];
  const others = players.map((p, i) => ({ ...p, idx: i })).filter((p) => p.idx !== activeIdx && p.hp > 0 && !(p.untargetableRounds > 0));
  return (
    <div className="min-h-screen w-full bg-[#0A0910] px-4 py-6">
      <div className="text-center text-[10px] text-[#8b8578] mb-1 tracking-widest">セット {setNumber}</div>
      {globalDebuff > 0 && <div className="text-center text-xs text-[#C9A227] mb-2 tracking-widest">全体デバフ無効化中(残り{globalDebuff}巡)</div>}
      <HpStrip players={players} highlightIdx={activeIdx} />
      <GrimoirePanel key={activeIdx} player={me} others={others} isInteractive={true} silenced={me.silencedTurns > 0} onCast={onCast} onPass={onPass} log={log} />
    </div>
  );
}

// ============================================================
// ONLINE MODE (Firebase Realtime Database, room code based)
// ============================================================
function genCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = ""; for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function OnlineHome({ onCreate, onJoin, onBack }) {
  const [tab, setTab] = useState("create");
  const [count, setCount] = useState(3);
  const [name, setName] = useState("プレイヤー1");
  const [book, setBook] = useState("western");
  const [joinCode, setJoinCode] = useState("");
  const [err, setErr] = useState("");

  return (
    <div style={{ fontFamily: "'EB Garamond', serif" }} className="min-h-screen w-full bg-[#100E17] text-[#EDE6D6] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <button onClick={onBack} className="text-xs text-[#8b8578] mb-4">← 戻る</button>
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("create")} className={`flex-1 py-2 rounded border text-sm ${tab === "create" ? "border-[#C9A227] text-[#C9A227]" : "border-[#3a3550] text-[#8b8578]"}`}>部屋を作る</button>
          <button onClick={() => setTab("join")} className={`flex-1 py-2 rounded border text-sm ${tab === "join" ? "border-[#C9A227] text-[#C9A227]" : "border-[#3a3550] text-[#8b8578]"}`}>部屋に入る</button>
        </div>

        {tab === "create" && (
          <div className="bg-[#1B1826] border border-[#3a3550] rounded-lg p-5 space-y-4">
            <div>
              <div className="text-xs tracking-widest text-[#8b8578] mb-2">人数</div>
              <div className="flex gap-3">{[3, 4].map((n) => (
                <button key={n} onClick={() => setCount(n)} className={`flex-1 py-2 rounded border ${count === n ? "border-[#C9A227] text-[#C9A227] bg-[#C9A227]/10" : "border-[#3a3550] text-[#8b8578]"}`}>{n}人</button>
              ))}</div>
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} className="bg-transparent border-b border-[#3a3550] text-[#EDE6D6] w-full outline-none pb-1" placeholder="あなたの名前" />
            <div className="flex gap-2">
              {Object.values(BOOKS).map((b) => (
                <button key={b.key} onClick={() => setBook(b.key)} style={{ borderColor: book === b.key ? b.accent : "#3a3550", color: book === b.key ? b.accent : "#8b8578", backgroundColor: book === b.key ? b.accent + "1A" : "transparent" }} className="flex-1 border rounded py-2 text-xs">
                  <span style={{ fontFamily: "'Cinzel', serif" }} className="mr-1">{b.sigil}</span>{b.name}
                </button>
              ))}
            </div>
            <button onClick={() => onCreate({ count, name, book })} className="w-full py-3 rounded bg-[#C9A227] text-[#100E17] tracking-widest font-semibold">部屋を作成</button>
          </div>
        )}

        {tab === "join" && (
          <div className="bg-[#1B1826] border border-[#3a3550] rounded-lg p-5 space-y-4">
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="部屋コード" className="bg-transparent border-b border-[#3a3550] text-[#EDE6D6] w-full outline-none pb-1 tracking-widest text-center text-lg" />
            <input value={name} onChange={(e) => setName(e.target.value)} className="bg-transparent border-b border-[#3a3550] text-[#EDE6D6] w-full outline-none pb-1" placeholder="あなたの名前" />
            <div className="flex gap-2">
              {Object.values(BOOKS).map((b) => (
                <button key={b.key} onClick={() => setBook(b.key)} style={{ borderColor: book === b.key ? b.accent : "#3a3550", color: book === b.key ? b.accent : "#8b8578", backgroundColor: book === b.key ? b.accent + "1A" : "transparent" }} className="flex-1 border rounded py-2 text-xs">
                  <span style={{ fontFamily: "'Cinzel', serif" }} className="mr-1">{b.sigil}</span>{b.name}
                </button>
              ))}
            </div>
            {err && <div className="text-xs text-red-400">{err}</div>}
            <button onClick={async () => { setErr(""); const ok = await onJoin({ code: joinCode, name, book }); if (!ok) setErr("部屋が見つからないか、空きスロットがありません"); }} className="w-full py-3 rounded bg-[#C9A227] text-[#100E17] tracking-widest font-semibold">参加する</button>
          </div>
        )}
      </div>
    </div>
  );
}

function LobbyScreen({ code, room, isHost, onStart, onRefresh }) {
  const [copied, setCopied] = useState(false);
  const allFilled = room && room.players.every((p) => p && p.name);
  return (
    <div style={{ fontFamily: "'EB Garamond', serif" }} className="min-h-screen w-full bg-[#100E17] text-[#EDE6D6] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-xs tracking-widest text-[#8b8578] mb-2">部屋コード</div>
        <div className="flex items-center justify-center gap-2 mb-8">
          <div style={{ fontFamily: "'Cinzel', serif" }} className="text-4xl tracking-[0.3em] text-[#C9A227]">{code}</div>
          <button onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="text-[#8b8578] hover:text-[#EDE6D6]"><Copy size={16} /></button>
        </div>
        {copied && <div className="text-xs text-[#C9A227] mb-4">コピーしました</div>}
        <div className="space-y-2 mb-8">
          {room ? room.players.map((p, i) => (
            <div key={i} className="border border-[#3a3550] rounded px-4 py-2 flex items-center justify-between text-sm">
              <span>{p && p.name ? p.name : "空き"}</span>
              {p && p.book && <span style={{ color: BOOKS[p.book].accent, fontFamily: "'Cinzel', serif" }}>{BOOKS[p.book].sigil} {BOOKS[p.book].name}</span>}
            </div>
          )) : <div className="text-[#8b8578] text-sm">読み込み中…</div>}
        </div>
        <button onClick={onRefresh} className="text-xs text-[#8b8578] mb-4 inline-flex items-center gap-1"><RefreshCw size={12} />更新</button>
        {isHost ? (
          <button disabled={!allFilled} onClick={onStart} className={`w-full py-3 rounded tracking-widest font-semibold ${allFilled ? "bg-[#C9A227] text-[#100E17]" : "bg-[#3a3550] text-[#8b8578]"}`}>{allFilled ? "対戦開始" : "全員揃うのを待っています"}</button>
        ) : (
          <div className="text-sm text-[#8b8578]">ホストの開始を待っています…</div>
        )}
      </div>
    </div>
  );
}

function ChatTradePanel({ room, mySlot, code, fetchRoom, writeRoom, others }) {
  const [chatText, setChatText] = useState("");
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeTarget, setTradeTarget] = useState(others[0]?.idx ?? null);
  const [giveChar, setGiveChar] = useState("");
  const [wantChar, setWantChar] = useState("");
  const [sacrificing, setSacrificing] = useState(null); // trade id being responded to

  const me = room.players[mySlot];
  const book = BOOKS[me.book];
  const ownedLetters = Object.entries(me.letters).filter(([, n]) => n > 0);
  const uniquePool = [...new Set(book.pool)];
  const chatLog = room.chatLog || [];
  const trades = room.trades || [];
  const incoming = trades.filter((t) => t.toIdx === mySlot && t.status === "pending");
  const outgoing = trades.filter((t) => t.fromIdx === mySlot && t.status === "pending");

  const sendChat = async () => {
    if (!chatText.trim()) return;
    const fresh = (await fetchRoom(code)) || room;
    const nextLog = [...(fresh.chatLog || []), { from: me.name, text: chatText.trim(), ts: Date.now() }].slice(-50);
    await writeRoom(code, { ...fresh, chatLog: nextLog });
    setChatText("");
  };

  const sendTrade = async () => {
    if (!giveChar || !wantChar || tradeTarget == null) return;
    const fresh = (await fetchRoom(code)) || room;
    const proposal = { id: `${Date.now()}_${mySlot}`, fromIdx: mySlot, toIdx: tradeTarget, giveChar, wantChar, status: "pending" };
    const nextTrades = [...(fresh.trades || []), proposal];
    const nextLog = [...(fresh.chatLog || []), { from: "system", text: `${me.name}が${room.players[tradeTarget].name}に交渉を持ちかけた(${giveChar}を渡し${wantChar}を要求)`, ts: Date.now() }].slice(-50);
    await writeRoom(code, { ...fresh, trades: nextTrades, chatLog: nextLog });
    setTradeOpen(false); setGiveChar(""); setWantChar("");
  };

  const decline = async (tradeId) => {
    const fresh = (await fetchRoom(code)) || room;
    const nextTrades = (fresh.trades || []).map((t) => (t.id === tradeId ? { ...t, status: "declined" } : t));
    await writeRoom(code, { ...fresh, trades: nextTrades });
  };

  const accept = async (tradeId, sacrificeChar) => {
    const fresh = (await fetchRoom(code)) || room;
    const trade = (fresh.trades || []).find((t) => t.id === tradeId);
    if (!trade || trade.status !== "pending") { setSacrificing(null); return; }
    const list = fresh.players.map((p) => ({ ...p }));
    const proposer = list[trade.fromIdx];
    const target = list[trade.toIdx];
    if ((proposer.letters[trade.giveChar] || 0) < 1 || (target.letters[sacrificeChar] || 0) < 1) { setSacrificing(null); return; }
    proposer.letters = { ...proposer.letters, [trade.giveChar]: proposer.letters[trade.giveChar] - 1 };
    const targetBook = BOOKS[target.book];
    const gainedForTarget = targetBook.pool[Math.floor(Math.random() * targetBook.pool.length)];
    target.letters = { ...target.letters, [gainedForTarget]: (target.letters[gainedForTarget] || 0) + 1 };
    target.letters = { ...target.letters, [sacrificeChar]: target.letters[sacrificeChar] - 1 };
    proposer.letters = { ...proposer.letters, [trade.wantChar]: (proposer.letters[trade.wantChar] || 0) + 1 };
    const nextTrades = fresh.trades.map((t) => (t.id === tradeId ? { ...t, status: "accepted" } : t));
    const nextLog = [...(fresh.chatLog || []), { from: "system", text: `${target.name}が交渉を承諾。${proposer.name}⇄${target.name}で文字を交換した`, ts: Date.now() }].slice(-50);
    await writeRoom(code, { ...fresh, players: list, trades: nextTrades, chatLog: nextLog });
    setSacrificing(null);
  };

  return (
    <div className="max-w-xl mx-auto mt-4 bg-[#1B1826] border border-[#3a3550] rounded-lg p-4 text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[#8b8578] tracking-widest">チャット・交渉</div>
        <button onClick={() => setTradeOpen((o) => !o)} className="text-[#C9A227] border border-[#C9A227] rounded px-2 py-0.5">交渉を持ちかける</button>
      </div>

      {tradeOpen && (
        <div className="border border-[#3a3550] rounded p-3 mb-3 space-y-2">
          <div className="flex gap-2 items-center">
            <span className="text-[#8b8578]">相手:</span>
            <select value={tradeTarget ?? ""} onChange={(e) => setTradeTarget(Number(e.target.value))} className="bg-[#100E17] text-[#EDE6D6] border border-[#3a3550] rounded px-1">
              {others.map((o) => <option key={o.idx} value={o.idx}>{o.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-[#8b8578]">あげる文字:</span>
            {ownedLetters.map(([ch, n]) => (
              <button key={ch} onClick={() => setGiveChar(ch)} className={`font-mono border rounded px-1.5 ${giveChar === ch ? "border-[#C9A227] text-[#C9A227]" : "border-[#3a3550] text-[#EDE6D6]"}`}>{ch}×{n}</button>
            ))}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-[#8b8578]">欲しい文字:</span>
            {uniquePool.map((ch) => (
              <button key={ch} onClick={() => setWantChar(ch)} className={`font-mono border rounded px-1.5 ${wantChar === ch ? "border-[#C9A227] text-[#C9A227]" : "border-[#3a3550] text-[#EDE6D6]"}`}>{ch}</button>
            ))}
          </div>
          <button onClick={sendTrade} disabled={!giveChar || !wantChar} className="w-full py-1.5 rounded bg-[#C9A227] text-[#100E17] font-semibold disabled:opacity-40">送信</button>
        </div>
      )}

      {incoming.length > 0 && (
        <div className="mb-3 space-y-2">
          {incoming.map((t) => (
            <div key={t.id} className="border border-[#C9A227] rounded p-2">
              <div className="text-[#EDE6D6] mb-1">{room.players[t.fromIdx].name}から: {t.giveChar}をあげるので{t.wantChar}をください</div>
              {sacrificing === t.id ? (
                <div className="flex gap-1 flex-wrap items-center">
                  <span className="text-[#8b8578]">渡す文字を選択:</span>
                  {ownedLetters.map(([ch, n]) => (
                    <button key={ch} onClick={() => accept(t.id, ch)} className="font-mono border border-[#3a3550] text-[#EDE6D6] rounded px-1.5">{ch}×{n}</button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setSacrificing(t.id)} className="border border-[#C9A227] text-[#C9A227] rounded px-2 py-0.5">承諾</button>
                  <button onClick={() => decline(t.id)} className="border border-[#3a3550] text-[#8b8578] rounded px-2 py-0.5">拒否</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {outgoing.length > 0 && (
        <div className="mb-3 text-[#8b8578]">送信済み: {outgoing.map((t) => `${room.players[t.toIdx].name}へ(${t.giveChar}→${t.wantChar})`).join(", ")}</div>
      )}

      <div className="max-h-32 overflow-y-auto border border-[#3a3550] rounded p-2 mb-2 space-y-1">
        {chatLog.length === 0 && <div className="text-[#6b6558]">まだメッセージがありません</div>}
        {chatLog.map((m, i) => (
          <div key={i} className={m.from === "system" ? "text-[#8b8578] italic" : "text-[#EDE6D6]"}>
            {m.from !== "system" && <span className="text-[#C9A227]">{m.from}: </span>}{m.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={chatText} onChange={(e) => setChatText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder="メッセージを入力" className="flex-1 bg-[#100E17] text-[#EDE6D6] border border-[#3a3550] rounded px-2 py-1" />
        <button onClick={sendChat} className="border border-[#C9A227] text-[#C9A227] rounded px-3">送信</button>
      </div>
    </div>
  );
}

function OnlineGame({ onExit }) {
  const [stage, setStage] = useState("home"); // home | lobby | playing | gameover
  const [code, setCode] = useState(null);
  const [mySlot, setMySlot] = useState(null);
  const [room, setRoom] = useState(null);
  const unsubRef = useRef(null);
  const processedTurnRef = useRef(-1);
  const submittedSetRef = useRef(-1);

  const fetchRoom = async (c) => {
    try {
      await ensureAuth();
      const snap = await get(ref(db, `rooms/${c}`));
      return snap.exists() ? snap.val() : null;
    } catch (e) { return null; }
  };
  const writeRoom = async (c, data) => {
    try { await ensureAuth(); await set(ref(db, `rooms/${c}`), data); } catch (e) { /* ignore */ }
  };

  const stopWatching = () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } };
  const startWatching = async (c) => {
    stopWatching();
    await ensureAuth();
    unsubRef.current = onValue(ref(db, `rooms/${c}`), (snap) => {
      if (snap.exists()) setRoom(snap.val());
    });
  };
  useEffect(() => () => stopWatching(), []);

  const handleCreate = async ({ count, name, book }) => {
    const c = genCode();
    const players = Array.from({ length: count }, (_, i) => (i === 0 ? { name, book, joined: true } : null));
    const initial = { status: "lobby", count, players, activeIdx: 0, turnNumber: 0, log: "", hostSlot: 0 };
    await writeRoom(c, initial);
    setCode(c); setMySlot(0); setRoom(initial); setStage("lobby");
    startWatching(c);
  };

  const handleJoin = async ({ code: c, name, book }) => {
    const r = await fetchRoom(c);
    if (!r || r.status !== "lobby") return false;
    const emptyIdx = r.players.findIndex((p) => !p);
    if (emptyIdx === -1) return false;
    const fresh = await fetchRoom(c);
    if (!fresh || fresh.players[emptyIdx]) return false;
    fresh.players[emptyIdx] = { name, book, joined: true };
    await writeRoom(c, fresh);
    setCode(c); setMySlot(emptyIdx); setRoom(fresh); setStage("lobby");
    startWatching(c);
    return true;
  };

  const handleStart = async () => {
    const hp = 50 * room.count;
    const players = room.players.map((p) => makePlayer(p.name, p.book, hp));
    const next = { ...room, status: "playing", players, activeIdx: 0, turnNumber: 0, setNumber: 1, baseMaxHp: hp, log: "対戦開始", slotsLeft: aliveCount(players), globalDebuff: 0, awaitingPick: false, setTransition: null, chatLog: [], trades: [] };
    processedTurnRef.current = -1;
    await writeRoom(code, next);
    setRoom(next);
  };

  // Turn-start step: stun-skip or draw, exactly once per turnNumber. After drawing, await the bonus letter pick.
  useEffect(() => {
    if (!room || room.status !== "playing") return;
    if (room.activeIdx !== mySlot) return;
    if (processedTurnRef.current === room.turnNumber) return;
    processedTurnRef.current = room.turnNumber;

    (async () => {
      const list = room.players.map((p) => ({ ...p }));
      let p = list[mySlot];
      if (p.invincible) { list[mySlot] = { ...p, invincible: false }; p = list[mySlot]; }
      if (p.stunnedTurns > 0) {
        list[mySlot] = { ...p, stunnedTurns: p.stunnedTurns - 1 };
        const r = consumeSlot(list, room.globalDebuff || 0, room.slotsLeft || aliveCount(list));
        const ni = nextAliveIndex(r.list, mySlot);
        const next = { ...room, players: r.list, activeIdx: ni, turnNumber: room.turnNumber + 1, slotsLeft: r.slotsLeft, globalDebuff: r.globalDebuffImmuneRounds, log: `${p.name}は行動不能でスキップ${r.roundNote ? " / " + r.roundNote : ""}` };
        await writeRoom(code, next);
        setRoom(next);
      } else {
        list[mySlot] = drawForPlayer(p);
        const next = { ...room, players: list, awaitingPick: true };
        await writeRoom(code, next);
        setRoom(next);
      }
    })();
  }, [room, mySlot, code]);

  const onLetterPick = async (ch) => {
    const fresh = (await fetchRoom(code)) || room;
    const list = fresh.players.map((p, i) => (i === mySlot ? { ...p, letters: { ...p.letters, [ch]: (p.letters[ch] || 0) + 1 } } : p));
    await writeRoom(code, { ...fresh, players: list, awaitingPick: false });
  };

  const startSetTransition = async (list, deadNames) => {
    const survivors = list.map((p, i) => i).filter((i) => list[i].hp > 0);
    const next = { ...room, players: list, status: "setTransition", setTransition: { survivors, keptSubmitted: {} }, log: `${deadNames}が力尽きた → 次のセットへ` };
    await writeRoom(code, next); setRoom(next);
  };

  const submitKept = async (kept) => {
    const fresh = (await fetchRoom(code)) || room;
    const st = fresh.setTransition || { survivors: [], keptSubmitted: {} };
    const nextSubmitted = { ...st.keptSubmitted, [mySlot]: kept };
    let next = { ...fresh, setTransition: { ...st, keptSubmitted: nextSubmitted } };
    await writeRoom(code, next); setRoom(next);
  };

  // Once everyone has submitted, the lowest-indexed survivor finalizes the new set.
  useEffect(() => {
    if (!room || room.status !== "setTransition" || !room.setTransition) return;
    const { survivors, keptSubmitted } = room.setTransition;
    const allSubmitted = survivors.every((i) => keptSubmitted[i] !== undefined);
    if (!allSubmitted) return;
    const leader = Math.min(...survivors);
    if (mySlot !== leader) return;
    if (submittedSetRef.current === room.setNumber) return;
    submittedSetRef.current = room.setNumber;

    (async () => {
      const fresh = (await fetchRoom(code)) || room;
      const st = fresh.setTransition;
      const list = fresh.players.map((p, i) => {
        if (p.hp <= 0) return p;
        const keptList = st.keptSubmitted[i] ? Object.entries(st.keptSubmitted[i]).flatMap(([ch, n]) => Array(n).fill(ch)) : [];
        const kept = selectKeptLetters(p.letters, keptList);
        return resetPlayerForNewSet(p, fresh.baseMaxHp, kept);
      });
      const firstIdx = list.map((p, i) => i).find((i) => list[i].hp > 0);
      processedTurnRef.current = -1;
      const next = { ...fresh, players: list, status: "playing", activeIdx: firstIdx, turnNumber: (fresh.turnNumber || 0) + 1, setNumber: (fresh.setNumber || 1) + 1, slotsLeft: aliveCount(list), globalDebuff: 0, awaitingPick: false, setTransition: null, log: "新しいセットが始まった" };
      await writeRoom(code, next); setRoom(next);
    })();
  }, [room, mySlot, code]);

  const finishTurn = async (list, msg, hasExtraTurn, globalDebuffImmuneRounds) => {
    const prevAlive = aliveCount(room.players);
    const newAlive = aliveCount(list);
    if (newAlive <= 1) {
      const next = { ...room, players: list, status: "gameover", log: msg, globalDebuff: globalDebuffImmuneRounds };
      await writeRoom(code, next); setRoom(next); return;
    }
    if (newAlive < prevAlive) {
      const deadNames = room.players.filter((p, i) => p.hp > 0 && list[i].hp <= 0).map((p) => p.name).join("・");
      await startSetTransition(list, deadNames);
      return;
    }
    if (hasExtraTurn) {
      const next = { ...room, players: list, log: msg, globalDebuff: globalDebuffImmuneRounds };
      await writeRoom(code, next); setRoom(next); return;
    }
    const r = consumeSlot(list, globalDebuffImmuneRounds, room.slotsLeft || aliveCount(list));
    const ni = nextAliveIndex(r.list, room.activeIdx);
    const next = { ...room, players: r.list, activeIdx: ni, turnNumber: room.turnNumber + 1, slotsLeft: r.slotsLeft, globalDebuff: r.globalDebuffImmuneRounds, log: msg + (r.roundNote ? " / " + r.roundNote : "") };
    await writeRoom(code, next); setRoom(next);
  };

  const onCast = async (spell, targetIdx) => {
    const { list, msg, hasExtraTurn, globalDebuffImmuneRounds } = applyEffects(room.players, mySlot, targetIdx, spell, room.globalDebuff || 0);
    list[mySlot] = { ...list[mySlot], letters: payCost(list[mySlot].letters, spell.cost) };
    await finishTurn(list, msg, hasExtraTurn, globalDebuffImmuneRounds);
  };
  const onPass = async () => {
    let list = room.players.map((p) => ({ ...p }));
    if (list[mySlot].silencedTurns > 0) list[mySlot] = { ...list[mySlot], silencedTurns: list[mySlot].silencedTurns - 1 };
    await finishTurn(list, `${list[mySlot].name} は発動せずターンを終えた`, false, room.globalDebuff || 0);
  };

  useEffect(() => {
    if (stage === "lobby" && room && room.status === "playing") setStage("playing");
  }, [stage, room]);

  if (stage === "home") {
    return <OnlineHome onCreate={handleCreate} onJoin={handleJoin} onBack={onExit} />;
  }
  if (stage === "lobby") {
    return <LobbyScreen code={code} room={room} isHost={mySlot === 0} onStart={handleStart} onRefresh={async () => setRoom(await fetchRoom(code))} />;
  }

  if (!room) return <div className="min-h-screen bg-[#0A0910] text-[#8b8578] flex items-center justify-center">読み込み中…</div>;

  if (room.status === "gameover") {
    const alive = room.players.filter((p) => p.hp > 0);
    return <GameOverScreen winner={alive.length === 1 ? alive[0] : null} restartLabel="ホームに戻る" onRestart={() => { stopWatching(); onExit(); }} />;
  }

  if (room.status === "setTransition") {
    const st = room.setTransition;
    const amSurvivor = st.survivors.includes(mySlot);
    if (!amSurvivor) {
      return <div className="min-h-screen bg-[#0A0910] text-[#8b8578] flex items-center justify-center text-sm tracking-widest px-4 text-center">{room.log}<br />生存者が次のセットの準備をしています…</div>;
    }
    if (st.keptSubmitted[mySlot] !== undefined) {
      return <div className="min-h-screen bg-[#0A0910] text-[#8b8578] flex items-center justify-center text-sm tracking-widest">他のプレイヤーの選択を待っています…</div>;
    }
    const p = room.players[mySlot];
    const needsPick = Object.values(p.letters).reduce((a, b) => a + b, 0) > 20;
    if (!needsPick) {
      submitKept({});
      return <div className="min-h-screen bg-[#0A0910] text-[#8b8578] flex items-center justify-center text-sm tracking-widest">{room.log}<br />文字を持ち越しています…</div>;
    }
    return <LetterKeepScreen book={BOOKS[p.book]} player={p} onConfirm={submitKept} />;
  }

  if (room.awaitingPick && room.activeIdx === mySlot) {
    return <LetterPickerScreen book={BOOKS[room.players[mySlot].book]} player={room.players[mySlot]} onPick={onLetterPick} />;
  }

  const isMyTurn = room.activeIdx === mySlot && !room.awaitingPick;
  const me = room.players[mySlot];
  const others = room.players.map((p, i) => ({ ...p, idx: i })).filter((p) => p.idx !== mySlot && p.hp > 0 && !(p.untargetableRounds > 0));
  const activeName = room.players[room.activeIdx]?.name;

  return (
    <div className="min-h-screen w-full bg-[#0A0910] px-4 py-6">
      <div className="text-center text-[10px] text-[#8b8578] mb-1 tracking-widest">セット {room.setNumber || 1}</div>
      {(room.globalDebuff || 0) > 0 && <div className="text-center text-xs text-[#C9A227] mb-2 tracking-widest">全体デバフ無効化中(残り{room.globalDebuff}巡)</div>}
      <HpStrip players={room.players} highlightIdx={room.activeIdx} />
      {!isMyTurn && <div className="text-center text-xs text-[#8b8578] mb-3 tracking-widest">{activeName} のターンです…</div>}
      <GrimoirePanel key={mySlot} player={me} others={others} isInteractive={isMyTurn} silenced={me.silencedTurns > 0} onCast={onCast} onPass={onPass} log={room.log} />
      <ChatTradePanel room={room} mySlot={mySlot} code={code} fetchRoom={fetchRoom} writeRoom={writeRoom} others={others} />
    </div>
  );
}

// ============================================================
// Root
// ============================================================
export default function Spellwars() {
  const [mode, setMode] = useState("menu");
  return (
    <>
      <FontImport />
      {mode === "menu" && <ModeSelect onPick={setMode} />}
      {mode === "hotseat" && <HotseatGame onExit={() => setMode("menu")} />}
      {mode === "online" && <OnlineGame onExit={() => setMode("menu")} />}
    </>
  );
}
