/**
 * Layout das abas principais (mapa, alertas, perfil).
 */
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{icon}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1B5E20' },
        headerTintColor: '#FFFFFF',
        tabBarActiveTintColor: '#1B5E20',
        tabBarInactiveTintColor: '#90A593',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Abastece',
          tabBarLabel: 'Mapa',
          tabBarIcon: ({ color }) => <TabIcon icon="🗺️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color }) => <TabIcon icon="🔔" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}
