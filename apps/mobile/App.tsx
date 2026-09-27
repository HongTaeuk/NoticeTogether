/**
 * NoticeTogether
 * PRD 1~10단계 MVP
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import NoticeInputScreen from './src/screens/NoticeInputScreen';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingIntroScreen from './src/screens/OnboardingIntroScreen';
import HouseholdSetupScreen from './src/screens/HouseholdSetupScreen';
import { authFetch } from './src/lib/apiClient';
import { clearSession, loadSession, saveSession, type Session } from './src/lib/authStorage';

type Screen = 'loading' | 'auth' | 'onboarding-intro' | 'household-setup' | 'main';

function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await loadSession();
      if (!stored) {
        setScreen('auth');
        return;
      }
      await refreshHouseholdState(stored);
    })();
  }, []);

  // PRD 5-2 분기 5: 배우자가 아직 없으면(보호자 1명뿐이면) 목록 대신 초대 화면을 채운다.
  async function refreshHouseholdState(current: Session) {
    try {
      const res = await authFetch(current.accessToken, '/api/auth/me');
      if (!res.ok) {
        // 토큰이 만료/무효화된 경우 다시 로그인하도록 한다.
        await clearSession();
        setSession(null);
        setScreen('auth');
        return;
      }
      const data = await res.json();
      const updated: Session = {
        ...current,
        role: data.user.role,
        householdId: data.household.id,
        inviteCode: data.household.inviteCode,
      };
      await saveSession(updated);
      setSession(updated);
      setScreen((data.members?.length ?? 1) < 2 ? 'household-setup' : 'main');
    } catch {
      setSession(current);
      setScreen('main');
    }
  }

  async function handleAuthed(newSession: Session, isNewSignup: boolean) {
    await saveSession(newSession);
    setSession(newSession);
    if (isNewSignup) {
      // PRD 5-4: 최초 가입 직후에만 "배너 미리보기 ≠ 확인" 온보딩 안내를 보여준다.
      setScreen('onboarding-intro');
      return;
    }
    await refreshHouseholdState(newSession);
  }

  async function handleLogout() {
    await clearSession();
    setSession(null);
    setScreen('auth');
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        {screen === 'loading' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#1B64F2" size="large" />
          </View>
        )}
        {screen === 'auth' && <AuthScreen onAuthed={handleAuthed} />}
        {screen === 'household-setup' && session && (
          <HouseholdSetupScreen
            session={session}
            onJoined={(update) => {
              const merged = { ...session, ...update };
              setSession(merged);
              saveSession(merged);
              setScreen('main');
            }}
            onContinue={() => setScreen('main')}
          />
        )}
        {screen === 'main' && session && (
          <NoticeInputScreen session={session} onLogout={handleLogout} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
