import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useThemeColors } from './src/context/ThemeContext';
import { ToastProvider } from './src/components/ui/ToastProvider';
import { RoleHeader } from './src/components/RoleHeader';
import { AdminDashboard } from './src/screens/admin/AdminDashboard';
import { AgentDashboard } from './src/screens/agent/AgentDashboard';
import { CustomerDashboard } from './src/screens/customer/CustomerDashboard';
import { LoginScreen } from './src/screens/LoginScreen';
import { ReceiptModal } from './src/components/ReceiptModal';
import { CollectionRecord } from './src/types';

function MainAppContent() {
  const { isAuthenticated, currentRole, login } = useAuth();
  const [selectedReceipt, setSelectedReceipt] = useState<CollectionRecord | null>(null);
  const { colors } = useThemeColors();

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.primaryDark }]}>
        <RNStatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
        <StatusBar style="light" />
        <LoginScreen onLogin={login} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.primaryDark }]}>
      <RNStatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <StatusBar style="light" />
      <RoleHeader />

      <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
        {currentRole === 'ADMIN' && (
          <AdminDashboard onSelectReceipt={(rec) => setSelectedReceipt(rec)} />
        )}
        {currentRole === 'AGENT' && (
          <AgentDashboard onSelectReceipt={(rec) => setSelectedReceipt(rec)} />
        )}
        {currentRole === 'CUSTOMER' && (
          <CustomerDashboard onSelectReceipt={(rec) => setSelectedReceipt(rec)} />
        )}
      </View>

      <ReceiptModal
        visible={!!selectedReceipt}
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <NavigationContainer>
              <MainAppContent />
            </NavigationContainer>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: RNStatusBar.currentHeight || 0,
  },
  screenContainer: {
    flex: 1,
  },
});
