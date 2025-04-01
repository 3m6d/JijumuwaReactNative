import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Input, Button } from 'react-native-elements';
import { router } from 'expo-router';
import { Phone, Lock, User as User2 } from 'lucide-react-native';
import { register } from '@/lib/api';

export default function RegisterScreen() {
  const [userType, setUserType] = useState('elderly');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setLoading(true);
    setError('');

    try {
      if (userType === 'elderly' && pin.length !== 4) {
        setError('PIN must be 4 digits');
        return;
      }

      if (userType === 'caretaker' && password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      const userData = {
        name,
        phone_number: phoneNumber,
        password: userType === 'elderly' ? pin : password,
        user_type: userType,
      };

      await register(userData);
      router.replace('/login');
    } catch (err) {
      setError(err.detail || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=3000&auto=format&fit=crop' }}
          style={styles.headerImage}
        />
        <View style={styles.overlay} />
        <Text style={styles.title}>Join CareConnect</Text>
        <Text style={styles.subtitle}>Create your account</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              userType === 'elderly' && styles.activeToggle,
            ]}
            onPress={() => setUserType('elderly')}
          >
            <Text style={[
              styles.toggleText,
              userType === 'elderly' && styles.activeToggleText
            ]}>Elderly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              userType === 'caretaker' && styles.activeToggle,
            ]}
            onPress={() => setUserType('caretaker')}
          >
            <Text style={[
              styles.toggleText,
              userType === 'caretaker' && styles.activeToggleText
            ]}>Caretaker</Text>
          </TouchableOpacity>
        </View>

        <Input
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          leftIcon={<User2 size={20} color="#666" />}
          containerStyle={styles.input}
        />

        <Input
          placeholder="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          autoCapitalize="none"
          leftIcon={<Phone size={20} color="#666" />}
          containerStyle={styles.input}
        />

        {userType === 'elderly' ? (
          <Input
            placeholder="4-Digit PIN"
            value={pin}
            onChangeText={setPin}
            keyboardType="numeric"
            secureTextEntry
            maxLength={4}
            leftIcon={<Lock size={20} color="#666" />}
            containerStyle={styles.input}
          />
        ) : (
          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={<Lock size={20} color="#666" />}
            containerStyle={styles.input}
          />
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title="Register"
          onPress={handleRegister}
          loading={loading}
          containerStyle={styles.buttonContainer}
          buttonStyle={styles.button}
        />

        <TouchableOpacity
          onPress={() => router.push('/login')}
          style={styles.loginLink}
        >
          <Text style={styles.loginText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 36,
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  form: {
    flex: 1,
    padding: 20,
    marginTop: -30,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  toggleButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: '#2089dc',
  },
  toggleText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#666',
  },
  activeToggleText: {
    color: '#fff',
  },
  input: {
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    padding: 15,
    backgroundColor: '#2089dc',
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    fontFamily: 'Inter-Regular',
    color: '#2089dc',
    fontSize: 16,
  },
});