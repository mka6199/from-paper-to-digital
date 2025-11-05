import React from 'react';
import { Text, TextProps } from 'react-native';
import { useCurrency } from '../context/CurrencyProvider';

type Props = TextProps & {
  amountAED: number;          // stored/base amount in AED
  asPlainString?: boolean;    // if true, return null Text and give back only string via children? (not needed now)
  to?: undefined | Parameters<ReturnType<typeof useCurrency>['format']>[1];
};

export default function Money({ amountAED, to, ...textProps }: Props) {
  const { format } = useCurrency();
  const display = format(amountAED, to);
  return <Text {...textProps}>{display}</Text>;
}
