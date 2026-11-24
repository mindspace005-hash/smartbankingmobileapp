import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  ShieldAlert,
  BookOpenCheck,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useThemeColors } from '../../context/ThemeContext';
import {
  CollectionRecord,
  ManagerBranchId,
  ManagerCommandPayload,
} from '../../types';
import { ManagerDashboardProvider } from './ManagerDashboardContext';
import { ManagerOverviewTab } from './tabs/ManagerOverviewTab';
import { ManagerApprovalsTab } from './tabs/ManagerApprovalsTab';
import { ManagerAgentsTab } from './tabs/ManagerAgentsTab';
import { ManagerRiskTab } from './tabs/ManagerRiskTab';
import { ManagerDaybookTab } from './tabs/ManagerDaybookTab';

interface AdminDashboardProps {
  onSelectReceipt: (receipt: CollectionRecord) => void;
}

const Tab = createBottomTabNavigator();

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSelectReceipt }) => {
  const {
    isDemoMode,
    fetchManagerCommandData,
    collections,
    accounts,
    managerApprovals,
    managerAgents,
  } = useAuth();
  const { colors } = useThemeColors();

  const [selectedBranchId, setSelectedBranchId] = useState<ManagerBranchId>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ManagerCommandPayload | null>(null);

  const fetchRef = useRef(fetchManagerCommandData);
  fetchRef.current = fetchManagerCommandData;

  const reloadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const payload = await fetchRef.current(selectedBranchId);
      setData(payload);
    } finally {
      setRefreshing(false);
    }
  }, [selectedBranchId]);

  // Keep Manager data cleanly synchronized without triggering pull-to-refresh flicker or Live loops
  const demoCollectionsCount = isDemoMode ? collections.length : 0;
  const demoAccountsCount = isDemoMode ? accounts.length : 0;

  useEffect(() => {
    let mounted = true;
    fetchRef.current(selectedBranchId)
      .then((payload) => {
        if (mounted) setData(payload);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [selectedBranchId, isDemoMode, demoCollectionsCount, demoAccountsCount, managerApprovals, managerAgents]);

  const pendingApprovalsCount = useMemo(
    () => (data?.approvals || []).filter((a) => a.status === 'PENDING').length,
    [data?.approvals]
  );

  const contextValue = useMemo(
    () => ({
      selectedBranchId,
      setSelectedBranchId,
      refreshing,
      reloadData,
      data,
      pendingApprovalsCount,
      onSelectReceipt,
    }),
    [selectedBranchId, refreshing, reloadData, data, pendingApprovalsCount, onSelectReceipt]
  );

  return (
    <ManagerDashboardProvider value={contextValue}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: colors.primaryDark,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            height: 62,
            paddingBottom: 7,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 10.5,
            fontWeight: '800',
          },
        }}
      >
        <Tab.Screen
          name="ManagerOverview"
          component={ManagerOverviewTab}
          options={{
            tabBarLabel: 'सारांश',
            tabBarIcon: ({ color, size }) => <LayoutDashboard size={size - 3} color={color} />,
          }}
        />
        <Tab.Screen
          name="ManagerApprovals"
          component={ManagerApprovalsTab}
          options={{
            tabBarLabel: 'मंजुरी',
            tabBarBadge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: colors.danger,
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '800',
            },
            tabBarIcon: ({ color, size }) => <ClipboardCheck size={size - 3} color={color} />,
          }}
        />
        <Tab.Screen
          name="ManagerAgents"
          component={ManagerAgentsTab}
          options={{
            tabBarLabel: 'एजंट',
            tabBarIcon: ({ color, size }) => <Users size={size - 3} color={color} />,
          }}
        />
        <Tab.Screen
          name="ManagerRisk"
          component={ManagerRiskTab}
          options={{
            tabBarLabel: 'थकबाकी',
            tabBarIcon: ({ color, size }) => <ShieldAlert size={size - 3} color={color} />,
          }}
        />
        <Tab.Screen
          name="ManagerDaybook"
          component={ManagerDaybookTab}
          options={{
            tabBarLabel: 'रोजमेळ',
            tabBarIcon: ({ color, size }) => <BookOpenCheck size={size - 3} color={color} />,
          }}
        />
      </Tab.Navigator>
    </ManagerDashboardProvider>
  );
};
