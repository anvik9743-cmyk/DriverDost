// DriverDost Customer App — React Native (Expo)
import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
const API_URL = 'http://localhost:4000';
export default function App() {
  const [pickup, setPickup] = useState(''); const [hours, setHours] = useState('3'); const [msg, setMsg] = useState('');
  const book = () => fetch(`${API_URL}/api/bookings`, { method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ pickup, hours: Number(hours), serviceType: 'Hourly', transmission: 'Manual' }) })
    .then(r => r.json()).then(b => setMsg(`Booking #${b.id}: ${b.status} — ₹${b.total}`)).catch(e => setMsg(String(e)));
  return (<View style={{ padding: 24 }}>
    <Text style={{ fontSize: 24, fontWeight: '700' }}>DriverDost</Text>
    <Text>Your Car. Your Driver. Your Convenience. from ₹129/hr</Text>
    <TextInput placeholder="Pickup location" value={pickup} onChangeText={setPickup} style={{ borderWidth: 1, padding: 10, marginVertical: 8 }} />
    <TextInput placeholder="Hours" keyboardType="numeric" value={hours} onChangeText={setHours} style={{ borderWidth: 1, padding: 10, marginVertical: 8 }} />
    <Button title="Book a Driver" onPress={book} /><Text>{msg}</Text>
  </View>);
}
