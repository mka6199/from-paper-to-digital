import React from 'react';
import { View, Text } from 'react-native';

type Props = {
  title: string;
  value: string | number;
};

const KPICard: React.FC<Props> = ({ title, value }) => {
  return (
    <View
      style={{
        flex: 1,
        padding: 16,
        borderRadius: 16,
        backgroundColor: '#fff',
        elevation: 2,
        margin: 6,
      }}
    >
      <Text style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>{title}</Text>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>{String(value)}</Text>
    </View>
  );
};

export default KPICard;
