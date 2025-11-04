import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { addIncome } from '../../services/income';

export default function AddIncomeScreen({ navigation }: any) {
  const [source, setSource] = useState('Client Payment');
  const [amount, setAmount] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0,10));
  const [notes, setNotes] = useState('');

  async function onSave() {
    const date = new Date(dateStr).getTime();
    const amt = parseFloat(amount);
    if (!source || !amt || !date) {
      Alert.alert('Missing info', 'Please fill source, amount, and date.');
      return;
    }
    try {
      await addIncome({ source, amount: amt, date, notes });
      Alert.alert('Saved', 'Income recorded.');
      navigation.goBack();
    } catch (e:any) {
      Alert.alert('Error', e.message || 'Failed to save income');
    }
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text>Source</Text>
      <TextInput value={source} onChangeText={setSource} placeholder="e.g. Invoice 1023" style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10 }} />
      <Text>Amount (AED)</Text>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10 }} />
      <Text>Date</Text>
      <TextInput value={dateStr} onChangeText={setDateStr} placeholder="YYYY-MM-DD" style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10 }} />
      <Text>Notes</Text>
      <TextInput value={notes} onChangeText={setNotes} placeholder="optional" style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10 }} />
      <Button title="Save Income" onPress={onSave} />
    </View>
  );
}
