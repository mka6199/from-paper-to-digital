
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import KPICard from '../../components/dashboard/KPICard';
import { monthStartEnd, formatMoney } from '../../utils/date';
import { getMonthlyStats } from '../../services/stats';

export default function DashboardKPIs() {
  const [{ payrollOut, cashIn, net }, setStats] = useState({ payrollOut: 0, cashIn: 0, net: 0 });

  useEffect(() => {
    const { startMs, endMs } = monthStartEnd(new Date());
    getMonthlyStats(startMs, endMs).then(setStats).catch(() => {});
  }, []);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
      <KPICard title="Cash In (month)" value={formatMoney(cashIn)} />
      <KPICard title="Payroll Out (month)" value={formatMoney(payrollOut)} />
      <KPICard title="Net (month)" value={formatMoney(net)} />
    </View>
  );
}
