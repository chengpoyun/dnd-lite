/** 第三方素材與商標來源，顯示於「關於」頁的素材來源 Modal */
export interface Attribution {
  text: string;
  url?: string;
}

export const ATTRIBUTIONS: Attribution[] = [
  { text: 'Dungeons & Dragons 是 Wizards of the Coast 的註冊商標' },
  { text: 'Gem icons created by Freepik - Flaticon', url: 'https://www.flaticon.com/free-icons/gem' },
];
