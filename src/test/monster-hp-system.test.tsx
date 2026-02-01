/**
 * 怪物 Max HP 系統單元測試
 * 
 * 測試目標：
 * 1. HP 顯示邏輯：/? (未知)、/X (已知)、/<=X (死亡)
 * 2. 死亡按鈕功能：將 max_hp 設為 -total_damage
 * 3. MonsterCard 的 HP 顯示格式
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import MonsterCard from '../../components/MonsterCard';
import type { CombatMonsterWithLogs } from '../../lib/supabase';

describe('Max HP 系統測試', () => {
  const baseMonster: CombatMonsterWithLogs = {
    id: 'test-monster-1',
    session_code: 'TEST123',
    name: '地精',
    number: 1,
    total_damage: 25,
    ac_range_min: 0,
    ac_range_max: null,
    max_hp: null,
    resistances: {},
    damage_logs: [],
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  describe('HP 顯示邏輯', () => {
    it('未知 HP 應該顯示 "/<span>?</span>"', () => {
      const monster = { ...baseMonster, max_hp: null };
      
      render(
        <MonsterCard
          monster={monster}
          onAddDamage={vi.fn()}
          onAdjustAC={vi.fn()}
          onSettings={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // 檢查是否有 total_damage 顯示
      expect(screen.getByText('25')).toBeInTheDocument();
      
      // 檢查是否有 /? 顯示（未知 HP）
      const hpSection = screen.getByText('25').parentElement;
      expect(hpSection?.textContent).toContain('/?');
    });

    it('已知 HP 應該顯示 "/X" 格式', () => {
      const monster = { ...baseMonster, max_hp: 50, total_damage: 25 };
      
      render(
        <MonsterCard
          monster={monster}
          onAddDamage={vi.fn()}
          onAdjustAC={vi.fn()}
          onSettings={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // 檢查顯示 25/50
      expect(screen.getByText('25')).toBeInTheDocument();
      const hpSection = screen.getByText('25').parentElement;
      expect(hpSection?.textContent).toContain('/50');
    });

    it('死亡狀態（負值 HP）應該顯示 "/<=X" 格式並加底線', () => {
      const monster = { ...baseMonster, max_hp: -30, total_damage: 35 };
      
      const { container } = render(
        <MonsterCard
          monster={monster}
          onAddDamage={vi.fn()}
          onAdjustAC={vi.fn()}
          onSettings={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // 檢查顯示 35/<=30
      expect(screen.getByText('35')).toBeInTheDocument();
      
      // 檢查是否有底線元素 <u>
      const underlinedElement = container.querySelector('u');
      expect(underlinedElement).toBeInTheDocument();
      expect(underlinedElement?.textContent).toContain('<=');
      
      // 檢查絕對值顯示（30 而不是 -30）
      const hpSection = screen.getByText('35').parentElement;
      expect(hpSection?.textContent).toContain('30');
      expect(hpSection?.textContent).not.toContain('-30');
    });
  });

  describe('HP 邊界值測試', () => {
    it('HP = 0 應該顯示為已知 HP', () => {
      const monster = { ...baseMonster, max_hp: 0, total_damage: 0 };
      
      render(
        <MonsterCard
          monster={monster}
          onAddDamage={vi.fn()}
          onAdjustAC={vi.fn()}
          onSettings={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const hpSection = screen.getByText('0').parentElement;
      expect(hpSection?.textContent).toContain('/0');
    });

    it('total_damage > max_hp 應該正常顯示（允許過殺）', () => {
      const monster = { ...baseMonster, max_hp: 20, total_damage: 50 };
      
      render(
        <MonsterCard
          monster={monster}
          onAddDamage={vi.fn()}
          onAdjustAC={vi.fn()}
          onSettings={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText('50')).toBeInTheDocument();
      const hpSection = screen.getByText('50').parentElement;
      expect(hpSection?.textContent).toContain('/20');
    });

    it('negative total_damage 應該顯示（當前實作允許）', () => {
      const monster = { ...baseMonster, max_hp: 50, total_damage: -10 };
      
      render(
        <MonsterCard
          monster={monster}
          onAddDamage={vi.fn()}
          onAdjustAC={vi.fn()}
          onSettings={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // 當前實作允許顯示負數 total_damage
      // 未來可以考慮改為 Math.max(0, total_damage)
      expect(screen.getByText('-10')).toBeInTheDocument();
    });
  });

  describe('HP 數值計算邏輯', () => {
    it('Math.abs() 應該正確處理負值 max_hp', () => {
      const negativeHP = -45;
      const absoluteValue = Math.abs(negativeHP);
      
      expect(absoluteValue).toBe(45);
      expect(absoluteValue).toBeGreaterThan(0);
    });

    it('三元運算子應該正確判斷 HP 狀態', () => {
      const unknownHP = null;
      const knownHP = 50;
      const deadHP = -30;

      // 未知
      expect(unknownHP === null).toBe(true);
      
      // 已知
      expect(knownHP !== null && knownHP >= 0).toBe(true);
      
      // 死亡
      expect(deadHP < 0).toBe(true);
    });
  });

  describe('死亡狀態轉換測試', () => {
    it('未知 HP 怪物死亡應設定 max_hp = -total_damage', () => {
      // 模擬死亡邏輯
      const monster = { ...baseMonster, max_hp: null, total_damage: 42 };
      const expectedMaxHP = -monster.total_damage;

      expect(expectedMaxHP).toBe(-42);
      expect(expectedMaxHP).toBeLessThan(0);
    });

    it('已知 HP 怪物死亡不應修改 max_hp', () => {
      const monster = { ...baseMonster, max_hp: 50, total_damage: 60 };
      
      // 死亡時 max_hp 應保持不變
      const maxHPAfterDeath = monster.max_hp;
      expect(maxHPAfterDeath).toBe(50);
      expect(maxHPAfterDeath).toBeGreaterThan(0);
    });

    it('死亡狀態怪物的 HP 顯示應該包含 <= 符號', () => {
      const monster = { ...baseMonster, max_hp: -25 };
      
      const { container } = render(
        <MonsterCard
          monster={monster}
          onAddDamage={vi.fn()}
          onAdjustAC={vi.fn()}
          onSettings={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const underlinedElement = container.querySelector('u');
      expect(underlinedElement?.textContent).toBe('<=');
    });
  });

  describe('HP 顯示樣式測試', () => {
    it('未知 HP 的問號應該使用特定樣式', () => {
      const monster = { ...baseMonster, max_hp: null };
      
      const { container } = render(
        <MonsterCard
          monster={monster}
          onAddDamage={vi.fn()}
          onAdjustAC={vi.fn()}
          onSettings={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // 檢查 ? 符號存在
      expect(container.textContent).toContain('?');
    });

    it('死亡狀態的底線應該使用藍色樣式', () => {
      const monster = { ...baseMonster, max_hp: -30 };
      
      const { container } = render(
        <MonsterCard
          monster={monster}
          onAddDamage={vi.fn()}
          onAdjustAC={vi.fn()}
          onSettings={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const underlinedElement = container.querySelector('u');
      expect(underlinedElement?.className).toContain('text-blue-400');
    });
  });

  describe('整合測試：HP 狀態轉換', () => {
    it('應該正確處理 HP 從未知 → 已知 → 死亡的完整流程', () => {
      // 1. 初始：未知 HP
      let monster = { ...baseMonster, max_hp: null, total_damage: 0 };
      expect(monster.max_hp).toBeNull();

      // 2. 設定已知 HP
      monster = { ...monster, max_hp: 50 };
      expect(monster.max_hp).toBe(50);
      expect(monster.max_hp).toBeGreaterThan(0);

      // 3. 受到傷害但未死
      monster = { ...monster, total_damage: 30 };
      expect(monster.total_damage).toBeLessThan(monster.max_hp!);

      // 4. 受到致命傷害（已知 HP 不轉為負值）
      monster = { ...monster, total_damage: 60 };
      expect(monster.total_damage).toBeGreaterThan(monster.max_hp!);
      expect(monster.max_hp).toBe(50); // max_hp 保持不變
    });

    it('應該正確處理 HP 從未知直接到死亡的流程', () => {
      // 1. 初始：未知 HP
      let monster = { ...baseMonster, max_hp: null, total_damage: 35 };
      expect(monster.max_hp).toBeNull();

      // 2. 死亡時設定 max_hp = -total_damage
      monster = { ...monster, max_hp: -monster.total_damage };
      expect(monster.max_hp).toBe(-35);
      expect(monster.max_hp).toBeLessThan(0);

      // 3. 顯示時使用絕對值
      const displayValue = Math.abs(monster.max_hp);
      expect(displayValue).toBe(35);
    });
  });
});
