import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { useThemeColors } from '../../context/ThemeContext';
import { RADIUS } from '../../theme/tokens';

export interface BarDatum {
  label: string;
  value: number;
}

interface DailyBarChartProps {
  title: string;
  data: BarDatum[];
  accentColor?: string;
}

export const DailyBarChart: React.FC<DailyBarChartProps> = ({ title, data, accentColor }) => {
  const { colors } = useThemeColors();
  const barColor = accentColor || colors.primary;

  if (!data || data.length === 0) {
    return null;
  }

  const sliced = data.slice(-7);
  const maxVal = Math.max(...sliced.map((d) => d.value), 1);
  const chartWidth = 310;
  const chartHeight = 128;
  const plotHeight = 86;
  const topPad = 18;
  const slotWidth = chartWidth / sliced.length;
  const barWidth = Math.min(28, slotWidth * 0.56);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.svgWrap}>
        <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <Line
            x1="0"
            y1={topPad + plotHeight}
            x2={chartWidth}
            y2={topPad + plotHeight}
            stroke={colors.border}
            strokeWidth="1"
          />
          {sliced.map((item, idx) => {
            const ratio = item.value / maxVal;
            const h = Math.max(4, Math.round(ratio * plotHeight));
            const x = idx * slotWidth + (slotWidth - barWidth) / 2;
            const y = topPad + plotHeight - h;
            const shortVal =
              item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : `${Math.round(item.value)}`;
            return (
              <React.Fragment key={`${item.label}_${idx}`}>
                <SvgText
                  x={x + barWidth / 2}
                  y={Math.max(11, y - 5)}
                  fontSize="9.5"
                  fontWeight="700"
                  fill={colors.textSecondary}
                  textAnchor="middle"
                >
                  {shortVal}
                </SvgText>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  rx={6}
                  fill={barColor}
                  opacity={0.9}
                />
                <SvgText
                  x={x + barWidth / 2}
                  y={topPad + plotHeight + 15}
                  fontSize="9.5"
                  fontWeight="600"
                  fill={colors.textMuted}
                  textAnchor="middle"
                >
                  {item.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  svgWrap: {
    alignItems: 'center',
  },
});
