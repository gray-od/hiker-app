export function getSeasonBadgeClass(season: string): string {
  if (season === 'winter') return 'bg-[#6db3ff]/20 text-[#2563eb] dark:bg-[#6db3ff]/10 dark:text-[#6db3ff]';
  if (season === 'summer') return 'bg-[#ffec6d]/20 text-[#b8960f] dark:bg-[#ffec6d]/10 dark:text-[#ffec6d]';
  return 'bg-[#f5a623]/20 text-[#c2841a] dark:bg-[#f5a623]/10 dark:text-[#f5a623]';
}

export function getPlanTypeBadgeClass(planType: string): string {
  if (planType === 'comfort') return 'bg-[#ffec6d]/20 text-[#b8960f] dark:bg-[#ffec6d]/10 dark:text-[#ffec6d]';
  if (planType === 'ultralight') return 'bg-[#6db3ff]/20 text-[#2563eb] dark:bg-[#6db3ff]/10 dark:text-[#6db3ff]';
  return 'bg-[#75a93a]/20 text-[#75a93a] dark:bg-[#75a93a]/10 dark:text-[#75a93a]';
}
