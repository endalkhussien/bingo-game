export type UiLanguage = 'en' | 'am';

export const UI_LANG_STORAGE_KEY = 'waliya-ui-language';

export const UI_STRINGS = {
  en: {
    balance: 'Balance',
    gameBoard: 'Game Board',
    bingoCards: 'Bingo Cards',
    reports: 'Reports',
    rechargeBalance: 'Recharge Balance',
    logout: 'Logout',
    selectCartellas: 'Select Cartellas',
    clearCards: 'Clear Cards',
    shuffle: 'Shuffle',
    shuffled: 'Shuffled!',
    createGame: 'Create Game',
    commission: 'Commission %',
    cartellaVoice: 'Cartella voice',
    mute: 'Muted',
    unmute: 'On',
    lastCall: 'Last call',
    checkCard: 'Check Card',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
  },
  am: {
    balance: 'ሂሳብ',
    gameBoard: 'የጨዋታ ቦርድ',
    bingoCards: 'ቢንጎ ካርዶች',
    reports: 'ሪፖርቶች',
    rechargeBalance: 'ሂሳብ መሙላ',
    logout: 'መውጣት',
    selectCartellas: 'ካርቴላዎችን ይምረጡ',
    clearCards: 'ካርዶችን አጽዳ',
    shuffle: 'ቀይር',
    shuffled: 'ተቀይሯል!',
    createGame: 'ጨዋታ ይፍጠሩ',
    commission: 'ኮሚሽን %',
    cartellaVoice: 'የካርቴላ ድምፅ',
    mute: 'ድምፅ ጠፍቷል',
    unmute: 'በርቷል',
    lastCall: 'የመጨረሻው ቁጥር',
    checkCard: 'ካርድ ይፈትሹ',
    daily: 'ቀን',
    weekly: 'ሳምንት',
    monthly: 'ወር',
  },
} as const;

export type UiStringKey = keyof typeof UI_STRINGS.en;

export function t(lang: UiLanguage, key: UiStringKey): string {
  return UI_STRINGS[lang][key] ?? UI_STRINGS.en[key];
}
