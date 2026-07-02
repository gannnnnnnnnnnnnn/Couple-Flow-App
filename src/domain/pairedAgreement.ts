import type { PairMember } from '../types';

export function getEffectivePairedAgreementMembers(
  members: PairMember[],
  currentMemberId: string,
) {
  const sortedMembers = [...members].sort(comparePairMembers);
  const chosenByDisplayName = new Map<string, PairMember>();

  sortedMembers.forEach((member) => {
    const displayNameKey = normalizeDisplayName(member.display_name || member.id);
    const existing = chosenByDisplayName.get(displayNameKey);
    if (!existing || member.id === currentMemberId) {
      chosenByDisplayName.set(displayNameKey, member);
    }
  });

  const dedupedMembers = [...chosenByDisplayName.values()].sort(comparePairMembers);
  if (dedupedMembers.length <= 2) {
    return dedupedMembers;
  }

  const currentMember = dedupedMembers.find((member) => member.id === currentMemberId);
  if (!currentMember) {
    return dedupedMembers.slice(0, 2);
  }

  return [
    currentMember,
    ...dedupedMembers.filter((member) => member.id !== currentMemberId),
  ]
    .slice(0, 2)
    .sort(comparePairMembers);
}

export function hasExtraRawPairMembers(members: PairMember[]) {
  return members.length > 2;
}

function normalizeDisplayName(displayName: string) {
  return displayName.trim().toLocaleLowerCase();
}

function comparePairMembers(left: PairMember, right: PairMember) {
  const createdAtComparison = left.created_at.localeCompare(right.created_at);
  if (createdAtComparison !== 0) {
    return createdAtComparison;
  }

  return left.id.localeCompare(right.id);
}
