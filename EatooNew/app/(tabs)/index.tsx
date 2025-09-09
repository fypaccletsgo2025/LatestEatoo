import React from 'react';
import { SafeAreaView, ScrollView, View, Text, Image, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';

const Card = ({ title, subtitle, uri }: { title: string; subtitle?: string; uri: string }) => (
  <View className="w-[150px] mr-4">
    <View className="w-[150px] h-[150px] bg-gray-200 rounded-2xl overflow-hidden">
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
    </View>
    <Text className="mt-2 font-semibold">{title}</Text>
    {subtitle ? <Text className="mt-0.5 text-gray-500 text-xs">{subtitle}</Text> : null}
  </View>
);

const MoodCard = ({ label, uri, caption }: { label: string; uri: string; caption: string }) => (
  <View className="w-40 mr-4">
    <View className="w-40 h-[120px] rounded-2xl overflow-hidden">
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      <View className="absolute inset-0 items-center justify-center">
        <Text className="text-white font-extrabold text-2xl">{label}</Text>
      </View>
    </View>
    <Text className="mt-2 font-semibold">{caption.split('.')[0]}.</Text>
    <Text className="mt-0.5 text-gray-500 text-xs">{caption.replace(/^[^.]+\.\s?/, '')}</Text>
  </View>
);

export default function Home() {
  const navigation = useNavigation();
  return (
    <SafeAreaView className="flex-1 bg-[#d1ccc7]">
      <ScrollView>
        <View className="p-4 pb-28">
          {/* Top Row: avatar + search */}
          <View className="flex-row items-center mb-4">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open menu"
              onPress={() => (navigation as any)?.getParent?.()?.openDrawer?.()}
              className="w-9 h-9 rounded-full bg-gray-200 mr-3 items-center justify-center"
            >
              <Ionicons name="person-circle-outline" size={22} color="#6B7280" />
            </Pressable>
            <View className="flex-1 flex-row items-center bg-gray-200 rounded-xl px-3 h-10">
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput placeholder="Search" placeholderTextColor="#9CA3AF" className="flex-1 ml-2" />
            </View>
          </View>

          {/* For you */}
          <Text className="text-xl font-extrabold mb-3">For you</Text>
          <View className="flex-row mb-6">
            <Card title="Niko Neko Matcha" uri="https://images.unsplash.com/photo-1517705008128-361805f42e86?w=600" />
            <Card title="leaf & co. cafe" uri="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600" />
          </View>

          {/* Mood Bites */}
          <Text className="text-xl font-extrabold mb-3">Mood Bites</Text>
          <View className="flex-row">
            <MoodCard
              label="Spicy"
              uri="https://images.unsplash.com/photo-1604908176997-431c4d2b4c63?w=800"
              caption="Taste the Heat, Feel the Vibe. Because comfort tastes better shared."
            />
            <MoodCard
              label="COZY"
              uri="https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?w=800"
              caption="Because comfort tastes better shared. Warm bites, warmer vibes."
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
