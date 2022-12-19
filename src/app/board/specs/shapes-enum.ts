export enum BoardShape {
  STANDARD = 'Standard',
  EXPANSION6 = '5-6 Player Expansion',
  SEAFARERS1 = 'Seafarers 1: Heading for New Shores',
  SEAFARERS2 = 'Seafarers 2: The Four Islands',
  DRAGONS = 'The Desert Dragons'
}

export function shapeLabelToEnumName(label: string): string {
  switch (label) {
    case BoardShape.STANDARD:
      return 'STANDARD';
    case BoardShape.EXPANSION6:
      return 'EXPANSION6';
    case BoardShape.SEAFARERS1:
      return 'SEAFARERS1';
    case BoardShape.SEAFARERS2:
      return 'SEAFARERS2';
    case BoardShape.DRAGONS:
      return 'DRAGONS';
    default:
      throw new Error(`Unrecognized shape label "${label}"`);
  }
}