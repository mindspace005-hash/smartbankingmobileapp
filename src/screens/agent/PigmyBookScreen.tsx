import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useAuth } from '../../context/AuthContext';
import { useThemeColors, ThemeColors } from '../../context/ThemeContext';

type FilterOption = 'Last Month' | 'This Month' | 'Last 7 Days' | 'Today';

interface DailySummary {
  date: string;
  customers: number;
  amount: number;
}

export const PigmyBookScreen = () => {
  const { colors } = useThemeColors();
  const styles = getStyles(colors);

  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false;

  const [filter, setFilter] = useState<FilterOption>('Last Month');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  
  // Real data state
  const [data, setData] = useState<DailySummary[]>([]);
  const [totalCollection, setTotalCollection] = useState(0);

  const filterOptions: FilterOption[] = ['Today', 'Last 7 Days', 'This Month', 'Last Month'];
  
  const { collections } = useAuth();

  useEffect(() => {
    if (filter === 'Today') {
      const todayStr = new Date().toLocaleDateString();
      const todayCollections = collections.filter(c => c.timestamp.startsWith(todayStr));
      
      let sum = 0;
      const uniqueCustomers = new Set<string>();
      
      todayCollections.forEach(c => {
        sum += c.amount;
        uniqueCustomers.add(String(c.accountId));
      });
      
      setTotalCollection(sum);
      setData(todayCollections.length > 0 ? [{
        date: todayStr,
        customers: uniqueCustomers.size,
        amount: sum
      }] : []);
    } else {
      // Placeholder for future API calls
      setTotalCollection(0);
      setData([]);
    }
  }, [filter, collections]);

  const renderItem = ({ item }: { item: DailySummary }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.cell, styles.cellDate]}>{item.date}</Text>
      <Text style={[styles.cell, styles.cellCustomers]}>{item.customers}</Text>
      <Text style={[styles.cell, styles.cellAmount]}>{item.amount}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.summaryContainer}>
        {/* Dropdown Row */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Show Collection of:-</Text>
          <TouchableOpacity 
            style={styles.dropdownBtn}
            onPress={() => setIsFilterModalVisible(true)}
          >
            <Text style={styles.dropdownText}>{filter}</Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Total Row */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Collection: </Text>
          <Text style={styles.totalValue}>₹{totalCollection}</Text>
        </View>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeaderText, styles.cellDate]}>Collected Date</Text>
        <Text style={[styles.tableHeaderText, styles.cellCustomers]}>Customers</Text>
        <Text style={[styles.tableHeaderText, styles.cellAmount]}>Amount</Text>
      </View>

      {/* Table Body */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.date}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, data.length === 0 && styles.emptyListContent]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isOffline && filter !== 'Today' 
                ? "You are offline.\nPlease connect to the internet to see historical data." 
                : "No data available for the selected period."}
            </Text>
          </View>
        }
      />

      {/* Simple Modal for Dropdown Selection */}
      <Modal visible={isFilterModalVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsFilterModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {filterOptions.map((opt) => (
              <TouchableOpacity 
                key={opt}
                style={styles.modalOption}
                onPress={() => {
                  setFilter(opt);
                  setIsFilterModalVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, filter === opt && styles.modalOptionSelected]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  summaryContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginRight: 8,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  dropdownText: {
    fontSize: 14,
    color: '#4B5563',
    marginRight: 4,
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: (colors as any).primaryDark || '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cell: {
    fontSize: 15,
    color: '#111827',
  },
  cellDate: {
    flex: 1.5,
    textAlign: 'left',
  },
  cellCustomers: {
    flex: 1.2,
    textAlign: 'center',
  },
  cellAmount: {
    flex: 1.3,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    width: '80%',
    padding: 16,
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
  modalOptionSelected: {
    fontWeight: 'bold',
    color: colors.primary,
  }
});
