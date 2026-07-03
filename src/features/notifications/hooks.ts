import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';

import type { TaskWithRelations } from '@/lib/types';
import { daysOverdue } from '@/lib/recurrence';

/**
 * Local notifications for due tasks.
 *
 * Uses `expo-notifications` on native. On web, the Notifications API differs and
 * requires HTTPS + user permission; we no-op there for now (email digest via the
 * Supabase Edge Function covers web/cross-device — see supabase/functions).
 *
 * We import expo-notifications lazily so the web bundle doesn't pull in native
 * modules it can't use.
 */
async function getNotifications() {
  if (Platform.OS === 'web') return null;
  const Notifications = await import('expo-notifications');
  return Notifications;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/**
 * Schedule a morning reminder for every task that is currently due/overdue.
 * Returns the number of notifications scheduled.
 */
export async function scheduleDueTaskReminders(
  tasks: TaskWithRelations[],
  hour = 8,
): Promise<number> {
  const Notifications = await getNotifications();
  if (!Notifications) return 0;

  const granted = await requestNotificationPermission();
  if (!granted) return 0;

  // Clear previously scheduled reminders to avoid duplicates.
  await Notifications.cancelAllScheduledNotificationsAsync();

  const due = tasks.filter((t) => t.active && daysOverdue(t.next_due_date) >= 0);
  const trigger = new Date();
  trigger.setHours(hour, 0, 0, 0);
  if (trigger.getTime() <= Date.now()) {
    trigger.setDate(trigger.getDate() + 1);
  }

  for (const task of due) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌿 Thymely',
        body: `${task.title}${task.plants.length ? ` — ${task.plants.map((p) => p.name).join(', ')}` : ''}`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
    });
  }
  return due.length;
}

export function useScheduleReminders() {
  return useMutation({
    mutationFn: async (tasks: TaskWithRelations[]) => scheduleDueTaskReminders(tasks),
  });
}
