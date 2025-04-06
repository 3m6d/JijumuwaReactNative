// app/TabTwoScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import TrackPlayer, { Event } from 'react-native-track-player';

const MUSIC_ASSET = require('../../assets/music-assets/hanuman.mp3');

export default function TabTwoScreen() {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function setupPlayer() {
      try {
        // Register playback service
        TrackPlayer.registerPlaybackService(() => async function() {
          TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
          TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
        });

        // Initialize player
        await TrackPlayer.setupPlayer();
        await TrackPlayer.add({
          id: 'track1',
          url: MUSIC_ASSET,
          title: 'Sample Track',
          artist: 'Test Artist',
        });
      } catch (error) {
        console.log('Setup error:', error);
      }
    }

    if (isMounted) {
      setupPlayer();
    }
    return () => {
        isMounted = false;
        TrackPlayer.reset().catch((error) => console.log('Cleanup error:', error));
    };
  }, []);

  const togglePlayback = async () => {
    try {
      if (isPlaying) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.log('Playback error:', error);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="text-3xl font-bold mb-8">Music Player</Text>
      <View className="items-center mb-10">
        <Text className="text-2xl font-semibold">Sample Track</Text>
        <Text className="text-xl text-gray-600">Test Artist</Text>
      </View>
      <TouchableOpacity
        className="w-48 h-48 bg-blue-500 rounded-full justify-center items-center"
        onPress={togglePlayback}
      >
        <Text className="text-4xl text-white font-bold">
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
