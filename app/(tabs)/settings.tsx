import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { Badge, Button, Card, ConfigBanner, Screen, TextField } from '@/components/ui';
import { useSession, useSignInWithEmail, useSignInWithOAuth, useSignOut } from '@/features/auth/hooks';
import { useScheduleReminders } from '@/features/notifications/hooks';
import { shareUrl, useCreateShare, useRevokeShare, useShares } from '@/features/sharing/hooks';
import { useTasks } from '@/features/tasks/hooks';

export default function SettingsScreen() {
  const { session } = useSession();
  const signIn = useSignInWithEmail();
  const oauth = useSignInWithOAuth();
  const signOut = useSignOut();
  const schedule = useScheduleReminders();
  const { data: tasks = [] } = useTasks(false);
  const { data: shares = [] } = useShares();
  const createShare = useCreateShare();
  const revokeShare = useRevokeShare();

  const [email, setEmail] = useState('');
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  async function copy(text: string) {
    try {
      await Clipboard.setStringAsync(text);
    } catch {
      // ignore
    }
  }

  return (
    <Screen>
      <Text className="text-2xl font-bold text-leaf-900">Settings</Text>
      <ConfigBanner />

      {/* Account (Phase 2) */}
      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-leaf-900">Account</Text>
          <Badge tone={session ? 'leaf' : 'gray'} label={session ? 'Signed in' : 'Phase 2'} />
        </View>
        {session ? (
          <View className="gap-2">
            <Text className="text-sm text-leaf-700">{session.user.email}</Text>
            <Button title="Sign out" variant="secondary" onPress={() => signOut.mutate()} />
          </View>
        ) : (
          <View className="gap-2">
            <Text className="text-sm text-leaf-600">
              Sign-in is optional in Phase 1 — your data uses a single local profile. Add auth
              (magic link or OAuth) to sync across devices.
            </Text>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button
              title={signIn.isSuccess ? 'Magic link sent ✓' : 'Send magic link'}
              onPress={() => signIn.mutate(email)}
              loading={signIn.isPending}
              disabled={!email.includes('@')}
            />
            <View className="flex-row gap-2">
              <Button
                title=" Apple"
                variant="secondary"
                onPress={() => oauth.mutate('apple')}
                fullWidth
              />
              <Button
                title="Google"
                variant="secondary"
                onPress={() => oauth.mutate('google')}
                fullWidth
              />
            </View>
            {signIn.isError ? (
              <Text className="text-red-600 text-xs">
                Couldn't send the link. Enable email auth in Supabase first.
              </Text>
            ) : null}
          </View>
        )}
      </Card>

      {/* Notifications (Phase 3) */}
      <Card className="gap-3">
        <Text className="font-semibold text-leaf-900">Notifications</Text>
        <Text className="text-sm text-leaf-600">
          Schedule an 8am local reminder for tasks that are due.
          {Platform.OS === 'web' ? ' (Native only — use the email digest on web.)' : ''}
        </Text>
        <Button
          title="Schedule due reminders"
          variant="secondary"
          disabled={Platform.OS === 'web'}
          loading={schedule.isPending}
          onPress={() =>
            schedule.mutate(tasks, {
              onSuccess: (count) => setReminderMsg(`Scheduled ${count} reminder(s).`),
            })
          }
        />
        {reminderMsg ? <Text className="text-leaf-600 text-sm">{reminderMsg}</Text> : null}
      </Card>

      {/* Sharing (Phase 5) */}
      <Card className="gap-3">
        <Text className="font-semibold text-leaf-900">Sharing</Text>
        <Text className="text-sm text-leaf-600">
          Create a read-only link to your schedule, or a temporary caretaker link for when you're
          away.
        </Text>
        <View className="flex-row gap-2">
          <Button
            title="Read-only link"
            size="sm"
            onPress={() => createShare.mutate({ kind: 'read_only' })}
            loading={createShare.isPending}
          />
          <Button
            title="Caretaker (7d)"
            size="sm"
            variant="secondary"
            onPress={() => createShare.mutate({ kind: 'caretaker', expiresInDays: 7 })}
          />
        </View>
        {shares.map((s) => (
          <View key={s.id} className="bg-leaf-50 rounded-xl p-3 gap-1">
            <View className="flex-row items-center justify-between">
              <Badge tone={s.kind === 'caretaker' ? 'amber' : 'leaf'} label={s.kind} />
              {s.expires_at ? (
                <Text className="text-xs text-leaf-500">
                  expires {s.expires_at.slice(0, 10)}
                </Text>
              ) : null}
            </View>
            <Text className="text-xs text-leaf-700" selectable>
              {shareUrl(s.token)}
            </Text>
            <View className="flex-row gap-2">
              <Button title="Copy" size="sm" variant="ghost" onPress={() => copy(shareUrl(s.token))} />
              <Button
                title="Revoke"
                size="sm"
                variant="ghost"
                onPress={() => revokeShare.mutate(s.id)}
              />
            </View>
          </View>
        ))}
      </Card>

      <Card className="gap-1">
        <Text className="font-semibold text-leaf-900">About</Text>
        <Text className="text-sm text-leaf-600">Thymely · garden care on schedule</Text>
        <Text className="text-xs text-leaf-400">Version 1.0.0</Text>
      </Card>
    </Screen>
  );
}
