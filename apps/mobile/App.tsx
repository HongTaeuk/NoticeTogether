/**
 * NoticeTogether
 * PRD 1~2단계 MVP: 알림 텍스트 붙여넣기 → AI 요약/체크리스트 + 원문 보기 토글
 *
 * @format
 */

import { StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import NoticeInputScreen from './src/screens/NoticeInputScreen';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <NoticeInputScreen />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
