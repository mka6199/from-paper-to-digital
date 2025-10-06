// App.tsx
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { addWorker, listWorkers, Worker } from './src/services/workers';

export default function App() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('3000');

  async function load() {
    try {
      const rows = await listWorkers();
      setWorkers(rows);
    } catch (e: any) {
      Alert.alert('Load error', e.message ?? String(e));
    }
  }

  async function onAdd() {
    if (!name || !role) return Alert.alert('Missing', 'Name and role are required');
    try {
      await addWorker({ name, role, monthlySalaryAED: Number(salary) || 0 });
      setName(''); setRole('');
      load();
    } catch (e: any) {
      Alert.alert('Add error', e.message ?? String(e));
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F5EF' }}>
      <View style={{ padding: 16 }}>

        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Add Worker (Firestore test)</Text>

        <TextInput
          placeholder="Name (e.g., Michael)"
          value={name} onChangeText={setName}
          style={{ height: 42, backgroundColor:'#fff', borderRadius: 8, paddingHorizontal: 12, marginBottom: 8 }}
        />
        <TextInput
          placeholder="Role (e.g., Driver)"
          value={role} onChangeText={setRole}
          style={{ height: 42, backgroundColor:'#fff', borderRadius: 8, paddingHorizontal: 12, marginBottom: 8 }}
        />
        <TextInput
          placeholder="Monthly Salary (AED)"
          value={salary} onChangeText={setSalary} keyboardType="numeric"
          style={{ height: 42, backgroundColor:'#fff', borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 }}
        />

        <Pressable onPress={onAdd} style={({pressed})=>({
          height: 48, borderRadius: 10, alignItems:'center', justifyContent:'center',
          backgroundColor: pressed ? '#14532D' : '#166534'
        })}>
          <Text style={{ color:'#fff', fontWeight: '700' }}>Add to Firestore</Text>
        </Pressable>

        <View style={{ height: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Workers</Text>

        <FlatList
          data={workers}
          keyExtractor={(w)=>w.id!}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <View style={{ backgroundColor:'#fff', borderRadius: 10, padding: 12 }}>
              <Text style={{ fontWeight:'700' }}>{item.name}</Text>
              <Text style={{ color:'#6B7280' }}>{item.role} • {item.monthlySalaryAED} AED</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
