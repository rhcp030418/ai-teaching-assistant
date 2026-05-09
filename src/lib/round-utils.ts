// 라운드 상태 판단 유틸 (시간 기반)
// active 플래그 대신 startDate~endDate로 자동 판단

export type RoundStatus = "pending" | "active" | "closed";

export function getRoundStatus(round: { startDate: Date; endDate: Date }, now: Date = new Date()): RoundStatus {
  if (now < round.startDate) return "pending";
  if (now >= round.endDate) return "closed";
  return "active";
}

export function isRoundActive(round: { startDate: Date; endDate: Date }, now: Date = new Date()): boolean {
  return getRoundStatus(round, now) === "active";
}

export function isRoundClosed(round: { startDate: Date; endDate: Date }, now: Date = new Date()): boolean {
  return getRoundStatus(round, now) === "closed";
}
