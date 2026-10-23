// DriverDost Driver App — React Native (Expo)
// Run in production: npx create-expo-app, copy this file + screens/, set API_URL.
import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, Switch } from 'react-native';
const API_URL = 'http://localhost:4000';
export default function App() {
  const [online, setOnline] = useState(true);
  const [bookings, setBookings] = useState([]);
  const load = () => fetch(`${API_URL}/api/bookings`).then(r => r.json()).then(setBookings).catch(()=>{});
  useEffect(load, []);
  const act = (id, a) => fetch(`${API_URL}/api/bookings/${id}/${a}`, { method: 'POST' }).then(load);
  return (<View style={{ padding: 24 }}>
    <Text style={{ fontSize: 24, fontWeight: '700' }}>DriverDost Driver</Text>
    <Text>Verified ✓ Licence ✓ Background Check ✓</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text>Online</Text><Switch value={online} onValueChange={setOnline} /></View>
    <FlatList data={bookings} keyExtractor={b => String(b.id)}
      renderItem={({ item }) => (<View style={{ padding: 12, borderWidth: 1, marginVertical: 6 }}>
        <Text>{item.serviceType} — {item.pickup} · Earn ₹{item.driverEarnings} · {item.status}</Text>
        <Button title="Arrived" onPress={() => act(item.id, 'arrived')} />
        <Button title="Start Trip" onPress={() => act(item.id, 'start')} />
        <Button title="Complete Trip" onPress={() => act(item.id, 'complete')} />
      </View>)} />
  </View>);
}
