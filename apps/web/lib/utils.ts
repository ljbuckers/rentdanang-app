const VND_USD_RATE = 25500;

export function formatVND(amount: number | null): string {
  if (!amount) return "N/A";
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `₫${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)} triệu`;
  }
  return `₫${amount.toLocaleString("vi-VN")}`;
}

export function formatUSD(amount: number | null): string {
  if (!amount) return "";
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

export function vndToUsd(vnd: number): number {
  return Math.round(vnd / VND_USD_RATE);
}

export function formatPrice(
  priceVnd: number | null,
  priceUsd: number | null
): string {
  if (!priceVnd && !priceUsd) return "Contact for price";
  const vnd = priceVnd ? formatVND(priceVnd) : "";
  const usd = priceUsd
    ? formatUSD(priceUsd)
    : priceVnd
      ? formatUSD(vndToUsd(priceVnd))
      : "";
  if (vnd && usd) return `${vnd} (~${usd}/mo)`;
  return vnd || usd;
}

export function formatPhone(phone: string | null): string {
  if (!phone) return "";
  const clean = phone.replace(/[\s.\-]/g, "");
  if (clean.startsWith("0") && clean.length === 10) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  return phone;
}

export function phoneToTel(phone: string | null): string {
  if (!phone) return "";
  const clean = phone.replace(/[\s.\-]/g, "");
  if (clean.startsWith("0")) {
    return `+84${clean.slice(1)}`;
  }
  return clean;
}

export function phoneToZalo(phone: string | null): string {
  if (!phone) return "";
  const clean = phone.replace(/[\s.\-]/g, "");
  return `https://zalo.me/${clean}`;
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isNew(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return now.getTime() - date.getTime() < 24 * 60 * 60 * 1000;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    facebook: "#1877F2",
    airbnb: "#FF5A5F",
    chotot: "#FFBA00",
    batdongsan: "#E03C31",
    dotproperty: "#00B14F",
    fazwaz: "#FF6600",
    agency: "#6366F1",
    telegram: "#26A5E4",
  };
  return colors[source] || "#6B7280";
}

export function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    facebook: "Facebook",
    airbnb: "Airbnb",
    chotot: "Cho Tot",
    batdongsan: "Batdongsan",
    dotproperty: "Dot Property",
    fazwaz: "FazWaz",
    agency: "Agency",
    telegram: "Telegram",
  };
  return labels[source] || source;
}

export function getAmenityLabel(amenity: string): string {
  const labels: Record<string, string> = {
    swimming_pool: "Pool",
    gym: "Gym",
    balcony: "Balcony",
    ocean_view: "Ocean View",
    river_view: "River View",
    parking: "Parking",
    elevator: "Elevator",
    washing_machine: "Washer",
    kitchen: "Kitchen",
    air_conditioning: "AC",
    water_heater: "Hot Water",
    wifi: "WiFi",
    cleaning_service: "Cleaning",
    "24h_security": "24h Security",
    pet_friendly: "Pet Friendly",
  };
  return labels[amenity] || amenity;
}
