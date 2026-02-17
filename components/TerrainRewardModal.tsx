/**
 * TerrainRewardModal - 地形獎勵獲取多步驟流程
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Modal, ModalButton } from './ui/Modal';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { SegmentBar, type SegmentBarOption } from './ui/SegmentBar';
import { MODAL_CONTAINER_CLASS, MODAL_LABEL_BLOCK_CLASS, BUTTON_PRIMARY_CLASS, MODAL_FOOTER_BUTTONS_CLASS, MODAL_BUTTON_CANCEL_CLASS } from '../styles/modalStyles';
import { STYLES, combineStyles } from '../styles/common';
import { getFinalSkillBonus } from '../utils/characterAttributes';
import { getTierForLevel, getRewardFromTable, getRewardsForCategoryInTier, getBackupSkillsForCategory } from '../utils/terrainReward';
import { computeRollResults, getNextDowngradeTier } from '../utils/terrainRewardFlow';
import type { TerrainDef, TierKey, TierTable, ParsedReward } from '../types/terrainReward';
import type { CharacterStats } from '../types';
import type { CustomRecord } from '../types';
import * as ItemService from '../services/itemService';
import { useToast } from '../hooks/useToast';

const SKILL_OPTIONS: SegmentBarOption<string>[] = [
  { value: '求生', label: '求生' },
  { value: '觀察', label: '觀察' },
  { value: '自然', label: '自然' },
];

function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

interface TerrainRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  terrain: TerrainDef;
  stats: CharacterStats;
  setStats: React.Dispatch<React.SetStateAction<CharacterStats>>;
  characterId: string;
  onCharacterDataChanged?: () => void;
  onSaveExtraData: (extraData: Record<string, unknown>) => Promise<boolean>;
}

export function TerrainRewardModal({
  isOpen,
  onClose,
  terrain,
  stats,
  setStats,
  characterId,
  onCharacterDataChanged,
  onSaveExtraData,
}: TerrainRewardModalProps) {
  const { showSuccess, showError } = useToast();
  const level = stats?.level ?? 1;
  const currentTier = getTierForLevel(terrain, level);
  const currentTable = currentTier ? terrain.tables[currentTier]! : null;

  const [step, setStep] = useState<'config' | 'roll_result' | 'success_reward' | 'failure_category' | 'failure_roll_result' | 'failure_pick' | 'done'>('config');
  const [attemptsInput, setAttemptsInput] = useState('1');
  const [selectedSkill, setSelectedSkill] = useState<string>('求生');
  const [rollResults, setRollResults] = useState<ReturnType<typeof computeRollResults> | null>(null);
  const [successRewards, setSuccessRewards] = useState<Array<{ reward: ParsedReward; x: number; y: number }>>([]);
  const [successIndex, setSuccessIndex] = useState(0);
  const [failureIndex, setFailureIndex] = useState(0);
  const [downgradedTier, setDowngradedTier] = useState<TierKey | null>(null);
  const [failureCategoryIndex, setFailureCategoryIndex] = useState(0);
  const [failureBackupSkill, setFailureBackupSkill] = useState<string>('');
  const [failureRollTotal, setFailureRollTotal] = useState<number | null>(null);
  const [failureRollSuccess, setFailureRollSuccess] = useState(false);
  const [failureRollDetail, setFailureRollDetail] = useState<{ d20: number; bonus: number; dc: number; skillName: string } | null>(null);
  const [failurePickOptions, setFailurePickOptions] = useState<ParsedReward[]>([]);
  const [specialStoryCount, setSpecialStoryCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const dc = terrain.skillDc[selectedSkill as keyof typeof terrain.skillDc] ?? 10;
  const skillBonus = getFinalSkillBonus(stats, selectedSkill);

  const startRoll = useCallback(() => {
    const attempts = Math.max(1, Math.min(20, parseInt(attemptsInput, 10) || 1));
    const d20Rolls = Array.from({ length: attempts }, () => rollDice(20));
    const results = computeRollResults(attempts, dc, skillBonus, d20Rolls);
    setRollResults(results);
    if (results.successCount > 0 && currentTable) {
      const list: Array<{ reward: ParsedReward; x: number; y: number }> = [];
      const xMax = currentTable.xDie;
      for (let i = 0; i < results.successCount; i++) {
        const x = rollDice(xMax);
        const y = rollDice(6);
        const reward = getRewardFromTable(currentTable, x, y);
        if (reward) list.push({ reward, x, y });
      }
      setSuccessRewards(list);
      setSuccessIndex(0);
    }
    setStep('roll_result');
  }, [attemptsInput, dc, skillBonus, currentTable]);

  const addRewardToInventory = useCallback(
    async (name: string, quantity: number): Promise<boolean> => {
      const list = await ItemService.getCharacterItems(characterId);
      if (!list.success || !list.items) {
        showError(list.error ?? '載入物品失敗');
        return false;
      }
      const existing = list.items.find(
        (ci) => ItemService.getDisplayValues(ci).displayName === name
      );
      if (existing) {
        const result = await ItemService.updateCharacterItem(existing.id, {
          quantity: existing.quantity + quantity,
        });
        if (!result.success) {
          showError(result.error ?? '更新數量失敗');
          return false;
        }
      } else {
        const result = await ItemService.createCharacterItem(characterId, {
          name,
          category: 'MH素材',
          quantity,
          is_magic: false,
        });
        if (!result.success) {
          showError(result.error ?? '加入物品失敗');
          return false;
        }
      }
      showSuccess(`已加入 ${name} × ${quantity}`);
      onCharacterDataChanged?.();
      return true;
    },
    [characterId, showError, showSuccess, onCharacterDataChanged]
  );

  const saveSpecialStoryToRecords = useCallback(
    async (countOverride?: number) => {
      const count = countOverride !== undefined ? countOverride : specialStoryCount;
      if (count <= 0) return;
      const records = stats.customRecords ?? [];
      const existing = records.find((r) => r.name === '特殊劇情' && r.note === '地形獎勵');
      let updated: CustomRecord[];
      if (existing) {
        const value = parseInt(existing.value, 10) || 0;
        updated = records.map((r) =>
          r.id === existing.id ? { ...r, value: String(value + count) } : r
        );
      } else {
        updated = [
          ...records,
          { id: Date.now().toString(), name: '特殊劇情', value: String(count), note: '地形獎勵' },
        ];
      }
      setStats((prev) => ({ ...prev, customRecords: updated }));
      const extraData = {
        downtime: stats.downtime ?? 0,
        renown: stats.renown ?? { used: 0, total: 0 },
        prestige: stats.prestige ?? { org: '', level: 0, rankName: '' },
        customRecords: updated,
        attacks: stats.attacks ?? [],
      };
      await onSaveExtraData(extraData);
    },
    [specialStoryCount, stats, setStats, onSaveExtraData]
  );

  const finishFlow = useCallback(
    (countToSave?: number) => {
      saveSpecialStoryToRecords(countToSave);
      setStep('done');
    },
    [saveSpecialStoryToRecords]
  );

  const proceedFromRollResult = useCallback(() => {
    if (!rollResults) return;
    if (rollResults.successCount > 0 && successRewards.length > 0) {
      setStep('success_reward');
      return;
    }
    if (rollResults.failureCount > 0) {
      setFailureIndex(0);
      setDowngradedTier(currentTier ? getNextDowngradeTier(currentTier) ?? currentTier : 'initial');
      setStep('failure_category');
      return;
    }
    finishFlow();
  }, [rollResults, successRewards.length, currentTier, finishFlow]);

  const confirmSuccessReward = useCallback(async () => {
    const item = successRewards[successIndex];
    if (!item) return;
    setIsSubmitting(true);
    const ok = await addRewardToInventory(item.reward.name, item.reward.quantity);
    setIsSubmitting(false);
    if (!ok) return;
    if (successIndex + 1 >= successRewards.length) {
      if (rollResults && rollResults.failureCount > 0) {
        setFailureIndex(0);
        setDowngradedTier(currentTier ? getNextDowngradeTier(currentTier) ?? currentTier : 'initial');
        setStep('failure_category');
      } else {
        finishFlow();
      }
    } else {
      setSuccessIndex((i) => i + 1);
    }
  }, [successIndex, successRewards, rollResults, currentTier, addRewardToInventory, finishFlow]);

  const failureTable = useMemo((): TierTable | null => {
    const tier = downgradedTier ?? currentTier;
    if (!tier) return null;
    return terrain.tables[tier];
  }, [downgradedTier, currentTier, terrain.tables]);

  const failureCategory = failureTable?.categories[failureCategoryIndex];
  const failureCategoryOptions: SegmentBarOption<number>[] = (failureTable?.categories ?? []).map((c, i) => ({
    value: i,
    label: c.label,
  }));
  const backupSkills = failureCategory ? getBackupSkillsForCategory(failureCategory.id) : [];
  const backupSkillOptions: SegmentBarOption<string>[] = backupSkills.map((s) => ({ value: s, label: s }));

  const doFailureRoll = useCallback(() => {
    if (!failureCategory) return;
    const backupSkill = failureBackupSkill || getBackupSkillsForCategory(failureCategory.id)[0];
    const bonus = getFinalSkillBonus(stats, backupSkill);
    const d20 = rollDice(20);
    const total = d20 + bonus;
    const success = total >= failureCategory.backupDc;
    setFailureRollTotal(total);
    setFailureRollSuccess(success);
    setFailureRollDetail({ d20, bonus, dc: failureCategory.backupDc, skillName: backupSkill });
    if (success) {
      setFailurePickOptions(getRewardsForCategoryInTier(failureTable!, failureCategoryIndex));
      setStep('failure_pick');
    } else {
      setStep('failure_roll_result');
    }
  }, [failureCategory, failureBackupSkill, failureTable, failureCategoryIndex, stats]);

  const proceedFromFailureRollResult = useCallback(() => {
    const nextTier = getNextDowngradeTier(downgradedTier!);
    if (nextTier === null) {
      const newCount = specialStoryCount + 1;
      setSpecialStoryCount(newCount);
      setFailureIndex((i) => i + 1);
      setFailureRollTotal(null);
      setFailureRollDetail(null);
      if (failureIndex + 1 >= (rollResults?.failureCount ?? 0)) {
        finishFlow(newCount);
      } else {
        setDowngradedTier(currentTier ? getNextDowngradeTier(currentTier) ?? currentTier : 'initial');
        setStep('failure_category');
      }
    } else {
      setDowngradedTier(nextTier);
      setFailureRollTotal(null);
      setFailureRollDetail(null);
      setStep('failure_category');
    }
  }, [downgradedTier, failureIndex, rollResults?.failureCount, currentTier, finishFlow, specialStoryCount]);

  /** 初階無法再下修時直接計入特殊劇情（不顯示資源類別／備用擲骰） */
  const proceedFromInitialExhaust = useCallback(() => {
    const newCount = specialStoryCount + 1;
    setSpecialStoryCount(newCount);
    setFailureIndex((i) => i + 1);
    setFailureRollTotal(null);
    setFailureRollDetail(null);
    if (failureIndex + 1 >= (rollResults?.failureCount ?? 0)) {
      finishFlow(newCount);
    } else {
      setDowngradedTier(currentTier ? getNextDowngradeTier(currentTier) ?? currentTier : 'initial');
      setStep('failure_category');
    }
  }, [specialStoryCount, failureIndex, rollResults?.failureCount, currentTier, finishFlow]);

  const [pickedFailureReward, setPickedFailureReward] = useState<ParsedReward | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('config');
      setAttemptsInput('1');
      setSelectedSkill('求生');
      setRollResults(null);
      setSuccessRewards([]);
      setSuccessIndex(0);
      setFailureIndex(0);
      setDowngradedTier(null);
      setFailureCategoryIndex(0);
      setFailureBackupSkill('');
      setFailureRollTotal(null);
      setFailureRollSuccess(false);
      setFailureRollDetail(null);
      setFailurePickOptions([]);
      setPickedFailureReward(null);
      setSpecialStoryCount(0);
      setShowCancelConfirm(false);
    }
  }, [isOpen, terrain.id]);

  const confirmFailurePick = useCallback(async () => {
    const reward = pickedFailureReward ?? failurePickOptions[0];
    if (!reward) return;
    setIsSubmitting(true);
    const ok = await addRewardToInventory(reward.name, reward.quantity);
    setIsSubmitting(false);
    if (!ok) return;
    setPickedFailureReward(null);
    setFailureIndex((i) => i + 1);
    if (failureIndex + 1 >= (rollResults?.failureCount ?? 0)) {
      finishFlow();
    } else {
      setDowngradedTier(currentTier ? getNextDowngradeTier(currentTier) ?? currentTier : 'initial');
      setFailureRollTotal(null);
      setFailureRollDetail(null);
      setFailureRollSuccess(false);
      setStep('failure_category');
    }
  }, [pickedFailureReward, failurePickOptions, failureIndex, rollResults, currentTier, addRewardToInventory, finishFlow]);

  const currentSuccessItem = successRewards[successIndex];

  if (!isOpen) return null;

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!isSubmitting) setShowCancelConfirm(true); }}
      title={`地形獎勵獲取 · ${terrain.name}`}
      size="md"
      disableBackdropClose={isSubmitting}
    >
      <div className={MODAL_CONTAINER_CLASS}>
        <LoadingOverlay visible={isSubmitting} text="處理中…" />
        {step === 'config' && (
          <>
            <label className={MODAL_LABEL_BLOCK_CLASS}>總共要獲取幾次獎勵？</label>
            <input
              type="number"
              min={1}
              max={20}
              value={attemptsInput}
              onChange={(e) => setAttemptsInput(e.target.value)}
              placeholder="1"
              className={combineStyles(STYLES.input.base, 'w-full mb-3')}
            />
            <label className={MODAL_LABEL_BLOCK_CLASS}>使用技能檢定</label>
            <SegmentBar<string> options={SKILL_OPTIONS} value={selectedSkill} onChange={setSelectedSkill} />
            <p className={combineStyles(STYLES.text.subtitle, 'mt-2')}>技能加值：{skillBonus >= 0 ? '+' : ''}{skillBonus}　DC：{dc}</p>
            <button type="button" className={combineStyles(BUTTON_PRIMARY_CLASS, 'w-full mt-4')} onClick={startRoll}>
              開始擲骰
            </button>
          </>
        )}

        {step === 'roll_result' && rollResults && (
          <>
            <p className={combineStyles(STYLES.text.bodySmall, 'mb-2')}>成功獎勵：{rollResults.successCount} 次　失敗獎勵：{rollResults.failureCount} 次</p>
            <div className={combineStyles(STYLES.text.muted, 'space-y-1 mb-4 max-h-64 overflow-y-auto')}>
              {rollResults.rollDetails.map((r, i) => (
                <div key={i}>
                  第{i + 1}次 d20={r.d20} +{r.bonus} = {r.total}{' '}
                  <span className={r.success ? STYLES.text.outcomeSuccess : STYLES.text.outcomeFailure}>
                    {r.success ? (r.critical ? '大成功' : '成功') : '失敗'}
                  </span>
                </div>
              ))}
            </div>
            <button type="button" className={combineStyles(BUTTON_PRIMARY_CLASS, 'w-full')} onClick={proceedFromRollResult}>
              繼續
            </button>
          </>
        )}

        {step === 'success_reward' && currentSuccessItem && (
          <>
            <p className={combineStyles(STYLES.text.subtitle, 'mb-2')}>成功獎勵 ({successIndex + 1}/{successRewards.length})</p>
            <p className={STYLES.text.bodySmall}>擲出 X={currentSuccessItem.x}, Y={currentSuccessItem.y} → 獲得</p>
            <p className={combineStyles(STYLES.text.emphasis, 'my-2')}>{currentSuccessItem.reward.name} × {currentSuccessItem.reward.quantity}</p>
            <button type="button" className={combineStyles(BUTTON_PRIMARY_CLASS, 'w-full')} onClick={confirmSuccessReward} disabled={isSubmitting}>
              確認加入物品欄
            </button>
          </>
        )}

        {step === 'failure_category' && failureTable && (
          <>
            <p className={combineStyles(STYLES.text.subtitle, 'mb-2')}>失敗獎勵 ({failureIndex + 1}/{rollResults?.failureCount ?? 0}) · 下修至{downgradedTier === 'initial' ? '初階' : downgradedTier === 'advanced' ? '進階' : downgradedTier === 'high' ? '高階' : '特階'}</p>
            {downgradedTier === 'initial' && currentTier === 'initial' ? (
              <>
                <p className={combineStyles(STYLES.text.bodySmall, 'mb-3')}>初階無法再下修，直接計入 1 次特殊劇情。</p>
                <button type="button" className={combineStyles(BUTTON_PRIMARY_CLASS, 'w-full mt-4')} onClick={proceedFromInitialExhaust}>
                  繼續
                </button>
              </>
            ) : (
              <>
                <label className={MODAL_LABEL_BLOCK_CLASS}>選擇資源類別</label>
                {failureCategoryOptions.length > 0 && (
                  <SegmentBar<number> options={failureCategoryOptions} value={failureCategoryIndex} onChange={setFailureCategoryIndex} />
                )}
                {failureCategory && (
                  <>
                    <p className={combineStyles(STYLES.text.muted, 'mt-2')}>該類別可取得獎勵：</p>
                    <p className={STYLES.text.subtitle}>{getRewardsForCategoryInTier(failureTable, failureCategoryIndex).map((r) => r.name).join('、')}</p>
                    {backupSkills.length >= 1 && (
                      <>
                        <label className={combineStyles(MODAL_LABEL_BLOCK_CLASS, 'mt-2')}>備用技能</label>
                        <SegmentBar<string> options={backupSkillOptions} value={failureBackupSkill || backupSkills[0]} onChange={(s) => setFailureBackupSkill(s)} />
                      </>
                    )}
                    <p className={combineStyles(STYLES.text.subtitle, 'mt-1')}>技能加值：{getFinalSkillBonus(stats, failureBackupSkill || backupSkills[0])}　DC：{failureCategory.backupDc}</p>
                  </>
                )}
                <button type="button" className={combineStyles(BUTTON_PRIMARY_CLASS, 'w-full mt-4')} onClick={doFailureRoll}>
                  擲骰
                </button>
              </>
            )}
          </>
        )}

        {step === 'failure_roll_result' && failureRollTotal !== null && (
          <>
            <p className={combineStyles(STYLES.text.bodySmall, 'mb-1')}>擲骰結果</p>
            {failureRollDetail ? (
              <div className={combineStyles(STYLES.text.muted, 'space-y-0.5 mb-3')}>
                <div>d20 = {failureRollDetail.d20}</div>
                <div>{failureRollDetail.skillName} 技能加值：{failureRollDetail.bonus >= 0 ? '+' : ''}{failureRollDetail.bonus}</div>
                <div>總和 = {failureRollDetail.d20} + {failureRollDetail.bonus >= 0 ? '+' : ''}{failureRollDetail.bonus} = {failureRollTotal}</div>
                <div>DC {failureRollDetail.dc} → <span className={failureRollTotal >= failureRollDetail.dc ? STYLES.text.outcomeSuccess : STYLES.text.outcomeFailure}>{failureRollTotal >= failureRollDetail.dc ? '成功' : '失敗'}</span></div>
              </div>
            ) : (
              <p className={combineStyles(STYLES.text.bodySmall, 'mb-3')}>{failureRollTotal} <span className={STYLES.text.outcomeFailure}>失敗</span></p>
            )}
            <button type="button" className={combineStyles(BUTTON_PRIMARY_CLASS, 'w-full mt-4')} onClick={proceedFromFailureRollResult}>
              繼續
            </button>
          </>
        )}

        {step === 'failure_pick' && failurePickOptions.length > 0 && (
          <>
            <p className={combineStyles(STYLES.text.subtitle, 'mb-2')}>檢定<span className={STYLES.text.outcomeSuccess}>成功</span> · 請選擇一項獎勵</p>
            <div className={combineStyles(STYLES.filterRow.wrap, 'mb-4')}>
              {failurePickOptions.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPickedFailureReward(r)}
                  className={combineStyles(
                    STYLES.choiceChip.base,
                    pickedFailureReward?.name === r.name ? STYLES.choiceChip.selected : STYLES.choiceChip.unselected
                  )}
                >
                  {r.name}{r.quantity > 1 ? ` × ${r.quantity}` : ''}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={combineStyles(BUTTON_PRIMARY_CLASS, 'w-full')}
              onClick={confirmFailurePick}
              disabled={isSubmitting || !pickedFailureReward}
            >
              確認加入物品欄
            </button>
          </>
        )}

        {step === 'done' && (
          <>
            <p className={combineStyles(STYLES.text.bodySmall, 'mb-4')}>
              {specialStoryCount > 0
                ? `採集完畢。有 ${specialStoryCount} 次特殊劇情，紀錄於角色頁面，請告知DM，觸發劇情後手動刪除該紀錄。`
                : '採集完畢。無特殊劇情'}
            </p>
            <button type="button" className={combineStyles(BUTTON_PRIMARY_CLASS, 'w-full')} onClick={onClose}>
              完成
            </button>
          </>
        )}
      </div>
    </Modal>

    <Modal isOpen={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} title="確認取消" size="xs">
      <div className={MODAL_CONTAINER_CLASS}>
        <p className={combineStyles(STYLES.text.bodySmall, 'mb-4')}>是否確認取消獎勵獲取？未完成的進度將不會儲存。</p>
        <div className={MODAL_FOOTER_BUTTONS_CLASS}>
          <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={() => setShowCancelConfirm(false)}>
            繼續獲取
          </ModalButton>
          <ModalButton variant="danger" onClick={() => { setShowCancelConfirm(false); onClose(); }}>
            確認取消
          </ModalButton>
        </div>
      </div>
    </Modal>
    </>
  );
}
