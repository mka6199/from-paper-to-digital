import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button } from 'react-native';
import { listIncomes } from '../../services/income';
import { monthStartEnd, formatMoney } from '../../utils/date';
import type { Income } from '../../types/models';

export default function IncomeListScreen({ navigation }: any) {
  const [items, setItems] = useState<Income[]>([]);

  async function load() {
    const { startMs, endMs } = monthStartEnd(new Date());
    const data = await listIncomes(startMs, endMs);
    setItems(data);
  }

  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex:1 }}>
      <View style={{ padding: 12 }}>
        <Button title="Add Income" onPress={() => navigation.navigate('AddIncome')} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text style={{ fontWeight: '700' }}>{item.source}</Text>
            <Text>{new Date(item.date).toDateString()}</Text>
            <Text>{formatMoney(item.amount)}</Text>
            {item.notes ? <Text style={{ color:'#555' }}>{item.notes}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}
