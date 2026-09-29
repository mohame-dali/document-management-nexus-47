export function getRelativeTime(date: string | Date): string {
  const now = new Date().getTime();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 172800) return 'أمس';
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} أيام`;
  return new Date(date).toLocaleDateString('ar-TN');
}

export function getDateGroup(date: string | Date): 'today' | 'yesterday' | 'older' {
  const now = new Date();
  const then = new Date(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thenDay = new Date(then.getFullYear(), then.getMonth(), then.getDate());

  if (thenDay.getTime() === today.getTime()) return 'today';
  if (thenDay.getTime() === yesterday.getTime()) return 'yesterday';
  return 'older';
}
