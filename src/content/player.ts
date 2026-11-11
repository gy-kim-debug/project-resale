export const AVATARS = { female: '여자', male: '남자' } as const;
export const CLOTHING = {
  jacket: '재킷',
  tshirt: '티셔츠',
  hoodie: '후드',
  coat: '코트',
  dress: '원피스',
} as const;
/** Saved outfit is the color key; clothing is the garment type. */
export const OUTFITS = {
  mint: { label: '민트', main: '#91af91', shade: '#587965' },
  blue: { label: '블루', main: '#8dadd3', shade: '#506d9b' },
  amber: { label: '앰버', main: '#e3bb78', shade: '#96723d' },
  rose: { label: '로즈', main: '#d99fae', shade: '#955f7b' },
  charcoal: { label: '차콜', main: '#76818b', shade: '#3c4652' },
  cream: { label: '크림', main: '#eee0b8', shade: '#aa946b' },
} as const;
export const SKINS = {
  light: {
    label: '밝은 톤',
    main: '#efc8a3',
    shade: '#d4a27f',
    neck: '#ddb18f',
  },
  tan: { label: '중간 톤', main: '#e8b58a', shade: '#cf936f', neck: '#d99d76' },
  deep: {
    label: '짙은 톤',
    main: '#ae7958',
    shade: '#83533f',
    neck: '#976446',
  },
} as const;
export const HAIRSTYLES = {
  short: '짧은 머리',
  long: '긴 머리',
  cap: '모자',
  bob: '단발',
  ponytail: '묶은 머리',
} as const;
export interface PlayerAppearance {
  avatar?: keyof typeof AVATARS;
  clothing?: keyof typeof CLOTHING;
  hair: keyof typeof HAIRSTYLES;
  outfit: keyof typeof OUTFITS;
  skin: keyof typeof SKINS;
}
export interface PlayerProfile {
  nickname: string;
  appearance: PlayerAppearance;
}
export const DEFAULT_PLAYER: PlayerProfile = {
  nickname: '플레이어',
  appearance: {
    avatar: 'male',
    clothing: 'jacket',
    hair: 'short',
    outfit: 'mint',
    skin: 'tan',
  },
};
