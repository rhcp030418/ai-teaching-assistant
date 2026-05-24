export type MaterialMetricKind = "difficulty" | "term" | "example";

export function normalizeExampleSufficiency(value: string) {
  if (value.includes("부족") || value.includes("보완")) return "보완 필요";
  if (value.includes("충분")) return "충분";
  return "보통";
}

export function displayMaterialMetricValue(kind: MaterialMetricKind, value: string) {
  if (kind === "example") return normalizeExampleSufficiency(value);
  if (kind === "term" && value === "중간") return "보통";
  if (kind === "difficulty" && value === "중간") return "중";
  return value;
}

export function materialMetricStyle(kind: MaterialMetricKind, value: string) {
  if (kind === "difficulty") {
    if (value.includes("상") || value.includes("높")) {
      return {
        card: "border-rose-100 bg-rose-50/80",
        label: "text-rose-600",
        badge: "bg-rose-100 text-rose-700",
      };
    }
    if (value.includes("중") || value.includes("보통")) {
      return {
        card: "border-amber-100 bg-amber-50/80",
        label: "text-amber-600",
        badge: "bg-amber-100 text-amber-700",
      };
    }
    return {
      card: "border-emerald-100 bg-emerald-50/80",
      label: "text-emerald-600",
      badge: "bg-emerald-100 text-emerald-700",
    };
  }

  if (kind === "term") {
    if (value.includes("높")) {
      return {
        card: "border-orange-100 bg-orange-50/80",
        label: "text-orange-600",
        badge: "bg-orange-100 text-orange-700",
      };
    }
    if (value.includes("낮")) {
      return {
        card: "border-emerald-100 bg-emerald-50/80",
        label: "text-emerald-600",
        badge: "bg-emerald-100 text-emerald-700",
      };
    }
    return {
      card: "border-sky-100 bg-sky-50/80",
      label: "text-sky-600",
      badge: "bg-sky-100 text-sky-700",
    };
  }

  const normalized = normalizeExampleSufficiency(value);
  if (normalized === "충분") {
    return {
      card: "border-emerald-100 bg-emerald-50/80",
      label: "text-emerald-600",
      badge: "bg-emerald-100 text-emerald-700",
    };
  }
  if (normalized === "보완 필요") {
    return {
      card: "border-amber-100 bg-amber-50/80",
      label: "text-amber-600",
      badge: "bg-amber-100 text-amber-700",
    };
  }
  return {
    card: "border-blue-100 bg-blue-50/80",
    label: "text-[#0F5FD7]",
    badge: "bg-blue-100 text-blue-700",
  };
}
