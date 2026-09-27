/**
 * NoticeTogether
 * PRD 1~10단계 MVP — 가입은 선택 사항(익명으로 바로 시작, 나중에 계정으로 승격 가능)
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import NoticeInputScreen from './src/screens/NoticeInputScreen';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingIntroScreen from './src/screens/OnboardingIntroScreen';
import HouseholdSetupScreen from './src/screens/HouseholdSetupScreen';
import NetworkBanner from './src/components/NetworkBanner';
import { API_BASE_URL } from './src/config/api';
import { authFetch, getCurrentTokens, setAuthTokens, setOnSessionExpired } from './src/lib/apiClient';
import { clearSession, loadSession, saveSession, type Session } from './src/lib/authStorage';

type Screen = 'loading' | 'auth' | 'onboarding-intro' | 'household-setup' | 'main';

function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setOnSessionExpired(() => {
      handleSessionExpired();
    });

    (async () => {
      const stored = await loadSession();
      if (!stored) {
        // 가입은 필수가 아니다 — 세션이 없으면 로그인 화면 대신 바로 익명 계정을 만들어 쓴다.
        await startAnonymousSession(true);
        return;
      }
      setAuthTokens({ accessToken: stored.accessToken, refreshToken: stored.refreshToken });
      await refreshHouseholdState(stored);
    })();

    return () => setOnSessionExpired(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startAnonymousSession(isFirstLaunch: boolean) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/anonymous`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? '시작하지 못했습니다.');
      const newSession: Session = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        userId: data.user.id,
        role: data.user.role,
        displayName: data.user.displayName ?? null,
        householdId: data.household.id,
        inviteCode: data.household.inviteCode,
        isAnonymous: true,
      };
      setAuthTokens({ accessToken: newSession.accessToken, refreshToken: newSession.refreshToken });
      await saveSession(newSession);
      setSession(newSession);
      // PRD 5-4: 최초 실행 때만 "배너 미리보기 ≠ 확인" 온보딩 안내를 보여준다.
      setScreen(isFirstLaunch ? 'onboarding-intro' : 'main');
    } catch {
      // 네트워크 문제 등으로 익명 세션조차 못 만들면, 이메일로라도 가입해서 시작할 수 있게 한다.
      setSession(null);
      setScreen('auth');
    }
  }

  async function handleSessionExpired() {
    // refreshToken까지 무효화된 경우(예: 오래 방치) — 로그인 화면에 가두지 않고
    // 새 익명 세션으로 계속 쓰게 한다(가입이 필수가 아니라는 원칙을 여기서도 지킨다).
    await clearSession();
    setSession(null);
    await startAnonymousSession(false);
  }

  // PRD 5-2 분기 5: 배우자가 아직 없으면(보호자 1명뿐이면) 목록 대신 초대 화면을 채운다.
  async function refreshHouseholdState(current: Session) {
    try {
      const res = await authFetch('/api/auth/me');
      if (!res.ok) {
        await handleSessionExpired();
        return;
      }
      const data = await res.json();
      const tokens = getCurrentTokens();
      const updated: Session = {
        ...current,
        accessToken: tokens?.accessToken ?? current.accessToken,
        refreshToken: tokens?.refreshToken ?? current.refreshToken,
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
    setAuthTokens({ accessToken: newSession.accessToken, refreshToken: newSession.refreshToken });
    await saveSession(newSession);
    setSession(newSession);
    if (isNewSignup) {
      setScreen('onboarding-intro');
      return;
    }
    await refreshHouseholdState(newSession);
  }

  async function handleLogout() {
    // 정식(비익명) 계정만 도달하는 경로 — 로그아웃 후에도 가입 화면에 가두지 않고
    // 바로 새 익명 세션으로 돌아가 앱을 계속 쓸 수 있게 한다.
    await clearSession();
    setSession(null);
    await startAnonymousSession(false);
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <NetworkBanner />
        {screen === 'loading' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#1B64F2" size="large" />
            <Text style={{ marginTop: 12, fontSize: 13, color: '#3D5A9C' }}>
              불러오는 중이에요
            </Text>
          </View>
        )}
        {screen === 'auth' && (
          <AuthScreen
            isUpgrade={session?.isAnonymous ?? false}
            onAuthed={handleAuthed}
            onBack={session ? () => setScreen('main') : undefined}
          />
        )}
        {screen === 'onboarding-intro' && session && (
          <OnboardingIntroScreen onNext={() => refreshHouseholdState(session)} />
        )}
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
          <NoticeInputScreen
            session={session}
            onLogout={handleLogout}
            onManageHousehold={() => setScreen('household-setup')}
            onManageAccount={() => setScreen('auth')}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
