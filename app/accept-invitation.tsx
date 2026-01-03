
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { parentService } from '@/services/database.service';
import { supabase } from '@/app/integrations/supabase/client';
import { IconSymbol } from '@/components/IconSymbol';

export default function AcceptInvitationScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInvitation = useCallback(async () => {
    try {
      setLoading(true);
      const invitationData = await parentService.getInvitationByToken(token);
      
      // Check if invitation is expired
      if (new Date(invitationData.expiresAt) < new Date()) {
        setError('This invitation has expired');
        return;
      }

      if (invitationData.status === 'accepted') {
        setError('This invitation has already been accepted');
        return;
      }

      setInvitation(invitationData);
    } catch (err) {
      console.error('Error loading invitation:', err);
      setError('Invalid or expired invitation');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadInvitation();
    }
  }, [token, loadInvitation]);

  const handleAccept = async () => {
    try {
      setLoading(true);

      // Check if user is already signed in
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to sign up with pre-filled email
        router.replace({
          pathname: '/sign-in',
          params: {
            email: invitation.email,
            invitationToken: token,
          },
        });
        return;
      }

      // Accept invitation
      await parentService.acceptInvitation(token);

      // Create parent profile if it doesn't exist
      const existingParent = await parentService.getByEmail(invitation.email);
      
      if (!existingParent) {
        await parentService.create({
          id: user.id,
          email: invitation.email,
          fullName: invitation.fullName,
        });
      }

      // Link parent to camper
      await parentService.linkToCamper(
        user.id,
        invitation.camperId,
        invitation.relationship
      );

      Alert.alert(
        'Success',
        'Invitation accepted! You can now manage your child\'s information.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/parent-dashboard'),
          },
        ]
      );
    } catch (err) {
      console.error('Error accepting invitation:', err);
      Alert.alert('Error', 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading invitation...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle"
          android_material_icon_name="error"
          size={64}
          color="#f44336"
        />
        <Text style={styles.errorTitle}>Invalid Invitation</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/sign-in')}
        >
          <Text style={styles.buttonText}>Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <IconSymbol
          ios_icon_name="envelope.open"
          android_material_icon_name="mail"
          size={64}
          color={colors.primary}
        />
        
        <Text style={styles.title}>You&apos;re Invited!</Text>
        
        <Text style={styles.message}>
          You have been invited to manage information for your child in CampSync.
        </Text>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Your Name:</Text>
            <Text style={styles.detailValue}>{invitation?.fullName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email:</Text>
            <Text style={styles.detailValue}>{invitation?.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Relationship:</Text>
            <Text style={styles.detailValue}>{invitation?.relationship}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.acceptButton}
          onPress={handleAccept}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <React.Fragment>
              <IconSymbol
                ios_icon_name="checkmark.circle"
                android_material_icon_name="check-circle"
                size={24}
                color="#fff"
              />
              <Text style={styles.acceptButtonText}>Accept Invitation</Text>
            </React.Fragment>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => router.replace('/sign-in')}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginBottom: 12,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  declineButton: {
    padding: 16,
  },
  declineButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  button: {
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
